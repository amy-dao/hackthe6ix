"""
Feature engineering aligned with the team synthetic_dataset.csv schema.

Single source of truth for turning farmer inputs into the numeric/categorical
vector both XGBoost models train on. Mirrors the logic in
Downloads/backend/backend/ml/feature_engineering.py so training and later
inference stay consistent.
"""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from .config import (
    CATEGORICAL_COLUMNS,
    FEATURE_COLUMNS,
    RISK_SCORE_TO_EXHAUSTION_DIVISOR,
    TARGET_RISK_SCORE,
    TARGET_ROTATE,
)
from .crop_meta import (
    CROP_REFERENCE,
    DEMAND_SCORE,
    NITROGEN_FIXING_FAMILIES,
    SOIL_TYPES,
    normalize_crop,
)


def parse_previous_crops(raw) -> list[str]:
    """Parse ``previous_crops`` (pipe-separated, oldest → newest)."""
    if raw is None or (isinstance(raw, float) and np.isnan(raw)):
        return []
    text = str(raw).strip()
    if not text or text.lower() in {"nan", "none", "null"}:
        return []
    return [normalize_crop(p) for p in text.split("|") if normalize_crop(p)]


def _ph_distance(soil_ph: float | None, ideal_range) -> float:
    if soil_ph is None or ideal_range is None:
        return 0.0
    low, high = ideal_range
    if low <= soil_ph <= high:
        return 0.0
    return round(min(abs(soil_ph - low), abs(soil_ph - high)), 2)


def _soil_type_match(soil_type: str | None, preferred_soils) -> int:
    if not soil_type or not preferred_soils:
        return 0
    return 1 if soil_type in preferred_soils else 0


def _rotation_stats(previous_crops: list[str], planned_crop_info: dict | None) -> dict:
    families = []
    for name in previous_crops:
        info = CROP_REFERENCE.get(name)
        families.append(info["family"] if info else None)

    planned_family = planned_crop_info["family"] if planned_crop_info else None

    same_family_repeat_count = 0
    for fam in reversed(families):
        if fam is not None and fam == planned_family:
            same_family_repeat_count += 1
        else:
            break

    heavy_feeder_streak = 0
    for name in reversed(previous_crops):
        info = CROP_REFERENCE.get(name)
        if not info:
            break
        if info["family"] in NITROGEN_FIXING_FAMILIES:
            break
        if info["nitrogen_demand"] == "high":
            heavy_feeder_streak += 1
        else:
            break

    seasons_since_fixer = len(previous_crops)
    for i, fam in enumerate(reversed(families)):
        if fam in NITROGEN_FIXING_FAMILIES:
            seasons_since_fixer = i
            break

    return {
        "same_family_repeat_count": same_family_repeat_count,
        "heavy_feeder_streak": heavy_feeder_streak,
        "seasons_since_nitrogen_fixer": seasons_since_fixer,
        "rotation_length": len(previous_crops),
    }


def build_features(
    plot_size_hectares,
    soil_ph,
    soil_type,
    planned_crop,
    previous_crops,
) -> dict:
    """Raw farmer inputs → feature dict matching FEATURE_COLUMNS."""
    planned_key = normalize_crop(planned_crop)
    planned_info = CROP_REFERENCE.get(planned_key)
    # Prefer full reference with ideal_ph / preferred_soils when present.
    if planned_info and "ideal_ph" not in planned_info:
        # crop_meta may be lean; enrich from extended table below if needed
        pass

    planned_family = planned_info["family"] if planned_info else "unknown"
    planned_n = DEMAND_SCORE[planned_info["nitrogen_demand"]] if planned_info else 2

    from .crop_meta_extended import get_full_crop_info

    full = get_full_crop_info(planned_key)
    ideal_ph = full.get("ideal_ph") if full else None
    preferred = full.get("preferred_soils") if full else None

    hist = previous_crops if isinstance(previous_crops, list) else parse_previous_crops(previous_crops)
    soil = normalize_crop(soil_type) or "unknown"
    if soil == "slit":
        soil = "silt"
    if soil not in SOIL_TYPES:
        soil = "unknown"

    try:
        size = float(plot_size_hectares) if plot_size_hectares is not None else 1.0
    except (TypeError, ValueError):
        size = 1.0
    try:
        ph = float(soil_ph) if soil_ph is not None else 6.5
    except (TypeError, ValueError):
        ph = 6.5

    return {
        "plot_size_hectares": size,
        "soil_ph": ph,
        "soil_type": soil if soil in SOIL_TYPES else "unknown",
        "planned_crop_family": planned_family,
        "planned_nitrogen_demand": planned_n,
        "ph_distance_from_ideal": _ph_distance(ph, ideal_ph),
        "soil_type_match": _soil_type_match(soil, preferred),
        **_rotation_stats(hist, planned_info),
    }


