from openai import OpenAI
import os


def get_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def call_openai(prompt: str):
    client = get_client()

    system_prompt = """
You are a construction superintendent assistant.

Convert raw jobsite notes into a professional daily field report using bullet points.

Rules:
- Use bullet points only
- Keep sentences short and direct
- No explanations or teaching tone
- Focus on completed work, progress, delays, and blockers
- If delays exist, include a follow‑up action item
- Maintain professional jobsite reporting language
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    )

    return {
        "text": response.choices[0].message.content,
        "usage": {
            "total_tokens": response.usage.total_tokens
        }
    }
