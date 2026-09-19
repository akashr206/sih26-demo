from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any
from app.models.schemas import Node, Edge, GraphData, GraphInsights

class OCRServiceInterface(ABC):
    @abstractmethod
    def extract_text_from_file(self, file_path: str, filename: str) -> str:
        """Extracts text from a given file (PDF, Image, or plain text)."""
        pass

class NLPServiceInterface(ABC):
    @abstractmethod
    def extract_entities_and_relations(self, text: str) -> Tuple[List[Node], List[Edge]]:
        """Extracts entities and basic relationships from raw text."""
        pass

class GraphServiceInterface(ABC):
    @abstractmethod
    def build_graph(self, nodes: List[Node], edges: List[Edge]) -> Any:
        """Builds and returns a graph object (e.g., NetworkX DiGraph) from nodes and edges."""
        pass
    
    @abstractmethod
    def get_graph_data(self) -> GraphData:
        """Retrieves the graph data in the Pydantic schema format."""
        pass

class InsightsServiceInterface(ABC):
    @abstractmethod
    def calculate_insights(self, graph: Any) -> GraphInsights:
        """Calculates centralities and communities from a graph object."""
        pass
