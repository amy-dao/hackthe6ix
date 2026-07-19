import re
import secrets

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import DuplicateKeyError

from .crop_reference import CROP_REFERENCE, SOIL_TYPES
from .db import fields_collection, users_collection
from .gemini import identify_plant
from .logic import derive_planting_status, empty_field_set, format_month_label, planted_field_set
from .models import (
    AddFieldRequest,
    FieldOut,
    IdentifyRequest,
    IdentifyResult,
    LoginRequest,
    ReferenceOut,
    SetCropRequest,
    SignupRequest,
    SyncFieldRequest,
    UpdateAccountRequest,
    UpdateFieldRequest,
    UserOut,
)

app = FastAPI(title="Field Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    # Also allow the dev servers when reached over LAN/Tailscale (teammates
    # hitting your machine's IP instead of localhost) on the same two ports.
    allow_origin_regex=r"http://(\d{1,3}\.){3}\d{1,3}:(3000|5173)",
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
    doc.pop("ownerId", None)
    return doc


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Every /fields route requires 'Authorization: Bearer <token>', where the
    token was issued by /signup or /login. Fields are scoped to whichever
    account this token belongs to."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = authorization.removeprefix("Bearer ").strip()
    user = users_collection.find_one({"sessionToken": token})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session — please sign in again.")
    return user


def get_field_or_404(oid_str: str, owner_id: str) -> dict:
    try:
        oid = ObjectId(oid_str)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Field not found")
    doc = fields_collection.find_one({"_id": oid, "ownerId": owner_id})
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
def list_fields(current_user: dict = Depends(get_current_user)):
    return [serialize_field(doc) for doc in fields_collection.find({"ownerId": str(current_user["_id"])})]


@app.get("/fields/{field_id}", response_model=FieldOut)
def get_field(field_id: str, current_user: dict = Depends(get_current_user)):
    return serialize_field(get_field_or_404(field_id, str(current_user["_id"])))


def field_fields_from_entries(name, acres, soil_ph, soil_type, crop_entries: list) -> dict:
    """Build the full set of field document fields (name/acres/soil + derived
    crop/status/history) from a plot-name plus a list of crop-history entries.
    Shared by field creation (Add Field) and subplot-sync (farm map), which
    both start from the same raw shape: at most one 'currently planted' crop
    entry, plus zero or more past-planting entries.
    """
    current_entries = [e for e in crop_entries if e.isCurrent]
    if len(current_entries) > 1:
        raise HTTPException(status_code=400, detail="Only one crop can be marked as currently planted.")

    past_entries = sorted((e for e in crop_entries if not e.isCurrent), key=lambda e: e.month)
    history = [
        {"crop": require_known_crop(e.crop), "period": f"Planted {format_month_label(e.month)}", "note": None}
        for e in reversed(past_entries)
    ]

    base = {"name": name, "acres": acres, "soilPh": soil_ph, "soilType": soil_type}

    if current_entries:
        current = current_entries[0]
        crop_name = require_known_crop(current.crop)
        return {
            **base,
            "crop": crop_name,
            "lastScan": format_month_label(current.month),
            "history": history,
            **derive_planting_status(crop_name, history),
        }
    return {**base, **EMPTY_FIELD_DEFAULTS, "history": history}


def find_field_by_name(name: str, owner_id: str):
    return fields_collection.find_one(
        {"name": {"$regex": f"^{re.escape(name.strip())}$", "$options": "i"}, "ownerId": owner_id}
    )


@app.post("/fields", response_model=FieldOut, status_code=201)
def add_field(payload: AddFieldRequest, current_user: dict = Depends(get_current_user)):
    """Create a new field: its info (size/soil), plus an optional crop-history
    seed — at most one entry may be marked as currently planted; the rest are
    logged as history. Whether a rotation recommendation is possible depends
    on whether any history was provided alongside the current crop.
    """
    doc = field_fields_from_entries(payload.name, payload.acres, payload.soilPh, payload.soilType, payload.cropEntries)
    doc["ownerId"] = str(current_user["_id"])
    result = fields_collection.insert_one(doc)
    return serialize_field(fields_collection.find_one({"_id": result.inserted_id}))


@app.post("/fields/sync", response_model=FieldOut)
def sync_field(payload: SyncFieldRequest, current_user: dict = Depends(get_current_user)):
    """Find-or-create by plot name — used when a farm-map subplot's info is
    saved. A subplot with the same name as an existing field (owned by this
    account) updates that field in place; otherwise a new field is created."""
    owner_id = str(current_user["_id"])
    fields = field_fields_from_entries(payload.name, payload.acres, payload.soilPh, payload.soilType, payload.cropEntries)
    existing = find_field_by_name(payload.name, owner_id)
    if existing:
        fields_collection.update_one({"_id": existing["_id"]}, {"$set": fields})
        return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))
    fields["ownerId"] = owner_id
    result = fields_collection.insert_one(fields)
    return serialize_field(fields_collection.find_one({"_id": result.inserted_id}))


