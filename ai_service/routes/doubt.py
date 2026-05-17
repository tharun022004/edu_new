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
        
        print(f"\n🔍 Solving doubt for Student {request.student_id}")
        print(f"   Subject: {request.subject}, Chapter: {request.chapter}, Topic: {request.topic}")
        print(f"   Class ID: {request.class_id}, Teacher ID: {request.teacher_id}")

        # 2. Load FAISS and search
        vector_db = FAISS.load_local(DB_PATH, get_embeddings(), allow_dangerous_deserialization=True)

        search_results = []
        search_attempts = []

        # Strategy 1: Search with full specificity (class_id + topic + teacher_id)
        if request.class_id:
            attempt1 = build_metadata_filter(
                request.subject,
                request.chapter,
                request.topic,
                request.class_id,
                request.teacher_id
            )
            if attempt1:
                search_attempts.append(("Class+Topic+Teacher", attempt1))

        # Strategy 2: Search with class_id + topic (no teacher_id)
        if request.class_id and request.topic:
            attempt2 = build_metadata_filter(
                request.subject,
                request.chapter,
                request.topic,
                request.class_id,
                None
            )
            if attempt2:
                search_attempts.append(("Class+Topic", attempt2))

        # Strategy 3: Search with just class_id (no topic)
        if request.class_id:
            attempt3 = build_metadata_filter(
                request.subject,
                request.chapter,
                None,
                request.class_id,
                None
            )
            if attempt3:
                search_attempts.append(("Class Only", attempt3))

        # Strategy 4: Search by subject + chapter only (broadest, no class_id)
        attempt4 = build_metadata_filter(
            request.subject,
            request.chapter,
            request.topic,
            None,
            None
        )
        if attempt4:
            search_attempts.append(("Subject+Chapter+Topic", attempt4))

        # Strategy 5: Search by subject + chapter only (fallback without topic)
        attempt5 = build_metadata_filter(
            request.subject,
            request.chapter,
            None,
            None,
            None
        )
        if attempt5:
            search_attempts.append(("Subject+Chapter", attempt5))

        # Execute search attempts in order
        for strategy_name, search_filter in search_attempts:
            print(f"   📍 Attempt: {strategy_name} with filter: {search_filter}")
            try:
                search_results = vector_db.similarity_search(
                    request.question,
                    k=4,
                    filter=search_filter if search_filter else None
                )
                if search_results:
                    print(f"   ✅ Found {len(search_results)} chunks using {strategy_name}")
                    break
                else:
                    print(f"   ❌ No results with {strategy_name}")
            except Exception as e:
                print(f"   ⚠️ Error with {strategy_name}: {str(e)}")
                continue
        
        # Last resort: Search with no filter at all to find ANY matching content
        if not search_results:
            print(f"   📍 Attempt: No Filter (Last Resort)")
            try:
                search_results = vector_db.similarity_search(
                    request.question,
                    k=4
                )
                if search_results:
                    print(f"   ✅ Found {len(search_results)} chunks with no filter (unfiltered search)")
                else:
                    print(f"   ❌ No results even with unfiltered search")
            except Exception as e:
                print(f"   ⚠️ Error with unfiltered search: {str(e)}")
        
        print(f"   Final result: {len(search_results)} relevant chunks found\n")

        # 3. Handle no results
        if not search_results:
            return {
                "status": "success",
                "answer": "I couldn't find relevant content in the current chapter. Please check if content has been uploaded for this topic or ask your teacher."
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
