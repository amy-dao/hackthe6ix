import argparse
import json
import os
import sys
from urllib import error, request


DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def build_request(prompt: str, api_key: str, model: str) -> request.Request:
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }
    url = f"{DEFAULT_BASE_URL}/models/{model}:generateContent?key={api_key}"
    return request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )


def extract_response_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        error_message = payload.get("error", {}).get("message")
        raise RuntimeError(error_message or "Gemini API returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
    if not text.strip():
        raise RuntimeError("Gemini API returned an empty response.")
    return text.strip()


def ask_gemini(prompt: str, api_key: str, model: str = DEFAULT_MODEL) -> str:
    if not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    request_obj = build_request(prompt, api_key, model)

    try:
        with request.urlopen(request_obj, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API request failed with {exc.code}: {details or exc.reason}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Could not reach Gemini API: {exc.reason}") from exc

    return extract_response_text(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ask Gemini questions from the command line")
    parser.add_argument("question", nargs="?", help="Question to send to Gemini")
    parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL), help="Gemini model name")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        parser.error("GEMINI_API_KEY is required")

    if args.question:
        print(ask_gemini(args.question, api_key, args.model))
        return

    while True:
        try:
            prompt = input("Ask Gemini (blank to quit): ").strip()
        except EOFError:
            print()
            return

        if not prompt:
            return

        try:
            print(ask_gemini(prompt, api_key, args.model))
        except RuntimeError as exc:
            print(f"Error: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
