from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import shutil
import os
import tempfile
from typing import List

from app.models.schemas import CaseCreate, CaseResponse, CaseAnalysisResponse
from app.services.case_service import CaseService
from app.services.ocr_service import OCRService
from app.services.nlp_service import NLPService
from app.services.graph_service import GraphService
from app.services.insights_service import InsightsService

router = APIRouter()

case_service = CaseService()
ocr_service = OCRService()
nlp_service = NLPService()
graph_service = GraphService()
insights_service = InsightsService()

@router.post("/cases", response_model=CaseResponse)
async def create_case(case: CaseCreate):
    try:
        new_case = case_service.create_case(case.name, case.description)
        return new_case
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cases", response_model=List[CaseResponse])
async def list_cases():
    try:
        return case_service.get_all_cases()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cases/{case_id}", response_model=CaseAnalysisResponse)
async def get_case(case_id: str):
    try:
        case_info = case_service.get_case(case_id)
        if not case_info:
            raise HTTPException(status_code=404, detail="Case not found")

        nodes, edges = case_service.load_graph_data(case_id)
        networkx_graph = graph_service.build_networkx_graph(nodes, edges)
        graph_data = graph_service.export_graph_data(networkx_graph)
        insights = insights_service.calculate_insights(networkx_graph)
        
        # Some neo4j types need explicit string conversion for safety, but pydantic should handle it.
        return CaseAnalysisResponse(
            case_info=CaseResponse(**case_info),
            graph_data=graph_data,
            insights=insights
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cases/{case_id}/upload", response_model=CaseAnalysisResponse)
async def upload_to_case(case_id: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    # Validate case exists
    case_info = case_service.get_case(case_id)
    if not case_info:
        raise HTTPException(status_code=404, detail="Case not found")

    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. OCR Extraction
        text = ocr_service.extract_text_from_file(temp_file_path, file.filename)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text.")
            
        # 2. NLP Entity & Relation Extraction
        nodes, edges = nlp_service.extract_entities_and_relations(text)
        
        # 3. Save to Case in Neo4j
        if nodes or edges:
            case_service.save_graph_data(case_id, nodes, edges)
        
        # 4. Return updated Case state
        return await get_case(case_id)

    except Exception as e:
        print(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
