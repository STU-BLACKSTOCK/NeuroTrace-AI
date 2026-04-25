"""
Resume My Work - FastAPI Backend
Stores activity logs and generates AI-powered session summaries.
"""

import os
import json
import sqlite3
from datetime import datetime, UTC
from typing import List, Optional, Any
from contextlib import asynccontextmanager

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client

load_dotenv()

# ─── CONFIG ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

DB_PATH = "activity.db"
SESSION_GAP_SECONDS = 300   # 5-minute gap = new session
MAX_LOGS_PER_SUMMARY = 100  # cap noisy logs sent to AI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set. AI summary will be unavailable.")
    gemini_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    logger.warning("SUPABASE_URL or SUPABASE_KEY not set. Supabase sync disabled.")
    supabase = None
# ──────────────────────────────────────────────────────────────────────────────


# ─── DATABASE ─────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT    NOT NULL,
            app       TEXT    NOT NULL DEFAULT '',
            action    TEXT    NOT NULL DEFAULT '',
            details   TEXT    NOT NULL DEFAULT '',
            session_id TEXT   NOT NULL DEFAULT 'unknown',
            received_at TEXT  NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pinned_summaries (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT   NOT NULL,
            summary   TEXT    NOT NULL,
            timestamp TEXT    NOT NULL
        )
    """)
    try:
        conn.execute("ALTER TABLE pinned_summaries ADD COLUMN auto_generated BOOLEAN DEFAULT 0")
    except Exception:
        pass
    conn.commit()
    conn.close()


# ─── MODELS ───────────────────────────────────────────────────────────────────

class LogEntry(BaseModel):
    timestamp: str
    app: str = ""
    action: str = ""
    details: str = ""
    session_id: Optional[str] = "unknown"
    type: Optional[str] = None
    file: Optional[str] = None
    snippet: Optional[str] = None
    title: Optional[str] = None
    intent: Optional[str] = None
    status: Optional[str] = None
    reasoning_tag: Optional[str] = None
    context_tags: Optional[List[str]] = None
    brief: Optional[str] = None
    summary_data: Optional[dict] = None


class SummaryResponse(BaseModel):
    summary: List[str]
    session_id: str
    log_count: int
    time_range: dict

class PinnedSummary(BaseModel):
    summary: List[str]
    timestamp: str
    session_id: str
    pinned: Optional[bool] = True


# ─── APP ──────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Resume My Work API",
    description="Stores activity logs and generates AI work context summaries.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def deduplicate_logs(logs: list) -> list:
    """Remove consecutive duplicate (action, app, details) triples."""
    if not logs:
        return logs
    seen = []
    prev = None
    for log in logs:
        key = (log["action"], log["app"], log["details"][:60])
        if key != prev:
            seen.append(log)
            prev = key
    return seen


def group_into_sessions(logs: list) -> dict[str, list]:
    """Group logs by session_id; fall back to time-based grouping."""
    sessions: dict[str, list] = {}
    for log in logs:
        sid = log.get("session_id") or "unknown"
        sessions.setdefault(sid, []).append(log)
    return sessions


def latest_session_logs(conn) -> tuple[list, str]:
    """Return deduplicated logs from the most recent session."""
    rows = conn.execute(
        "SELECT * FROM logs ORDER BY received_at DESC LIMIT 500"
    ).fetchall()
    logs = [dict(r) for r in rows]
    logs.reverse()

    if not logs:
        return [], "none"

    sessions = group_into_sessions(logs)
    latest_sid = logs[-1].get("session_id", "unknown")
    session_logs = sessions.get(latest_sid, logs[-MAX_LOGS_PER_SUMMARY:])
    return deduplicate_logs(session_logs[-MAX_LOGS_PER_SUMMARY:]), latest_sid


async def call_gemini(prompt: str) -> List[str]:
    """Call Google Gemini API and return 3 bullet points."""
    if not gemini_client:
        return [
            "⚠ GEMINI_API_KEY not set – AI summary unavailable.",
            "Set the environment variable in .env and restart the server.",
            "See README for setup instructions.",
        ]

    prompt_template = f"""You are an AI assistant that reconstructs a user's work session across code and browser activity.

You are given:
* Code snippets from files the user edited
* Search queries and browser activity
* File and application events

Your task is to infer:
1. What problem the user is trying to solve
2. What actions or approaches they attempted
3. What likely did not work or is incomplete
4. The most logical next step

Return ONLY 3 concise bullet points:
* Current task
* What was tried
* Next step

Be clear, specific, and avoid generic statements.
Respond ONLY with a JSON object: {{"summary": ["bullet1", "bullet2", "bullet3"]}}.

