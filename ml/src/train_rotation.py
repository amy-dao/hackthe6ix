"""Model 1 — crop rotation recommendation (binary classification)."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from .config import (
    ARTIFACTS_DIR,
    DEFAULT_DATA_PATH,
    ENCODERS_PATH,
    METRICS_PATH,
    RANDOM_STATE,
    ROTATION_MODEL_PATH,
    TARGET_ROTATE,
    TEST_SIZE,
)
from .dataset import load_training_data, print_inspection
from .features import build_feature_frame, prepare_matrix


def train_rotation_model(
    data_path: str | Path = DEFAULT_DATA_PATH,
    artifacts_dir: str | Path = ARTIFACTS_DIR,
) -> dict:
    artifacts_dir = Path(artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    df = load_training_data(data_path)
    print_inspection(df)

    feat = build_feature_frame(df)
    y = df[TARGET_ROTATE].astype(int).values

    X_train_df, X_val_df, y_train, y_val = train_test_split(
        feat,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    X_train, encoders = prepare_matrix(X_train_df, fit=True)
    X_val, _ = prepare_matrix(X_val_df, encoders=encoders, fit=False)

    pos = float((y_train == 1).sum())
    neg = float((y_train == 0).sum())
    scale_pos_weight = (neg / pos) if pos > 0 else 1.0

    model = XGBClassifier(
        n_estimators=200,
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
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_val)[:, 1]
    pred = (proba >= 0.5).astype(int)

    metrics = {
        "model": "rotation_classifier",
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "accuracy": float(accuracy_score(y_val, pred)),
        "f1": float(f1_score(y_val, pred, zero_division=0)),
        "classification_report": classification_report(
            y_val, pred, output_dict=True, zero_division=0
        ),
        "scale_pos_weight": scale_pos_weight,
        "data_path": str(Path(data_path).resolve()),
    }
    print(
        f"[rotation] accuracy={metrics['accuracy']:.3f}  "
        f"f1={metrics['f1']:.3f}  (val n={metrics['n_val']})"
    )

    model_path = artifacts_dir / ROTATION_MODEL_PATH.name
    enc_path = artifacts_dir / ENCODERS_PATH.name
    # Save booster JSON + joblib wrapper for easy load
    model.save_model(str(artifacts_dir / "rotate_model.json"))
    joblib.dump({"model": model, "encoders": encoders}, model_path)
    joblib.dump(encoders, enc_path)

    _update_metrics(artifacts_dir / METRICS_PATH.name, metrics)
    print(f"Saved rotation model -> {model_path}")
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
    train_rotation_model(args.data, args.artifacts)
