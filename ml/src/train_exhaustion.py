"""Model 2 — soil exhaustion score (regression in [0, 1] from risk_score)."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from .config import (
    ARTIFACTS_DIR,
    DEFAULT_DATA_PATH,
    ENCODERS_PATH,
    EXHAUSTION_MODEL_PATH,
    METRICS_PATH,
    RANDOM_STATE,
    TARGET_RISK_SCORE,
    TEST_SIZE,
)
from .dataset import load_training_data, print_inspection
from .features import build_feature_frame, prepare_matrix, risk_score_to_exhaustion


def train_exhaustion_model(
    data_path: str | Path = DEFAULT_DATA_PATH,
    artifacts_dir: str | Path = ARTIFACTS_DIR,
) -> dict:
    artifacts_dir = Path(artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    df = load_training_data(data_path)
    print_inspection(df)

    feat = build_feature_frame(df)
    y = risk_score_to_exhaustion(df[TARGET_RISK_SCORE]).values

    X_train_df, X_val_df, y_train, y_val = train_test_split(
        feat,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )

    # Reuse encoders from rotation training when available so inference shares them.
    encoders = None
    enc_path = artifacts_dir / ENCODERS_PATH.name
    if enc_path.exists():
        encoders = joblib.load(enc_path)
        X_train, encoders = prepare_matrix(X_train_df, encoders=encoders, fit=False)
        X_val, _ = prepare_matrix(X_val_df, encoders=encoders, fit=False)
    else:
        X_train, encoders = prepare_matrix(X_train_df, fit=True)
        X_val, _ = prepare_matrix(X_val_df, encoders=encoders, fit=False)
        joblib.dump(encoders, enc_path)

    model = XGBRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=2,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    pred = np.clip(model.predict(X_val), 0.0, 1.0)
    rmse = float(np.sqrt(mean_squared_error(y_val, pred)))
    mae = float(mean_absolute_error(y_val, pred))
    r2 = float(r2_score(y_val, pred))

    metrics = {
        "model": "exhaustion_regressor",
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "rmse": rmse,
        "mae": mae,
        "r2": r2,
        "target": "risk_score normalized to [0,1] via /8.0 clip",
        "data_path": str(Path(data_path).resolve()),
    }
    print(f"[exhaustion] rmse={rmse:.4f}  mae={mae:.4f}  r2={r2:.3f}  (val n={metrics['n_val']})")

    model_path = artifacts_dir / EXHAUSTION_MODEL_PATH.name
    model.save_model(str(artifacts_dir / "exhaustion_model.json"))
    joblib.dump({"model": model, "encoders": encoders}, model_path)

    _update_metrics(artifacts_dir / METRICS_PATH.name, metrics)
    print(f"Saved exhaustion model -> {model_path}")
    return metrics


def _update_metrics(path: Path, block: dict) -> None:
    existing = {}
    if path.exists():
        existing = json.loads(path.read_text(encoding="utf-8"))
    existing[block["model"]] = block
    path.write_text(json.dumps(existing, indent=2), encoding="utf-8")


if __name__ == "__main__":
    import argparse
    import sys

    root = Path(__file__).resolve().parents[1]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS_DIR)
    args = parser.parse_args()
    train_exhaustion_model(args.data, args.artifacts)