Logs:
{prompt}
"""
    try:
        logger.info(f"Sending prompt to Gemini: {prompt[:100]}...")
        response = await gemini_client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt_template,
            config={"response_mime_type": "application/json"}
        )
        text = response.text.strip()
        parsed = json.loads(text)
        return parsed.get("summary", [
            "⚠ Invalid summary format returned.",
            "Check Gemini API response.",
            "Try again later."
        ])
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return [
            "⚠ Failed to generate AI summary.",
            "An error occurred while calling the Gemini API.",
            f"Details: {str(e)[:100]}",
        ]

async def call_gemini_expand(prompt: str, original_summary: List[str]) -> str:
    """Call Google Gemini API for an expanded explanation."""
    if not gemini_client:
        return "⚠ GEMINI_API_KEY not set – AI summary unavailable."

    summary_text = "\n".join([f"- {s}" for s in original_summary])
    
    prompt_template = f"""You are an AI assistant expanding a user's work session summary.

Given the original summary and activity logs, provide a deeper explanation:
* Explain what the user was trying to achieve
* Explain why their attempts may have failed
* Provide a more detailed reasoning of next steps

Keep it clear and structured, but more detailed than the original summary. Do not use Markdown formatting like bold or headers, just plain text paragraphs.

Original Summary:
{summary_text}

