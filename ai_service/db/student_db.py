import sqlite3
import os

# Ensure data folder exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_FILE = os.path.join(DATA_DIR, "students.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create table (only once)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()


def save_message(student_id: str, role: str, message: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO chat_history (student_id, role, message) VALUES (?, ?, ?)",
        (student_id, role, message)
    )
    
    conn.commit()
    conn.close()


def get_chat_history(student_id: str, limit: int = 8):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 🔥 FIXED QUERY (includes id in inner select)
    cursor.execute(
        """SELECT role, message FROM 
           (SELECT id, role, message FROM chat_history 
            WHERE student_id = ? 
            ORDER BY id DESC 
            LIMIT ?) 
           ORDER BY id ASC""",
        (student_id, limit)
    )
    
    history = cursor.fetchall()
    conn.close()
    
    # Format for LLM
    formatted_history = []
    for role, message in history:
        formatted_history.append({
            "role": role,
            "content": message
        })
        
    return formatted_history


# Initialize DB
init_db()
