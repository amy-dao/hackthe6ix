from typing import Literal, Optional, Union

from pydantic import BaseModel

FieldStatus = Literal["rotate", "marginal", "safe", "empty"]


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


class AddFieldRequest(BaseModel):
    name: str
    acres: Union[float, str] = "—"


class AddCropRequest(BaseModel):
    cropName: str
    plotName: str
    date: Optional[str] = None
    photoAdded: bool = False


class SetCropRequest(BaseModel):
    cropName: str


class UpdateFieldRequest(BaseModel):
    name: Optional[str] = None
    acres: Optional[Union[float, str]] = None


class IdentifyRequest(BaseModel):
    imageBase64: Optional[str] = None
    description: Optional[str] = None


class IdentifyResult(BaseModel):
    species: str
    isWeed: bool
    reason: str
    confidence: str
