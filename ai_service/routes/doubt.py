from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.faiss_db import DB_PATH, build_metadata_filter, get_embeddings
from services.llm import  generate_answer
from langchain_community.vectorstores import FAISS
import os

router = APIRouter()

class DoubtRequest(BaseModel):
    question: str
    subject: str
    chapter: str
    student_id: str
    topic: Optional[str] = None
    class_id: Optional[str] = None
    teacher_id: Optional[str] = None

@router.post("/ask-doubt")
async def ask_doubt(request: DoubtRequest):
    try:
        # 1. Validation
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
            
        if not os.path.exists(DB_PATH):
            raise HTTPException(status_code=404, detail="Knowledge base is empty. Upload content first.")
        
        print(f"Solving doubt for Student {request.student_id} in {request.subject} - {request.chapter}")

        # 2. Load FAISS and search
        vector_db = FAISS.load_local(DB_PATH, get_embeddings(), allow_dangerous_deserialization=True)

        search_results = []
        search_attempts = []

        if request.class_id:
            search_attempts.append(
                build_metadata_filter(
                    request.subject,
                    request.chapter,
                    request.topic,
                    request.class_id,
                    request.teacher_id
                )
            )
            if request.topic:
                search_attempts.append(
                    build_metadata_filter(
                        request.subject,
                        request.chapter,
                        None,
                        request.class_id,
                        request.teacher_id
                    )
                )

        search_attempts.append(build_metadata_filter(request.subject, request.chapter, request.topic))
        if request.topic:
            search_attempts.append(build_metadata_filter(request.subject, request.chapter))

        for search_filter in search_attempts:
            search_results = vector_db.similarity_search(
                request.question,
                k=4,
                filter=search_filter
            )

            if search_results:
                break
        
        print(f"Found {len(search_results)} relevant chunks")

        # 3. Handle no results
        if not search_results:
            return {
                "status": "success",
                "answer": "I couldn't find this in the current chapter. Please check the topic or ask your teacher."
            }
        
        # 4. Combine chunks
        context = "\n\n".join([doc.page_content for doc in search_results])

        if not context.strip():
            return {
                "status": "success",
                "answer": "No useful content found in this chapter."
            }

        # 5. Generate answer
        final_answer = generate_answer(request.question, context)
        
        return {
            "status": "success",
            "answer": final_answer
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
