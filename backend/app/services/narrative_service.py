import os
import json
import hashlib
import re
from typing import Optional
from openai import OpenAI
from app.models.schemas import GraphData, GraphInsights


class NarrativeService:
    """Generates structured criminal intelligence briefings from graph data using an LLM."""

    SYSTEM_PROMPT = """... (as above) ..."""

    def __init__(self):
        api_key = os.environ.get("MIMO_API_KEY") or os.environ.get("OPENAI_API_KEY") or "placeholder-key"
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.xiaomimimo.com/v1",
            timeout=8.0
        )
        self.model = os.environ.get("MIMO_MODEL", "mimo-v2.6-flash")
        self._cache = {}  # { case_id: { "hash": str, "narrative": dict } }

    def _build_graph_summary(self, graph_data: GraphData) -> str:
        type_counts = {}
        for node in graph_data.nodes:
            t = node.type.upper()
            type_counts[t] = type_counts.get(t, 0) + 1

        lines = [
            f"Total entities: {len(graph_data.nodes)}",
            f"Total relationships: {len(graph_data.edges)}",
            f"Entity breakdown: {', '.join(f'{count} {t}' for t, count in type_counts.items())}",
            "\nEntities:",
        ]
        for node in graph_data.nodes:
            lines.append(f"  - [{node.type}] {node.label} (id: {node.id})")

        lines.append("\nRelationships:")
        for edge in graph_data.edges:
            src_label = next((n.label for n in graph_data.nodes if n.id == edge.source), edge.source)
            tgt_label = next((n.label for n in graph_data.nodes if n.id == edge.target), edge.target)
            lines.append(f"  - {src_label} --[{edge.relation}]--> {tgt_label}")

        return "\n".join(lines)

    def _build_insights_summary(self, insights: GraphInsights) -> dict:
        influencers = "None detected"
        if insights.top_influencers:
            parts = [f"{inf['label']} ({inf['type']}, score: {inf['score']})" for inf in insights.top_influencers]
            influencers = "; ".join(parts)

        middlemen = "None detected"
        if insights.key_middlemen:
            parts = [f"{m['label']} ({m['type']}, score: {m['score']})" for m in insights.key_middlemen]
            middlemen = "; ".join(parts)

        communities = "None detected"
        if insights.communities:
            parts = [
                f"Cluster {c['community_id']} ({c['size']} members: {', '.join(str(m) for m in c['members'])})"
                for c in insights.communities
            ]
            communities = "; ".join(parts)

        return {"influencers": influencers, "middlemen": middlemen, "communities": communities}

    def _compute_data_hash(self, graph_data: GraphData) -> str:
        raw = json.dumps(
            {"nodes": [n.id for n in graph_data.nodes], "edges": [(e.source, e.target) for e in graph_data.edges]},
            sort_keys=True
        )
        return hashlib.md5(raw.encode()).hexdigest()

    def _parse_json_response(self, raw_text: str) -> Optional[dict]:
        """Strip fences if present and parse JSON. Returns None on failure."""
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return None

        # Fill in any missing keys defensively so the frontend never sees undefined fields
        data.setdefault("executive_summary", "")
        data.setdefault("threat_level", "MODERATE")
        data.setdefault("threat_level_reasoning", "")
        data.setdefault("key_targets", [])
        data.setdefault("bridge_entities", [])
        data.setdefault("clusters", [])
        data.setdefault("recommended_actions", [])
        return data

    def generate_narrative(self, graph_data: GraphData, insights: GraphInsights, case_id: str) -> dict:
        """Generate a structured briefing dict for the case. Returns cached result if unchanged."""

        if not graph_data.nodes:
            return self._empty_narrative()

        data_hash = self._compute_data_hash(graph_data)
        cached = self._cache.get(case_id)
        if cached and cached["hash"] == data_hash:
            print(f"[NarrativeService] Returning cached narrative for case {case_id}")
            return cached["narrative"]

        graph_summary = self._build_graph_summary(graph_data)
        insights_parts = self._build_insights_summary(insights)

        user_message = f"""Generate a structured intelligence briefing for this criminal network:

NETWORK SUMMARY:
{graph_summary}

ANALYSIS METRICS:
- Top Influencers (by degree centrality): {insights_parts['influencers']}
- Key Middlemen (by betweenness centrality): {insights_parts['middlemen']}
- Detected Clusters: {insights_parts['communities']}"""

        try:
            print(f"[NarrativeService] Generating structured narrative for case {case_id}...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=1200,
                temperature=0.3,
                response_format={"type": "json_object"},  # drop this kwarg if MiMo doesn't support it
            )

            raw = (response.choices[0].message.content or "").strip()
            parsed = self._parse_json_response(raw)

            if parsed is None:
                print("[NarrativeService Warning] Model returned invalid JSON. Falling back to heuristic.")
                parsed = self._heuristic_narrative(graph_data, insights)

            self._cache[case_id] = {"hash": data_hash, "narrative": parsed}
            print(f"[NarrativeService] Narrative generated with {len(parsed.get('key_targets', []))} key targets, cached.")
            return parsed

        except Exception as e:
            print(f"[NarrativeService Warning] LLM call failed ({e}). Generating heuristic briefing.")
            parsed = self._heuristic_narrative(graph_data, insights)
            self._cache[case_id] = {"hash": data_hash, "narrative": parsed}
            return parsed

    def _empty_narrative(self) -> dict:
        return {
            "executive_summary": "",
            "threat_level": "LOW",
            "threat_level_reasoning": "",
            "key_targets": [],
            "bridge_entities": [],
            "clusters": [],
            "recommended_actions": [],
        }

    def _heuristic_narrative(self, graph_data: GraphData, insights: GraphInsights) -> dict:
        """Deterministic, template-built briefing in the same schema as the LLM output — used when the LLM is unavailable."""
        type_counts = {}
        for node in graph_data.nodes:
            t = node.type.upper()
            type_counts[t] = type_counts.get(t, 0) + 1
        breakdown = ", ".join(f"{cnt} {t}" for t, cnt in type_counts.items())

        summary = (
            f"The active investigation network encompasses {len(graph_data.nodes)} distinct entities connected by "
            f"{len(graph_data.edges)} validated relationships, comprising {breakdown}."
        )

        key_targets = []
        for inf in (insights.top_influencers or [])[:5]:
            key_targets.append({
                "name": inf.get("label", "Unknown"),
                "type": inf.get("type", "UNKNOWN"),
                "role": "High-Connectivity Node",
                "reasoning": f"Holds the highest degree centrality (score: {inf.get('score', 0)}) within the network.",
                "priority": "HIGH" if inf is (insights.top_influencers or [None])[0] else "MEDIUM",
            })

        bridge_entities = []
        for m in (insights.key_middlemen or [])[:5]:
            bridge_entities.append({
                "name": m.get("label", "Unknown"),
                "type": m.get("type", "UNKNOWN"),
                "connects": "Separate clusters within the network",
                "reasoning": f"High betweenness centrality (score: {m.get('score', 0)}) indicates a bridging role between otherwise disconnected groups.",
            })

        clusters = []
        for c in (insights.communities or []):
            clusters.append({
                "cluster_id": c.get("community_id"),
                "label": f"Cluster {c.get('community_id')}",
                "size": c.get("size", len(c.get("members", []))),
                "composition": f"Comprises {c.get('size', len(c.get('members', [])))} members: {', '.join(str(x) for x in c.get('members', []))}.",
            })

        threat_level = "HIGH" if bridge_entities else ("MODERATE" if key_targets else "LOW")

        recommended_actions = [{
            "action": "Cross-reference contact records and location overlaps for the top-ranked entities to isolate operational hubs.",
            "rationale": "Network structure shows concentrated connectivity around a small number of nodes.",
            "urgency": "ROUTINE",
        }]
        if bridge_entities:
            recommended_actions.insert(0, {
                "action": f"Prioritize surveillance on {bridge_entities[0]['name']}, identified as a key bridging entity.",
                "rationale": "Removing bridging entities is the most efficient way to fragment a connected network.",
                "urgency": "IMMEDIATE",
            })

        return {
            "executive_summary": summary,
            "threat_level": threat_level,
            "threat_level_reasoning": "Heuristically derived from centrality metrics (LLM unavailable).",
            "key_targets": key_targets,
            "bridge_entities": bridge_entities,
            "clusters": clusters,
            "recommended_actions": recommended_actions,
        }