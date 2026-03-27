from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import traceback
import re
from datetime import datetime

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
os.makedirs("data", exist_ok=True)

USERS_FILE = os.path.join("data", "users.json")


def load_project_data():
    filename = os.path.join(os.path.dirname(__file__), "project_data.json")

    if not os.path.exists(filename):
        return {"galleries": {}}

    with open(filename, "r", encoding="utf-8") as f:
        return json.load(f)


PROJECT_DATA = load_project_data()


def lookup_gallery_by_tag(tag: str):
    galleries = PROJECT_DATA.get("galleries", {})

    for gallery, info in galleries.items():
        if tag in info.get("tags", []):
            return gallery

    return None


def load_users():
    if not os.path.exists(USERS_FILE):
        return {}

    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def get_user_key(user: str) -> str:
    user = (user or "").strip().lower()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid user")

    safe_user = (
        user.replace(" ", "_")
        .replace(".", "_")
        .replace("@", "_at_")
    )
    return safe_user


def get_active_log_filename(user: str) -> str:
    return os.path.join("data", f"active_{get_user_key(user)}.txt")


def get_archive_filename(user: str) -> str:
    return os.path.join("data", f"archive_{get_user_key(user)}.txt")


def get_reports_filename(user: str) -> str:
    return os.path.join("data", f"reports_{get_user_key(user)}.txt")


def get_equipment_filename(user: str) -> str:
    return os.path.join("data", f"equipment_{get_user_key(user)}.txt")


def append_line(filename: str, text: str):
    with open(filename, "a", encoding="utf-8") as f:
        f.write(text)


@app.get("/")
def root():
    return {"status": "Sup't AI backend running"}


@app.post("/register")
async def register(payload: dict):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    users = load_users()

    if username in users:
        raise HTTPException(status_code=400, detail="User already exists")

    users[username] = {"password": password}
    save_users(users)

    return {"status": "user created"}


