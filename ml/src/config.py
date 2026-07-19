"""Paths and training defaults shared by both model pipelines."""

from __future__ import annotations

from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ML_ROOT / "data"
ARTIFACTS_DIR = ML_ROOT / "artifacts"

# Primary dataset from the team synthetic generator (CSV).
DEFAULT_DATA_PATH = DATA_DIR / "synthetic_dataset.csv"
# Fallback Excel path (older bootstrap schema).
DEFAULT_EXCEL_PATH = DATA_DIR / "subplot_training_data.xlsx"

ROTATION_MODEL_PATH = ARTIFACTS_DIR / "rotation_xgb.joblib"
EXHAUSTION_MODEL_PATH = ARTIFACTS_DIR / "exhaustion_xgb.joblib"
ENCODERS_PATH = ARTIFACTS_DIR / "feature_encoders.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"

# Feature columns matching Downloads/.../ml/feature_engineering.py
FEATURE_COLUMNS = [
    "plot_size_hectares",
    "soil_ph",
    "soil_type",
    "planned_crop_family",
    "planned_nitrogen_demand",
    "ph_distance_from_ideal",
    "soil_type_match",
    "same_family_repeat_count",
    "heavy_feeder_streak",
    "seasons_since_nitrogen_fixer",
    "rotation_length",
]

CATEGORICAL_COLUMNS = ["soil_type", "planned_crop_family"]

TARGET_ROTATE = "should_rotate"  # 0 / 1
TARGET_RISK_SCORE = "risk_score"  # continuous; mapped to exhaustion in [0, 1]
TARGET_RISK_LEVEL = "risk_level"  # optional multiclass (low/medium/high)

# risk_score observed up to ~15; divide by this then clip → [0, 1] exhaustion.
RISK_SCORE_TO_EXHAUSTION_DIVISOR = 8.0

RANDOM_STATE = 42
TEST_SIZE = 0.2
