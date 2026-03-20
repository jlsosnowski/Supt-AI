from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from datetime import datetime
import os

from app.services.log_service import add_log, get_logs, clear_logs
from app.services.tagger import categorize_log
from app.services.routing_service import route_prompt

app = FastAPI()

# Create uploads folder automatically
os.makedirs("uploads", exist_ok=True)

class LogInput(BaseModel):
    text: str

# --- Add Log ---
@app.post("/log")
async def log_entry(input: LogInput):
    category = categorize_log(input.text)

    add_log({
        "text": input.text,
        "category": category,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"status": "logged"}

# --- Generate Report ---
@app.post("/generate-report")
async def generate_report():
    logs = get_logs()

    if not logs:
        return {"text": "No logs recorded today."}

    seen = set()
    cleaned_logs = []

    for log in logs:
        key = log["text"].lower()
        if key not in seen:
            seen.add(key)
            cleaned_logs.append(log)

    formatted_logs = "\n".join([
        f"- ({log['category']}) {log['text']}"
        for log in cleaned_logs
    ])

    prompt = f"""
You are a construction superintendent and safety assistant.

Convert the following field notes into a PROFESSIONAL DAILY REPORT.

ONLY include:
- Safety issues
- Work completed
- Equipment installed
- Constraints impacting work
- Important notes

Group similar items together and remove duplicates.

FORMAT:

Daily Construction Report

1. Work Completed:
- ...

2. Equipment Installed:
- ...

3. Manpower:
- ...

4. Hazards:
- ...

5. Constraints / Delays:
- ...

6. Inspections & Testing:
- ...

7. Notes:
- ...

Rules:
- Use bullet points
- Be professional
- Do NOT invent information
- If missing, write "None reported"

Field Notes:
{formatted_logs}
"""

    result = await route_prompt(prompt, "auto", "normal")

    clear_logs()

    return {
        "text": result if isinstance(result, str) else result.get("text", "")
    }

# --- Upload Photo ---
@app.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    contents = await file.read()

    with open(f"uploads/{file.filename}", "wb") as f:
        f.write(contents)

    return {"status": "saved"}
