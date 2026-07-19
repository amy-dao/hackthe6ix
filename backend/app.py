import re
import secrets
from contextlib import asynccontextmanager
from typing import Optional

import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from .crop_reference import CROP_REFERENCE, SOIL_TYPES
from .db import farm_state_collection, fields_collection, users_collection
from .gemini import identify_plant, recommend_rotations
from .logic import derive_planting_status, empty_field_set, format_month_label, planted_field_set
from .model_service import (
    has_required_features,
    missing_required_features,
    try_get_model_service,
    unknown_recommendations,
)
from .models import (
    AddFieldRequest,
    FarmStatePayload,
    FieldOut,
    IdentifyRequest,
    IdentifyResult,
    LoginRequest,
    PredictBatchItemResult,
    PredictBatchRequest,
    PredictBatchResponse,
    PredictRequest,
    PredictResponse,
    ReferenceOut,
    SetCropRequest,
    SignupRequest,
    SubplotRecommendations,
    SyncFieldRequest,
    UpdateAccountRequest,
    UpdateFieldRequest,
    UserOut,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load XGBoost models once into memory — never per request.
    from .model_service import init_model_service

    service = init_model_service()
    if service is not None:
        print("Recommendation models loaded at startup.")
    else:
        print("Recommendation models unavailable — /predict will report not ready until trained.")
    yield


app = FastAPI(title="Field Intelligence API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Vite falls back to 3001/3002/... when 3000 is already taken.
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
    ],
    # Also allow the dev servers when reached over LAN/Tailscale (teammates
    # hitting your machine's IP instead of localhost) on common Vite ports.
    allow_origin_regex=r"http://(\d{1,3}\.){3}\d{1,3}:(3000|3001|3002|5173)",
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


def _field_to_subplot_features(doc: dict) -> dict:
    """Map a Mongo field document into the inference input shape."""
    history_crops = []
    for h in doc.get("history") or []:
        crop = h.get("crop") if isinstance(h, dict) else None
        if crop:
            history_crops.append(str(crop).strip().lower())
    # history in FieldOut is newest-first; models expect oldest → newest
    history_crops = list(reversed(history_crops))
    next_crop = doc.get("crop")
    if next_crop in (None, "", "No crop planted"):
        next_crop = None
    return {
        "soil_type": doc.get("soilType"),
        "crop_history": history_crops,
        "next_crop": next_crop,
        "soil_ph": doc.get("soilPh"),
        "acres": doc.get("acres") if isinstance(doc.get("acres"), (int, float)) else None,
        "subplot_id": str(doc.get("_id") or doc.get("id") or ""),
    }


def attach_recommendations_if_ready(doc: dict) -> dict:
    """
    When a field/subplot has all required features, run XGBoost inference
    and store results on ``doc['recommendations']``. Otherwise store Unknown.
    """
    service = try_get_model_service()
    features = _field_to_subplot_features(doc)
    if not has_required_features(features):
        doc["recommendations"] = unknown_recommendations()
        return doc
    if service is None:
        doc["recommendations"] = unknown_recommendations()
        return doc
    try:
        result = service.run_model_inference(features)
        doc["recommendations"] = result
    except Exception as exc:  # noqa: BLE001
        print(f"Inference skipped for field {features.get('subplot_id')}: {exc}")
        doc["recommendations"] = unknown_recommendations()
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


@app.get("/farm", response_model=Optional[FarmStatePayload])
def get_farm_state(current_user: dict = Depends(get_current_user)):
    """The saved farm-map drawing for this account, or None if nothing has
    been synced yet (brand-new account / first draw not saved)."""
    doc = farm_state_collection.find_one({"ownerId": str(current_user["_id"])})
    if not doc:
        return None
    return FarmStatePayload(**{k: doc.get(k) for k in ("farmPolygon", "farmAreaAcres", "subplots")})


@app.put("/farm", response_model=FarmStatePayload)
def set_farm_state(payload: FarmStatePayload, current_user: dict = Depends(get_current_user)):
    """Autosave endpoint — the frontend debounces calls here on every change
    to the farm boundary or subplot outlines, so a redraw is never needed
    after switching devices/browsers."""
    owner_id = str(current_user["_id"])
    farm_state_collection.find_one_and_update(
        {"ownerId": owner_id},
        {"$set": {**payload.model_dump(), "ownerId": owner_id}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return payload


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


@app.post("/fields", response_model=FieldOut, status_code=201)
def add_field(payload: AddFieldRequest, current_user: dict = Depends(get_current_user)):
    """Create a new field: its info (size/soil), plus an optional crop-history
    seed — at most one entry may be marked as currently planted; the rest are
    logged as history. Whether a rotation recommendation is possible depends
    on whether any history was provided alongside the current crop.
    """
    doc = field_fields_from_entries(payload.name, payload.acres, payload.soilPh, payload.soilType, payload.cropEntries)
    doc["ownerId"] = str(current_user["_id"])
    attach_recommendations_if_ready(doc)
    result = fields_collection.insert_one(doc)
    return serialize_field({**doc, "_id": result.inserted_id})


@app.post("/fields/sync", response_model=FieldOut)
def sync_field(payload: SyncFieldRequest, current_user: dict = Depends(get_current_user)):
    """Find-or-create by plot name — used when a farm-map subplot's info is
    saved. A subplot with the same name as an existing field (owned by this
    account) updates that field in place; otherwise a new field is created.
    One atomic find-and-modify round trip instead of a separate find + write
    + refetch — those were adding up to a noticeably slow save on the map."""
    owner_id = str(current_user["_id"])
    fields = field_fields_from_entries(payload.name, payload.acres, payload.soilPh, payload.soilType, payload.cropEntries)
    fields["ownerId"] = owner_id
    attach_recommendations_if_ready(fields)
    doc = fields_collection.find_one_and_update(
        {"name": {"$regex": f"^{re.escape(payload.name.strip())}$", "$options": "i"}, "ownerId": owner_id},
        {"$set": fields},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return serialize_field(doc)


@app.patch("/fields/{field_id}", response_model=FieldOut)
def update_field(field_id: str, payload: UpdateFieldRequest, current_user: dict = Depends(get_current_user)):
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "history" in updates and existing.get("status") != "empty":
        updates.update(derive_planting_status(existing["crop"], updates["history"]))
    if updates:
        merged = {**existing, **updates}
        attach_recommendations_if_ready(merged)
        if "recommendations" in merged:
            updates["recommendations"] = merged["recommendations"]
        fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
        existing = {**existing, **updates}
    return serialize_field(existing)


@app.patch("/fields/{field_id}/crop", response_model=FieldOut)
def set_crop(field_id: str, payload: SetCropRequest, current_user: dict = Depends(get_current_user)):
    """Change what's planted on an existing field — just the crop name. The
    outgoing crop gets logged to history and the rotation status is
    recomputed from there."""
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    updates = planted_field_set(existing, require_known_crop(payload.cropName.strip()))
    merged = {**existing, **updates}
    attach_recommendations_if_ready(merged)
    if "recommendations" in merged:
        updates["recommendations"] = merged["recommendations"]
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field({**existing, **updates})


@app.delete("/fields/{field_id}/crop", response_model=FieldOut)
def clear_crop(field_id: str, current_user: dict = Depends(get_current_user)):
    """Clear the crop, leaving the field empty (logs the outgoing crop into history)."""
    existing = get_field_or_404(field_id, str(current_user["_id"]))
    updates = empty_field_set(existing)
    fields_collection.update_one({"_id": existing["_id"]}, {"$set": updates})
    return serialize_field({**existing, **updates})


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
    return {
        "id": str(doc["_id"]),
        "username": doc["username"],
        "token": doc["sessionToken"],
        "farmerName": doc.get("farmerName"),
        "farmName": doc.get("farmName"),
        "location": doc.get("location"),
    }


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
    if payload.farmerName is not None:
        updates["farmerName"] = payload.farmerName.strip()
    if payload.farmName is not None:
        updates["farmName"] = payload.farmName.strip()
    if payload.location is not None:
        updates["location"] = payload.location.strip()
    if not updates:
        return serialize_user(current_user)
    try:
        users_collection.update_one({"_id": current_user["_id"]}, {"$set": updates})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="That username is already taken.")
    return serialize_user(users_collection.find_one({"_id": current_user["_id"]}))


def _predict_payload_dict(payload: PredictRequest) -> dict:
    history = list(payload.crop_history or [])
    if not history and payload.previous_crops:
        history = list(payload.previous_crops)
    return {
        "soil_type": payload.soil_type,
        "crop_history": history,
        "next_crop": payload.next_crop or payload.planned_crop or payload.current_crop,
        "plot_size_hectares": payload.plot_size_hectares,
        "acres": payload.acres,
        "soil_ph": payload.soil_ph,
        "other_features": payload.other_features or {},
        "subplot_id": payload.subplot_id,
    }


@app.post("/predict", response_model=PredictResponse)
def predict_recommendation(payload: PredictRequest):
    """
    Auto-inference for one subplot.

    If required features are complete → run models and return recommendations.
    If not → return Unknown for rotation + exhaustion (models are not run).
    """
    raw = _predict_payload_dict(payload)
    missing = missing_required_features(raw)
    if missing:
        unknown = unknown_recommendations()
        return PredictResponse(
            subplot_id=payload.subplot_id,
            ready=False,
            missing_fields=missing,
            rotation_recommendation="Unknown",
            soil_exhaustion_score="Unknown",
            rotation_label="Unknown",
            recommendations=SubplotRecommendations(**unknown),
        )

    service = try_get_model_service()
    if service is None:
        unknown = unknown_recommendations()
        return PredictResponse(
            subplot_id=payload.subplot_id,
            ready=False,
            missing_fields=["models_not_loaded"],
            rotation_recommendation="Unknown",
            soil_exhaustion_score="Unknown",
            rotation_label="Unknown",
            recommendations=SubplotRecommendations(**unknown),
        )

    result = service.run_model_inference(raw)
    rec = SubplotRecommendations(**result)
    return PredictResponse(
        subplot_id=payload.subplot_id,
        ready=True,
        missing_fields=[],
        rotation_recommendation=rec.rotation_recommendation,
        soil_exhaustion_score=rec.soil_exhaustion_score,
        rotation_probability=rec.rotation_probability,
        rotation_label=rec.rotation_label,
        recommendations=rec,
    )


@app.post("/predict/batch", response_model=PredictBatchResponse)
def predict_recommendations_batch(payload: PredictBatchRequest):
    """Score many subplots; incomplete ones get Unknown without running models."""
    service = try_get_model_service()
    items = [_predict_payload_dict(item) for item in payload.items]
    predictions: list[PredictBatchItemResult] = []
    unknown = SubplotRecommendations(**unknown_recommendations())

    if service is None:
        for item, raw in zip(payload.items, items):
            missing = missing_required_features(raw) or ["models_not_loaded"]
            predictions.append(
                PredictBatchItemResult(
                    subplot_id=item.subplot_id,
                    ready=False,
                    missing_fields=missing,
                    recommendations=unknown,
                )
            )
        return PredictBatchResponse(predictions=predictions)

    scored = service.predict_many(items)
    for item, raw, result in zip(payload.items, items, scored):
        if result is None:
            predictions.append(
                PredictBatchItemResult(
                    subplot_id=item.subplot_id,
                    ready=False,
                    missing_fields=missing_required_features(raw),
                    recommendations=unknown,
                )
            )
        else:
            predictions.append(
                PredictBatchItemResult(
                    subplot_id=item.subplot_id,
                    ready=True,
                    missing_fields=[],
                    recommendations=SubplotRecommendations(**result),
                )
            )
    return PredictBatchResponse(predictions=predictions)
