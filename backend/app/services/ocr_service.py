import pdfplumber
import pytesseract
from PIL import Image
import os
import json
import zipfile
import xml.etree.ElementTree as ET
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
                try:
                    df = pd.read_csv(file_path, encoding="utf-8")
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding="latin1")
                text = df.to_string(index=False)
            elif ext in [".xls", ".xlsx"]:
                df = pd.read_excel(file_path)
                text = df.to_string(index=False)
            elif ext == ".docx":
                # Extract text directly from docx XML without requiring python-docx
                try:
                    with zipfile.ZipFile(file_path) as z:
                        xml_content = z.read("word/document.xml")
                        tree = ET.fromstring(xml_content)
                        paragraphs = []
                        for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                            texts = [node.text for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if node.text]
                            if texts:
                                paragraphs.append("".join(texts))
                        text = "\n".join(paragraphs)
                except Exception as docx_err:
                    print(f"Error parsing .docx via zipfile: {docx_err}")
                    raise docx_err
            elif ext == ".json":
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    data = json.load(f)
                    text = json.dumps(data, indent=2)
            elif ext == ".txt":
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            else:
                raise ValueError(f"Unsupported file format: {ext}")
        except Exception as e:
            print(f"Error during OCR extraction for {filename}: {e}")
            raise e
        
        return text.strip()
