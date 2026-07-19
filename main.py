import argparse
import json
import os
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, request
 
 #
 
DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_HISTORY_FILE = "history_tracking.json"
DEFAULT_PORT = 8000
 
 
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
 
 
# ---------------------------------------------------------------------------
# History Tracking page persistence
#
# The farmer fills out the History Tracking form in the app by hand
# (crop, date planted, harvest date, yield, fertilizer used, pesticides
# applied) and hits Save. The frontend POSTs that data here, and it gets
# appended to a JSON file on disk.
# ---------------------------------------------------------------------------
 
REQUIRED_HISTORY_FIELDS = ["cropName", "datePlanted"]
ALL_HISTORY_FIELDS = [
    "cropName",
    "datePlanted",
    "harvestDate",
    "yieldAmount",
    "fertilizerUsed",
    "pesticidesApplied",
]
 
 
def load_history(history_file: str) -> list:
    if not os.path.exists(history_file):
        return []
    try:
        with open(history_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        # Corrupt or unreadable history file — start fresh rather than crash.
        return []
 
 
def save_history_entry(history_file: str, entry: dict) -> dict:
    """Append one History Tracking form submission to the history file."""
    record = {"timestamp": datetime.now(timezone.utc).isoformat()}
    for field in ALL_HISTORY_FIELDS:
        record[field] = entry.get(field, "") or ""
 
    history = load_history(history_file)
    history.append(record)
 
    with open(history_file, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
        f.write("\n")
 
    return record
 
 
# ---------------------------------------------------------------------------
# HTTP server
#
# POST /api/history  — save a new entry submitted from the form
# GET  /api/history   — list everything saved so far
# ---------------------------------------------------------------------------
 
 
def make_handler(history_file: str):
    class HistoryRequestHandler(BaseHTTPRequestHandler):
        def _send_json(self, status: int, payload: dict) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            # Allow the frontend dev server (different origin/port) to call this API.
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
 
        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
 
        def do_GET(self) -> None:
            if self.path != "/api/history":
                self._send_json(404, {"error": "Not found"})
                return
            self._send_json(200, {"entries": load_history(history_file)})
 
        def do_POST(self) -> None:
            if self.path != "/api/history":
                self._send_json(404, {"error": "Not found"})
                return
 
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length) if length else b""
 
            try:
                entry = json.loads(raw_body.decode("utf-8")) if raw_body else {}
            except json.JSONDecodeError:
                self._send_json(400, {"error": "Request body must be valid JSON."})
                return
 
            missing = [f for f in REQUIRED_HISTORY_FIELDS if not str(entry.get(f, "")).strip()]
            if missing:
                self._send_json(400, {"error": f"Missing required field(s): {', '.join(missing)}"})
                return
 
            record = save_history_entry(history_file, entry)
            self._send_json(201, {"saved": record})
 
        def log_message(self, format: str, *args) -> None:  # noqa: A002 - matches base signature
            sys.stderr.write(f"[history-server] {self.address_string()} - {format % args}\n")
 
    return HistoryRequestHandler
 
 
def run_server(history_file: str, port: int) -> None:
    handler = make_handler(history_file)
    server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    print(f"History Tracking server listening on http://localhost:{port}")
    print(f"Saving entries to {os.path.abspath(history_file)}")
    print("  POST /api/history  - save a form submission")
    print("  GET  /api/history  - list saved entries")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()
 
 
# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
 
 
def handle_ask(args: argparse.Namespace) -> None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY is required", file=sys.stderr)
        sys.exit(1)
 
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
 
 
def handle_serve(args: argparse.Namespace) -> None:
    run_server(args.history_file, args.port)
 
 
def main() -> None:
    parser = argparse.ArgumentParser(description="Ask Gemini questions, or serve the History Tracking API")
    subparsers = parser.add_subparsers(dest="command")
 
    ask_parser = subparsers.add_parser("ask", help="Ask Gemini a question")
    ask_parser.add_argument("question", nargs="?", help="Question to send to Gemini")
    ask_parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL), help="Gemini model name")
    ask_parser.set_defaults(func=handle_ask)
 
    serve_parser = subparsers.add_parser(
        "serve", help="Run the local server the History Tracking form submits to"
    )
    serve_parser.add_argument(
        "--history-file",
        default=os.environ.get("HISTORY_TRACKING_FILE", DEFAULT_HISTORY_FILE),
        help="Path to the JSON file where History Tracking entries are saved",
    )
    serve_parser.add_argument(
        "--port", type=int, default=int(os.environ.get("HISTORY_TRACKING_PORT", DEFAULT_PORT)), help="Port to listen on"
    )
    serve_parser.set_defaults(func=handle_serve)
 
    args = parser.parse_args()
 
    if not args.command:
        # Preserve old default behavior: no subcommand means "ask".
        args.command = "ask"
        args.question = None
        args.model = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
        handle_ask(args)
        return
 
    args.func(args)
 
 
if __name__ == "__main__":
    main()
 