Logs:
{prompt}
"""
    try:
        response = await gemini_client.aio.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt_template
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error (expand): {e}")
        return f"⚠ Failed to generate expanded summary: {str(e)[:100]}"


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.post("/logs", status_code=201)
async def ingest_log(entry: LogEntry):
    """Accept a single activity log entry."""
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    session_id = entry.session_id or "unknown"
    
    extra_data = {}
    if entry.type: extra_data["type"] = entry.type
    if entry.file: extra_data["file"] = entry.file
    if entry.snippet: extra_data["snippet"] = entry.snippet
    if entry.title: extra_data["title"] = entry.title
    if entry.intent: extra_data["intent"] = entry.intent
    if entry.status: extra_data["status"] = entry.status
    if entry.reasoning_tag: extra_data["reasoning_tag"] = entry.reasoning_tag
    if entry.context_tags: extra_data["context_tags"] = entry.context_tags
    if entry.brief: extra_data["brief"] = entry.brief
    if entry.summary_data: extra_data["summary_data"] = entry.summary_data

    sqlite_details = json.dumps({"text": entry.details, **extra_data}) if extra_data else entry.details
    supabase_details = {"text": entry.details, **extra_data} if extra_data else {"text": entry.details}
    
    # SQLite Insert
    conn = get_db()
    conn.execute(
        "INSERT INTO logs (timestamp, app, action, details, session_id, received_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (entry.timestamp, entry.app, entry.action, sqlite_details, session_id, now),
    )
    conn.commit()
    conn.close()
    
    # Supabase Insert
    if supabase:
        try:
            supabase.table("activity_logs").insert({
                "timestamp": entry.timestamp,
                "app": entry.app,
                "action": entry.action,
                "session_id": session_id,
                "details": supabase_details
            }).execute()
        except Exception as e:
            logger.error(f"Supabase insert failed: {e}")

    return {"status": "ok"}


@app.post("/logs/batch", status_code=201)
async def ingest_logs_batch(entries: List[LogEntry]):
    """Accept a batch of activity log entries."""
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    
    # SQLite Insert
    conn = get_db()
    
    sqlite_batch = []
    for e in entries:
        extra_data = {}
        if e.type: extra_data["type"] = e.type
        if e.file: extra_data["file"] = e.file
        if e.snippet: extra_data["snippet"] = e.snippet
        if e.title: extra_data["title"] = e.title
        if e.intent: extra_data["intent"] = e.intent
        if e.status: extra_data["status"] = e.status
        if e.reasoning_tag: extra_data["reasoning_tag"] = e.reasoning_tag
        if e.context_tags: extra_data["context_tags"] = e.context_tags
        if e.brief: extra_data["brief"] = e.brief
        if e.summary_data: extra_data["summary_data"] = e.summary_data
        sqlite_details = json.dumps({"text": e.details, **extra_data}) if extra_data else e.details
        sqlite_batch.append((e.timestamp, e.app, e.action, sqlite_details, e.session_id or "unknown", now))
        
    conn.executemany(
        "INSERT INTO logs (timestamp, app, action, details, session_id, received_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        sqlite_batch,
    )
    conn.commit()
    conn.close()
    
    # Supabase Insert
    if supabase:
        try:
            supabase_data = []
            for e in entries:
                extra_data = {}
                if e.type: extra_data["type"] = e.type
                if e.file: extra_data["file"] = e.file
                if e.snippet: extra_data["snippet"] = e.snippet
                if e.title: extra_data["title"] = e.title
                supabase_data.append({
                    "timestamp": e.timestamp,
                    "app": e.app,
                    "action": e.action,
                    "session_id": e.session_id or "unknown",
                    "details": {"text": e.details, **extra_data} if extra_data else {"text": e.details}
                })
            supabase.table("activity_logs").insert(supabase_data).execute()
        except Exception as e:
            logger.error(f"Supabase batch insert failed: {e}")

    return {"status": "ok", "count": len(entries)}


@app.get("/summary", response_model=SummaryResponse)
async def get_summary():
    """Generate an AI summary of the latest session logs."""
    conn = get_db()
    logs, session_id = latest_session_logs(conn)
    conn.close()

    if not logs:
        raise HTTPException(status_code=404, detail="No logs found.")

    # Build prompt
    lines = []
    for log in logs:
        details_text = log['details']
        extra = ""
        try:
            parsed = json.loads(details_text)
            if isinstance(parsed, dict) and "text" in parsed:
                details_text = parsed["text"]
                if "snippet" in parsed:
                    extra += f"\n  [Code Snippet from {parsed.get('file', 'file')}]:\n  {parsed['snippet']}"
                if "title" in parsed:
                    extra += f"\n  [Search Title]: {parsed['title']}"
        except (json.JSONDecodeError, TypeError):
            pass  # Not JSON or not parsing correctly, treat as normal string
            
        lines.append(
            f"[{log['timestamp']}] {log['action']} | App: {log['app']} | {details_text}{extra}"
        )
    prompt = "\n".join(lines)

    summary = await call_gemini(prompt)

    time_range = {
        "from": logs[0]["timestamp"],
        "to": logs[-1]["timestamp"],
    }

    return SummaryResponse(
        summary=summary,
        session_id=session_id,
        log_count=len(logs),
        time_range=time_range,
    )

@app.get("/summary/expand")
async def expand_summary(session_id: Optional[str] = None):
    """Generate a deeper AI explanation of the session logs."""
    conn = get_db()
    if session_id:
        rows = conn.execute(
            "SELECT * FROM logs WHERE session_id=? ORDER BY received_at DESC LIMIT ?",
            (session_id, MAX_LOGS_PER_SUMMARY),
        ).fetchall()
        logs = [dict(r) for r in rows]
        logs.reverse()
        logs = deduplicate_logs(logs)
    else:
        logs, session_id = latest_session_logs(conn)
    conn.close()

    if not logs:
        raise HTTPException(status_code=404, detail="No logs found.")

    # Get the original summary logic (just the bullets) to feed into the prompt
    # In a real system, we might cache this, but for now we regenerate it
    lines = []
    for log in logs:
        details_text = log['details']
        extra = ""
        try:
            parsed = json.loads(details_text)
            if isinstance(parsed, dict) and "text" in parsed:
                details_text = parsed["text"]
                if "snippet" in parsed:
                    extra += f"\n  [Code Snippet from {parsed.get('file', 'file')}]:\n  {parsed['snippet']}"
                if "title" in parsed:
                    extra += f"\n  [Search Title]: {parsed['title']}"
        except (json.JSONDecodeError, TypeError):
            pass
            
        lines.append(
            f"[{log['timestamp']}] {log['action']} | App: {log['app']} | {details_text}{extra}"
        )
    prompt = "\n".join(lines)
    
    # Generate the brief summary first
    original_summary = await call_gemini(prompt)
    
    # Now generate the expanded explanation
    expanded = await call_gemini_expand(prompt, original_summary)
    
    return {"expanded_summary": expanded}


@app.get("/logs")
async def list_logs(limit: int = 100, session_id: Optional[str] = None):
    """Return recent raw logs (for debugging)."""
    conn = get_db()
    if session_id:
        rows = conn.execute(
            "SELECT * FROM logs WHERE session_id=? ORDER BY received_at DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM logs ORDER BY received_at DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]


@app.get("/sessions")
async def list_sessions():
    """Return all unique session IDs with log counts."""
    conn = get_db()
    rows = conn.execute(
        "SELECT session_id, COUNT(*) as count, MIN(timestamp) as started, MAX(timestamp) as ended "
        "FROM logs GROUP BY session_id ORDER BY started DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/pin-summary", status_code=201)
async def pin_summary(pinned: PinnedSummary):
    conn = get_db()
    summary_json = json.dumps(pinned.summary)
    conn.execute(
        "INSERT INTO pinned_summaries (session_id, summary, timestamp) VALUES (?, ?, ?)",
        (pinned.session_id, summary_json, pinned.timestamp)
    )
    conn.commit()
    conn.close()
    
    if supabase:
        try:
            supabase.table("pinned_summaries").insert({
                "session_id": pinned.session_id,
                "summary": pinned.summary,
                "timestamp": pinned.timestamp
            }).execute()
        except Exception as e:
            logger.error(f"Supabase insert failed for pin-summary: {e}")
            
    return {"status": "ok"}

@app.delete("/pin-summary/{summary_id}", status_code=200)
async def delete_pinned_summary(summary_id: int):
    conn = get_db()
    conn.execute("DELETE FROM pinned_summaries WHERE id = ?", (summary_id,))
    conn.commit()
    conn.close()
    
    if supabase:
        try:
            supabase.table("pinned_summaries").delete().eq("id", summary_id).execute()
        except Exception as e:
            logger.error(f"Supabase delete failed for pin-summary: {e}")
            
    return {"status": "success", "message": "Summary deleted"}

@app.get("/pinned-summaries")
async def get_pinned_summaries():
    conn = get_db()
    rows = conn.execute("SELECT * FROM pinned_summaries ORDER BY timestamp DESC").fetchall()
    conn.close()
    
    results = []
    for r in rows:
        try:
            summary_list = json.loads(r["summary"])
        except json.JSONDecodeError:
            summary_list = [r["summary"]]
        results.append({
            "id": r["id"],
            "session_id": r["session_id"],
            "timestamp": r["timestamp"],
            "summary": summary_list,
            "pinned": True,
            "auto_generated": bool(r["auto_generated"]) if "auto_generated" in r.keys() else False
        })
    return results

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z")}

@app.post("/launch-widget", status_code=200)
async def launch_widget():
    """Launch the widget.py script as an OS-level always-on-top window."""
    try:
        import subprocess
        import os
        
        # Determine the absolute path to widget.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(current_dir)
        script_path = os.path.join(root_dir, "widget.py")
        
        # Use subprocess.Popen to launch it asynchronously
        subprocess.Popen(["python", script_path], cwd=root_dir)
        
        return {"status": "success", "message": "Floating window launched successfully."}
    except Exception as e:
        logger.error(f"Failed to launch widget: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to launch widget: {e}")

class ExplainRequest(BaseModel):
    log_details: dict

@app.post("/explain-log", status_code=200)
async def explain_log(request: ExplainRequest):
    """Generate an on-demand AI explanation for a single log event."""
    if not gemini_client:
        return {"what": "Unavailable", "why": "API Key missing", "impact": "None"}
    
    prompt = f"""
