"""Lightweight crop/soil metadata for feature engineering.

Mirrors backend/crop_reference.py so training does not depend on FastAPI imports.
Unknown crops fall back to medium demand / unknown family.
"""

from __future__ import annotations

DEMAND_SCORE = {"low": 1, "medium": 2, "high": 3}

CROP_REFERENCE: dict[str, dict] = {
    "corn": {"family": "grain", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "wheat": {"family": "grain", "nitrogen_demand": "medium", "phosphorus_demand": "medium", "potassium_demand": "low"},
    "rice": {"family": "grain", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "soybean": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "beans": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "peas": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "low", "potassium_demand": "low"},
    "tomato": {"family": "nightshade", "nitrogen_demand": "high", "phosphorus_demand": "high", "potassium_demand": "high"},
    "potato": {"family": "nightshade", "nitrogen_demand": "medium", "phosphorus_demand": "high", "potassium_demand": "high"},
    "pepper": {"family": "nightshade", "nitrogen_demand": "medium", "phosphorus_demand": "high", "potassium_demand": "medium"},
    "cabbage": {"family": "brassica", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "broccoli": {"family": "brassica", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "carrot": {"family": "umbellifer", "nitrogen_demand": "low", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "onion": {"family": "allium", "nitrogen_demand": "medium", "phosphorus_demand": "medium", "potassium_demand": "medium"},
    "lettuce": {"family": "aster", "nitrogen_demand": "medium", "phosphorus_demand": "low", "potassium_demand": "low"},
    "clover": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "low", "potassium_demand": "low"},
}

SOIL_TYPES = ("clay", "loam", "sandy", "silt")
NITROGEN_FIXING_FAMILIES = {"legume"}


def normalize_crop(name: str | None) -> str:
    if name is None:
        return ""
    return str(name).strip().lower()


def get_crop_info(crop_name: str | None) -> dict | None:
    key = normalize_crop(crop_name)
    return CROP_REFERENCE.get(key)


def demand_score(crop_name: str | None, nutrient: str) -> float:
    info = get_crop_info(crop_name)
    if not info:
        return 2.0  # unknown ≈ medium
    level = info.get(f"{nutrient}_demand", "medium")
    return float(DEMAND_SCORE.get(level, 2))


def crop_family(crop_name: str | None) -> str:
    info = get_crop_info(crop_name)
    return info["family"] if info else "unknown"
