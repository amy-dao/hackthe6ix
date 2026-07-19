"""
model_service.py — load XGBoost models once and run automatic subplot inference.

Models are loaded at FastAPI startup (singleton). Per-request inference only
runs preprocess + predict — never reloads or retrains.
"""

from __future__ import annotations

import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
ML_ROOT = REPO_ROOT / "ml"
ARTIFACTS_DIR = ML_ROOT / "artifacts"

if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

from data_processing import build_features, prepare_matrix  # noqa: E402

REQUIRED_FEATURES = [
    "soil_type",
    "crop_history",
    "next_crop",
    "soil_ph",
    "acres",
]


class ModelNotReadyError(RuntimeError):
    pass


def unknown_recommendations() -> dict[str, Any]:
    """Return when required features are incomplete — do not run models."""
    return {
        "rotation_recommendation": "Unknown",
        "soil_exhaustion_score": "Unknown",
        "rotation_probability": None,
        "rotation_label": "Unknown",
    }


def has_required_features(subplot: dict) -> bool:
    """True when every required raw field is present and non-empty."""
    return len(missing_required_features(subplot)) == 0


def missing_required_features(subplot: dict) -> list[str]:
    """Return names of required features that are missing or empty."""
    normalized = _normalize_subplot_dict(subplot)
    missing: list[str] = []
    for key in REQUIRED_FEATURES:
        val = normalized.get(key)
        if val is None:
            missing.append(key)
            continue
        if key == "crop_history":
            # Empty history is allowed (new plot) — treat as present but empty list.
            if not isinstance(val, list):
                missing.append(key)
            continue
        if key == "next_crop" and (not str(val).strip()):
            missing.append(key)
            continue
        if key == "soil_type" and (not str(val).strip()):
            missing.append(key)
            continue
        if key in {"soil_ph", "acres"}:
            try:
                float(val)
            except (TypeError, ValueError):
                missing.append(key)
    return missing


def _normalize_subplot_dict(subplot: dict) -> dict:
    """Accept API / frontend / Mongo field shapes and normalize keys."""
    history = subplot.get("crop_history")
    if history is None:
        history = subplot.get("previous_crops")
    if history is None and subplot.get("cropEntries"):
        entries = [e for e in subplot["cropEntries"] if getattr(e, "crop", None) or (isinstance(e, dict) and e.get("crop"))]
        crops = []
        for e in entries:
            crop = e.crop if hasattr(e, "crop") else e.get("crop", "")
            if str(crop).strip():
                crops.append(str(crop).strip().lower())
        # oldest → newest for history; last as next if not set
        history = crops[:-1] if len(crops) > 1 else []
        if "next_crop" not in subplot and "planned_crop" not in subplot and crops:
            subplot = {**subplot, "next_crop": crops[-1]}

    if isinstance(history, str):
        history = [p.strip().lower() for p in history.replace(",", "|").split("|") if p.strip()]

    next_crop = (
        subplot.get("next_crop")
        or subplot.get("planned_crop")
        or subplot.get("current_crop")
        or subplot.get("crop")
    )
    soil_type = subplot.get("soil_type") or subplot.get("soilType")
    soil_ph = subplot.get("soil_ph")
    if soil_ph is None:
        soil_ph = subplot.get("soilPh")
    acres = subplot.get("acres")
    if acres is None and subplot.get("plot_size_hectares") is not None:
        try:
            acres = float(subplot["plot_size_hectares"]) / 0.404685642
        except (TypeError, ValueError):
            acres = None
    if acres is None and subplot.get("areaAcres") is not None:
        acres = subplot.get("areaAcres")

    return {
        "soil_type": soil_type,
        "crop_history": history if isinstance(history, list) else [],
        "next_crop": next_crop,
        "soil_ph": soil_ph,
        "acres": acres,
        "subplot_id": subplot.get("subplot_id") or subplot.get("id"),
        "other_features": subplot.get("other_features") or {},
    }


