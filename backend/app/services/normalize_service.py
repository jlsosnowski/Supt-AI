def normalize_response(provider: str, raw):
    return {
        "provider": provider,
        "text": raw["text"],
        "tokensUsed": raw.get("usage", {}).get("total_tokens"),
        "latencyMs": None
    }
