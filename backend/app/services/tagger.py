def categorize_log(text: str):
    t = text.lower()

    if any(word in t for word in ["hazard", "unsafe", "injury", "risk", "energized", "live electrical"]):
        return "hazard"

    if any(word in t for word in ["violation", "escort", "ppe", "safety"]):
        return "safety"

    if any(word in t for word in ["delay", "late", "held up", "blocked"]):
        return "constraint"

    if any(word in t for word in ["install", "installed", "set", "placed", "erected"]):
        return "equipment"

    if any(word in t for word in ["crew size", "workers onsite", "headcount"]):
        return "manpower"

    return "general"
