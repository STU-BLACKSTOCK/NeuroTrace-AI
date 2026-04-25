def detect_intent(snippet: str, window_title: str) -> dict:
    intent = "general"
    status = "neutral"
    tags = []
    reasoning_tag = "User navigated or switched context."

    snippet_lower = snippet.lower() if snippet else ""
    title_lower = window_title.lower() if window_title else ""

    # Detect debugging
    if "exception" in snippet_lower or "error" in snippet_lower or "traceback" in snippet_lower or "failed" in snippet_lower:
        intent = "debugging"
        tags.append("error_detection")
        reasoning_tag = "User encountered an error and is likely debugging."
    
    # Detect development
    elif "def " in snippet_lower or "class " in snippet_lower or "import " in snippet_lower or "function" in snippet_lower:
        intent = "development"
        tags.append("code_edits")
        reasoning_tag = "User is writing or modifying code."

    # Detect integration
    elif "api" in title_lower or "requests" in snippet_lower or "fetch" in snippet_lower or "axios" in snippet_lower:
        intent = "integration"
        tags.append("api_usage")
        reasoning_tag = "User is working on API integration or network requests."

    # Detect research
    elif "search" in title_lower or "google" in title_lower or "stack overflow" in title_lower or "chatgpt" in title_lower:
        intent = "research"
        tags.append("search_intent")
        reasoning_tag = "User is searching for information or solutions."

    # Detect distraction
    elif "whatsapp" in title_lower or "youtube" in title_lower or "instagram" in title_lower or "netflix" in title_lower:
        intent = "distraction"
        tags.append("distraction")
        reasoning_tag = "User switched to a non-work application."

    return {
        "intent": intent,
        "status": status,
        "context_tags": tags,
        "reasoning_tag": reasoning_tag
    }

def detect_failure(snippet: str) -> str:
    """Explicit failure detection as requested."""
    snippet_lower = snippet.lower() if snippet else ""
    if "error" in snippet_lower or "exception" in snippet_lower or "undefined" in snippet_lower or "not found" in snippet_lower or "traceback" in snippet_lower:
        return "failure"
    elif snippet_lower:
        return "progress"
    return "neutral"