def row_to_features(row: pd.Series) -> dict:
    """
    Prefer precomputed FEATURE_COLUMNS from the CSV when present;
    otherwise engineer from raw columns.
    """
    if all(c in row.index and pd.notna(row.get(c)) for c in FEATURE_COLUMNS if c not in CATEGORICAL_COLUMNS):
        # CSV already has engineered numerics; still normalize categoricals.
        out = {c: row.get(c) for c in FEATURE_COLUMNS}
        out["soil_type"] = normalize_crop(out.get("soil_type")) or "unknown"
        out["planned_crop_family"] = normalize_crop(out.get("planned_crop_family")) or "unknown"
        return out

    planned = row.get("planned_crop") or row.get("intended_future_crop") or row.get("current_crop")
    history = row.get("previous_crops")
    if history is None:
        history = row.get("crop_history")
    return build_features(
        plot_size_hectares=row.get("plot_size_hectares", row.get("acres", 1.0)),
        soil_ph=row.get("soil_ph", 6.5),
        soil_type=row.get("soil_type"),
        planned_crop=planned,
        previous_crops=history,
    )


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Return a DataFrame with exactly FEATURE_COLUMNS.

    Fast path: CSV already contains engineered columns (synthetic_dataset.csv).
    Slow path: engineer row-by-row from raw farmer fields.
    """
    if all(c in df.columns for c in FEATURE_COLUMNS):
        out = df[FEATURE_COLUMNS].copy()
        out["soil_type"] = out["soil_type"].map(lambda v: normalize_crop(v) or "unknown")
        out["planned_crop_family"] = out["planned_crop_family"].map(
            lambda v: normalize_crop(v) or "unknown"
        )
        # Fill any null numerics with neutral defaults
        for col in FEATURE_COLUMNS:
            if col in CATEGORICAL_COLUMNS:
                out[col] = out[col].fillna("unknown")
            else:
                out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0)
        return out

    rows = [row_to_features(row) for _, row in df.iterrows()]
    return pd.DataFrame(rows)[FEATURE_COLUMNS]


def risk_score_to_exhaustion(series: pd.Series) -> pd.Series:
    """Map raw risk_score → soil exhaustion in [0, 1]."""
    s = pd.to_numeric(series, errors="coerce")
    return (s / RISK_SCORE_TO_EXHAUSTION_DIVISOR).clip(0.0, 1.0)


def prepare_matrix(
    feature_df: pd.DataFrame,
    encoders: dict[str, LabelEncoder] | None = None,
    fit: bool = True,
) -> tuple[np.ndarray, dict[str, LabelEncoder]]:
    """Label-encode categoricals; return dense X and encoders."""
    df = feature_df.copy()
    encoders = encoders or {}

    for col in CATEGORICAL_COLUMNS:
        df[col] = df[col].astype(str)
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            encoders[col] = le
        else:
            le = encoders[col]
            known = set(le.classes_)
            df[col] = df[col].apply(lambda v, k=known, c0=le.classes_[0]: v if v in k else c0)
            df[col] = le.transform(df[col])

    X = df[FEATURE_COLUMNS].astype(float).values
    return X, encoders


def records_to_matrix(records: Iterable[dict], encoders: dict[str, LabelEncoder]) -> np.ndarray:
    frame = build_feature_frame(pd.DataFrame(list(records)))
    X, _ = prepare_matrix(frame, encoders=encoders, fit=False)
    return X
