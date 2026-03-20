from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os

from app.services.routing_service import route_prompt


app = FastAPI()


# ✅ CORS FIX — allows Vercel frontend + local testing
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


# ensure uploads folder exists
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
        with open("log.txt", "r", encoding="utf-8") as f:
            notes = f.read()
    except FileNotFoundError:
        notes = ""

    result = route_prompt(notes)

    return {"text": result}


@app.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"

    with open(file_location, "wb") as f:
        f.write(await file.read())

    return {"status": "uploaded"}
