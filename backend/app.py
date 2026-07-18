from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .crop_reference import CROP_REFERENCE, SOIL_TYPES
from .db import fields_collection
from .gemini import identify_plant
from .logic import derive_planting_status, empty_field_set, format_month_label, planted_field_set
from .models import (
    AddFieldRequest,
    FieldOut,
    IdentifyRequest,
    IdentifyResult,
    ReferenceOut,
    SetCropRequest,
    UpdateFieldRequest,
)

app = FastAPI(title="Field Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMPTY_FIELD_DEFAULTS = {
    "crop": "No crop planted",
    "status": "empty",
    "risk": 0,
    "reason": "This field is currently empty. Rotation guidance resumes once a new crop is planted.",
    "confidence": "—",
    "lastScan": "",
    "suggestedCrops": [],
    "durationLabel": "Status",
    "durationRange": "Awaiting new planting",
    "history": [],
}


def serialize_field(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def get_field_or_404(oid_str: str) -> dict:
    try:
        oid = ObjectId(oid_str)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Field not found")
    doc = fields_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Field not found")
    return doc


def require_known_crop(crop_name: str) -> str:
    """Validate against CROP_REFERENCE (the single source of truth for crop names),
    but keep the farmer's original casing for storage/display."""
    if crop_name.strip().lower() not in CROP_REFERENCE:
        raise HTTPException(status_code=400, detail=f"Unknown crop: {crop_name!r}")
    return crop_name


@app.get("/reference", response_model=ReferenceOut)
def get_reference():
    """Single source of truth for the crop and soil-type dropdowns — keeps the
    frontend from hardcoding a list that can drift from CROP_REFERENCE/SOIL_TYPES."""
    return ReferenceOut(soilTypes=SOIL_TYPES, crops=sorted(CROP_REFERENCE.keys()))


@app.get("/fields", response_model=list[FieldOut])
def list_fields():
    return [serialize_field(doc) for doc in fields_collection.find()]


@app.get("/fields/{field_id}", response_model=FieldOut)
def get_field(field_id: str):
    return serialize_field(get_field_or_404(field_id))


@app.post("/fields", response_model=FieldOut, status_code=201)
def add_field(payload: AddFieldRequest):
    """Create a new field: its info (size/soil), plus an optional crop-history
    seed — at most one entry may be marked as currently planted; the rest are
    logged as history. Whether a rotation recommendation is possible depends
    on whether any history was provided alongside the current crop.
    """
    current_entries = [e for e in payload.cropEntries if e.isCurrent]
    if len(current_entries) > 1:
        raise HTTPException(status_code=400, detail="Only one crop can be marked as currently planted.")

    past_entries = sorted((e for e in payload.cropEntries if not e.isCurrent), key=lambda e: e.month)
    history = [
        {"crop": require_known_crop(e.crop), "period": f"Planted {format_month_label(e.month)}", "note": None}
        for e in reversed(past_entries)
    ]

    base = {
        "name": payload.name,
        "acres": payload.acres,
        "soilPh": payload.soilPh,
        "soilType": payload.soilType,
    }

    if current_entries:
        current = current_entries[0]
        crop_name = require_known_crop(current.crop)
        doc = {
            **base,
            "crop": crop_name,
            "lastScan": format_month_label(current.month),
            "history": history,
            **derive_planting_status(crop_name, history),
        }
    else:
        doc = {**base, **EMPTY_FIELD_DEFAULTS, "history": history}

    result = fields_collection.insert_one(doc)
    return serialize_field(fields_collection.find_one({"_id": result.inserted_id}))


@app.patch("/fields/{field_id}", response_model=FieldOut)
def update_field(field_id: str, payload: UpdateFieldRequest):
    existing = get_field_or_404(field_id)
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
        existing = fields_collection.find_one({"_id": existing["_id"]})
    return serialize_field(existing)


@app.patch("/fields/{field_id}/crop", response_model=FieldOut)
def set_crop(field_id: str, payload: SetCropRequest):
    """Change what's planted on an existing field — just the crop name. The
    outgoing crop gets logged to history and the rotation status is
    recomputed from there."""
    existing = get_field_or_404(field_id)
    updates = planted_field_set(existing, require_known_crop(payload.cropName.strip()))
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))


@app.delete("/fields/{field_id}/crop", response_model=FieldOut)
def clear_crop(field_id: str):
    """Clear the crop, leaving the field empty (logs the outgoing crop into history)."""
    existing = get_field_or_404(field_id)
    updates = empty_field_set(existing)
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))


@app.delete("/fields/{field_id}", status_code=204)
def delete_field(field_id: str):
    """Delete the plot itself (not just its crop)."""
    existing = get_field_or_404(field_id)
    fields_collection.delete_one({"_id": existing["_id"]})


@app.post("/identify", response_model=IdentifyResult)
def identify(payload: IdentifyRequest):
    if not payload.imageBase64 and not payload.description:
        raise HTTPException(status_code=400, detail="Provide an image or a description.")
    try:
        return identify_plant(image_base64=payload.imageBase64, description=payload.description)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Identification failed: {exc}") from exc
