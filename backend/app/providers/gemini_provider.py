from google import genai
import os

def get_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def call_gemini(prompt: str):
    client = get_client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
    )

    return {
        "text": response.text,
        "usage": {}
    }