def _enrich_with_crop_suggestions(result: dict[str, Any], normalized: dict) -> dict[str, Any]:
    """Attach NPK deficiency + suggested restorative crops (heuristic)."""
    history = list(normalized.get("crop_history") or [])
    next_crop = normalized.get("next_crop")
    crops = [*history]
    if next_crop:
        crops.append(str(next_crop).strip().lower())

    # Demand scores: high demand depletes remaining nutrient → treat as deficiency signal
    from .crop_reference import CROP_REFERENCE, DEMAND_SCORE

    totals = {"N": 0.0, "P": 0.0, "K": 0.0}
    counted = 0
    for name in crops:
        info = CROP_REFERENCE.get(name)
        if not info:
            continue
        totals["N"] += DEMAND_SCORE.get(info["nitrogen_demand"], 2)
        totals["P"] += DEMAND_SCORE.get(info["phosphorus_demand"], 2)
        totals["K"] += DEMAND_SCORE.get(info["potassium_demand"], 2)
        counted += 1

    npk_deficiency = None
    suggested: list[str] = []
    reason = None
    should_rotate = result.get("rotation_recommendation") == 1

    if counted > 0:
        avgs = {k: totals[k] / counted for k in totals}
        # Highest average demand → most depleted remaining nutrient
        worst = max(avgs, key=lambda k: avgs[k])
        if avgs[worst] >= 2.2 or should_rotate:
            npk_deficiency = worst

    restorative = {
        "N": ["soybean", "beans", "peas", "clover"],
        "P": ["beans", "peas", "lettuce", "wheat"],
        "K": ["beans", "peas", "lettuce", "clover"],
    }
    if npk_deficiency:
        current = set(crops)
        suggested = [c.title() for c in restorative[npk_deficiency] if c not in current][:3]
        names = {"N": "Nitrogen", "P": "Phosphorus", "K": "Potassium"}
        nutrient = names[npk_deficiency]
        if npk_deficiency == "N":
            reason = (
                f"Low {nutrient} detected. Legumes help fix nitrogen in the soil, "
                "improving fertility for the next season."
            )
        elif npk_deficiency == "P":
            reason = (
                f"Low {nutrient} detected. Lighter-feeding crops and legumes reduce further "
                "phosphorus draw while soil recovers."
            )
        else:
            reason = (
                f"Low {nutrient} detected. Lower-potassium-demand crops give the soil time "
                "to rebuild K reserves."
            )
    elif should_rotate:
        suggested = ["Soybean", "Clover", "Peas"]
        reason = (
            "Soil nutrients look relatively balanced; legumes still help maintain fertility "
            "if you rotate."
        )

    result["npk_deficiency"] = npk_deficiency
    result["suggested_crops"] = suggested
    result["suggestion_reason"] = reason
    return result


