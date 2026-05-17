from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.faiss_db import DB_PATH, build_metadata_filter, get_embeddings
from services.llm import generate_quiz
from langchain_community.vectorstores import FAISS
import os

router = APIRouter()

# Request model
class QuizRequest(BaseModel):
    subject: str
    chapter: str
    topic: Optional[str] = None
    class_id: Optional[str] = None
    teacher_id: Optional[str] = None


@router.post("/generate-quiz")
async def create_quiz(request: QuizRequest):
    try:
        # 🔹 1. Check if FAISS DB exists
        if not os.path.exists(DB_PATH):
            raise HTTPException(
                status_code=404,
                detail="Knowledge base is empty. Upload content first."
            )
        
        print(f"\n[QUIZ] Generating for: {request.subject} - {request.chapter}")

        # 🔹 2. Load FAISS DB
        vector_db = FAISS.load_local(
            DB_PATH,
            get_embeddings(),
            allow_dangerous_deserialization=True
        )
        
        # 🔹 3. Fetch relevant content with multiple search strategies
        search_filters = []
        
        # Strategy 1: Most specific (class+topic+teacher)
        if request.class_id:
            search_filters.append(("Class+Topic+Teacher", build_metadata_filter(
                request.subject,
                request.chapter,
                request.topic,
                request.class_id,
                request.teacher_id
            )))
            
            # Strategy 2: Class+Topic (no teacher)
            if request.topic:
                search_filters.append(("Class+Topic", build_metadata_filter(
                    request.subject,
                    request.chapter,
                    request.topic,
                    request.class_id,
                    None
                )))
            
            # Strategy 3: Class only
            search_filters.append(("Class Only", build_metadata_filter(
                request.subject,
                request.chapter,
                None,
                request.class_id,
                None
            )))
        
        # Strategy 4: Subject+Chapter+Topic
        search_filters.append(("Subject+Chapter+Topic", build_metadata_filter(
            request.subject,
            request.chapter,
            request.topic
        )))
        
        # Strategy 5: Subject+Chapter (broadest)
        search_filters.append(("Subject+Chapter", build_metadata_filter(
            request.subject,
            request.chapter
        )))

        search_results = []
        query_text = request.topic or request.chapter or request.subject
        
        for strategy_name, search_filter in search_filters:
            print(f"   📍 Attempt: {strategy_name} with filter: {search_filter}")
            try:
                search_results = vector_db.similarity_search(
                    query_text,
                    k=12,
                    filter=search_filter
                )
                if search_results:
                    print(f"   ✅ Found {len(search_results)} chunks using {strategy_name}")
                    break
                else:
                    print(f"   ❌ No results with {strategy_name}")
            except Exception as e:
                print(f"   ⚠️ Error with {strategy_name}: {str(e)}")
                continue
        
        # Last resort: No filter
        if not search_results:
            print(f"   📍 Attempt: No Filter (Last Resort)")
            try:
                search_results = vector_db.similarity_search(
                    query_text,
                    k=12
                )
                if search_results:
                    print(f"   ✅ Found {len(search_results)} chunks with no filter")
                else:
                    print(f"   ❌ No results even with unfiltered search")
            except Exception as e:
                print(f"   ⚠️ Error with unfiltered search: {str(e)}")
        
        # 🔹 4. Handle no content
        if not search_results:
            raise HTTPException(
                status_code=404,
                detail="No content found for this chapter."
            )
        
        # 🔹 5. Combine chunks
        context = "\n\n".join([doc.page_content for doc in search_results])
        
        # 🔹 6. Generate quiz using LLM
        quiz = generate_quiz(context)
        
        # 🔹 7. Validate output
        if not quiz or not isinstance(quiz, list):
            raise HTTPException(
                status_code=500,
                detail="AI failed to generate valid quiz. Try again."
            )
        
        return {
            "status": "success",
            "subject": request.subject,
            "chapter": request.chapter,
            "topic": request.topic or "General",
            "total_questions": len(quiz),
            "quiz": quiz
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