@app.patch("/fields/{field_id}", response_model=FieldOut)
def update_field(field_id: str, payload: UpdateFieldRequest, current_user: dict = Depends(get_current_user)):
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
        existing = fields_collection.find_one({"_id": existing["_id"]})
    return serialize_field(existing)


@app.patch("/fields/{field_id}/crop", response_model=FieldOut)
def set_crop(field_id: str, payload: SetCropRequest, current_user: dict = Depends(get_current_user)):
    """Change what's planted on an existing field — just the crop name. The
    outgoing crop gets logged to history and the rotation status is
    recomputed from there."""
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    updates = planted_field_set(existing, require_known_crop(payload.cropName.strip()))
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))


@app.delete("/fields/{field_id}/crop", response_model=FieldOut)
def clear_crop(field_id: str, current_user: dict = Depends(get_current_user)):
    """Clear the crop, leaving the field empty (logs the outgoing crop into history)."""
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    updates = empty_field_set(existing)
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field(fields_collection.find_one({"_id": existing["_id"]}))


@app.delete("/fields/{field_id}", status_code=204)
def delete_field(field_id: str, current_user: dict = Depends(get_current_user)):
    """Delete the plot itself (not just its crop)."""
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    fields_collection.delete_one({"_id": existing["_id"]})


@app.post("/identify", response_model=IdentifyResult)
def identify(payload: IdentifyRequest):
    if not payload.imageBase64 and not payload.description:
        raise HTTPException(status_code=400, detail="Provide an image or a description.")
    try:
        return identify_plant(image_base64=payload.imageBase64, description=payload.description)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Identification failed: {exc}") from exc


def serialize_user(doc: dict) -> dict:
    return {"id": str(doc["_id"]), "username": doc["username"], "token": doc["sessionToken"]}


@app.post("/signup", response_model=UserOut, status_code=201)
def signup(payload: SignupRequest):
    username = payload.username.strip()
    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt())
    token = secrets.token_hex(32)
    try:
        result = users_collection.insert_one(
            {"username": username, "passwordHash": password_hash, "sessionToken": token}
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="That username is already taken.")
    return serialize_user(users_collection.find_one({"_id": result.inserted_id}))


@app.post("/login", response_model=UserOut)
def login(payload: LoginRequest):
    user = users_collection.find_one({"username": payload.username.strip()})
    if not user or not bcrypt.checkpw(payload.password.encode("utf-8"), user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    token = secrets.token_hex(32)
    users_collection.update_one({"_id": user["_id"]}, {"$set": {"sessionToken": token}})
    user["sessionToken"] = token
    return serialize_user(user)


@app.patch("/account", response_model=UserOut)
def update_account(payload: UpdateAccountRequest, current_user: dict = Depends(get_current_user)):
    updates: dict = {}
    if payload.username is not None:
        updates["username"] = payload.username.strip()
    if payload.password is not None:
        updates["passwordHash"] = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt())
    if not updates:
        return serialize_user(current_user)
    try:
        users_collection.update_one({"_id": current_user["_id"]}, {"$set": updates})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="That username is already taken.")
    return serialize_user(users_collection.find_one({"_id": current_user["_id"]}))
