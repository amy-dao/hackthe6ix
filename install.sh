#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Installing frontend dependencies (npm)"
npm install

echo "==> Setting up Python virtual environment (.venv) for the backend"
if [ -n "${VIRTUAL_ENV:-}" ]; then
  echo "==> ERROR: a virtual environment is currently active ($VIRTUAL_ENV)."
  echo "    Run 'deactivate' (or open a fresh terminal) and re-run this script —"
  echo "    recreating .venv while it's active fails because its own"
  echo "    interpreter is locked."
  exit 1
fi

PY_VERSION="$(cat .python-version)"
if command -v "python${PY_VERSION}" >/dev/null 2>&1; then
  PYTHON_BIN="python${PY_VERSION}"
else
  echo "==> WARNING: python${PY_VERSION} not found on PATH; falling back to python3 ($(python3 --version 2>&1))."
  echo "    Install Python ${PY_VERSION} for a known-good environment, e.g.: brew install python@${PY_VERSION}"
  PYTHON_BIN="python3"
fi
"$PYTHON_BIN" -m venv .venv

# Windows (Git Bash/MSYS) venvs use Scripts/, not bin/.
if [ -f .venv/Scripts/pip.exe ]; then
  VENV_PIP=.venv/Scripts/pip.exe
  VENV_ACTIVATE=.venv/Scripts/activate
else
  VENV_PIP=.venv/bin/pip
  VENV_ACTIVATE=.venv/bin/activate
fi
"$VENV_PIP" install --upgrade pip
"$VENV_PIP" install -r backend/requirements.txt

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "==> Created backend/.env from template — edit it with your MongoDB connection string before running the backend."
fi

echo ""
echo "==> Install complete. To run:"
echo "  Backend:  source $VENV_ACTIVATE && uvicorn backend.app:app --reload --port 8000"
echo "  Frontend: npm run dev"
