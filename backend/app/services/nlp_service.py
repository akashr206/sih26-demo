import os
import json
from typing import List, Tuple
from openai import OpenAI
from app.models.schemas import Node, Edge
from app.services.interfaces import NLPServiceInterface

class NLPService(NLPServiceInterface):
    def __init__(self):
        # Initialize MiMo LLM via OpenAI SDK
        api_key = os.environ.get("MIMO_API_KEY") or os.environ.get("OPENAI_API_KEY") or "placeholder-key"
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.xiaomimimo.com/v1"
        )
        self.model = "mimo-v2.5" 

    def extract_entities_and_relations(self, text: str) -> Tuple[List[Node], List[Edge]]:
        system_prompt = """You are an expert criminal intelligence analyst. Your task is to process raw OCR text from police documents and extract strictly meaningful entities related to the crime and the explicit relationships between them.

CRITICAL RULE:
IGNORE administrative text, boilerplates, and form metadata (like "F.I.R.", "Date", "Action Taken", "Station", etc.).
DO NOT extract the Police Officers, Sub-Inspectors (S.I.), or officials investigating the case. We only want the criminal network (suspects, victims, accomplices, gangs, involved locations, and seized vehicles/phones).
FOCUS ONLY on entities heavily relevant to the core crime.

EXTRACT ENTITIES:
- PERSON: Names of suspects, victims, accomplices, and witnesses (EXCLUDE police officers).
- ORG: Criminal gangs, involved businesses (EXCLUDE police departments/stations).
- LOCATION: Addresses, cities, crime scenes.
- PHONE: Phone numbers.
- VEHICLE_PLATE: Vehicle registration plates.

EXTRACT RELATIONSHIPS:
Extract explicit relationships between these entities (e.g., ACCOMPLICE_OF, OWNS_VEHICLE, CALLED, ARRESTED_AT). 
DO NOT link entities just because they appear in the same sentence unless there is a clear semantic connection.

OUTPUT FORMAT:
You must return valid JSON ONLY. No markdown, no explanation.
Schema:
{
  "nodes": [
    {"id": "PERSON_john_doe", "label": "John Doe", "type": "PERSON"},
    {"id": "PHONE_9876543210", "label": "9876543210", "type": "PHONE"}
  ],
  "edges": [
    {"source": "PERSON_john_doe", "target": "PHONE_9876543210", "relation": "OWNS_PHONE"}
  ]
}
Note: id should be uppercase type underscore lowercase normalized label (e.g., LOCATION_delhi).
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract entities and relationships from this text:\n\n{text}"}
                ],
                max_tokens=2048,
                temperature=0.1, # Low temperature for more deterministic extraction
                response_format={"type": "json_object"}
            )
            
            # Extract JSON string
            result_content = response.choices[0].message.content
            
            # Parse JSON
            parsed_data = json.loads(result_content)
            
            # Convert to internal schemas
            nodes = []
            edges = []
            
            for node_data in parsed_data.get("nodes", []):
                nodes.append(Node(
                    id=node_data.get("id"),
                    label=node_data.get("label"),
                    type=node_data.get("type"),
                    metadata={"source": "mimo-llm"}
                ))
                
            for edge_data in parsed_data.get("edges", []):
                edges.append(Edge(
                    source=edge_data.get("source"),
                    target=edge_data.get("target"),
                    relation=edge_data.get("relation"),
                    weight=1.0
                ))
                
            return nodes, edges

        except Exception as e:
            api_key = os.environ.get("MIMO_API_KEY")
            print(api_key)
            print(f"Error calling MiMo API: {e}")
            # Return empty if fails
            return [], []