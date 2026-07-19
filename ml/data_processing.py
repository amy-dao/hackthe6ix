"""
data_processing.py — load dataset, inspect columns, engineer features, encode.

Public entry point for training scripts. Implementation lives in ``src/`` so
backend ``model_service`` can import the same feature builders without drift.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.config import (  # noqa: E402
    CATEGORICAL_COLUMNS,
    DEFAULT_DATA_PATH,
    FEATURE_COLUMNS,
    RANDOM_STATE,
    TARGET_RISK_SCORE,
    TARGET_ROTATE,
)
from src.dataset import load_training_data, print_inspection  # noqa: E402
from src.features import (  # noqa: E402
    build_feature_frame,
    build_features,
    parse_previous_crops,
    prepare_matrix,
    risk_score_to_exhaustion,
)

__all__ = [
    "CATEGORICAL_COLUMNS",
    "DEFAULT_DATA_PATH",
    "FEATURE_COLUMNS",
    "RANDOM_STATE",
    "TARGET_RISK_SCORE",
    "TARGET_ROTATE",
    "build_feature_frame",
    "build_features",
    "load_training_data",
    "parse_previous_crops",
    "prepare_matrix",
    "print_inspection",
    "risk_score_to_exhaustion",
]
