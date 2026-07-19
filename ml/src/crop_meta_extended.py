"""Full crop reference with ideal_ph and preferred_soils (matches backend)."""

from __future__ import annotations

from .crop_meta import CROP_REFERENCE, normalize_crop

# Extended fields not required for family/demand features but used for pH / soil match.
_EXTENDED = {
    "corn": {"ideal_ph": (5.8, 7.0), "preferred_soils": ["loam", "silt"]},
    "wheat": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "clay"]},
    "rice": {"ideal_ph": (5.5, 6.5), "preferred_soils": ["clay", "silt"]},
    "soybean": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "silt"]},
    "beans": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "sandy"]},
    "peas": {"ideal_ph": (6.0, 7.5), "preferred_soils": ["loam", "silt"]},
    "tomato": {"ideal_ph": (6.0, 6.8), "preferred_soils": ["loam"]},
    "potato": {"ideal_ph": (4.8, 6.5), "preferred_soils": ["sandy", "loam"]},
    "pepper": {"ideal_ph": (5.5, 6.8), "preferred_soils": ["loam", "sandy"]},
    "cabbage": {"ideal_ph": (6.0, 7.5), "preferred_soils": ["loam", "clay"]},
    "broccoli": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "clay"]},
    "carrot": {"ideal_ph": (6.0, 6.8), "preferred_soils": ["sandy", "loam"]},
    "onion": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "sandy"]},
    "lettuce": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "silt"]},
    "clover": {"ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "clay", "silt"]},
}


def get_full_crop_info(crop_name: str | None) -> dict | None:
    key = normalize_crop(crop_name)
    base = CROP_REFERENCE.get(key)
    if not base:
        return None
    extra = _EXTENDED.get(key, {})
    return {**base, **extra}
