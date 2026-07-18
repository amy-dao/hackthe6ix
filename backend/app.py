import re

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import fields_collection
from .logic import empty_field_set, new_planted_field_doc, planted_field_set
from .models import AddCropRequest, AddFieldRequest, FieldOut, SetCropRequest, UpdateFieldRequest

app = FastAPI(title="Field Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMPTY_FIELD_DEFAULTS = {
    "crop": "",
    "status": "empty",
    "risk": 0,
    "reason": "",
    "confidence": "",
    "lastScan": "",
    "suggestedCrops": [],
    "durationLabel": "",
    "durationRange": "",
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


@app.get("/fields", response_model=list[FieldOut])
def list_fields():
    return [serialize_field(doc) for doc in fields_collection.find()]


@app.get("/fields/{field_id}", response_model=FieldOut)
def get_field(field_id: str):
    return serialize_field(get_field_or_404(field_id))


@app.post("/fields", response_model=FieldOut, status_code=201)
def add_field(payload: AddFieldRequest):
    doc = {"name": payload.name, "acres": payload.acres, **EMPTY_FIELD_DEFAULTS}
    result = fields_collection.insert_one(doc)
    return serialize_field(fields_collection.find_one({"_id": result.inserted_id}))


@app.post("/fields/crop", response_model=FieldOut)
def add_crop(payload: AddCropRequest):
    """Log a planting against an existing plot (matched by name) or create a new one."""
    crop_name = payload.cropName.strip()
    plot_name = payload.plotName.strip()
    date_label = payload.date or None

    existing = fields_collection.find_one({"name": {"$regex": f"^{re.escape(plot_name)}$", "$options": "i"}})

    if existing:
        updates = planted_field_set(existing, crop_name, date_label)
        fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
        return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))

    doc = new_planted_field_doc(plot_name, crop_name, date_label)
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
    """Directly set/change what's planted (field-detail 'Edit crop'), no date involved."""
    existing = get_field_or_404(field_id)
    updates = planted_field_set(existing, payload.cropName.strip())
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))


@app.delete("/fields/{field_id}/crop", response_model=FieldOut)
def clear_crop(field_id: str):
    """Clear the crop, leaving the field empty (logs the outgoing crop into history)."""
    existing = get_field_or_404(field_id)
    updates = empty_field_set(existing)
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))