Analyze this log event and explain what the user did, why, and its impact.
Log: {json.dumps(request.log_details)}

Return EXACTLY a JSON object with this format:
{{
    "what": "What user did",
    "why": "Why they likely did it",
    "impact": "Impact on their workflow"
}}
Return ONLY valid JSON.
"""
    try:
        response = await gemini_client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.endswith("```"): text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Error explaining log: {e}")
        return {"what": "Error", "why": "Failed to generate explanation.", "impact": "N/A"}

@app.post("/idle", status_code=200)
async def handle_idle():
    """Triggered by agent when user is idle for 10 minutes. Generates and auto-pins summary."""
    conn = get_db()
    
    # Fetch recent logs
    rows = conn.execute("SELECT * FROM logs ORDER BY received_at DESC LIMIT 40").fetchall()
    logs = [dict(r) for r in rows]
    logs.reverse()
    logs = deduplicate_logs(logs)
    
    if not logs or len(logs) < 3:
        conn.close()
        return {"status": "skipped", "reason": "Not enough logs to generate auto-summary"}
        
    session_id = logs[-1].get("session_id", "unknown")

    # Build prompt
    lines = []
    for log in logs:
        details_text = log['details']
        extra = ""
        try:
            parsed = json.loads(details_text)
            if isinstance(parsed, dict) and "text" in parsed:
                details_text = parsed["text"]
                if "snippet" in parsed:
                    extra += f"\n  [Code Snippet]:\n  {parsed['snippet']}"
                if "title" in parsed:
                    extra += f"\n  [Search Title]: {parsed['title']}"
        except (json.JSONDecodeError, TypeError):
            pass
            
        lines.append(f"[{log['timestamp']}] {log['action']} | App: {log['app']} | {details_text}{extra}")
    prompt = "\n".join(lines)

    summary = await call_gemini(prompt)
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    
    # Save to pinned_summaries with auto_generated=1
    summary_json = json.dumps(summary)
    conn.execute(
        "INSERT INTO pinned_summaries (session_id, summary, timestamp, auto_generated) VALUES (?, ?, ?, 1)",
        (session_id, summary_json, now)
    )
    conn.commit()
    conn.close()
    
    if supabase:
        try:
            supabase.table("pinned_summaries").insert({
                "session_id": session_id,
                "summary": summary,
                "timestamp": now,
                "auto_generated": True
            }).execute()
        except Exception as e:
            logger.error(f"Supabase insert failed for idle summary: {e}")

    return {"status": "success", "message": "Auto-pinned idle summary generated"}
