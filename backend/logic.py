"""Crop-planting/clearing state transitions, ported from src/lib/fieldHelpers.ts
so the backend and frontend agree on what a "planted" or "empty" field looks like.
"""

from datetime import date as date_cls
from typing import Optional


def format_today() -> str:
    return date_cls.today().strftime("%b %-d, %Y")


def with_outgoing_crop_logged(existing: dict, end_label: str) -> list[dict]:
    if existing["status"] == "empty":
        return existing["history"]
    entry = {"crop": existing["crop"], "period": f"Through {end_label}", "note": None}
    return [entry, *existing["history"]]


def planted_field_set(existing: dict, crop_name: str, date_label: Optional[str] = None) -> dict:
    """Fields to $set on an existing document when a crop is planted/changed."""
    changed_crop = existing["status"] == "empty" or existing["crop"] != crop_name
    reason = (
        f"{crop_name} was planted on {date_label}. Rotation history will build as data accumulates."
        if date_label
        else f"{crop_name} was just planted here — rotation history will build as data accumulates over the season."
    )
    updates = {
        "crop": crop_name,
        "status": "safe",
        "risk": 8,
        "confidence": "High",
        "reason": reason,
        "suggestedCrops": [],
        "durationLabel": "Next rotation decision",
        "durationRange": "Reassess in ~90 days",
    }
    if date_label:
        updates["lastScan"] = "Just added"
    if changed_crop:
        updates["history"] = with_outgoing_crop_logged(existing, date_label or format_today())
    return updates


def new_planted_field_doc(name: str, crop_name: str, date_label: Optional[str] = None) -> dict:
    """A brand-new field document created directly from a planting (no existing doc to diff against)."""
    reason = (
        f"{crop_name} was planted on {date_label}. Rotation history will build as data accumulates."
        if date_label
        else f"{crop_name} was just planted here — rotation history will build as data accumulates over the season."
    )
    return {
        "name": name,
        "acres": "—",
        "crop": crop_name,
        "status": "safe",
        "risk": 8,
        "reason": reason,
        "confidence": "High",
        "lastScan": "Just added" if date_label else "",
        "suggestedCrops": [],
        "durationLabel": "Next rotation decision",
        "durationRange": "Reassess in ~90 days",
        "history": [],
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
        "history": with_outgoing_crop_logged(existing, today),
    }
