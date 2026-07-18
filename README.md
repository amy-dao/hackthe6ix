# hackthe6ix — Field Intelligence

A mobile-first web app that helps row-crop farmers make field-level
decisions across the growing cycle: whether to rotate a crop, what's
actually growing or intruding in a field right now, how long a planted
crop should remain before rotation, and where weed pressure is
concentrated. Implemented from the "Field Intelligence App" design
(see `PRD.md`-style goals: a rotation-timing model + camera-based
identification, unified around a field/season data model).

This is primarily a frontend prototype: the UI seeds/mocks its own data
client-side (no real ML/CV model) so the full interaction flow can be
reviewed and demoed end-to-end. A FastAPI + MongoDB backend now exists
under `backend/` with a `fields` collection matching the app's data
model, but the React app does not call it yet — field/crop state still
lives in React and resets on reload.

## Features / screens

- **Sign in** — mock auth gate (any non-empty email/password)
- **Fields dashboard** — card grid and birdseye map view of all fields,
  with search, status filters (Rotate now / Marginal / Safe / Empty),
  and a bulk-edit mode to clear crops across multiple fields at once
- **Field detail** — three tabs: **Field** (edit the plot's name and
  acreage), **Crop** (rotation recommendation, risk score with
  plain-language reasoning, confidence + last-scan date, suggested next
  crops, and accept / override / dismiss actions), and **History**
  (past plantings for that plot — crop, season, and outcome notes;
  changing or clearing the current crop automatically logs it here)
- **Identify** — point a camera at a plant (live preview via
  `getUserMedia`, falls back to a placeholder if no camera permission)
  or describe it in text; returns a mocked weed/crop identification
  with a confidence score and a "flag as weed" action
- **Add crop** — log a new planting against an existing or new plot,
  with optional photo-based auto-identify
- **Profile** — farmer/farm info, scanning equipment, measurement
  units, and a status-color theme toggle (traffic-light / earth-tone)

## Stack

- **Frontend**: React 19 + TypeScript + Vite, styled with plain inline
  styles (no CSS framework). Field/crop state currently lives in React
  and resets on reload — see the caveat above.
- **Backend**: FastAPI + PyMongo, under `backend/`, backed by a MongoDB
  Atlas cluster. Not yet wired to the frontend.

## Prerequisites

- Node.js `20.19+` or `22.12+` (required by Vite 8)
- npm
- Python `3.10+`
- A MongoDB Atlas cluster (or any MongoDB connection string) — only
  needed if you're running the backend

## Run it

### Frontend

```bash
npm install
npm run dev
```

Then open http://localhost:3000

### Backend

One-time setup:

```bash
./install.sh
```

This installs frontend deps, creates a `.venv` virtual environment,
installs `backend/requirements.txt` into it, and copies
`backend/.env.example` to `backend/.env` if it doesn't exist yet. Edit
`backend/.env` and set `MONGODB_URI` to your real Atlas connection
string (see `backend/.env.example` for the format).

(You can use a differently-named venv instead of `.venv` if you
prefer — e.g. `python3 -m venv hackthesix && source
hackthesix/bin/activate && pip install -r backend/requirements.txt`.
Just make sure it's `.gitignore`d.)

Then, each time you want to run it:

```bash
source .venv/bin/activate
uvicorn backend.app:app --reload --port 8000
```

Interactive API docs are at http://localhost:8000/docs. See
`backend/app.py` for the available `/fields` endpoints.

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
  seedData.ts            mock fields and crop options
  lib/
    fieldHelpers.ts       status/field derivation helpers
    formStyles.ts         shared input/label style helpers
  components/
    Header.tsx, BottomNav.tsx, MapPopup.tsx, FieldThumb.tsx
  screens/
    LoginScreen.tsx, DashboardScreen.tsx, FieldDetailScreen.tsx,
    IdentifyScreen.tsx, AddCropScreen.tsx, ProfileScreen.tsx

backend/
  app.py                 FastAPI app + /fields routes
  db.py                   MongoDB connection (reads backend/.env)
  models.py               Pydantic schemas (Field, PlantingRecord, ...)
  requirements.txt
  .env.example            MONGODB_URI template
```

## Other scaffolding in this repo

`main.py`, `requirements*.txt`, and `tests/test_main.py` are an
early Python scaffold (unrelated to the app above — pending sync with
its author). Run it with:

```bash
python main.py
python main.py Karen
python -m unittest discover -s tests
```
