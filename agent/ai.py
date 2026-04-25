import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend folder
env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

def generate_log_explanation(log: dict, context: dict = None) -> dict:
    """Strict rule-based fallback returning {what, why, impact}."""
    action = log.get("action", "")
    app = log.get("app", "").lower()
    title = log.get("title", "").lower()
    
    what = "General activity detected."
    why = "System tracking."
    impact = "Maintains session continuity."
    
    if action in ["file_edit", "file_modified"]:
        what = "User edited a file."
        why = "Likely implementing or fixing logic."
        impact = "Contributes to codebase development."
    elif action == "browser_activity":
        if "google" in title or "search" in title:
            what = "User performed a web search."
            why = "Likely searching for a solution or documentation."
            impact = "Aids in problem-solving and research."
        elif "whatsapp" in title or "youtube" in title or "instagram" in title:
            what = "User opened a non-work site."
            why = "Taking a break or communicating."
            impact = "Lowers focus score but provides a mental break."
        else:
            what = "User browsed a webpage."
            why = "Gathering information."
            impact = "General browsing context."
    elif action == "app_focus":
        what = f"User switched focus to {app}."
        why = "Changing current context."
        impact = "Shifts the active workflow."
    elif action == "app_switch":
        what = "User switched between applications."
        why = "Multitasking or looking for specific tools."
        impact = "Increases context switching overhead."
        
    return {"what": what, "why": why, "impact": impact}

def generate_rule_based_summary(summary: dict) -> str:
    task = summary.get("primary_task", "development")
    patterns = summary.get("patterns", [])
    is_stuck = summary.get("is_stuck", False)
    failures = len(summary.get("failures", []))
    flow = summary.get("flow", "")
    
    if "code" in flow and "browser" in flow:
        s1 = f"You were actively debugging a {task} problem by writing code and searching for solutions."
    elif flow.count("browser") >= 3:
        s1 = f"You were intensely researching {task} topics and analyzing documentation."
    else:
        s1 = f"You were focused on implementing {task} features."

    if failures > 0 or is_stuck:
        s2 = "You demonstrated repeated attempts, indicating active problem-solving and persistence."
    elif "Multitasking" in patterns or "Distracted" in patterns:
        s2 = "You showed frequent context switching, exploring multiple avenues simultaneously."
    else:
        s2 = "You maintained a consistent rhythm, indicating a structured approach."

    if failures > 0 or is_stuck:
        s3 = "Next step: apply the researched solution and validate the results step-by-step."
    else:
        s3 = "Next step: review your recent changes and proceed to the next milestone."
        
    return f"{s1}\n{s2}\n{s3}"

def generate_ai_summary(summary: dict) -> str:
    prompt = f"""
Analyze this session summary and generate a Resume Brief.
Input:
Task: {summary.get('primary_task')}
Flow: {summary.get('flow')}
Failures: {len(summary.get('failures', []))}
Reasoning: {summary.get('reasoning')}
Last Activity: {summary.get('last_activity')}

Output EXACTLY 3 sentences:
1. What user was doing
2. What they tried or failed
3. What next step
"""
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"[WARN] AI Generation failed: {e}")
        return None

def explain_log_with_ai(log: dict) -> dict:
    prompt = f"""
Analyze this log event and explain what the user did, why, and its impact.
Log: {json.dumps(log)}

Return EXACTLY a JSON object with this format:
{{
    "what": "What user did",
    "why": "Why they likely did it",
    "impact": "Impact on their workflow"
}}
Return ONLY valid JSON.
"""
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception:
        return None
