import os
import pickle
import hashlib
from datetime import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

# Ensure data folder exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "faiss_index")
embeddings = None
MIN_INDEX_TEXT_LENGTH = 1

def get_embeddings():
    global embeddings
    if embeddings is None:
        try:
            embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
                model_kwargs={"local_files_only": True}
            )
        except Exception:
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return embeddings

def _clean_value(value, fallback=""):
    if value is None:
        return fallback
    value = str(value).strip()
    return value if value else fallback

def build_metadata_filter(subject: str, chapter: str, topic: str = None, class_id: str = None, teacher_id: str = None):
    """
    Build a metadata filter for FAISS similarity search.
    IMPORTANT: Only include non-empty values to ensure proper matching.
    Empty values are problematic with FAISS filters and cause search failures.
    """
    metadata_filter = {}
    
    subject = _clean_value(subject)
    if subject:
        metadata_filter["subject"] = subject
    
    chapter = _clean_value(chapter)
    if chapter:
        metadata_filter["chapter"] = chapter
    
    topic = _clean_value(topic)
    if topic:
        metadata_filter["topic"] = topic
    
    class_id = _clean_value(class_id)
    if class_id:
        metadata_filter["class_id"] = class_id
    
    teacher_id = _clean_value(teacher_id)
    if teacher_id:
        metadata_filter["teacher_id"] = teacher_id
    
    # If no valid filters, return empty dict (will search all documents)
    return metadata_filter

def _new_splitter():
    return RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=140,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""]
    )

def index_content(
    text: str,
    subject: str,
    chapter: str,
    topic: str = "",
    class_id: str = "",
    teacher_id: str = "",
    source_type: str = "manual"
):
    text = (text or "").strip()
    if len(text) < MIN_INDEX_TEXT_LENGTH:
        return {
            "status": "failed",
            "chunks_stored": 0,
            "text_length": len(text),
            "reason": "No text available to index."
        }

    chunks = _new_splitter().split_text(text)
    chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
    if not chunks:
        return {
            "status": "failed",
            "chunks_stored": 0,
            "text_length": len(text),
            "reason": "No valid chunks were created from the extracted text."
        }

    now = datetime.utcnow().isoformat()
    base_metadata = {
        "subject": _clean_value(subject, "General"),
        "chapter": _clean_value(chapter, "General"),
        "topic": _clean_value(topic, "General"),
        "class_id": _clean_value(class_id),
        "teacher_id": _clean_value(teacher_id),
        "source_type": _clean_value(source_type, "manual"),
        "text_length": len(text),
        "source_hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "created_at": now
    }
    metadatas = [base_metadata.copy() for _ in chunks]

    try:
        print(f"\n📚 Indexing {len(chunks)} chunks")
        print(f"   Subject: {base_metadata['subject']}")
        print(f"   Chapter: {base_metadata['chapter']}")
        print(f"   Topic: {base_metadata['topic']}")
        print(f"   Class ID: {base_metadata['class_id']}")
        print(f"   Teacher ID: {base_metadata['teacher_id']}")
        
        if os.path.exists(DB_PATH):
            print(f"   Loading existing FAISS index...")
            vector_db = FAISS.load_local(DB_PATH, get_embeddings(), allow_dangerous_deserialization=True)
            vector_db.add_texts(texts=chunks, metadatas=metadatas)
            print(f"   ✅ Added to existing index")
        else:
            print(f"   Creating new FAISS index...")
            vector_db = FAISS.from_texts(texts=chunks, embedding=get_embeddings(), metadatas=metadatas)
            print(f"   ✅ Created new index")

        vector_db.save_local(DB_PATH)
        print(f"   💾 Index saved to {DB_PATH}")

        verification = list_knowledge()
        matching_chunks = sum(
            item.get("chunks", 0)
            for item in verification.get("items", [])
            if item.get("subject") == base_metadata["subject"]
            and item.get("chapter") == base_metadata["chapter"]
            and item.get("topic") == base_metadata["topic"]
            and item.get("class_id", "") == base_metadata["class_id"]
            and item.get("teacher_id", "") == base_metadata["teacher_id"]
        )

        print(f"   🔍 Verification: {matching_chunks} chunks found for this exact metadata")
        print(f"   📊 Total chunks in DB: {verification.get('total_chunks', 0)}\n")

        if matching_chunks <= 0:
            print(f"   ⚠️ WARNING: Chunks were saved but verification didn't find them!")
            return {
                "status": "failed",
                "chunks_stored": 0,
                "text_length": len(text),
                "reason": "FAISS save completed but verification did not find the indexed chunks."
            }

        return {
            "status": "success",
            "chunks_stored": len(chunks),
            "text_length": len(text),
            "metadata": base_metadata
        }
    except Exception as e:
        print(f"❌ Error storing content: {e}\n")
        return {
            "status": "failed",
            "chunks_stored": 0,
            "text_length": len(text),
            "reason": str(e)
        }

