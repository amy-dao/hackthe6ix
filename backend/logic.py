"""Crop-planting/clearing state transitions, ported from src/lib/fieldHelpers.ts
so the backend and frontend agree on what a "planted" or "empty" field looks like.
"""

from datetime import date as date_cls
from datetime import datetime
from typing import Optional


def format_today() -> str:
    return date_cls.today().strftime("%b %-d, %Y")


def format_month_label(month: str) -> str:
    """'2025-01' -> 'Jan 2025'"""
    return datetime.strptime(month, "%Y-%m").strftime("%b %Y")


def with_outgoing_crop_logged(status: str, crop: str, history: list[dict], end_label: str) -> list[dict]:
    if status == "empty":
        return history
    entry = {"crop": crop, "period": f"Through {end_label}", "note": None}
    return [entry, *history]


def derive_planting_status(crop_name: str, history: list[dict]) -> dict:
    """Whether a rotation recommendation is possible depends entirely on
    whether there's any earlier planting on record — with none, there's
    nothing to compare the current crop against yet."""
    if history:
        return {
            "status": "safe",
            "risk": 8,
            "confidence": "High",
            "reason": f"{crop_name} is currently planted here. Rotation history will build as data accumulates.",
            "suggestedCrops": [],
            "durationLabel": "Next rotation decision",
            "durationRange": "Reassess in ~90 days",
        }
    return {
        "status": "unknown",
        "risk": 0,
        "confidence": "—",
        "reason": (
            f"{crop_name} is currently planted here, but there's no earlier planting on record yet. "
            "Add a previous crop to get a rotation recommendation."
        ),
        "suggestedCrops": [],
        "durationLabel": "Status",
        "durationRange": "Awaiting planting history",
    }


def planted_field_set(existing: dict, crop_name: str, date_label: Optional[str] = None) -> dict:
    """Fields to $set on an existing document when its crop is changed via
    the field-detail 'Change crop' action. The outgoing crop (if any) is
    logged into history, and the new status is derived from whatever
    history now exists."""
    today = date_label or format_today()
    history = with_outgoing_crop_logged(existing["status"], existing["crop"], existing["history"], today)
    return {
        "crop": crop_name,
        "history": history,
        "lastScan": today,
        **derive_planting_status(crop_name, history),
    }


def empty_field_set(existing: dict) -> dict:
    """Fields to $set on an existing document when its crop is cleared."""
    today = format_today()
    return {
        "crop": "No crop planted",
        "status": "empty",
        "risk": 0,
        "confidence": "—",
        "reason": "This field is currently empty. Rotation guidance resumes once a new crop is planted.",
        "suggestedCrops": [],
        "durationLabel": "Status",
        "durationRange": "Awaiting new planting",
        "history": with_outgoing_crop_logged(existing["status"], existing["crop"], existing["history"], today),
    }
