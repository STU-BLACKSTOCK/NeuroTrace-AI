"""
seed_test_data.py — Send sample activity logs to the backend for testing.
Usage: python seed_test_data.py [backend_url]
"""
import sys
import json
import datetime
import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

SESSION = "session_demo_001"

LOGS = [
    {"action": "session_start",  "app": "System",     "details": "New session started"},
    {"action": "agent_start",    "app": "System",     "details": "Agent initialized"},
    {"action": "app_focus",      "app": "VS Code",    "details": "VS Code | backend/main.py"},
    {"action": "file_modified",  "app": "FileSystem", "details": "/projects/resume-my-work/backend/main.py"},
    {"action": "app_switch",     "app": "Chrome",     "details": "VS Code → Chrome | FastAPI docs"},
    {"action": "app_switch",     "app": "VS Code",    "details": "Chrome → VS Code | agent.py"},
    {"action": "file_modified",  "app": "FileSystem", "details": "/projects/resume-my-work/agent/agent.py"},
    {"action": "file_created",   "app": "FileSystem", "details": "/projects/resume-my-work/agent/config.py"},
    {"action": "app_switch",     "app": "Terminal",   "details": "VS Code → Terminal | bash"},
    {"action": "app_switch",     "app": "VS Code",    "details": "Terminal → VS Code | README.md"},
    {"action": "file_modified",  "app": "FileSystem", "details": "/projects/resume-my-work/README.md"},
]

now = datetime.datetime.utcnow()
batch = []
for i, log in enumerate(LOGS):
    ts = (now - datetime.timedelta(minutes=len(LOGS) - i)).isoformat() + "Z"
    batch.append({
        "timestamp": ts,
        "session_id": SESSION,
        **log,
    })

try:
    r = requests.post(f"{BASE}/logs/batch", json=batch, timeout=5)
    print(f"✅ Seeded {len(batch)} logs → {r.status_code}")
    print(f"   Now visit: GET {BASE}/summary")
except requests.exceptions.ConnectionError:
    print(f"❌ Could not connect to {BASE}. Is the backend running?")
