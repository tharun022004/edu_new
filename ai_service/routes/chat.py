from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llm import generate_chat_response
from db.student_db import save_message, get_chat_history

router = APIRouter()

class ChatRequest(BaseModel):
    student_id: str
    message: str

@router.post("/chat")
async def general_chat(request: ChatRequest):
    try:
        # 1. Validation
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
            
        print(f"[CHAT] Student {request.student_id}: {request.message}")

        # 2. Save user message FIRST (important for consistency)
        save_message(request.student_id, "user", request.message)

        # 3. Fetch updated history (includes latest message)
        history = get_chat_history(request.student_id)

        # 4. Generate AI response
        ai_response = generate_chat_response(
            request.student_id,
            request.message,
            history
        )

        # 5. Save AI response
        save_message(request.student_id, "assistant", ai_response)

        return {
            "status": "success",
            "reply": ai_response
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))