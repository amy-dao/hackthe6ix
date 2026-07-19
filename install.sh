#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Installing frontend dependencies (npm)"
npm install

echo "==> Setting up Python virtual environment (.venv) for the backend"
PY_VERSION="$(cat .python-version)"
if command -v "python${PY_VERSION}" >/dev/null 2>&1; then
  PYTHON_BIN="python${PY_VERSION}"
else
  echo "==> WARNING: python${PY_VERSION} not found on PATH; falling back to python3 ($(python3 --version 2>&1))."
  echo "    Install Python ${PY_VERSION} for a known-good environment, e.g.: brew install python@${PY_VERSION}"
  PYTHON_BIN="python3"
fi
"$PYTHON_BIN" -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "==> Created backend/.env from template — edit it with your MongoDB connection string before running the backend."
fi

echo ""
echo "==> Install complete. To run:"
echo "  Backend:  source .venv/bin/activate && uvicorn backend.app:app --reload --port 8000"
echo "  Frontend: npm run dev"
