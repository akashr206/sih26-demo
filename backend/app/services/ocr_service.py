import pdfplumber
import pytesseract
from PIL import Image
import os
import pandas as pd
from app.services.interfaces import OCRServiceInterface

class OCRService(OCRServiceInterface):
    def extract_text_from_file(self, file_path: str, filename: str) -> str:
        text = ""
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            if ext == ".pdf":
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
            elif ext in [".png", ".jpg", ".jpeg", ".tiff"]:
                image = Image.open(file_path)
                text = pytesseract.image_to_string(image)
            elif ext == ".csv":
                df = pd.read_csv(file_path)
                text = df.to_string(index=False)
            elif ext in [".xls", ".xlsx"]:
                df = pd.read_excel(file_path)
                text = df.to_string(index=False)
            elif ext == ".txt":
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()
            else:
                raise ValueError(f"Unsupported file format: {ext}")
        except Exception as e:
            print(f"Error during OCR extraction: {e}")
            raise e
        
        return text.strip()
