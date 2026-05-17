from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.faiss_db import index_content, list_knowledge, remove_content

router = APIRouter()

class UploadRequest(BaseModel):
    text: str
    subject: str
    chapter: str
    topic: Optional[str] = None
    class_id: Optional[str] = None
    teacher_id: Optional[str] = None
    source_type: Optional[str] = "manual"

@router.get("/knowledge")
async def get_knowledge():
    try:
        return list_knowledge()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-content")
async def upload_content(request: UploadRequest):
    try:
        # Validation
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        print(f"Uploading content for {request.subject} - {request.chapter}")

        result = index_content(
            text=request.text,
            subject=request.subject,
            chapter=request.chapter,
            topic=request.topic or "General",
            class_id=request.class_id or "",
            teacher_id=request.teacher_id or "",
            source_type=request.source_type or "manual"
        )

        if result.get("status") != "success" or result.get("chunks_stored", 0) <= 0:
            raise HTTPException(
                status_code=422,
                detail=result.get("reason") or "AI indexing failed. No chunks were stored."
            )

        return {
            "status": "success",
            "chunks_stored": result.get("chunks_stored", 0),
            "text_length": result.get("text_length", 0),
            "metadata": result.get("metadata", {}),
            "subject": request.subject,
            "chapter": request.chapter,
            "topic": request.topic or "General"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RemoveRequest(BaseModel):
    subject: str
    chapter: str
    topic: Optional[str] = None
    class_id: Optional[str] = None
    teacher_id: Optional[str] = None


@router.post("/remove-content")
async def remove_content_route(request: RemoveRequest):
    try:
        removed = remove_content(
            subject=request.subject,
            chapter=request.chapter,
            topic=request.topic,
            class_id=request.class_id,
            teacher_id=request.teacher_id
        )
        return {"status": "success", "removed_chunks": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
