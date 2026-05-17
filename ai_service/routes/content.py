from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.faiss_db import index_content, list_knowledge, remove_content
import pickle
from services.faiss_db import DB_PATH
import os

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

@router.get("/knowledge/debug")
async def get_knowledge_debug():
    """Debug endpoint to see detailed knowledge base structure"""
    try:
        knowledge = list_knowledge()
        return {
            "status": "success",
            "summary": {
                "total_chunks": knowledge.get("total_chunks", 0),
                "total_subjects": len(knowledge.get("subjects", [])),
                "subjects": knowledge.get("subjects", [])
            },
            "details": knowledge.get("items", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/knowledge/debug-samples")
async def get_knowledge_debug_samples(subject: Optional[str] = None, chapter: Optional[str] = None, topic: Optional[str] = None, class_id: Optional[str] = None, teacher_id: Optional[str] = None, limit: int = 5):
    """Return sample page contents from the FAISS docstore for given metadata filters."""
    try:
        if not DB_PATH or not os.path.exists(DB_PATH):
            raise HTTPException(status_code=404, detail="Knowledge base not found")

        pkl_path = os.path.join(DB_PATH, "index.pkl")
        if not os.path.exists(pkl_path):
            raise HTTPException(status_code=404, detail="Index file not found")

        with open(pkl_path, "rb") as f:
            docstore, _ = pickle.load(f)

        docs = list(getattr(docstore, "_dict", {}).values())
        samples = []

        def matches(md_value, filter_value):
            if filter_value is None:
                return True
            try:
                return str(md_value or "").strip() == str(filter_value).strip()
            except Exception:
                return False

        for doc in docs:
            if len(samples) >= limit:
                break
            metadata = getattr(doc, "metadata", {}) or {}
            if not matches(metadata.get("subject"), subject):
                continue
            if not matches(metadata.get("chapter"), chapter):
                continue
            if not matches(metadata.get("topic"), topic):
                continue
            if not matches(metadata.get("class_id"), class_id):
                continue
            if not matches(metadata.get("teacher_id"), teacher_id):
                continue

            content = getattr(doc, "page_content", None)
            if content is None:
                content = getattr(doc, "text", "")

            samples.append({
                "metadata": metadata,
                "content_preview": (content or "").strip()[:200]
            })

        return {"status": "success", "samples": samples, "requested_limit": limit}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-content")
async def upload_content(request: UploadRequest):
    try:
        # Validation
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        print(f"📤 Uploading content for {request.subject} - {request.chapter}")

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
