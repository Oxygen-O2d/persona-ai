import pytesseract
from pdf2image import convert_from_bytes
import pymupdf4llm
import fitz
import io
import os
from docx import Document # For .docx files

# ... (keep your Tesseract and Poppler paths) ...

async def parse_document_to_markdown(file_bytes: bytes, filename: str) -> str:
    """
    The 'Universal Translator': Routes files to the correct parser based 
    on their extension.
    """
    ext = filename.split('.')[-1].lower()

    try:
        # --- 1. HANDLE PLAIN TEXT (.txt) ---
        if ext == 'txt':
            return file_bytes.decode("utf-8")

        # --- 2. HANDLE WORD DOCS (.docx) ---
        elif ext == 'docx':
            doc = Document(io.BytesIO(file_bytes))
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return "\n\n".join(full_text)

        # --- 3. HANDLE PDF (Standard + OCR) ---
        elif ext == 'pdf':
            with fitz.open(stream=file_bytes, filetype="pdf") as doc:
                text_content = pymupdf4llm.to_markdown(doc)
                
                # If it's a scan, use your OCR logic
                if len(text_content.strip()) < 150:
                    images = convert_from_bytes(file_bytes, poppler_path=POPPLER_PATH)
                    ocr_text = ""
                    for i, image in enumerate(images):
                        page_text = pytesseract.image_to_string(image)
                        ocr_text += f"\n--- OCR PAGE {i+1} ---\n{page_text}"
                    return ocr_text
                return text_content

        return "❌ Unsupported file format."

    except Exception as e:
        return f"Error parsing {filename}: {str(e)}"