from app.providers.openai_provider import call_openai
from app.providers.gemini_provider import call_gemini
from app.providers.claude_provider import call_claude

def format_response(provider, raw):
    return {
        "provider": provider,
        "text": raw["text"],
        "tokensUsed": raw.get("usage", {}).get("total_tokens"),
        "latencyMs": None
    }

async def route_prompt(prompt: str, model: str, personality: str):
    if model == "openai":
        raw = await call_openai(prompt)
        return format_response("openai", raw)

    if model == "gemini":
        raw = await call_gemini(prompt)
        return format_response("gemini", raw)

    if model == "claude":
        raw = await call_claude(prompt)
        return format_response("claude", raw)

    if model == "auto":
        raw = await call_openai(prompt)
        return format_response("openai", raw)

    return {
        "provider": "none",
        "text": "Model not supported.",
        "tokensUsed": 0,
        "latencyMs": None
    }
