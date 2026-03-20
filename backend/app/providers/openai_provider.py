from openai import OpenAI
import os


def get_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def call_openai(prompt: str):
    client = get_client()

    system_prompt = """
You are a construction superintendent assistant.

Convert raw jobsite notes into a professional daily field report.

Rules:
- Use bullet points
- Slightly elaborate each item (1 short sentence max)
- Keep it professional and jobsite-focused
- No teaching or explanations
- Include progress, status, and any issues
- If delays or blockers exist, include a follow-up action
- Keep tone clear, confident, and concise

Example style:
- Installed CRAH unit 1350-7 and confirmed proper placement and leveling
- Completed condensate drain line routing to designated drain location
- Electrical rough-in delayed due to crew availability; follow-up scheduled for tomorrow
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
