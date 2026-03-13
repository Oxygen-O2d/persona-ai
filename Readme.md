🚀 Persona AI: Your Intelligent Academic TutorPersona AI is a full-stack, local AI-powered study assistant designed to help students master complex academic materials. Built with FastAPI and React, it leverages Vectorless RAG (Retrieval-Augmented Generation) to provide highly accurate, context-aware answers from your personal documents and the live web.Created by Pratham Tailor.✨ Key Features📚 Multi-Format RAG Engine: Seamlessly chat with PDFs, DOCX, and TXT files. The backend automatically parses the text and feeds it into the LLM context window.🧠 Smart Session Memory: Built-in context memory that maintains conversation history and document context across different chat tabs, just like commercial AI tools.☁️ Google Drive Integration: Directly import study materials from your Google Drive using the integrated Google Picker API (OAuth 2.0).🌐 Live Web Search: Access real-time information from the internet to supplement your local study materials.📝 Textbook-Grade Formatting: High-fidelity Markdown rendering with remark-gfm and Tailwind Typography, supporting tables, bold terms, and structured headers.📖 Built-in PDF Preview: Side-by-side view of your documents using @react-pdf-viewer for an integrated reading and chatting experience.🛠️ Tech StackFrontendFramework: React.js (Vite)Styling: Tailwind CSS v4Animations: Framer MotionIcons: Lucide-ReactPDF Rendering: @react-pdf-viewer/coreBackendFramework: FastAPI (Python)AI Engine: Ollama (Running Llama 3.1 8B locally)Document Parsing: pymupdf4llm, python-docx, and pytesseract (OCR for scanned images)Integration: Google Drive API v3🚀 Getting StartedPrerequisitesOllama installed and running locally with the llama3.1 model.Node.js (v18+) and Python (3.10+).Tesseract OCR installed on your system (for scanned PDF fallback).InstallationClone the Repository:git clone [https://github.com/Oxygen-02d/persona-ai.git](https://github.com/Oxygen-02d/persona-ai.git)
cd persona-ai
Backend Setup:cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
Frontend Setup:cd frontend
npm install
npm run dev
📜 Academic FocusThis project was developed as a comprehensive study tool to assist with preparation for the GATE 2026 Computer Science exam and Gujarat Technological University (GTU) coursework in Artificial Intelligence and Machine Learning (AIML minors).Built with ❤️ and Llama 3.1