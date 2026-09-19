from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Node(BaseModel):
    id: str
    label: str
    type: str
    metadata: Dict[str, Any] = {}

class Edge(BaseModel):
    source: str
    target: str
    relation: str
    weight: float = 1.0

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class GraphInsights(BaseModel):
    top_influencers: List[Dict[str, Any]] = []
    key_middlemen: List[Dict[str, Any]] = []
    communities: List[Dict[str, Any]] = []
    stats: Dict[str, Any] = {}

class CaseCreate(BaseModel):
    name: str
    description: str

class CaseResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: Optional[Any] = None

class CaseAnalysisResponse(BaseModel):
    case_info: CaseResponse
    graph_data: GraphData
    insights: GraphInsights
