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
    datePlanted: Optional[str] = None
    harvestDate: Optional[str] = None
    yieldAmount: Optional[str] = None
    fertilizerUsed: Optional[str] = None
    pesticidesApplied: Optional[str] = None


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
    recommendations: Optional["SubplotRecommendations"] = None


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
    history: Optional[list[PlantingRecord]] = None


class ReferenceOut(BaseModel):
    soilTypes: list[str]
    crops: list[str]


class IdentifyRequest(BaseModel):
    imageBase64: Optional[str] = None
    description: Optional[str] = None


ActionTier = Literal["monitor", "spot_treat", "broader_concern"]


class IdentifyResult(BaseModel):
    isPlant: bool
    species: Optional[str] = None
    isWeed: Optional[bool] = None
    actionTier: Optional[ActionTier] = None
    reason: str


class FieldRecommendationOut(BaseModel):
    fieldId: str
    fieldName: str
    recommendedCrop: str
    rotationDate: str
    reason: str
    confidence: str


class FieldRecommendationResult(BaseModel):
    fieldId: str
    recommendedCrop: str
    rotationDate: str
    reason: str
    confidence: str


class RecommendationsResult(BaseModel):
    recommendations: list[FieldRecommendationResult]


class SignupRequest(BaseModel):
    username: str = Field(min_length=1, max_length=40)
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    token: str


class UpdateAccountRequest(BaseModel):
    username: Optional[str] = Field(default=None, min_length=1, max_length=40)
    password: Optional[str] = None


class PredictRequest(BaseModel):
    """Inputs for subplot rotation + soil exhaustion models."""

    soil_type: Optional[str] = None
    crop_history: list[str] = []
    next_crop: Optional[str] = None
    planned_crop: Optional[str] = None
    current_crop: Optional[str] = None
    previous_crops: Optional[list[str]] = None
    plot_size_hectares: Optional[float] = Field(default=None, ge=0)
    acres: Optional[float] = Field(default=None, ge=0)
    soil_ph: Optional[float] = Field(default=None, ge=3.5, le=9)
    other_features: Optional[dict] = None
    subplot_id: Optional[str] = None


class SubplotRecommendations(BaseModel):
    """Model output, or literal \"Unknown\" when required features are missing."""

    rotation_recommendation: Union[int, Literal["Unknown"]]
    soil_exhaustion_score: Union[float, Literal["Unknown"]]
    rotation_probability: Optional[float] = None
    rotation_label: Optional[str] = None


UNKNOWN_RECOMMENDATIONS = SubplotRecommendations(
    rotation_recommendation="Unknown",
    soil_exhaustion_score="Unknown",
    rotation_probability=None,
    rotation_label="Unknown",
)


class PredictResponse(BaseModel):
    subplot_id: Optional[str] = None
    ready: bool = True
    missing_fields: list[str] = []
    rotation_recommendation: Optional[Union[int, Literal["Unknown"]]] = None
    soil_exhaustion_score: Optional[Union[float, Literal["Unknown"]]] = None
    rotation_probability: Optional[float] = None
    rotation_label: Optional[str] = None
    recommendations: Optional[SubplotRecommendations] = None


class PredictBatchRequest(BaseModel):
    items: list[PredictRequest]


class PredictBatchItemResult(BaseModel):
    subplot_id: Optional[str] = None
    ready: bool
    missing_fields: list[str] = []
    recommendations: Optional[SubplotRecommendations] = None


class PredictBatchResponse(BaseModel):
    predictions: list[PredictBatchItemResult]
