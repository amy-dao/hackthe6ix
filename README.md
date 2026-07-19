# hackthe6ix — Field Intelligence

A mobile-first web app that helps row-crop farmers make field-level
decisions: whether to rotate a crop, what's actually growing in a
field right now (via camera + Gemini), how long a planted crop should
remain before rotation, and where weed pressure is concentrated.

The app has two pieces that both need to be running at the same time:
a **React frontend** and a **Python backend** (talking to MongoDB +
Gemini). If you only run the frontend, the app will load but show
"Couldn't load fields from the server" — that's expected, it means the
backend isn't running yet.

## Quick start

### 0. Get the secrets from a teammate

This project shares one MongoDB database and one Gemini API key across
the whole team

- `MONGODB_URI`
- `GEMINI_API_KEY`

You'll paste these into a file in step 2.

### 1. Install everything

Requires: Node.js `20.19+` or `22.12+`, npm, and Python `3.10+`
already installed on your machine.

**macOS / Linux** — from the project root:

```bash
./install.sh
```

**Windows** — if you're using **WSL** or **Git Bash**, just run
`./install.sh` above, same as macOS/Linux. Otherwise, in PowerShell or
Command Prompt, run these one at a time from the project root:

```powershell
npm install
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
```

(If PowerShell refuses to run `activate` with an execution-policy
error, see Troubleshooting below.)

Either way, this installs the frontend's npm packages, creates a
Python virtual environment at `.venv`, installs the backend's Python
packages into it, and creates `backend/.env` from a template.

### 2. Add the secrets

Open `backend/.env` (created in step 1) and fill it in:

```
MONGODB_URI=<paste the value from step 0>
GEMINI_API_KEY=<paste the value from step 0>
```

This file is never committed to git — every teammate has their own
local copy.

### 3. Run it — two terminals, both stay open

**Terminal 1 — backend:**

macOS / Linux / WSL / Git Bash:

```bash
source .venv/bin/activate
uvicorn backend.app:app --reload --port 8000
```

Windows (PowerShell or Command Prompt):

```powershell
.venv\Scripts\activate
uvicorn backend.app:app --reload --port 8000
```

Wait for `Application startup complete.` Leave this terminal running.
You'll know the venv is active because your prompt gets a `(.venv)`
prefix.

**Terminal 2 — frontend** (same command, every OS):

```bash
npm run dev
```

Then open the URL it prints (usually **http://localhost:3000**).

Both terminals need to stay open the whole time you're using the app.
Closing either one breaks it.

## Troubleshooting

**"Couldn't load fields from the server: Failed to fetch"**
The backend (Terminal 1) isn't running, or you closed it. Restart it
with the command in step 3 above.

**"address already in use" when starting the backend**
Something else on your machine is already using port 8000. Either
close that other thing, or run the backend on a different port:
`uvicorn backend.app:app --reload --port 8001` — but then also set
`VITE_API_URL=http://localhost:8001` when you run `npm run dev`.

**Teammates get "Failed to fetch" when they open your dev server**
By default both dev servers only listen on `localhost`, which only
your own machine can reach. To let teammates on the same network (or
Tailscale) load the app from your machine:

1. Start the backend with `--host 0.0.0.0` so it accepts connections
   from other machines:
   ```bash
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```
2. `npm run dev` already listens on all interfaces — it'll print a
   `Network:` URL (e.g. `http://100.x.x.x:3000`) alongside the
   `Local:` one. Share that `Network` URL, not the `localhost` one.
3. Find your machine's IP if you need it directly: `ipconfig getifaddr en0`
   (macOS Wi-Fi) or `ifconfig` / `ipconfig` more generally.

Teammates should open the `Network` URL in their own browser — the
app automatically points its API calls at whatever host they loaded
the page from, so no extra config is needed on their end.

**`ModuleNotFoundError` or `command not found: uvicorn` / `'uvicorn' is not recognized`**
You forgot to activate the virtual environment first — run
`source .venv/bin/activate` (macOS/Linux) or `.venv\Scripts\activate`
(Windows) in that terminal, then try again. You'll know it worked if
your terminal prompt gets a `(.venv)` prefix.

**Windows: "cannot be loaded because running scripts is disabled on this system"**
PowerShell is blocking the venv's `activate` script. Run this once in
that PowerShell window, then retry:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**Windows: `python` / `python3` not found**
Windows usually installs Python as `python`, not `python3` — use
`python -m venv .venv` instead of `python3 -m venv .venv`. If neither
works, Python isn't installed or isn't on your `PATH` — reinstall from
[python.org](https://www.python.org/downloads/) and make sure to check
"Add python.exe to PATH" during setup.

**Nothing happens / blank page at localhost:3000**
Make sure `npm run dev` (Terminal 2) is actually still running and
didn't crash — scroll up in that terminal for an error.

**Still stuck?**
Copy the exact error text from whichever terminal (or the browser)
shows it, and ask in the team chat — that error text is the fastest
way to figure out what's wrong.

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
  or describe it in text; sends the photo or description to Gemini and
  returns a real weed/crop identification with a plain-language reason,
  a confidence score, and a "flag as weed" action
- **Add crop** — log a new planting against an existing or new plot
- **Profile** — farmer/farm info, scanning equipment, measurement
  units, and a status-color theme toggle (traffic-light / earth-tone)

All of the above persists to MongoDB through the backend — reloading
the page or signing back in later shows the same data.

## Stack

- **Frontend**: React 19 + TypeScript + Vite, styled with plain inline
  styles (no CSS framework)
- **Backend**: FastAPI + PyMongo (`backend/`), backed by a MongoDB
  Atlas cluster, plus Gemini (`google-genai`) for plant/weed
  identification

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
  seedData.ts            crop name options
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
its author). Run it with:

```bash
python main.py
python main.py Karen
python -m unittest discover -s tests
```
