import networkx as nx
from typing import List
from app.models.schemas import Node, Edge, GraphData

class GraphService:
    def build_networkx_graph(self, nodes: List[Node], edges: List[Edge]) -> nx.DiGraph:
        """Stateless function: Builds a NetworkX directed graph from nodes and edges."""
        graph = nx.DiGraph()
        
        # Add nodes
        for node in nodes:
            graph.add_node(node.id, label=node.label, type=node.type, metadata=node.metadata)
                
        # Add edges
        for edge in edges:
            if graph.has_edge(edge.source, edge.target):
                graph[edge.source][edge.target]['weight'] += edge.weight
            else:
                graph.add_edge(edge.source, edge.target, relation=edge.relation, weight=edge.weight)
                
        return graph

    def export_graph_data(self, graph: nx.DiGraph) -> GraphData:
        """Exports a NetworkX graph to the GraphData Pydantic schema."""
        nodes_out = []
        edges_out = []
        
        for node_id, data in graph.nodes(data=True):
            nodes_out.append(Node(
                id=node_id,
                label=data.get('label', node_id),
                type=data.get('type', 'UNKNOWN'),
                metadata=data.get('metadata', {})
            ))
            
        for source, target, data in graph.edges(data=True):
            edges_out.append(Edge(
                source=source,
                target=target,
                relation=data.get('relation', 'UNKNOWN'),
                weight=data.get('weight', 1.0)
            ))
            
        return GraphData(nodes=nodes_out, edges=edges_out)
