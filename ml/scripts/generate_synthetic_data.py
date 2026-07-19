"""
Generate a synthetic Excel workbook matching the expected training schema.

Use this when the real teammate Excel is not yet available. Replace
``ml/data/subplot_training_data.xlsx`` with the real file when you have it —
column names documented in ``ml/README.md`` / ``ml/src/config.py``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.crop_meta import CROP_REFERENCE, SOIL_TYPES, crop_family, demand_score  # noqa: E402


def _history_string(crops: list[str]) -> str:
    return " | ".join(crops)


def generate(n_rows: int = 800, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    crops = list(CROP_REFERENCE.keys())
    soils = list(SOIL_TYPES)
    rows = []

    for i in range(n_rows):
        hist_len = int(rng.integers(1, 6))
        history = [str(rng.choice(crops)) for _ in range(hist_len)]
        # Occasionally force same-family streaks (harder cases for rotation).
        if rng.random() < 0.25 and hist_len >= 2:
            fam = crop_family(history[-1])
            same = [c for c in crops if crop_family(c) == fam]
            history[-1] = str(rng.choice(same))
            history[-2] = str(rng.choice(same))

        current = history[-1]
        future = str(rng.choice(crops))
        soil = str(rng.choice(soils))

        n_vals = [demand_score(c, "nitrogen") for c in history]
        p_vals = [demand_score(c, "phosphorus") for c in history]
        k_vals = [demand_score(c, "potassium") for c in history]
        total = float(np.mean(n_vals) + np.mean(p_vals) + np.mean(k_vals))
        legumes = sum(1 for c in history if crop_family(c) == "legume")
        legume_share = legumes / len(history)
        intensity = (total - 3.0) / 6.0
        hist_f = min(1.0, len(history) / 6.0)
        exhaustion = float(
            np.clip(0.55 * intensity + 0.35 * hist_f + 0.25 * (1.0 - legume_share) + rng.normal(0, 0.05), 0, 1)
        )

        same_fam = len(history) >= 2 and crop_family(history[-1]) == crop_family(history[-2])
        should_rotate = int(
            exhaustion >= 0.55
            or same_fam
            or (np.mean(n_vals) >= 2.5 and legume_share < 0.2)
            or rng.random() < 0.05  # small label noise
        )

        plantings_since = max(0, len(history) - legumes)
        years_since = max(0, len(history) - 1)
        freq = float(rng.uniform(0.8, 2.2))
        ph = float(rng.normal(6.5, 0.4))

        rows.append(
            {
                "subplot_id": f"sp_{i:04d}",
                "soil_type": soil,
                "current_crop": current,
                "intended_future_crop": future,
                "crop_history": _history_string(history),
                "plantings_since_rotation": plantings_since,
                "years_since_rotation": years_since,
                "planting_frequency_per_year": round(freq, 2),
                "soil_ph": round(ph, 2),
                "should_rotate": should_rotate,
                "soil_exhaustion": round(exhaustion, 4),
            }
        )

    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=800)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "data" / "subplot_training_data.xlsx",
    )
    args = parser.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df = generate(args.n)
    df.to_excel(args.out, index=False)
    print(f"Wrote {len(df)} rows -> {args.out}")
    print(f"Columns: {list(df.columns)}")
    print(f"should_rotate balance: {df['should_rotate'].value_counts().to_dict()}")
    print(
        f"soil_exhaustion: min={df['soil_exhaustion'].min():.3f} "
        f"max={df['soil_exhaustion'].max():.3f} mean={df['soil_exhaustion'].mean():.3f}"
    )


if __name__ == "__main__":
    main()
