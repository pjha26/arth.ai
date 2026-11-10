def extract_features(message, session_context=None):
    session_context = session_context or {}
    message = message if isinstance(message, str) else ""
    lower = message.lower()
    return {
        "char_length": len(message), "word_count": len(message.split()),
        "question_count": message.count("?"), "exclamation_count": message.count("!"),
        "has_pricing": int(any(w in lower for w in ["pricing", "cost", "budget", "price", "pay"])),
        "has_competitor": int(any(w in lower for w in ["competitor", "alternative", "vs", "versus", "compare"])),
        "has_integration": int(any(w in lower for w in ["integrate", "api", "connect", "plugin"])),
        "has_timeline": int(any(w in lower for w in ["timeline", "onboard", "start", "when", "how long"])),
        "has_team": int(any(w in lower for w in ["team", "seats", "users", "licenses"])),
        "message_index": session_context.get("messageIndex", 0),
        "minutes_since_delivery": session_context.get("minutesSinceDelivery", 0.0),
    }
