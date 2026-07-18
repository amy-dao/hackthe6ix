# Reference table of crop nutrient demand and family classification.
# "demand" is a rough relative scale (low / medium / high) for N-P-K draw,
# used by services/fertilizer_service.py to flag under/over-fertilizing
# and by services/rotation_service.py to catch back-to-back heavy feeders.
#
# This is intentionally simple and meant to be expanded with real
# agronomic data (or swapped for a proper lookup DB/API) as the project matures.

CROP_REFERENCE = {
    "corn": {"family": "grain", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (5.8, 7.0), "preferred_soils": ["loam", "silt"]},
    "wheat": {"family": "grain", "nitrogen_demand": "medium", "phosphorus_demand": "medium", "potassium_demand": "low", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "clay"]},
    "rice": {"family": "grain", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (5.5, 6.5), "preferred_soils": ["clay", "silt"]},
    "soybean": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "silt"]},
    "beans": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "sandy"]},
    "peas": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "low", "potassium_demand": "low", "ideal_ph": (6.0, 7.5), "preferred_soils": ["loam", "silt"]},
    "tomato": {"family": "nightshade", "nitrogen_demand": "high", "phosphorus_demand": "high", "potassium_demand": "high", "ideal_ph": (6.0, 6.8), "preferred_soils": ["loam"]},
    "potato": {"family": "nightshade", "nitrogen_demand": "medium", "phosphorus_demand": "high", "potassium_demand": "high", "ideal_ph": (4.8, 6.5), "preferred_soils": ["sandy", "loam"]},
    "pepper": {"family": "nightshade", "nitrogen_demand": "medium", "phosphorus_demand": "high", "potassium_demand": "medium", "ideal_ph": (5.5, 6.8), "preferred_soils": ["loam", "sandy"]},
    "cabbage": {"family": "brassica", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (6.0, 7.5), "preferred_soils": ["loam", "clay"]},
    "broccoli": {"family": "brassica", "nitrogen_demand": "high", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "clay"]},
    "carrot": {"family": "umbellifer", "nitrogen_demand": "low", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (6.0, 6.8), "preferred_soils": ["sandy", "loam"]},
    "onion": {"family": "allium", "nitrogen_demand": "medium", "phosphorus_demand": "medium", "potassium_demand": "medium", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "sandy"]},
    "lettuce": {"family": "aster", "nitrogen_demand": "medium", "phosphorus_demand": "low", "potassium_demand": "low", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "silt"]},
    "clover": {"family": "legume", "nitrogen_demand": "low", "phosphorus_demand": "low", "potassium_demand": "low", "ideal_ph": (6.0, 7.0), "preferred_soils": ["loam", "clay", "silt"]},
}

SOIL_TYPES = ["clay", "loam", "sandy", "silt"]

# Families whose members fix atmospheric nitrogen (good for restoring
# nitrogen-depleted soil after a heavy feeder).
NITROGEN_FIXING_FAMILIES = {"legume"}

DEMAND_SCORE = {"low": 1, "medium": 2, "high": 3}


def get_crop_info(crop_name: str):
    return CROP_REFERENCE.get(crop_name.strip().lower())
