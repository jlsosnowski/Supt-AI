import os
from anthropic import Anthropic

def get_client():
    return Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def call_claude(prompt: str):
    client = get_client()

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    text = ""
    if response.content and len(response.content) > 0:
        text = response.content[0].text

    input_tokens = response.usage.input_tokens if response.usage else 0
    output_tokens = response.usage.output_tokens if response.usage else 0

    return {
        "text": text,
        "usage": {
            "total_tokens": input_tokens + output_tokens
        }
    }
