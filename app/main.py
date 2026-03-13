from fastapi import FastAPI, UploadFile, File, Form
from app.services.ollama_client import persona_engine
from app.core.parser import parse_document_to_markdown
from app.core.web_search import get_web_context # Import the new tool
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List

app = FastAPI(title="Persona AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- THE MEMORY BANK ---
# This stores the parsed PDF and chat history for every active chat tab
session_db: Dict[str, dict] = {}

# Prompts for different modes
STUDY_PROMPT = """
You are a highly capable Academic Tutor helping a university student. 
Your primary goal is to explain concepts clearly, accurately, and with excellent visual structure.

CRITICAL FORMATTING RULES:
1. ALWAYS use Markdown formatting.
2. Use `###` for main section headers.
3. Use bullet points (`-` or `*`) for lists, techniques, or causes.
4. **Bold** all key terms and important definitions.
5. Keep paragraphs short and scannable.

Use the provided 'Document Context' to answer the question. If the document doesn't have the answer, state that, and then use your general knowledge.
"""

WEB_PROMPT = "You are a helpful AI assistant. Use the provided web search context to answer the user's question accurately and concisely."

@app.get("/")
def read_root():
    return {"status": "Persona AI is online"}

@app.post("/ask")
async def ask_persona(query: str):
    response = await persona_engine.chat(query, "You are a helpful AI assistant.")
    return {"response": response}

@app.post("/web-ask")
async def web_ask(query: str, session_id: str = Form("default-web")):
    # 1. Fetch live internet data
    web_context = get_web_context(query)
    
    # Initialize web memory if it doesn't exist
    if session_id not in session_db:
        session_db[session_id] = {"chat_history": ""}
        
    history = session_db[session_id]["chat_history"]
    
    # 2. Combine web data, history, and question
    combined_query = f"Web Context:\n{web_context}\n\nPrevious Conversation:\n{history}\n\nUser Question:\n{query}"
    
    # 3. Send to Ollama
    response = await persona_engine.chat(combined_query, WEB_PROMPT)
    
    # 4. Save to history
    session_db[session_id]["chat_history"] += f"\nUser: {query}\nAI: {response}\n"
    
    return {"response": response}

# --- STUDY MODE INITIALIZATION ---
@app.post("/upload-and-study")
async def upload_and_study(
    question: str = Form(...), 
    file: UploadFile = File(...),
    session_id: str = Form(...) # The React app MUST send this now
):
    """Parses the PDF, saves it to memory, and answers the first question."""
    
    file_bytes = await file.read()
    document_context = await parse_document_to_markdown(file_bytes, file.filename)
    
    # Initialize the memory slot for this specific chat
    session_db[session_id] = {
        "document_context": document_context,
        "chat_history": ""
    }
    
    combined_query = f"Document Context:\n{document_context}\n\nUser Question:\n{question}"
    response = await persona_engine.chat(combined_query, STUDY_PROMPT)
    
    # Log the first interaction
    session_db[session_id]["chat_history"] += f"\nUser: {question}\nAI: {response}\n"
    
    return {"filename": file.filename, "answer": response}

# --- STUDY MODE FOLLOW-UP ---
@app.post("/study-ask")
async def study_ask(
    question: str = Form(...),
    session_id: str = Form(...)
):
    """Answers follow-up questions using the saved PDF and chat history."""
    
    if session_id not in session_db or "document_context" not in session_db[session_id]:
        return {"answer": "Session memory cleared or file not found. Please re-upload your document."}
        
    document_context = session_db[session_id]["document_context"]
    history = session_db[session_id]["chat_history"]
    
    # Inject the saved document AND the history into the query
    combined_query = f"Document Context:\n{document_context}\n\nPrevious Conversation:\n{history}\n\nNew User Question:\n{question}"
    
    response = await persona_engine.chat(combined_query, STUDY_PROMPT)
    
    # Update the running history
    session_db[session_id]["chat_history"] += f"\nUser: {question}\nAI: {response}\n"
    
    return {"answer": response}