from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import traceback

from app.services.routing_service import route_prompt


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://supt-ai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)


@app.get("/")
def root():
    return {"status": "Sup't AI backend running"}


@app.post("/log")
async def log_entry(payload: dict):
    text = payload.get("text", "")
    if not text:
        return {"error": "No text provided"}

    with open("log.txt", "a", encoding="utf-8") as f:
        f.write(text + "\n")

    return {"status": "saved"}


@app.post("/generate-report")
async def generate_report():
    try:
        try:
            with open("log.txt", "r", encoding="utf-8") as f:
                notes = f.read()
        except FileNotFoundError:
            notes = ""

        if not notes.strip():
            return {"text": "No notes found yet."}

        result = await route_prompt(
            notes,
            model="openai",
            personality="professional",
        )

        if result is None:
            raise HTTPException(status_code=500, detail="route_prompt returned None")

        report_text = result["text"]

        # clear shared log after report generation
        open("log.txt", "w", encoding="utf-8").close()

        return {"text": report_text}

    except Exception as e:
        print("GENERATE_REPORT_ERROR:", repr(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"

    with open(file_location, "wb") as f:
        f.write(await file.read())

    return {"status": "uploaded"}
