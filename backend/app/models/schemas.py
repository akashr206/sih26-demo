from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal

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

class NarrativeTarget(BaseModel):
    name: str
    type: str
    role: str
    reasoning: str
    priority: Literal["HIGH", "MEDIUM", "LOW"]

class NarrativeBridge(BaseModel):
    name: str
    type: str
    connects: str
    reasoning: str

class NarrativeCluster(BaseModel):
    cluster_id: Any
    label: str
    size: int
    composition: str

class NarrativeAction(BaseModel):
    action: str
    rationale: str
    urgency: Literal["IMMEDIATE", "ROUTINE"]

class CaseNarrative(BaseModel):
    executive_summary: str = ""
    threat_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"] = "LOW"
    threat_level_reasoning: str = ""
    key_targets: List[NarrativeTarget] = []
    bridge_entities: List[NarrativeBridge] = []
    clusters: List[NarrativeCluster] = []
    recommended_actions: List[NarrativeAction] = []

class CaseAnalysisResponse(BaseModel):
    case_info: CaseResponse
    graph_data: GraphData
    insights: GraphInsights
    narrative: CaseNarrative = CaseNarrative()