@app.post("/login")
async def login(payload: dict):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "").strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    users = load_users()

    if username not in users:
        raise HTTPException(status_code=401, detail="Invalid username")

    if users[username]["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"status": "login success", "user": username}


@app.post("/log")
async def log_entry(payload: dict):
    text = payload.get("text", "").strip()
    user = payload.get("user", "").strip()

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    if not user:
        raise HTTPException(status_code=400, detail="No user provided")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {text}\n"

    active_file = get_active_log_filename(user)
    archive_file = get_archive_filename(user)

    append_line(active_file, line)
    append_line(archive_file, line)

    equipment_patterns = [
        r"(CRAH(?:\s+Unit)?\s+[\w\-]+)",
        r"(RTU[\w\-]*|\bRTU\b(?:\s+[\w\-]+)?)",
        r"(Panel\s+[\w\-]+)",
        r"(UPS\s+[\w\-]+)"
    ]

    location_pattern = r"(IDF\s*Room\s*[\w\-]+|MDF\s*Room\s*[\w\-]+|Room\s*[\w\-]+|Roof\s*Grid\s*[\w\-]+)"

    equipment_match = None
    for pattern in equipment_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            equipment_match = match.group()
            break

    location_match = re.search(location_pattern, text, re.IGNORECASE)

    if equipment_match:
        equipment_file = get_equipment_filename(user)

        equipment_parts = equipment_match.strip().split()
        tag_value = ""
        equipment_name = equipment_match

        if len(equipment_parts) >= 2:
            last_part = equipment_parts[-1]
            if any(char.isdigit() for char in last_part):
                tag_value = last_part
                equipment_name = " ".join(equipment_parts[:-1])

        if not location_match and tag_value:
            gallery = lookup_gallery_by_tag(tag_value)
            if gallery:
                location_value = f"Gallery {gallery}"
            else:
                location_value = "Unknown location"
        else:
            location_value = (
                location_match.group()
                if location_match
                else "Unknown location"
            )

        equipment_line = f"[{timestamp}] {equipment_name} | {tag_value} | {location_value} | installed\n"
        append_line(equipment_file, equipment_line)

    return {"status": "saved"}


@app.post("/generate-report")
async def generate_report(payload: dict):
    user = payload.get("user", "").strip()

    if not user:
        raise HTTPException(status_code=400, detail="No user provided")

    active_file = get_active_log_filename(user)
    reports_file = get_reports_filename(user)

    try:
        try:
            with open(active_file, "r", encoding="utf-8") as f:
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
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        report_block = (
            f"\n===== REPORT {timestamp} =====\n"
            f"{report_text}\n"
            f"===== END REPORT =====\n"
        )
        append_line(reports_file, report_block)

        with open(active_file, "w", encoding="utf-8") as f:
            f.write("")

        return {"text": report_text}

    except Exception as e:
        print("GENERATE_REPORT_ERROR:", repr(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/history")
async def get_history(payload: dict):
    user = payload.get("user", "").strip()

    if not user:
        raise HTTPException(status_code=400, detail="No user provided")

    archive_file = get_archive_filename(user)
    reports_file = get_reports_filename(user)

    try:
        archive_text = ""
        reports_text = ""

        if os.path.exists(archive_file):
            with open(archive_file, "r", encoding="utf-8") as f:
                archive_text = f.read()

        if os.path.exists(reports_file):
            with open(reports_file, "r", encoding="utf-8") as f:
                reports_text = f.read()

        return {
            "archive": archive_text,
            "reports": reports_text,
            "archive_exists": os.path.exists(archive_file),
            "reports_exists": os.path.exists(reports_file),
            "archive_file": archive_file,
            "reports_file": reports_file,
        }

    except Exception as e:
        print("HISTORY_ERROR:", repr(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/equipment-log")
async def equipment_log(payload: dict):
    user = payload.get("user", "").strip()
    equipment = payload.get("equipment", "").strip()
    tag = payload.get("tag", "").strip()
    location = payload.get("location", "").strip()
    status = payload.get("status", "installed").strip()

    if not user:
        raise HTTPException(status_code=400, detail="No user provided")

    if not equipment or not location:
        raise HTTPException(status_code=400, detail="Missing required fields")

    filename = get_equipment_filename(user)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {equipment} | {tag} | {location} | {status}\n"

    append_line(filename, line)

    return {"status": "saved"}


@app.post("/equipment-report")
async def equipment_report(payload: dict):
    user = payload.get("user", "").strip()

    if not user:
        raise HTTPException(status_code=400, detail="No user provided")

    filename = get_equipment_filename(user)

    try:
        if not os.path.exists(filename):
            return {"text": "No equipment logged yet."}

        with open(filename, "r", encoding="utf-8") as f:
            data = f.read()

        if not data.strip():
            return {"text": "No equipment logged yet."}

        result = await route_prompt(
            f"Create a clean installed equipment report with locations:\n{data}",
            model="openai",
            personality="professional",
        )

        if result is None:
            raise HTTPException(status_code=500, detail="route_prompt returned None")

        return {"text": result["text"]}

    except Exception as e:
        print("EQUIPMENT_REPORT_ERROR:", repr(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/equipment-list")
async def equipment_list(payload: dict):
    user = payload.get("user", "").strip()

    if not user:
        raise HTTPException(status_code=400, detail="No user provided")

    filename = get_equipment_filename(user)

    if not os.path.exists(filename):
        return {"items": []}

    items = []

    with open(filename, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue

            timestamp = ""
            rest = line

            if line.startswith("[") and "]" in line:
                closing_index = line.find("]")
                timestamp = line[1:closing_index]
                rest = line[closing_index + 1:].strip()

            parts = [p.strip() for p in rest.split("|")]

            equipment = parts[0] if len(parts) > 0 else ""
            tag = parts[1] if len(parts) > 1 else ""
            location = parts[2] if len(parts) > 2 else ""
            status = parts[3] if len(parts) > 3 else ""

            items.append({
                "timestamp": timestamp,
                "equipment": equipment,
                "tag": tag,
                "location": location,
                "status": status,
            })

    return {"items": items}


@app.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"

    with open(file_location, "wb") as f:
        f.write(await file.read())

    return {"status": "uploaded"}