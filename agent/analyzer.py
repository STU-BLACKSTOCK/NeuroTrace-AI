import json
from utils import detect_intent, detect_failure

def detect_patterns(flow_actions, distractions, app_switches):
    patterns = []
    flow_str = " ".join(flow_actions)
    if "code browser code" in flow_str:
        patterns.append("Debugging")
    if "browser browser browser" in flow_str:
        patterns.append("Research")
    if distractions > 0:
        patterns.append("Distracted")
    if app_switches > 5:
        patterns.append("Multitasking")
    return patterns

def detect_stuck_behavior(events, failures):
    if len(failures) > 2:
        return True
    
    file_edits = {}
    searches = {}
    for e in events:
        if e.get("action") in ["file_edit", "file_modified"]:
            f = e.get("details", "")
            file_edits[f] = file_edits.get(f, 0) + 1
            if file_edits[f] > 5: return True
        elif e.get("action") == "browser_activity":
            q = e.get("title", "")
            searches[q] = searches.get(q, 0) + 1
            if searches[q] > 3: return True
            
    return False

def calculate_focus_score(distractions, app_switches):
    score = 100
    score -= (20 * distractions)
    excessive_switches = max(0, app_switches - 5)
    score -= (10 * excessive_switches)
    return max(0, score)

def analyze_session(events: list) -> dict:
    if not events:
        return {}

    intents_count = {}
    failures = []
    tools_used = set()
    last_activity = ""
    app_switches = 0
    distractions = 0
    flow_actions = []
    intent_flow = []
    last_intent = None
    
    for event in events:
        intent = event.get("intent", "general")
        action = event.get("action", "")
        intents_count[intent] = intents_count.get(intent, 0) + 1
        
        if intent != last_intent and intent != "general":
            intent_flow.append(intent)
            last_intent = intent
        
        if action == "app_switch":
            app_switches += 1
            
        if intent == "distraction":
            distractions += 1
            
        app = event.get("app", "Unknown")
        if app != "Unknown":
            tools_used.add(app)
            
        if event.get("status") == "failure":
            failures.append(event.get("details", "Unknown failure"))
            
        if action in ["file_edit", "browser_activity", "file_modified", "app_focus"]:
            last_activity = f"{action} - {event.get('details', '')}"

        if action in ["file_edit", "file_modified"]:
            flow_actions.append("code")
        elif action == "browser_activity":
            flow_actions.append("browser")
        else:
            if not flow_actions or flow_actions[-1] != "app":
                flow_actions.append("app")

    primary_task = max(intents_count, key=intents_count.get) if intents_count else "general"

    if not last_activity and events:
        last_activity = events[-1].get("details", "")

    flow_str = " → ".join(flow_actions[-10:]) if flow_actions else "None"
    intent_flow_str = " → ".join(intent_flow[-5:]) if intent_flow else "None"
    
    patterns = detect_patterns(flow_actions, distractions, app_switches)
    is_stuck = detect_stuck_behavior(events, failures)
    focus_score = calculate_focus_score(distractions, app_switches)

    summary = {
        "primary_task": primary_task,
        "flow": flow_str,
        "intent_flow": intent_flow_str,
        "failures": failures[-5:],
        "last_activity": last_activity,
        "tools_used": list(tools_used),
        "total_events": len(events),
        "app_switches": app_switches,
        "distractions": distractions,
        "attempts": len(failures) + 1,
        "patterns": patterns,
        "is_stuck": is_stuck,
        "focus_score": focus_score
    }
    
    summary["reasoning"] = infer_reasoning(summary)
    
    return summary

def infer_reasoning(summary: dict) -> str:
    patterns = summary.get("patterns", [])
    is_stuck = summary.get("is_stuck", False)
    focus = summary.get("focus_score", 100)
    flow = summary.get("flow", "")
    failures = len(summary.get("failures", []))
    
    parts = []
    if "code" in flow and "browser" in flow:
        parts.append("User is actively debugging by alternating between browser searches and code edits.")
    elif flow.count("browser") >= 3:
        parts.append("User is conducting deep research across multiple browser sessions.")
    elif "app" in flow and "browser" not in flow and "code" not in flow:
        parts.append("User is navigating various applications.")
    else:
        parts.append("User is focused on progressing through their tasks.")
        
    if failures > 0:
        parts.append("They are showing problem-solving behavior due to recent failures.")
    elif is_stuck:
        parts.append("However, they are making repeated attempts, suggesting they might be facing friction.")
        
    if focus < 50:
        parts.append("Frequent context switching indicates heavy multitasking or distraction.")
    elif focus >= 80:
        parts.append("They are maintaining a highly focused workflow.")

    return " ".join(parts)

