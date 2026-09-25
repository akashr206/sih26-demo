import os
import json
import re
import csv
import io
from typing import List, Tuple
from openai import OpenAI
from app.models.schemas import Node, Edge
from app.services.interfaces import NLPServiceInterface

class NLPService(NLPServiceInterface):
    def __init__(self):
        # Initialize MiMo LLM via OpenAI SDK with 3.5s timeout to ensure snappy response
        api_key = os.environ.get("MIMO_API_KEY") or os.environ.get("OPENAI_API_KEY") or "placeholder-key"
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.xiaomimimo.com/v1",
            timeout=3.5
        )
        self.model = os.environ.get("MIMO_MODEL", "mimo-v2.6-flash") 

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
            print(f"[NLPService] Requesting entity extraction from {self.model}...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract entities and relationships from this text:\n\n{text}"}
                ],
                max_tokens=4096,
                temperature=0.1
            )
            
            # Extract content
            result_content = response.choices[0].message.content or ""
            
            if not result_content.strip():
                print(f"[NLPService Warning] Empty content received from model {self.model}. Using rule-based fallback.")
                return self._extract_fallback(text)

            # Strip markdown formatting if the model wraps JSON in ```json ... ```
            clean_json = result_content.strip()
            if clean_json.startswith("```"):
                clean_json = re.sub(r"^```(?:json)?\s*", "", clean_json)
                clean_json = re.sub(r"\s*```$", "", clean_json)
            
            # Parse JSON
            parsed_data = json.loads(clean_json)
            
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
                
            if nodes or edges:
                return nodes, edges

            return self._extract_fallback(text)

        except Exception as e:
            print(f"[NLPService Warning] MiMo LLM unavailable ({e}). Using intelligent rule-based fallback.")
            return self._extract_fallback(text)

    def _extract_fallback(self, text: str) -> Tuple[List[Node], List[Edge]]:
        """Intelligent heuristic and regex fallback for extracting entities and relationships."""
        nodes_dict = {}
        edges_list = []

        def add_node(label: str, n_type: str) -> str:
            clean = label.strip().strip('"\'')
            if not clean or len(clean) < 2 or clean.lower() in ["none", "null", "n/a", "date", "action"]:
                return None
            norm_id = f"{n_type.upper()}_{re.sub(r'[^a-zA-Z0-9]', '_', clean.lower()).strip('_')}"
            if norm_id not in nodes_dict:
                nodes_dict[norm_id] = Node(
                    id=norm_id,
                    label=clean,
                    type=n_type.upper(),
                    metadata={"source": "pattern-extraction"}
                )
            return norm_id

        def add_edge(src: str, tgt: str, rel: str):
            if src and tgt and src != tgt:
                edges_list.append(Edge(source=src, target=tgt, relation=rel, weight=1.0))

        # Check for tabular CSV/structured format
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if lines:
            try:
                reader = csv.DictReader(io.StringIO(text))
                for row in reader:
                    row_nodes = []
                    for k, v in row.items():
                        if not k or not v:
                            continue
                        kl = k.lower().strip()
                        vl = v.strip()
                        if any(p in kl for p in ["suspect", "accused", "person", "caller", "receiver", "driver", "operator", "name"]):
                            nid = add_node(vl, "PERSON")
                            if nid: row_nodes.append((nid, "PERSON"))
                        elif any(p in kl for p in ["phone", "mobile", "contact", "number", "cdr"]):
                            nid = add_node(vl, "PHONE")
                            if nid: row_nodes.append((nid, "PHONE"))
                        elif any(p in kl for p in ["vehicle", "plate", "truck", "car"]):
                            nid = add_node(vl, "VEHICLE_PLATE")
                            if nid: row_nodes.append((nid, "VEHICLE_PLATE"))
                        elif any(p in kl for p in ["location", "city", "port", "dock", "address", "station"]):
                            nid = add_node(vl, "LOCATION")
                            if nid: row_nodes.append((nid, "LOCATION"))
                        elif any(p in kl for p in ["gang", "cartel", "company", "org", "firm", "vessel"]):
                            nid = add_node(vl, "ORG")
                            if nid: row_nodes.append((nid, "ORG"))

                    for i in range(len(row_nodes)):
                        for j in range(i + 1, len(row_nodes)):
                            id1, type1 = row_nodes[i]
                            id2, type2 = row_nodes[j]
                            rel = "CONNECTED_TO"
                            if type1 == "PERSON" and type2 == "PHONE": rel = "OWNS_PHONE"
                            elif type1 == "PERSON" and type2 == "LOCATION": rel = "OPERATES_AT"
                            elif type1 == "PERSON" and type2 == "VEHICLE_PLATE": rel = "OWNS_VEHICLE"
                            elif type1 == "PERSON" and type2 == "ORG": rel = "MEMBER_OF"
                            elif type1 == "PERSON" and type2 == "PERSON": rel = "ACCOMPLICE_OF"
                            add_edge(id1, id2, rel)
            except Exception:
                pass

        # Regex pattern matching across document text
        phone_matches = set(re.findall(r'(?:\+?91[\-\s]?)?[6-9]\d{9}\b', text))
        phone_ids = [add_node(p, "PHONE") for p in phone_matches]

        vehicle_matches = set(re.findall(r'\b[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}\b', text))
        vehicle_ids = [add_node(v, "VEHICLE_PLATE") for v in vehicle_matches]

        person_matches = set(re.findall(r'(?:Suspect|Accused|Arrested|Driver|Carrier|Operator|Alias)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)', text, re.IGNORECASE))
        person_ids = [add_node(p, "PERSON") for p in person_matches]

        location_matches = set(re.findall(r'(?:Location|Port|Dockyard|City|Warehouse|Address|Seized at)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)', text, re.IGNORECASE))
        location_ids = [add_node(l, "LOCATION") for l in location_matches if l.lower() not in ["the", "this", "that", "fir", "case"]]

        org_matches = set(re.findall(r'([A-Z][a-zA-Z0-9\s]{2,25}(?:Gang|Cartel|Syndicate|Enterprises|Logistics|Solutions|Pvt Ltd|LLC))', text))
        org_ids = [add_node(o, "ORG") for o in org_matches]

        for p in person_ids:
            if not p: continue
            for ph in phone_ids:
                if ph: add_edge(p, ph, "OWNS_PHONE")
            for v in vehicle_ids:
                if v: add_edge(p, v, "USES_VEHICLE")
            for loc in location_ids:
                if loc: add_edge(p, loc, "OPERATES_AT")
            for o in org_ids:
                if o: add_edge(p, o, "AFFILIATED_WITH")

        return list(nodes_dict.values()), edges_list