def _input_fingerprint(normalized: dict) -> str:
    payload = {
        "soil_type": str(normalized.get("soil_type") or "").lower(),
        "crop_history": [str(c).lower() for c in (normalized.get("crop_history") or [])],
        "next_crop": str(normalized.get("next_crop") or "").lower(),
        "soil_ph": normalized.get("soil_ph"),
        "acres": normalized.get("acres"),
    }
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class RecommendationModelService:
    """In-memory rotation classifier + exhaustion regressor (+ shared encoders)."""

    def __init__(self, artifacts_dir: Path | None = None):
        self.artifacts_dir = Path(artifacts_dir or ARTIFACTS_DIR)
        self.rotation_model = None
        self.exhaustion_model = None
        self.encoders: dict | None = None
        self._cache: dict[str, dict[str, Any]] = {}
        self._load()

    def _resolve_bundle(self, *names: str) -> Path:
        for name in names:
            path = self.artifacts_dir / name
            if path.exists():
                return path
        raise ModelNotReadyError(
            f"None of {names} found in {self.artifacts_dir}. Run: python ml/train_models.py"
        )

    def _load(self) -> None:
        rot_path = self._resolve_bundle("rotation_model.joblib", "rotation_xgb.joblib")
        exh_path = self._resolve_bundle("exhaustion_model.joblib", "exhaustion_xgb.joblib")
        rot_bundle = joblib.load(rot_path)
        exh_bundle = joblib.load(exh_path)
        self.rotation_model = rot_bundle["model"] if isinstance(rot_bundle, dict) else rot_bundle
        self.exhaustion_model = exh_bundle["model"] if isinstance(exh_bundle, dict) else exh_bundle
        self.encoders = None
        if isinstance(rot_bundle, dict):
            self.encoders = rot_bundle.get("encoders")
        if self.encoders is None and isinstance(exh_bundle, dict):
            self.encoders = exh_bundle.get("encoders")
        enc_path = self.artifacts_dir / "feature_encoders.joblib"
        if self.encoders is None and enc_path.exists():
            self.encoders = joblib.load(enc_path)
        if self.encoders is None:
            raise ModelNotReadyError("Feature encoders missing alongside model artifacts.")
        print(f"Loaded recommendation models from {self.artifacts_dir}")

    @property
    def ready(self) -> bool:
        return (
            self.rotation_model is not None
            and self.exhaustion_model is not None
            and self.encoders is not None
        )

    def preprocess_input(self, subplot: dict) -> np.ndarray:
        """Raw subplot → model matrix (single row)."""
        if self.encoders is None:
            raise ModelNotReadyError("Encoders not loaded.")
        normalized = _normalize_subplot_dict(subplot)
        feats = build_features(
            plot_size_hectares=float(normalized["acres"]) * 0.404685642,
            soil_ph=float(normalized["soil_ph"]),
            soil_type=normalized["soil_type"],
            planned_crop=normalized["next_crop"],
            previous_crops=normalized["crop_history"] or [],
        )
        frame = pd.DataFrame([feats])
        X, _ = prepare_matrix(frame, encoders=self.encoders, fit=False)
        return X

    def run_model_inference(self, subplot: dict) -> dict[str, Any]:
        """
        Run both models for one subplot. Uses an input-hash cache so unchanged
        plots skip re-scoring.
        """
        if not self.ready:
            raise ModelNotReadyError("Models are not loaded.")

        normalized = _normalize_subplot_dict(subplot)
        subplot_id = normalized.get("subplot_id") or "unknown"
        print(f"Running inference for subplot {subplot_id}")

        fp = _input_fingerprint(normalized)
        cached = self._cache.get(fp)
        if cached is not None:
            return dict(cached)

        features = self.preprocess_input(normalized)
        rotation_pred = int(self.rotation_model.predict(features)[0])
        rotation_proba = float(self.rotation_model.predict_proba(features)[0][1])
        exhaustion_score = float(self.exhaustion_model.predict(features)[0])
        exhaustion_score = max(0.0, min(1.0, exhaustion_score))

        result = {
            "rotation_recommendation": rotation_pred,
            "rotation_probability": round(rotation_proba, 4),
            "rotation_label": "Rotate Crops" if rotation_pred == 1 else "Do Not Rotate",
            "soil_exhaustion_score": round(exhaustion_score, 4),
        }
        result = _enrich_with_crop_suggestions(result, normalized)
        self._cache[fp] = result
        # Bound cache size
        if len(self._cache) > 2048:
            self._cache.pop(next(iter(self._cache)))
        return dict(result)

    def predict(self, subplot: dict) -> dict[str, Any]:
        """Alias used by API routes."""
        return self.run_model_inference(subplot)

    def predict_many(self, payloads: list[dict[str, Any]]) -> list[dict[str, Any] | None]:
        """
        Vectorized batch inference.

        Returns a list aligned with ``payloads``. Entries that lack required
        features are ``None``; ready ones are scored in one matrix pass
        (cache hits skipped from the matrix).
        """
        if not self.ready:
            raise ModelNotReadyError("Models are not loaded.")

        results: list[dict[str, Any] | None] = [None] * len(payloads)
        to_score_idx: list[int] = []
        to_score_norm: list[dict] = []

        for i, raw in enumerate(payloads):
            if not has_required_features(raw):
                continue
            normalized = _normalize_subplot_dict(raw)
            fp = _input_fingerprint(normalized)
            cached = self._cache.get(fp)
            if cached is not None:
                results[i] = dict(cached)
                continue
            to_score_idx.append(i)
            to_score_norm.append(normalized)

        if not to_score_norm:
            return results

        print(f"Running batch inference for {len(to_score_norm)} subplot(s)")
        feat_rows = [
            build_features(
                plot_size_hectares=float(n["acres"]) * 0.404685642,
                soil_ph=float(n["soil_ph"]),
                soil_type=n["soil_type"],
                planned_crop=n["next_crop"],
                previous_crops=n["crop_history"] or [],
            )
            for n in to_score_norm
        ]
        frame = pd.DataFrame(feat_rows)
        X, _ = prepare_matrix(frame, encoders=self.encoders, fit=False)

        rot_pred = self.rotation_model.predict(X)
        rot_proba = self.rotation_model.predict_proba(X)[:, 1]
        exh = np.clip(self.exhaustion_model.predict(X), 0.0, 1.0)

        for j, i in enumerate(to_score_idx):
            pred = int(rot_pred[j])
            result = {
                "rotation_recommendation": pred,
                "rotation_probability": round(float(rot_proba[j]), 4),
                "rotation_label": "Rotate Crops" if pred == 1 else "Do Not Rotate",
                "soil_exhaustion_score": round(float(exh[j]), 4),
            }
            result = _enrich_with_crop_suggestions(result, to_score_norm[j])
            fp = _input_fingerprint(to_score_norm[j])
            self._cache[fp] = result
            results[i] = result

        if len(self._cache) > 2048:
            # Drop oldest ~half when oversized
            for _ in range(len(self._cache) // 2):
                self._cache.pop(next(iter(self._cache)))

        return results

    def maybe_attach_recommendations(self, subplot: dict) -> dict | None:
        """If features are complete, run inference and return the recommendations dict."""
        if not has_required_features(subplot):
            return None
        return self.run_model_inference(subplot)


# Module-level singleton filled by FastAPI lifespan (not reloaded per request).
_SERVICE: RecommendationModelService | None = None


def init_model_service(artifacts_dir: Path | None = None) -> RecommendationModelService | None:
    """Load models once at startup. Returns None if artifacts are missing."""
    global _SERVICE
    try:
        _SERVICE = RecommendationModelService(artifacts_dir=artifacts_dir)
        return _SERVICE
    except ModelNotReadyError as exc:
        print(f"Recommendation models not loaded: {exc}")
        _SERVICE = None
        return None


def get_model_service() -> RecommendationModelService:
    if _SERVICE is None or not _SERVICE.ready:
        raise ModelNotReadyError(
            "Recommendation models are not available. Run: python ml/train_models.py"
        )
    return _SERVICE


def try_get_model_service() -> RecommendationModelService | None:
    return _SERVICE if _SERVICE is not None and _SERVICE.ready else None


# Back-compat for earlier lru_cache import sites
@lru_cache(maxsize=1)
def _legacy_get() -> RecommendationModelService:
    return get_model_service()
