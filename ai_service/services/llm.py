import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate

# Load environment variables
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# Initialize Groq LLM
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.1-8b-instant"
)

# -------------------------------------------------------
# 🔹 1. DOUBT SOLVING FUNCTION (USED IN /ask-doubt)
# -------------------------------------------------------

def generate_answer(question: str, context: str) -> str:
    try:
        prompt = PromptTemplate.from_template(
            """You are a helpful AI tutor.

Use ONLY the following course content to answer the student's question.

Course Content:
{context}

Student Question:
{question}

Rules:
- Answer clearly and simply
- Do not add extra information
- If answer is not in content, say "I don't know"

Answer:"""
        )

        chain = prompt | llm

        response = chain.invoke({
            "context": context,
            "question": question
        })

        return response.content

    except Exception as e:
        print(f"Doubt LLM Error: {e}")
        return f"Error: {str(e)}"


# -------------------------------------------------------
# 🔹 2. CHAT FUNCTION (USED IN /chat)
# -------------------------------------------------------

def generate_chat_response(student_id: str, message: str, history: list) -> str:
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a friendly, encouraging AI tutor.\n"
                    "Help students understand concepts clearly.\n"
                    "Keep answers simple, short, and conversational."
                )
            }
        ]

        # ✅ IMPORTANT: history already includes latest message
        messages.extend(history)

        # ❌ DO NOT append message again (avoids duplication bug)

        response = llm.invoke(messages)

        return response.content

    except Exception as e:
        print(f"Chat LLM Error: {e}")
        return "I'm having trouble right now. Please try again!"


def _extract_json_array(text: str):
    """Best-effort extraction of a JSON array from a model response."""
    if not text:
        return None

    cleaned = text.replace("```json", "").replace("```", "").strip()
    if cleaned.startswith("[") and cleaned.endswith("]"):
        try:
            return json.loads(cleaned)
        except Exception:
            pass

    match = re.search(r"\[[\s\S]*\]", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None

    return None


def _fallback_quiz_from_context(context: str, count: int = 5) -> list:
    """Create a simple deterministic quiz when the LLM output can't be parsed."""
    text = " ".join((context or "").split())
    if not text:
        return []

    # Split into short chunks and use them as prompts.
    chunks = [chunk.strip() for chunk in re.split(r"[\n\.\?\!;]+", text) if chunk.strip()]
    if not chunks:
        chunks = [text]

    quiz = []
    for index, chunk in enumerate(chunks[:count]):
        words = chunk.split()
        correct = " ".join(words[: min(6, len(words))]) if words else "the provided content"
        distractor_1 = "General concept"
        distractor_2 = "Unrelated topic"
        distractor_3 = "None of the above"
        options = [correct, distractor_1, distractor_2, distractor_3]
        quiz.append({
            "question": f"Which option best matches the content snippet: '{correct[:70]}'?",
            "options": options,
            "answer": correct,
        })

    return quiz
    

def generate_quiz(context: str) -> list:
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert teacher. Based ONLY on the provided context, generate 5 multiple-choice questions. "
                    "You MUST return the output strictly as a JSON list of objects. "
                    "Do not include markdown formatting like ```json. "
                    "Use this exact format: "
                    "[{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"The correct option text\"}]"
                )
            },
            {
                "role": "user",
                "content": f"Context:\n{context}"
            }
        ]

        response = llm.invoke(messages)

        # Try strict JSON first, then best-effort extraction.
        quiz_data = _extract_json_array(getattr(response, "content", ""))

        if isinstance(quiz_data, dict):
            quiz_data = quiz_data.get("quiz") or quiz_data.get("questions")

        if isinstance(quiz_data, list) and quiz_data:
            normalized = []
            for item in quiz_data:
                if not isinstance(item, dict):
                    continue
                options = item.get("options") or []
                answer = item.get("answer") or item.get("correctAnswer") or item.get("correct")
                if isinstance(answer, int) and 0 <= answer < len(options):
                    answer = options[answer]
                if not options or not answer:
                    continue
                normalized.append({
                    "question": item.get("question", ""),
                    "options": options,
                    "answer": answer,
                })

            if normalized:
                return normalized

        # Fallback: generate a deterministic quiz so the endpoint never fails silently.
        fallback_quiz = _fallback_quiz_from_context(context)
        if fallback_quiz:
            return fallback_quiz

        return []

    except json.JSONDecodeError:
        print("❌ JSON Decode Error: AI returned invalid format")
        return _fallback_quiz_from_context(context)
    except Exception as e:
        print(f"❌ Quiz Generation Error: {e}")
        return _fallback_quiz_from_context(context)
