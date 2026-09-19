import uuid
from typing import List, Tuple, Dict, Any
import difflib
from app.db.neo4j_client import neo4j_client
from app.models.schemas import Node, Edge

class CaseService:
    def _parse_case_node(self, node) -> Dict[str, Any]:
        d = dict(node)
        if "created_at" in d:
            d["created_at"] = str(d["created_at"])
        return d

    def create_case(self, name: str, description: str) -> Dict[str, Any]:
        case_id = str(uuid.uuid4())
        query = """
        CREATE (c:Case {id: $id, name: $name, description: $description, created_at: datetime()})
        RETURN c
        """
        with neo4j_client.get_session() as session:
            result = session.run(query, id=case_id, name=name, description=description)
            record = result.single()
            if record:
                return self._parse_case_node(record["c"])
        return {}

    def get_all_cases(self) -> List[Dict[str, Any]]:
        query = "MATCH (c:Case) RETURN c ORDER BY c.created_at DESC"
        cases = []
        with neo4j_client.get_session() as session:
            result = session.run(query)
            for record in result:
                cases.append(self._parse_case_node(record["c"]))
        return cases

    def get_case(self, case_id: str) -> Dict[str, Any]:
        query = "MATCH (c:Case {id: $id}) RETURN c"
        with neo4j_client.get_session() as session:
            result = session.run(query, id=case_id)
            record = result.single()
            if record:
                return self._parse_case_node(record["c"])
        return {}

    def save_graph_data(self, case_id: str, nodes: List[Node], edges: List[Edge]):
        with neo4j_client.get_session() as session:
            # Fetch existing entities for fuzzy matching
            existing_nodes = []
            node_query = "MATCH (n:Entity {case_id: $case_id}) RETURN n.id AS id, n.label AS label, n.type AS type"
            result = session.run(node_query, case_id=case_id)
            for record in result:
                existing_nodes.append({
                    "id": record["id"],
                    "label": record["label"].lower(),
                    "type": record["type"]
                })
            
            id_mapping = {}
            
            for node in nodes:
                best_match_id = None
                best_ratio = 0.0
                node_label_lower = node.label.lower()
                
                for existing in existing_nodes:
                    if existing["type"] == node.type:
                        ratio = difflib.SequenceMatcher(None, node_label_lower, existing["label"]).ratio()
                        if ratio > best_ratio:
                            best_ratio = ratio
                            best_match_id = existing["id"]
                
                if best_ratio >= 0.85 and best_match_id:
                    id_mapping[node.id] = best_match_id
                    node.id = best_match_id
                else:
                    existing_nodes.append({
                        "id": node.id,
                        "label": node_label_lower,
                        "type": node.type
                    })
                    
            for edge in edges:
                if edge.source in id_mapping:
                    edge.source = id_mapping[edge.source]
                if edge.target in id_mapping:
                    edge.target = id_mapping[edge.target]

            # Save nodes
            for node in nodes:
                node_query = """
                MERGE (n:Entity {id: $node_id, case_id: $case_id})
                SET n.label = $label, n.type = $type, n.metadata = $metadata
                """
                session.run(node_query, node_id=node.id, case_id=case_id, label=node.label, type=node.type, metadata=str(node.metadata))
                
            # Save edges
            for edge in edges:
                edge_query = """
                MATCH (a:Entity {id: $source_id, case_id: $case_id})
                MATCH (b:Entity {id: $target_id, case_id: $case_id})
                MERGE (a)-[r:LINK {case_id: $case_id, type: $relation}]->(b)
                ON CREATE SET r.weight = $weight
                ON MATCH SET r.weight = r.weight + $weight
                """
                session.run(edge_query, source_id=edge.source, target_id=edge.target, case_id=case_id, relation=edge.relation, weight=edge.weight)

    def load_graph_data(self, case_id: str) -> Tuple[List[Node], List[Edge]]:
        nodes = []
        edges = []
        with neo4j_client.get_session() as session:
            # Load nodes
            node_query = "MATCH (n:Entity {case_id: $case_id}) RETURN n"
            node_result = session.run(node_query, case_id=case_id)
            for record in node_result:
                n = record["n"]
                nodes.append(Node(
                    id=n["id"],
                    label=n["label"],
                    type=n["type"],
                    metadata={"source": "neo4j"} # simplified for MVP
                ))
            
            # Load edges
            edge_query = """
            MATCH (a:Entity {case_id: $case_id})-[r:LINK {case_id: $case_id}]->(b:Entity {case_id: $case_id})
            RETURN a.id as source, b.id as target, r.type as relation, r.weight as weight
            """
            edge_result = session.run(edge_query, case_id=case_id)
            for record in edge_result:
                edges.append(Edge(
                    source=record["source"],
                    target=record["target"],
                    relation=record["relation"],
                    weight=record["weight"]
                ))
                
        return nodes, edges