def process_and_store_content(
    text: str,
    subject: str,
    chapter: str,
    topic: str = "",
    class_id: str = "",
    teacher_id: str = "",
    source_type: str = "manual"
):
    return index_content(text, subject, chapter, topic, class_id, teacher_id, source_type).get("chunks_stored", 0)

def list_knowledge():
    if not os.path.exists(DB_PATH):
        return {
            "status": "success",
            "total_chunks": 0,
            "items": [],
            "subjects": []
        }

    pkl_path = os.path.join(DB_PATH, "index.pkl")
    if not os.path.exists(pkl_path):
        return {
            "status": "success",
            "total_chunks": 0,
            "items": [],
            "subjects": []
        }

    try:
        with open(pkl_path, "rb") as file:
            docstore, _ = pickle.load(file)

        docs = getattr(docstore, "_dict", {}).values()
        grouped = {}

        for doc in docs:
            metadata = getattr(doc, "metadata", {}) or {}
            subject = _clean_value(metadata.get("subject"), "General")
            chapter = _clean_value(metadata.get("chapter"), "General")
            topic = _clean_value(metadata.get("topic"), "General")
            class_id = _clean_value(metadata.get("class_id"))
            teacher_id = _clean_value(metadata.get("teacher_id"))
            source_type = _clean_value(metadata.get("source_type"), "unknown")
            created_at = _clean_value(metadata.get("created_at"))
            key = (subject, chapter, topic, class_id, teacher_id)

            if key not in grouped:
                grouped[key] = {
                    "subject": subject,
                    "chapter": chapter,
                    "topic": topic,
                    "class_id": class_id,
                    "teacher_id": teacher_id,
                    "source_type": source_type,
                    "text_length": int(metadata.get("text_length") or 0),
                    "chunks": 0,
                    "last_added": created_at
                }

            grouped[key]["chunks"] += 1
            grouped[key]["text_length"] = max(grouped[key].get("text_length", 0), int(metadata.get("text_length") or 0))
            if created_at and created_at > (grouped[key].get("last_added") or ""):
                grouped[key]["last_added"] = created_at

        items = sorted(
            grouped.values(),
            key=lambda item: (
                item["subject"].lower(),
                item["chapter"].lower(),
                item["topic"].lower()
            )
        )
        subjects = sorted({item["subject"] for item in items})

        return {
            "status": "success",
            "total_chunks": sum(item["chunks"] for item in items),
            "items": items,
            "subjects": subjects
        }
    except Exception as e:
        print(f"❌ Error in list_knowledge: {e}")
        return {
            "status": "error",
            "total_chunks": 0,
            "items": [],
            "subjects": [],
            "error": str(e)
        }


def remove_content(subject: str, chapter: str, topic: str = None, class_id: str = None, teacher_id: str = None):
    """
    Remove all documents matching the provided metadata by rebuilding the FAISS index without them.
    Returns number of chunks removed.
    """
    if not os.path.exists(DB_PATH):
        return 0

    pkl_path = os.path.join(DB_PATH, "index.pkl")
    if not os.path.exists(pkl_path):
        return 0

    try:
        with open(pkl_path, "rb") as file:
            docstore, _ = pickle.load(file)

        docs = list(getattr(docstore, "_dict", {}).values())

        keep_texts = []
        keep_metas = []
        removed = 0

        for doc in docs:
            metadata = getattr(doc, "metadata", {}) or {}
            s = _clean_value(metadata.get("subject"), "General")
            ch = _clean_value(metadata.get("chapter"), "General")
            tp = _clean_value(metadata.get("topic"), "General")
            cid = _clean_value(metadata.get("class_id"))
            tid = _clean_value(metadata.get("teacher_id"))

            match = True
            if _clean_value(subject) and s != _clean_value(subject):
                match = False
            if _clean_value(chapter) and ch != _clean_value(chapter):
                match = False
            if topic is not None and _clean_value(topic) and tp != _clean_value(topic):
                match = False
            if class_id is not None and _clean_value(class_id) and cid != _clean_value(class_id):
                match = False
            if teacher_id is not None and _clean_value(teacher_id) and tid != _clean_value(teacher_id):
                match = False

            if match:
                removed += 1
                continue

            # keep this doc
            content = getattr(doc, "page_content", None)
            if content is None:
                # fallback, try text attribute
                content = getattr(doc, "text", "")
            keep_texts.append(content)
            keep_metas.append(metadata)

        # Rebuild index from kept docs
        if keep_texts:
            vector_db = FAISS.from_texts(texts=keep_texts, embedding=get_embeddings(), metadatas=keep_metas)
            vector_db.save_local(DB_PATH)
        else:
            # no docs remain: remove index files
            try:
                for fname in os.listdir(DB_PATH):
                    os.remove(os.path.join(DB_PATH, fname))
            except Exception:
                pass

        return removed

    except Exception as e:
        print(f"Error removing content: {e}")
        return 0
