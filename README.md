# hackthe6ix — Field Intelligence

A mobile-first web app that helps row-crop farmers make field-level
decisions: whether to rotate a crop, what's actually growing in a
field right now (via camera + Gemini), how long a planted crop should
remain before rotation, and where weed pressure is concentrated.

Two pieces run at the same time: a **React frontend** and a **Python
backend** (talking to MongoDB + Gemini).

## Quick start

### 0. Get the secrets from a teammate

- `MONGODB_URI`
- `GEMINI_API_KEY`

(If you're setting up the MongoDB Atlas cluster for the first time,
add `0.0.0.0/0` under **Network Access** so every teammate's backend
can reach it, not just yours.)

### 1. Install everything

Requires: Node.js `20.19+` or `22.12+`, npm, and Python `3.12` (the
project is pinned to `3.12` via `.python-version` — newer versions like
3.14 can hit missing/broken native wheels for packages such as
`pydantic-core`). On macOS: `brew install python@3.12`.

```bash
./install.sh
```

(Windows without WSL/Git Bash: `npm install`, `py -3.12 -m venv .venv`,
`.venv\Scripts\activate`, `pip install -r backend/requirements.txt`,
`copy backend\.env.example backend\.env`.)

Already set this up before? Re-run `./install.sh` (or at least
`pip install -r backend/requirements.txt`) after every `git pull` —
new backend dependencies get added from time to time, and a missing
one makes the backend crash on startup, which shows up as "Failed to
fetch" on every screen, starting with sign-in.

### 2. Add the secrets

Open `backend/.env` and paste in the two values from step 0.

### 3. Run it — two terminals, both stay open

**Terminal 1 — backend:**

```bash
source .venv/bin/activate
uvicorn backend.app:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
npm run dev
```

Open the URL it prints — **http://localhost:3000**.

### 4. Let teammates view it from your machine (optional)

If a teammate wants to open the app from *their* browser without
running their own install, they can load it from your machine over the
same Wi-Fi/LAN (or Tailscale):

1. Start the backend with `--host 0.0.0.0` so it accepts outside
   connections:
   ```bash
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```
2. `npm run dev` already listens on all interfaces — it prints a
   `Network:` URL (e.g. `http://192.168.1.23:3000`) alongside
   `Local:`. Share that `Network` URL — the app auto-points its API
   calls at whatever host loaded the page, so no config needed on
   their end.
3. Find your machine's IP directly if you need it:
   `ipconfig getifaddr en0` (macOS Wi-Fi).

## Features / screens

- **Sign in / create account** — real accounts (bcrypt-hashed
  passwords, stored in MongoDB); each account only sees its own fields
- **Fields dashboard** — card grid and birdseye map view of all fields,
  with search, status filters, and bulk-edit mode
- **Field detail** — Field (name/acreage), Crop (rotation
  recommendation, risk score, confidence, suggested next crops, and
  accept / override / dismiss actions), History (past plantings)
- **Identify** — camera or text description of a plant, sent to Gemini
  for weed/crop identification with a confidence score
- **Add crop** — log a new planting against an existing or new plot
- **Profile** — farmer/farm info, plus username/password changes

All of the above persists to MongoDB through the backend.

## Stack

- **Frontend**: React 19 + TypeScript + Vite, plain inline styles
- **Backend**: FastAPI + PyMongo (`backend/`), MongoDB Atlas, plus
  Gemini (`google-genai`) for plant/weed identification

## Other scripts

```bash
npm run build    # type-check (tsc -b) + production build to dist/
npm run preview  # serve the production build locally
npm run lint     # eslint
```

## Project structure

```
src/
  App.tsx              top-level state + screen routing
  types.ts              shared TypeScript types
  palette.ts             color palettes + status labels
  lib/
    api.ts                 calls to the backend
    fieldHelpers.ts        status/date/icon display helpers
    formStyles.ts          shared input/label style helpers
  components/
    Header.tsx, BottomNav.tsx, MapPopup.tsx, FieldThumb.tsx
  screens/
    LoginScreen.tsx, DashboardScreen.tsx, FieldDetailScreen.tsx,
    IdentifyScreen.tsx, AddCropScreen.tsx, ProfileScreen.tsx

backend/
  app.py                 FastAPI app + all routes
  db.py                   MongoDB connection (reads backend/.env)
  gemini.py               Gemini client + plant/weed identification
  logic.py                 crop-planting/clearing business logic
  models.py               Pydantic request/response schemas
  requirements.txt
  .env.example            MONGODB_URI / GEMINI_API_KEY template
```

## Other scaffolding in this repo

`main.py`, `requirements*.txt`, and `tests/test_main.py` are an
early Python scaffold (unrelated to the app above — pending sync with
its author).
