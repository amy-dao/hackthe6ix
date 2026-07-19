"""Load the team synthetic CSV (or Excel fallback) for training."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .config import (
    DEFAULT_DATA_PATH,
    FEATURE_COLUMNS,
    TARGET_RISK_LEVEL,
    TARGET_RISK_SCORE,
    TARGET_ROTATE,
)


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapping = {c: str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns}
    out = df.rename(columns=mapping)
    aliases = {
        "history": "previous_crops",
        "crop_history": "previous_crops",
        "past_crops": "previous_crops",
        "future_crop": "planned_crop",
        "intended_future_crop": "planned_crop",
        "next_crop": "planned_crop",
        "exhaustion": TARGET_RISK_SCORE,
        "soil_exhaustion": TARGET_RISK_SCORE,
        "soil_exhaustion_score": TARGET_RISK_SCORE,
    }
    for src, dst in aliases.items():
        if src in out.columns and dst not in out.columns:
            out = out.rename(columns={src: dst})
    return out


def load_training_data(path: str | Path | None = None) -> pd.DataFrame:
    path = Path(path) if path else DEFAULT_DATA_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Training data not found at {path}. "
            "Place synthetic_dataset.csv in ml/data/ or pass --data."
        )

    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path)
    elif path.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(path)
    else:
        raise ValueError(f"Unsupported data format: {path.suffix}")

    df = _normalize_columns(df)

    # Minimum: either engineered feature columns OR raw inputs we can engineer.
    has_features = all(c in df.columns for c in FEATURE_COLUMNS)
    has_raw = "planned_crop" in df.columns and "soil_type" in df.columns
    if not has_features and not has_raw:
        raise ValueError(
            f"Dataset missing engineered features and raw inputs. "
            f"Found columns: {list(df.columns)}"
        )
    if TARGET_ROTATE not in df.columns:
        raise ValueError(f"Dataset missing required target column '{TARGET_ROTATE}'.")
    if TARGET_RISK_SCORE not in df.columns:
        raise ValueError(
            f"Dataset missing '{TARGET_RISK_SCORE}' "
            "(used as continuous soil-exhaustion proxy)."
        )
    return df


def print_inspection(df: pd.DataFrame) -> None:
    print("=== Dataset inspection ===")
    print(f"rows: {len(df)}")
    print(f"columns ({len(df.columns)}): {list(df.columns)}")
    nulls = df.isna().sum()
    nulls = nulls[nulls > 0]
    print(f"nulls: {dict(nulls) if len(nulls) else 'none'}")
    print(f"should_rotate: {df[TARGET_ROTATE].value_counts().to_dict()}")
    rs = pd.to_numeric(df[TARGET_RISK_SCORE], errors="coerce")
    print(
        f"risk_score: min={rs.min():.3f} max={rs.max():.3f} mean={rs.mean():.3f}"
    )
    if TARGET_RISK_LEVEL in df.columns:
        print(f"risk_level: {df[TARGET_RISK_LEVEL].value_counts().to_dict()}")
