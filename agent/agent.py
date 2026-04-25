"""
Resume My Work - Background Activity Agent
Tracks user activity and sends structured logs to the FastAPI backend.
"""

import json
import time
import os
import sys
import platform
import datetime
import threading
import requests
import psutil
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from analyzer import analyze_session
from ai import generate_ai_summary, generate_rule_based_summary
from utils import detect_intent, detect_failure

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BACKEND_URL = "http://localhost:8000"
WATCH_FOLDER = str(Path.home() / "Documents")   # Change to your project folder
POLL_INTERVAL = 2.5          # seconds
IDLE_THRESHOLD = 120        # 2 minutes gap = new session
AUTO_PIN_THRESHOLD = 600                 # 10 minutes gap = auto pin session
LOG_FILE = "activity_log.jsonl"
# ──────────────────────────────────────────────────────────────────────────────

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    try:
        import pygetwindow as gw
    except ImportError:
        print("[WARN] pygetwindow not installed. Window tracking disabled on Windows.")
        gw = None
else:
    gw = None  # Not supported on Linux/macOS without extras


def get_active_window():
    """Return (app_name, window_title) of the currently focused window."""
    if IS_WINDOWS and gw:
        try:
            win = gw.getActiveWindow()
            if win is None:
                return "Unknown", "Unknown"
            title = win.title or "Unknown"
            # Try to extract app name from process
            for proc in psutil.process_iter(["pid", "name"]):
                try:
                    if proc.name().lower().replace(".exe", "") in title.lower():
                        return proc.name().replace(".exe", ""), title
                except Exception:
                    pass
            return "Unknown", title
        except Exception:
            return "Unknown", "Unknown"

    # Fallback: try xdotool on Linux
    try:
        import subprocess
        result = subprocess.run(
            ["xdotool", "getactivewindow", "getwindowname"],
            capture_output=True, text=True, timeout=2
        )
        title = result.stdout.strip() or "Unknown"
        return "Unknown", title
    except Exception:
        return "Unknown", "Unknown"


def make_log(action: str, app: str, details: str, **kwargs) -> dict:
    log = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "app": app,
        "action": action,
        "details": details,
    }
    log.update(kwargs)
    return log


def append_local(log: dict):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(log) + "\n")


def send_to_backend(log: dict):
    try:
        requests.post(f"{BACKEND_URL}/logs", json=log, timeout=3)
    except requests.exceptions.ConnectionError:
        pass  # Backend not running – silently skip
    except Exception as e:
        print(f"[WARN] Backend send error: {e}")


# ─── FILE WATCHER ─────────────────────────────────────────────────────────────

