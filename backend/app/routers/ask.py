from fastapi import APIRouter
from pydantic import BaseModel
from app.services.routing_service import route_prompt

router = APIRouter()

class AskRequest(BaseModel):
    prompt: str
    model: str = "auto"
    personality: str = "normal"

@router.post("/ask")
async def ask_ai(req: AskRequest):
    return await route_prompt(req.prompt, req.model, req.personality)
