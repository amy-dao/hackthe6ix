import base64
import json
import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

from .models import FieldRecommendationResult, IdentifyResult, RecommendationsResult

load_dotenv(Path(__file__).resolve().parent / ".env")

_client: Optional[genai.Client] = None

MODEL = "gemini-flash-latest"

PROMPT = (
    "You are an expert agronomist helping a row-crop farmer identify a plant found in "
    "their field. Identify the plant species. Decide whether it is a weed (an undesirable "
    "plant competing with the crop) as opposed to the crop itself or another desirable "
    "plant. Give a short, plain-language reason (1-2 sentences) a farmer would understand, "
    "and a confidence percentage formatted like '87%'."
)

RECOMMENDATION_PROMPT = (
    "You are an expert agronomist helping a row-crop farmer plan crop rotations. "
    "You will receive a JSON array of fields with their current crop, planting history, "
    "soil type, soil pH, and acreage. For EACH field, recommend: "
    "(1) the best next crop to plant, "
    "(2) a target rotation date as a human-readable date like 'October 15, 2026', "
    "(3) a short plain-language reason (1-2 sentences), and "
    "(4) a confidence percentage formatted like '82%'. "
    "Use sound rotation principles: alternate crop families, follow heavy feeders with "
    "nitrogen-fixing legumes, and match crops to soil type and pH. "
    "For empty fields, recommend what to plant next. "
    "For fields with limited history, still give your best recommendation. "
    "Return exactly one recommendation per field, matching each fieldId exactly."
)


def _client_instance() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to backend/.env.")
        _client = genai.Client(api_key=api_key)
    return _client


def _decode_image(image_base64: str) -> tuple[bytes, str]:
    match = re.match(r"^data:(image/\w+);base64,(.*)$", image_base64, re.DOTALL)
    if match:
        return base64.b64decode(match.group(2)), match.group(1)
    return base64.b64decode(image_base64), "image/jpeg"


def identify_plant(*, image_base64: Optional[str] = None, description: Optional[str] = None) -> IdentifyResult:
    if not image_base64 and not description:
        raise ValueError("Provide an image or a description.")

    contents: list = [PROMPT]
    if image_base64:
        data, mime_type = _decode_image(image_base64)
        contents.append(types.Part.from_bytes(data=data, mime_type=mime_type))
    if description:
        contents.append(f"Farmer's description: {description}")

    response = _client_instance().models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=IdentifyResult,
        ),
    )
    return IdentifyResult.model_validate_json(response.text)


def recommend_rotations(fields: list[dict]) -> list[FieldRecommendationResult]:
    if not fields:
        return []

    field_payload = [
        {
            "fieldId": field["id"],
            "name": field["name"],
            "currentCrop": field["crop"],
            "acres": field["acres"],
            "soilPh": field.get("soilPh"),
            "soilType": field.get("soilType"),
            "history": [{"crop": entry["crop"], "period": entry["period"]} for entry in field.get("history", [])],
            "status": field["status"],
        }
        for field in fields
    ]

    response = _client_instance().models.generate_content(
        model=MODEL,
        contents=[RECOMMENDATION_PROMPT, f"Fields:\n{json.dumps(field_payload, indent=2)}"],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RecommendationsResult,
        ),
    )
    return RecommendationsResult.model_validate_json(response.text).recommendations
