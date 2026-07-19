"""
train_models.py — train both XGBoost models and save artifacts.

Usage (from repo root):
  .\\.venv\\Scripts\\python.exe ml\\train_models.py
  .\\.venv\\Scripts\\python.exe ml\\train_models.py --data ml\\data\\synthetic_dataset.csv
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier, XGBRegressor

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from data_processing import (  # noqa: E402
    DEFAULT_DATA_PATH,
    RANDOM_STATE,
    TARGET_RISK_SCORE,
    TARGET_ROTATE,
    build_feature_frame,
    load_training_data,
    prepare_matrix,
    print_inspection,
    risk_score_to_exhaustion,
)
from src.config import (  # noqa: E402
    ARTIFACTS_DIR,
    ENCODERS_PATH,
    EXHAUSTION_MODEL_PATH,
    METRICS_PATH,
    ROTATION_MODEL_PATH,
    TEST_SIZE,
)

EARLY_STOPPING_ROUNDS = 25


def train_rotation(X_train, y_train, X_val, y_val) -> tuple[XGBClassifier, dict]:
    pos = float((y_train == 1).sum())
    neg = float((y_train == 0).sum())
    scale_pos_weight = (neg / pos) if pos > 0 else 1.0

    model = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=2,
        reg_lambda=1.0,
        objective="binary:logistic",
        eval_metric="logloss",
        scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        early_stopping_rounds=EARLY_STOPPING_ROUNDS,
    )
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    proba = model.predict_proba(X_val)[:, 1]
    pred = (proba >= 0.5).astype(int)
    metrics = {
        "model": "rotation_classifier",
        "accuracy": float(accuracy_score(y_val, pred)),
        "f1": float(f1_score(y_val, pred, zero_division=0)),
        "classification_report": classification_report(
            y_val, pred, output_dict=True, zero_division=0
        ),
        "best_iteration": int(getattr(model, "best_iteration", model.n_estimators) or 0),
        "scale_pos_weight": scale_pos_weight,
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
    }
    return model, metrics


def train_exhaustion(X_train, y_train, X_val, y_val) -> tuple[XGBRegressor, dict]:
    model = XGBRegressor(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=2,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        early_stopping_rounds=EARLY_STOPPING_ROUNDS,
    )
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    pred = np.clip(model.predict(X_val), 0.0, 1.0)
    metrics = {
        "model": "exhaustion_regressor",
        "rmse": float(np.sqrt(mean_squared_error(y_val, pred))),
        "mae": float(mean_absolute_error(y_val, pred)),
        "r2": float(r2_score(y_val, pred)),
        "best_iteration": int(getattr(model, "best_iteration", model.n_estimators) or 0),
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
    }
    return model, metrics


def train_all(data_path: Path, artifacts_dir: Path) -> dict:
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    df = load_training_data(data_path)
    print_inspection(df)

    feat = build_feature_frame(df)
    y_rotate = df[TARGET_ROTATE].astype(int).values
    y_exh = risk_score_to_exhaustion(df[TARGET_RISK_SCORE]).values

    # Shared split index so both models see the same val rows for reporting.
    idx = np.arange(len(feat))
    train_idx, val_idx = train_test_split(
        idx,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y_rotate,
    )

    X_train_df, X_val_df = feat.iloc[train_idx], feat.iloc[val_idx]
    X_train, encoders = prepare_matrix(X_train_df, fit=True)
    X_val, _ = prepare_matrix(X_val_df, encoders=encoders, fit=False)

    print("\n===== Model 1: Rotation classifier =====")
    rot_model, rot_metrics = train_rotation(
        X_train, y_rotate[train_idx], X_val, y_rotate[val_idx]
    )
    print(
        f"[rotation] accuracy={rot_metrics['accuracy']:.3f}  "
        f"f1={rot_metrics['f1']:.3f}  best_iter={rot_metrics['best_iteration']}"
    )

    print("\n===== Model 2: Exhaustion regressor =====")
    exh_model, exh_metrics = train_exhaustion(
        X_train, y_exh[train_idx], X_val, y_exh[val_idx]
    )
    print(
        f"[exhaustion] rmse={exh_metrics['rmse']:.4f}  "
        f"mae={exh_metrics['mae']:.4f}  r2={exh_metrics['r2']:.3f}  "
        f"best_iter={exh_metrics['best_iteration']}"
    )

    # Persist: joblib bundles (model + encoders) + native XGBoost JSON.
    joblib.dump({"model": rot_model, "encoders": encoders}, artifacts_dir / ROTATION_MODEL_PATH.name)
    joblib.dump({"model": exh_model, "encoders": encoders}, artifacts_dir / EXHAUSTION_MODEL_PATH.name)
    joblib.dump(encoders, artifacts_dir / ENCODERS_PATH.name)
    rot_model.save_model(str(artifacts_dir / "rotate_model.json"))
    exh_model.save_model(str(artifacts_dir / "exhaustion_model.json"))
    # Aliases expected by the API service docs
    joblib.dump({"model": rot_model, "encoders": encoders}, artifacts_dir / "rotation_model.joblib")
    joblib.dump({"model": exh_model, "encoders": encoders}, artifacts_dir / "exhaustion_model.joblib")

    metrics = {
        rot_metrics["model"]: rot_metrics,
        exh_metrics["model"]: exh_metrics,
        "data_path": str(data_path.resolve()),
        "random_state": RANDOM_STATE,
    }
    (artifacts_dir / METRICS_PATH.name).write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"\nSaved artifacts -> {artifacts_dir}")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train rotation + exhaustion XGBoost models")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS_DIR)
    args = parser.parse_args()
    if not args.data.exists():
        raise SystemExit(f"Missing dataset: {args.data}")
    train_all(args.data, args.artifacts)


if __name__ == "__main__":
    main()
