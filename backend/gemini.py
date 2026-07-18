import base64
import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

from .models import IdentifyResult

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
