# 🚀 Persona AI: Your Intelligent Academic Tutor

**Persona AI** is a full-stack, local AI-powered study assistant designed to help students master complex academic materials. Built with **FastAPI** and **React**, it leverages **Vectorless RAG (Retrieval-Augmented Generation)** to provide highly accurate, context-aware answers from your personal documents and the live web.

Created by **Pratham Tailor**.

## ✨ Key Features

* 📚 **Multi-Format RAG Engine**: Seamlessly chat with **PDFs, DOCX, and TXT** files. The backend automatically parses the text and feeds it into the LLM context window.
* 🧠 **Smart Session Memory**: Built-in context memory that maintains conversation history and document context across different chat tabs, just like commercial AI tools.
* ☁️ **Google Drive Integration**: Directly import study materials from your Google Drive using the integrated **Google Picker API** (OAuth 2.0).
* 🌐 **Live Web Search**: Access real-time information from the internet to supplement your local study materials.
* 📝 **Textbook-Grade Formatting**: High-fidelity Markdown rendering with `remark-gfm` and Tailwind Typography, supporting tables, bold terms, and structured headers.
* 📖 **Built-in PDF Preview**: Side-by-side view of your documents using `@react-pdf-viewer` for an integrated reading and chatting experience.

## 🛠️ Tech Stack

### Frontend
* **Framework**: React.js (Vite)
* **Styling**: Tailwind CSS v4
* **Animations**: Framer Motion
* **Icons**: Lucide-React
* **PDF Rendering**: `@react-pdf-viewer/core`

### Backend
* **Framework**: FastAPI (Python)
* **AI Engine**: Ollama (Running Llama 3.1 8B locally)
* **Document Parsing**: `pymupdf4llm`, `python-docx`, and `pytesseract` (OCR for scanned images)
* **Integration**: Google Drive API v3

## 🚀 Getting Started

### Prerequisites
* [Ollama](https://ollama.com/) installed and running locally with the `llama3.1` model.
* Node.js (v18+) and Python (3.10+).
* Tesseract OCR installed on your system (for scanned PDF fallback).

---

### Step 1: Clone the Repository

```bash
git clone [https://github.com/Oxygen-02d/persona-ai.git](https://github.com/Oxygen-02d/persona-ai.git)
cd persona-ai
```

### Step 2: Backend Setup

```bash
cd backend
python -m venv venv

# Activate on Windows:
venv\Scripts\activate

# Activate on macOS/Linux:
source venv/bin/activate

# Install dependencies and run
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Step 3: Frontend Setup

```bash
cd persona-frontend
npm install
npm run dev
```

---

*Built with ❤️ and Llama 3.1*