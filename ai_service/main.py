from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Import routes
from routes import content, doubt, chat,quiz

# Load environment variables
load_dotenv(Path(__file__).resolve().parent / ".env")

# Initialize FastAPI app
app = FastAPI(
    title="AI Student Companion API",
    description="Backend AI service for processing course content and answering student doubts.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routes
app.include_router(content.router)
app.include_router(doubt.router)
app.include_router(chat.router)  # ✅ NEW
app.include_router(quiz.router)  # ✅ NEW

# Health check
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "AI Engine is running perfectly!"
    }

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
