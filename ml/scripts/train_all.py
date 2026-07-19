"""Train both XGBoost models on synthetic_dataset.csv (or --data path)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.train_exhaustion import train_exhaustion_model  # noqa: E402
from src.train_rotation import train_rotation_model  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Train rotation + exhaustion models")
    parser.add_argument(
        "--data",
        type=Path,
        default=ROOT / "data" / "synthetic_dataset.csv",
        help="Path to training CSV/Excel (default: ml/data/synthetic_dataset.csv)",
    )
    parser.add_argument(
        "--artifacts",
        type=Path,
        default=ROOT / "artifacts",
    )
    args = parser.parse_args()

    if not args.data.exists():
        raise SystemExit(
            f"Missing data file: {args.data}\n"
            "Copy synthetic_dataset.csv into ml/data/ or pass --data."
        )

    print("\n===== Model 1: Rotation classifier =====")
    rot = train_rotation_model(args.data, args.artifacts)
    print("\n===== Model 2: Exhaustion regressor =====")
    exh = train_exhaustion_model(args.data, args.artifacts)

    print("\n===== Summary =====")
    print(f"Rotation  accuracy={rot['accuracy']:.3f}  f1={rot['f1']:.3f}")
    print(f"Exhaustion rmse={exh['rmse']:.4f}  mae={exh['mae']:.4f}  r2={exh['r2']:.3f}")
    print(f"Artifacts: {args.artifacts}")


if __name__ == "__main__":
    main()
