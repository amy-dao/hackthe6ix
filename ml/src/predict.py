"""Inference helpers for later backend / UI integration (not wired yet)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np

from .config import ARTIFACTS_DIR, EXHAUSTION_MODEL_PATH, ROTATION_MODEL_PATH
from .features import build_features, prepare_matrix
import pandas as pd


class SubplotRecommender:
    """Score a subplot using the trained rotation + exhaustion models.

    Preferred raw inputs (farmer-facing):
      plot_size_hectares, soil_ph, soil_type, planned_crop, previous_crops

    ``previous_crops``: list[str] or pipe-separated string, oldest → newest.
    """

    def __init__(
        self,
        rotation_path: str | Path | None = None,
        exhaustion_path: str | Path | None = None,
    ):
        rotation_path = Path(rotation_path or ARTIFACTS_DIR / ROTATION_MODEL_PATH.name)
        exhaustion_path = Path(exhaustion_path or ARTIFACTS_DIR / EXHAUSTION_MODEL_PATH.name)
        if not rotation_path.exists() or not exhaustion_path.exists():
            raise FileNotFoundError(
                "Model artifacts missing. Train with `python ml/scripts/train_all.py`."
            )
        rot_bundle = joblib.load(rotation_path)
        exh_bundle = joblib.load(exhaustion_path)
        self.rotation_model = rot_bundle["model"]
        self.exhaustion_model = exh_bundle["model"]
        self.encoders = rot_bundle.get("encoders") or exh_bundle["encoders"]

    def _matrix(self, record: dict[str, Any]) -> np.ndarray:
        if all(k in record for k in ("planned_crop", "soil_type")):
            feats = build_features(
                plot_size_hectares=record.get("plot_size_hectares", 1.0),
                soil_ph=record.get("soil_ph", 6.5),
                soil_type=record.get("soil_type"),
                planned_crop=record.get("planned_crop"),
                previous_crops=record.get("previous_crops", []),
            )
        else:
            feats = record
        frame = pd.DataFrame([feats])
        X, _ = prepare_matrix(frame, encoders=self.encoders, fit=False)
        return X

    def predict_rotation(self, record: dict[str, Any]) -> dict[str, Any]:
        X = self._matrix(record)
        proba = float(self.rotation_model.predict_proba(X)[0, 1])
        label = 1 if proba >= 0.5 else 0
        return {
            "should_rotate": label,
            "label": "Rotate" if label == 1 else "Do Not Rotate",
            "probability_rotate": proba,
        }

    def predict_exhaustion(self, record: dict[str, Any]) -> dict[str, Any]:
        X = self._matrix(record)
        score = float(np.clip(self.exhaustion_model.predict(X)[0], 0.0, 1.0))
        return {
            "soil_exhaustion": score,
            "soil_exhaustion_0_100": score * 100.0,
        }

    def predict(self, record: dict[str, Any]) -> dict[str, Any]:
        return {**self.predict_rotation(record), **self.predict_exhaustion(record)}
