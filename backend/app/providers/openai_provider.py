from openai import OpenAI
import os

def get_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def call_openai(prompt: str):
    client = get_client()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return {
        "text": response.choices[0].message.content,
        "usage": {
            "total_tokens": response.usage.total_tokens
        }
    }
