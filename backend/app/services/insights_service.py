import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities
from typing import Any
from app.models.schemas import GraphInsights
from app.services.interfaces import InsightsServiceInterface

class InsightsService(InsightsServiceInterface):
    def calculate_insights(self, graph: Any) -> GraphInsights:
        if not isinstance(graph, (nx.Graph, nx.DiGraph)):
            raise ValueError("Invalid graph object. Must be a NetworkX graph.")
            
        if len(graph.nodes) == 0:
            return GraphInsights()

        insights = GraphInsights()

        # 1. Degree Centrality (Top Influencers)
        degree_dict = nx.degree_centrality(graph)
        sorted_degrees = sorted(degree_dict.items(), key=lambda item: item[1], reverse=True)
        # Get top 5
        for node_id, score in sorted_degrees[:5]:
            node_data = graph.nodes[node_id]
            insights.top_influencers.append({
                "id": node_id,
                "label": node_data.get('label', node_id),
                "type": node_data.get('type', 'UNKNOWN'),
                "score": round(score, 4)
            })

        # 2. Betweenness Centrality (Key Bridges / Middlemen)
        betweenness_dict = nx.betweenness_centrality(graph)
        sorted_betweenness = sorted(betweenness_dict.items(), key=lambda item: item[1], reverse=True)
        # Get top 5
        for node_id, score in sorted_betweenness[:5]:
            if score > 0: # Only include if they actually bridge
                node_data = graph.nodes[node_id]
                insights.key_middlemen.append({
                    "id": node_id,
                    "label": node_data.get('label', node_id),
                    "type": node_data.get('type', 'UNKNOWN'),
                    "score": round(score, 4)
                })

        # 3. Community Detection (Sub-gangs)
        # Convert to undirected for community detection
        undirected_graph = graph.to_undirected()
        if len(undirected_graph.edges) > 0:
            communities = list(greedy_modularity_communities(undirected_graph))
            for i, community in enumerate(communities):
                if len(community) > 1: # Ignore isolated nodes
                    members = []
                    for node_id in community:
                        node_data = graph.nodes[node_id]
                        members.append(node_data.get('label', node_id))
                    
                    insights.communities.append({
                        "community_id": i + 1,
                        "size": len(community),
                        "members": members[:5] # Show top 5 members for brevity
                    })

        return insights
