from typing import Literal, Optional, Union

from pydantic import BaseModel, Field

# "unknown" = a crop is currently planted but the field has no earlier
# planting on record, so there isn't enough history to base a rotation
# recommendation on yet.
FieldStatus = Literal["rotate", "marginal", "safe", "empty", "unknown"]

# Kept in sync with backend/crop_reference.py SOIL_TYPES by hand — small,
# stable list. Crop names aren't a Literal here because CROP_REFERENCE is a
# runtime dict; crop membership is validated against it in app.py instead.
SoilType = Literal["clay", "loam", "sandy", "silt"]


class PlantingRecord(BaseModel):
    crop: str
    period: str
    note: Optional[str] = None


class FieldOut(BaseModel):
    id: str
    name: str
    crop: str
    acres: Union[float, str]
    status: FieldStatus
    risk: int
    reason: str
    confidence: str
    lastScan: str
    suggestedCrops: list[str]
    durationLabel: str
    durationRange: str
    history: list[PlantingRecord]
    soilPh: Optional[float] = None
    soilType: Optional[SoilType] = None


class CropEntry(BaseModel):
    """One row from the Add Field crop-history builder."""

    crop: str
    month: str  # "YYYY-MM"
    isCurrent: bool = False


class AddFieldRequest(BaseModel):
    name: str
    acres: Union[float, str] = "—"
    soilPh: Optional[float] = Field(default=None, ge=3.5, le=9)
    soilType: Optional[SoilType] = None
    cropEntries: list[CropEntry] = []


class SyncFieldRequest(BaseModel):
    """Farm-map subplot data being saved as a field — same shape as
    AddFieldRequest, matched to an existing field by name or created if new."""

    name: str
    acres: float
    soilPh: Optional[float] = Field(default=None, ge=3.5, le=9)
    soilType: Optional[SoilType] = None
    cropEntries: list[CropEntry] = []


class SetCropRequest(BaseModel):
    """Change what's planted on an existing field — just the crop name,
    everything else (rotation status, history logging) is derived server-side."""

    cropName: str


class UpdateFieldRequest(BaseModel):
    name: Optional[str] = None
    acres: Optional[Union[float, str]] = None
    soilPh: Optional[float] = Field(default=None, ge=3.5, le=9)
    soilType: Optional[SoilType] = None


class ReferenceOut(BaseModel):
    soilTypes: list[str]
    crops: list[str]


class IdentifyRequest(BaseModel):
    imageBase64: Optional[str] = None
    description: Optional[str] = None


class IdentifyResult(BaseModel):
    species: str
    isWeed: bool
    reason: str
    confidence: str