class ChangeHandler(FileSystemEventHandler):
    def __init__(self, emit_fn):
        self.emit = emit_fn
        self._debounce = {}
        self._lock = threading.Lock()

    def _debounced(self, path: str) -> bool:
        now = time.time()
        with self._lock:
            last = self._debounce.get(path, 0)
            if now - last < 2:
                return True
            self._debounce[path] = now
        return False

    def on_modified(self, event):
        if event.is_directory or self._debounced(event.src_path):
            return
            
        valid_exts = {'.py', '.js', '.java', '.ts', '.html', '.css', '.md'}
        ext = os.path.splitext(event.src_path)[1].lower()
        snippet = ""
        log_type = None
        
        if ext in valid_exts:
            try:
                with open(event.src_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                    snippet = "".join(lines[-20:])
                    if len(snippet) > 1000:
                        snippet = snippet[-1000:]
                log_type = "code"
            except Exception:
                snippet = ""
                
        if log_type == "code" and snippet:
            intent_data = detect_intent(snippet, "")
            log = make_log("file_edit", "FileSystem", event.src_path, type="code", file=os.path.basename(event.src_path), snippet=snippet, **intent_data)
        else:
            log = make_log("file_modified", "FileSystem", event.src_path)
            
        self.emit(log)

    def on_created(self, event):
        if event.is_directory or self._debounced(event.src_path):
            return
        log = make_log("file_created", "FileSystem", event.src_path)
        self.emit(log)

    def on_deleted(self, event):
        if event.is_directory or self._debounced(event.src_path):
            return
        log = make_log("file_deleted", "FileSystem", event.src_path)
        self.emit(log)

    def on_moved(self, event):
        if event.is_directory:
            return
        log = make_log("file_moved", "FileSystem",
                        f"{event.src_path} → {event.dest_path}")
        self.emit(log)


# ─── MAIN AGENT ───────────────────────────────────────────────────────────────

class ActivityAgent:
    def __init__(self):
        self.last_app = None
        self.last_title = None
        self.last_event_time = time.time()
        self.session_id = self._new_session_id()
        self.session_events = []

    def _new_session_id(self) -> str:
        return datetime.datetime.utcnow().strftime("session_%Y%m%d_%H%M%S")

    def emit(self, log: dict):
        now = time.time()
        idle = now - self.last_event_time

        if "intent" not in log:
            log["intent"] = "neutral"
        if "status" not in log:
            log["status"] = "neutral"
        if "context_tags" not in log:
            log["context_tags"] = []
        if "reasoning_tag" not in log:
            log["reasoning_tag"] = ""

        # Session detection: gap > threshold
        if idle > IDLE_THRESHOLD:
            if self.session_events:
                summary = analyze_session(self.session_events)
                
                ai_summary = generate_ai_summary(summary)
                fallback_summary = generate_rule_based_summary(summary)
                final_summary = ai_summary if ai_summary else fallback_summary
                
                print("\n" + "="*50)
                print("🌟 RESUME BRIEF 🌟")
                print(f"Task: {summary.get('primary_task', 'general')}")
                print(f"Patterns detected: {', '.join(summary.get('patterns', []))}")
                print(f"Focus score: {summary.get('focus_score', 100)}")
                print(f"Failures: {len(summary.get('failures', []))}")
                print(f"Distractions: {summary.get('distractions', 0)}")
                print(f"Flow: {summary.get('flow', 'None')}")
                print(f"Last Activity: {summary.get('last_activity', 'Unknown')}\n")
                print(f"Reasoning: {summary.get('reasoning', 'General workflow.')}\n")
                print(f"Summary:\n{final_summary}")
                print("="*50 + "\n")
                
                brief_log = make_log("session_summary", "Agent", "Generated resume brief", brief=final_summary, summary_data=summary)
                brief_log["session_id"] = self.session_id
                append_local(brief_log)
                send_to_backend(brief_log)

            self.session_events = []

            sep = make_log("session_start", "System",
                           f"New session after {int(idle)}s idle. ID={self._new_session_id()}")
            self.session_id = self._new_session_id()
            append_local(sep)
            send_to_backend(sep)

        log["session_id"] = self.session_id
        self.last_event_time = now
        
        self.session_events.append(log)

        append_local(log)
        send_to_backend(log)

    def check_window(self):
        app, title = get_active_window()
        if app != self.last_app or title != self.last_title:
            action = "app_switch" if self.last_app else "app_focus"
            log_type = None
            
            title_lower = title.lower()
            if "google " in title_lower or "- google search" in title_lower or "google chrome" in title_lower and "search" in title_lower:
                log_type = "search"
                action = "browser_activity"
            elif "stack overflow" in title_lower:
                log_type = "search"
                action = "browser_activity"
            elif "google" in title_lower: # Catch generic google searches if simple
                log_type = "search"
                action = "browser_activity"
                
            details = f"{self.last_app} → {app} | {title}" if self.last_app and action != "browser_activity" else f"{app} | {title}"
            
            intent_data = detect_intent("", title)
            if log_type == "search":
                log = make_log(action, app, details, type="search", title=title, **intent_data)
            else:
                log = make_log(action, app, details, **intent_data)
                
            self.emit(log)
            self.last_app = app
            self.last_title = title

    def run(self):
        print(f"▶ Resume My Work Agent starting")
        print(f"  Watch folder : {WATCH_FOLDER}")
        print(f"  Backend URL  : {BACKEND_URL}")
        print(f"  Log file     : {LOG_FILE}")
        print(f"  Poll interval: {POLL_INTERVAL}s\n")

        # Start file watcher
        handler = ChangeHandler(self.emit)
        observer = Observer()
        watch_path = WATCH_FOLDER if os.path.isdir(WATCH_FOLDER) else str(Path.home())
        observer.schedule(handler, watch_path, recursive=True)
        observer.start()

        # Emit startup log
        startup = make_log("agent_start", "System",
                           f"Agent started. Watching: {watch_path}")
        self.emit(startup)

        last_auto_pin_trigger = 0

        try:
            while True:
                self.check_window()
                
                # Check for 10-minute idle auto-pin
                idle = time.time() - self.last_event_time
                if idle > AUTO_PIN_THRESHOLD and time.time() - last_auto_pin_trigger > AUTO_PIN_THRESHOLD:
                    print("Idle for 10 minutes, triggering auto-summary to backend...")
                    try:
                        requests.post(f"{BACKEND_URL}/idle")
                    except Exception as e:
                        print(f"Failed to trigger auto-summary: {e}")
                    last_auto_pin_trigger = time.time()
                
                time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            print("\n⏹ Agent stopped by user.")
        finally:
            observer.stop()
            observer.join()
            stop_log = make_log("agent_stop", "System", "Agent stopped.")
            append_local(stop_log)
            send_to_backend(stop_log)


if __name__ == "__main__":
    agent = ActivityAgent()
    agent.run()
