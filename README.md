# Resume My Work 🧠

> **AI-powered work context reconstructor.** A background agent tracks your activity, a FastAPI backend stores and processes logs, and a React dashboard lets you instantly resume where you left off — powered by Gemini AI.

---

## Architecture

```
┌─────────────────────┐     POST /logs      ┌─────────────────────────┐
│   Background Agent  │ ──────────────────► │    FastAPI Backend      │
│   (Python)          │                     │(SQLite/Supabase+Gemini) │
│                     │                     │                         │
│ • Active window     │                     │ • Stores all events     │
│ • App switches      │                     │ • Groups sessions       │
│ • File changes      │                     │ • AI summarization      │
│ • Session detection │                     │                      │
└─────────────────────┘                     └──────────┬───────────┘
                                                       │ GET /summary
                                            ┌──────────▼───────────┐
                                            │   React Frontend     │
                                            │                      │
                                            │ • Dashboard UI       │
                                            │ • Live activity feed │
                                            │ • Session history    │
                                            └──────────────────────┘
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Gemini API key | Required for AI summary |
| Supabase | Required for cloud sync |

---

## Quick Start (Full System)

### Step 1 — Clone / unzip the project

```bash
# The project structure should look like:
resume-my-work/
├── agent/
│   ├── agent.py
│   └── requirements.txt
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── index.js
│       ├── App.js
│       └── App.css
└── README.md
```

---

### Step 2 — Set up the Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create and configure .env file
cp .env.example .env

# Edit the .env file with your credentials:
# GEMINI_API_KEY=your_gemini_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_key

# Start the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at: http://localhost:8000  
📖 API docs at: http://localhost:8000/docs

---

### Supabase Table Setup
Create a table in your Supabase project named `activity_logs` with the following columns:
- `id` (int8 or uuid, primary key)
- `timestamp` (text or timestamp)
- `app` (text)
- `action` (text)
- `session_id` (text)
- `details` (jsonb)

---

### Step 3 — Set up the Agent (new terminal)

```bash
cd agent

# Activate the same venv or create a new one
python -m venv venv
venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Edit agent.py to set your watch folder (optional)
# WATCH_FOLDER = r"C:\Users\YourName\Projects"

# Start the agent
python agent.py
```

✅ Agent is now tracking:
- Active window / app switches (Windows only)
- File changes in your watch folder
- Session boundaries (5-min idle = new session)

---

### Step 4 — Set up the Frontend (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Optional: point to a remote backend
# Create .env file:
echo REACT_APP_API_URL=http://localhost:8000 > .env

# Start the dev server
npm start
```

✅ Frontend running at: http://localhost:3000

---

## Testing the System

### Test 1 — Send a manual log

```bash
curl -X POST http://localhost:8000/logs \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-01T10:00:00Z",
    "app": "VS Code",
    "action": "app_focus",
    "details": "Editing main.py",
    "session_id": "session_test_001"
  }'
```

### Test 2 — Get a summary

```bash
curl http://localhost:8000/summary
```

Expected response:
```json
{
  "summary": [
    "🎯 The user was working on a Python backend project in VS Code.",
    "⚡ They edited main.py and switched between the terminal and browser.",
    "→ Resume by opening main.py and reviewing the last changes made."
  ],
  "session_id": "session_test_001",
  "log_count": 12,
  "time_range": {
    "from": "2025-01-01T09:45:00Z",
    "to": "2025-01-01T10:00:00Z"
  }
}
```

### Test 3 — View all logs

```bash
curl http://localhost:8000/logs?limit=20
```

### Test 4 — List sessions

```bash
curl http://localhost:8000/sessions
```

### Test 5 — Batch logs

```bash
curl -X POST http://localhost:8000/logs/batch \
  -H "Content-Type: application/json" \
  -d '[
    {"timestamp":"2025-01-01T10:01:00Z","app":"Chrome","action":"app_switch","details":"Chrome → VS Code","session_id":"session_test_001"},
    {"timestamp":"2025-01-01T10:03:00Z","app":"FileSystem","action":"file_modified","details":"/projects/main.py","session_id":"session_test_001"}
  ]'
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/logs` | Ingest a single activity log |
| POST | `/logs/batch` | Ingest multiple logs at once |
| GET | `/logs` | List recent logs (`?limit=N&session_id=X`) |
| GET | `/summary` | Generate AI summary of latest session |
| GET | `/sessions` | List all sessions with counts |
| GET | `/health` | Health check |

---

## Configuration

### Agent (`agent/agent.py`)

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:8000` | Where to send logs |
| `WATCH_FOLDER` | `~/Documents` | Folder to watch for file changes |
| `POLL_INTERVAL` | `2.5` | Seconds between window checks |
| `IDLE_THRESHOLD` | `300` | Seconds idle before new session |

### Backend (`backend/main.py`)

| Env Var | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (env var) | Your Google Gemini API key |
| `SUPABASE_URL` | (env var) | Your Supabase project URL |
| `SUPABASE_KEY` | (env var) | Your Supabase anon public key |
| `DB_PATH` | `activity.db` | SQLite database file |
| `SESSION_GAP_SECONDS` | `300` | Idle gap to split sessions |
| `MAX_LOGS_PER_SUMMARY` | `100` | Max log lines sent to AI |

### Frontend

| Env Var | Default | Description |
|---------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend URL |

---

## Common Errors & Fixes

### `ModuleNotFoundError: No module named 'pygetwindow'`
```bash
pip install pygetwindow
# Note: pygetwindow only works on Windows.
# On Linux/macOS, window tracking is disabled gracefully.
```

### `Connection refused` when agent tries to send logs
- Make sure the backend is running: `uvicorn main:app --reload --port 8000`
- The agent will silently skip failed sends and keep running.

### Frontend shows `NetworkError` or CORS error
- Check `REACT_APP_API_URL` in your `.env` file.
- The backend has CORS enabled for all origins by default.
- Ensure `uvicorn` is running on the correct port.

### AI summary returns "API key not set"
- Ensure `GEMINI_API_KEY` is set in your `.env` file before starting the backend.
- Get a key at Google AI Studio.

### Supabase errors
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`.
- Ensure the `activity_logs` table exists with the correct schema (specifically, `details` must be `jsonb`).

### `watchdog` not detecting file changes
- On some Linux systems you may need: `pip install watchdog[inotify]`

---

## Running as a Background Service (Windows)

To run the agent automatically at startup on Windows:

1. Create `start_agent.bat`:
```bat
@echo off
cd /d C:\path\to\resume-my-work\agent
call venv\Scripts\activate
python agent.py
```

2. Press `Win+R`, type `shell:startup`, place a shortcut to `start_agent.bat` there.

---

## Production Build (Frontend)

```bash
cd frontend
npm run build
# Serve the build/ folder with any static server
npx serve -s build -p 3000
```

---

## License

MIT — free to use, modify, and distribute.
