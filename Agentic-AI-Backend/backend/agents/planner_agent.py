"""
planner_agent.py — 5-node LangGraph pipeline

  parse_architecture → identify_domains → create_plan → dispatch_subagents → compile_results

Each node is an autonomous agent step. The graph is compiled once at import
time and reused across requests (LangGraph checkpoints per thread_id).
"""

import json
import os
import operator
from typing import TypedDict, Annotated

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

# ─────────────────────────────────────────────
# Shared State
# ─────────────────────────────────────────────

class PlannerState(TypedDict):
    raw_graph: dict                           # JSON from ArchCanvas (nodes + edges)
    nodes: list[dict]
    edges: list[dict]
    architecture_summary: str
    risk_domains: list[str]
    plan: dict
    agent_findings: Annotated[list[dict], operator.add]  # each agent appends
    review_report: str
    messages: Annotated[list, operator.add]

# ─────────────────────────────────────────────
# LLM — shared across all nodes
# ─────────────────────────────────────────────

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.2,
    groq_api_key=os.environ.get("GROQ_API_KEY"),
)

# ─────────────────────────────────────────────
# Helper: strip markdown code fences from LLM output
# ─────────────────────────────────────────────

def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        # parts[1] is the content inside the first pair of fences
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()

# ─────────────────────────────────────────────
# Node 1 — Parse Architecture
# ─────────────────────────────────────────────

def parse_architecture(state: PlannerState) -> dict:
    """
    Converts the raw canvas JSON into structured nodes/edges
    and builds a plain-English summary — no LLM needed here,
    pure deterministic logic so it's fast and free.
    """
    print("\n[Agent 1/5]  parse_architecture")
    raw = state["raw_graph"]

    # Support both ArchCanvas format and the agents' own format
    nodes = raw.get("nodes") or raw.get("components") or []
    edges = raw.get("edges") or []

    # If coming from the image parser (ArchitecturalGraph schema),
    # convert `connections` arrays into edge objects
    if not edges and nodes:
        for node in nodes:
            for target_id in node.get("connections", []):
                edges.append({"id": f"{node['id']}__{target_id}", "source": node["id"], "target": target_id, "label": "→"})

    node_map = {n["id"]: n for n in nodes}
    node_names = [
        f"{n.get('technology') or n.get('type', 'Service')} ({n.get('name') or n.get('id')})"
        for n in nodes
    ]
    edge_descs = []
    for e in edges:
        src = node_map.get(e.get("source", ""), {})
        tgt = node_map.get(e.get("target", ""), {})
        src_name = src.get("technology") or src.get("name") or e.get("source", "?")
        tgt_name = tgt.get("technology") or tgt.get("name") or e.get("target", "?")
        edge_descs.append(f"{src_name} --[{e.get('label', '→')}]--> {tgt_name}")

    summary = (
        f"Architecture contains {len(nodes)} service(s): {', '.join(node_names) or 'none'}. "
        f"Connections: {'; '.join(edge_descs) if edge_descs else 'none defined'}."
    )
    print(f"  Summary: {summary[:120]}...")

    return {
        "nodes": nodes,
        "edges": edges,
        "architecture_summary": summary,
        "messages": [AIMessage(content=f"[parse_architecture] {summary}")],
    }

# ─────────────────────────────────────────────
# Node 2 — Identify Risk Domains
# ─────────────────────────────────────────────

def identify_domains(state: PlannerState) -> dict:
    """
    Agent 2: LLM decides which risk domains matter for this architecture.
    Returns a list like ["security", "scalability", "cost", "reliability"].
    """
    print("\n[Agent 2/5]  identify_domains")

    system = SystemMessage(content=(
        "You are the Planner Agent for an AI-powered cloud architecture review system.\n"
        "Identify which risk domains need investigation.\n\n"
        "Respond ONLY with a JSON array. Choose from:\n"
        '["security", "scalability", "cost", "reliability", "performance", "networking", "compliance", "observability"]\n\n'
        "Include 3-5 domains most relevant to the described architecture.\n"
        'Example: ["security", "scalability", "cost", "reliability"]'
    ))
    human = HumanMessage(content=(
        f"Architecture summary:\n{state['architecture_summary']}\n\n"
        f"Nodes:\n{json.dumps(state['nodes'][:10], indent=2)}"  # cap to avoid token overflow
    ))

    response = llm.invoke([system, human])
    raw_text = _strip_fences(response.content)

    try:
        domains = json.loads(raw_text)
        if not isinstance(domains, list):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        domains = ["security", "scalability", "cost", "reliability"]

    print(f"  Domains: {domains}")
    return {
        "risk_domains": domains,
        "messages": [AIMessage(content=f"[identify_domains] {domains}")],
    }

# ─────────────────────────────────────────────
# Node 3 — Create Plan
# ─────────────────────────────────────────────

def create_plan(state: PlannerState) -> dict:
    """
    Agent 3: Creates a concrete task plan — assigns specific checks
    to each sub-agent based on the identified risk domains.
    """
    print("\n[Agent 3/5]  create_plan")

    system = SystemMessage(content=(
        "You are the Planner Agent for a cloud architecture review system.\n"
        "Create a task plan for these sub-agents:\n"
        "  security_agent    — IAM, encryption, VPC, WAF, secrets\n"
        "  scalability_agent — auto-scaling, SPOF, caching, load balancing\n"
        "  cost_agent        — over-provisioning, reserved instances, data transfer\n"
        "  optimization_agent — Well-Architected violations, observability, IaC\n"
        "  reviewer_agent    — synthesize all findings into a final report\n\n"
        "Respond ONLY with a JSON object:\n"
        '{\n'
        '  "security_agent":     { "focus": "...", "checks": ["check1", "check2"] },\n'
        '  "scalability_agent":  { "focus": "...", "checks": ["check1", "check2"] },\n'
        '  "cost_agent":         { "focus": "...", "checks": ["check1", "check2"] },\n'
        '  "optimization_agent": { "focus": "...", "checks": ["check1", "check2"] },\n'
        '  "reviewer_agent":     { "focus": "...", "checks": ["check1", "check2"] }\n'
        "}\n\nMake the checks SPECIFIC to the services in this architecture."
    ))
    human = HumanMessage(content=(
        f"Architecture summary:\n{state['architecture_summary']}\n\n"
        f"Risk domains: {state['risk_domains']}\n\n"
        f"Nodes:\n{json.dumps(state['nodes'], indent=2)}\n\n"
        f"Edges:\n{json.dumps(state['edges'], indent=2)}"
    ))

    response = llm.invoke([system, human])
    raw_text = _strip_fences(response.content)

    try:
        plan = json.loads(raw_text)
    except json.JSONDecodeError:
        agents = ["security_agent", "scalability_agent", "cost_agent", "optimization_agent", "reviewer_agent"]
        plan = {a: {"focus": d, "checks": []} for a, d in zip(agents, state["risk_domains"] + ["synthesis", "synthesis"])}

    print(f"  Plan created for: {list(plan.keys())}")
    return {
        "plan": plan,
        "messages": [AIMessage(content=f"[create_plan] Plan for {list(plan.keys())}")],
    }

# ─────────────────────────────────────────────
# Node 4 — Dispatch Sub-Agents
# ─────────────────────────────────────────────

AGENT_PERSONAS = {
    "security_agent": (
        "You are a cloud security expert agent reviewing an AWS architecture.\n"
        "Focus on: IAM roles & least privilege, encryption at rest/transit, VPC config, "
        "security groups, WAF, secrets management, exposed endpoints, missing authentication."
    ),
    "scalability_agent": (
        "You are a cloud scalability expert agent reviewing an AWS architecture.\n"
        "Focus on: auto-scaling groups, load balancers, single points of failure, DB read replicas, "
        "caching layers (ElastiCache/CloudFront), queue-based decoupling, stateless design."
    ),
    "cost_agent": (
        "You are a cloud cost optimization expert reviewing an AWS architecture.\n"
        "Focus on: over-provisioned instances, on-demand vs reserved/spot, data transfer costs, "
        "unused resources, storage tier mismatches, Lambda cold starts, NAT Gateway overuse."
    ),
    "optimization_agent": (
        "You are an AWS architecture optimization expert reviewing a system.\n"
        "Focus on: AWS Well-Architected Framework violations, anti-patterns, missing observability "
        "(CloudWatch, X-Ray), missing backups, IaC gaps, service selection."
    ),
}

AGENT_RESPONSE_SCHEMA = """
Respond ONLY with a JSON object:
{
  "agent": "<your agent name>",
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "issue": "short title",
      "description": "what is wrong and why it matters",
      "recommendation": "specific fix with AWS service names"
    }
  ],
  "summary": "one sentence overall verdict"
}
Be specific and actionable. Reference actual services from the architecture."""


def dispatch_subagents(state: PlannerState) -> dict:
    """
    Agent 4: Runs security, scalability, cost, and optimization agents
    sequentially (parallel via LangGraph Send API is a future upgrade).
    """
    print("\n[Agent 4/5]  dispatch_subagents")
    findings = []

    for agent_name, persona in AGENT_PERSONAS.items():
        print(f"  → Running {agent_name}...")
        agent_plan = state["plan"].get(agent_name, {})

        system = SystemMessage(content=persona + AGENT_RESPONSE_SCHEMA)
        human = HumanMessage(content=(
            f"Architecture summary:\n{state['architecture_summary']}\n\n"
            f"Your assigned focus: {agent_plan.get('focus', 'general review')}\n"
            f"Specific checks: {agent_plan.get('checks', [])}\n\n"
            f"Nodes:\n{json.dumps(state['nodes'], indent=2)}\n\n"
            f"Connections:\n{json.dumps(state['edges'], indent=2)}"
        ))

        response = llm.invoke([system, human])
        raw_text = _strip_fences(response.content)

        try:
            result = json.loads(raw_text)
        except json.JSONDecodeError:
            result = {"agent": agent_name, "findings": [], "summary": f"Parse error for {agent_name}."}

        findings.append(result)
        print(f"     {agent_name}: {len(result.get('findings', []))} findings")

    return {
        "agent_findings": findings,
        "messages": [AIMessage(content=f"[dispatch_subagents] {len(findings)} agents done.")],
    }

# ─────────────────────────────────────────────
# Node 5 — Compile Results (Reviewer Agent)
# ─────────────────────────────────────────────

def compile_results(state: PlannerState) -> dict:
    """
    Agent 5 (Reviewer): Synthesizes all sub-agent findings into a
    single prioritized report with an overall score.
    """
    print("\n[Agent 5/5]  compile_results (Reviewer)")
    reviewer_plan = state["plan"].get("reviewer_agent", {})

    system = SystemMessage(content=(
        "You are the Reviewer Agent — the final synthesizer in an architecture review pipeline.\n"
        "You receive findings from Security, Scalability, Cost, and Optimization agents.\n"
        "Produce a clear, prioritized, actionable review report.\n\n"
        "Respond ONLY with a JSON object:\n"
        "{\n"
        '  "overall_score": <0-100>,\n'
        '  "verdict": "one sentence overall assessment",\n'
        '  "critical_blockers": ["issue1", "issue2"],\n'
        '  "priority_fixes": [\n'
        '    { "priority": 1, "issue": "...", "agent": "...", "fix": "..." }\n'
        "  ],\n"
        '  "quick_wins": ["easy improvement 1"],\n'
        '  "strengths": ["what is done well"],\n'
        '  "full_findings_by_agent": { "<agent>": { "summary": "...", "finding_count": N } }\n'
        "}"
    ))
    human = HumanMessage(content=(
        f"Architecture: {state['architecture_summary']}\n\n"
        f"Reviewer focus: {reviewer_plan.get('focus', 'full synthesis')}\n\n"
        f"All agent findings:\n{json.dumps(state['agent_findings'], indent=2)}"
    ))

    response = llm.invoke([system, human])
    raw_text = _strip_fences(response.content)

    try:
        report_data = json.loads(raw_text)
        review_report = json.dumps(report_data, indent=2)
        score = report_data.get("overall_score", "N/A")
    except json.JSONDecodeError:
        review_report = raw_text
        score = "N/A"

    print(f"  Score: {score}/100")
    return {
        "review_report": review_report,
        "messages": [AIMessage(content=f"[compile_results] Score: {score}/100")],
    }

# ─────────────────────────────────────────────
# Build & compile the graph (once at import time)
# ─────────────────────────────────────────────

def _build_graph() -> StateGraph:
    g = StateGraph(PlannerState)
    g.add_node("parse_architecture",  parse_architecture)
    g.add_node("identify_domains",    identify_domains)
    g.add_node("create_plan",         create_plan)
    g.add_node("dispatch_subagents",  dispatch_subagents)
    g.add_node("compile_results",     compile_results)

    g.set_entry_point("parse_architecture")
    g.add_edge("parse_architecture", "identify_domains")
    g.add_edge("identify_domains",   "create_plan")
    g.add_edge("create_plan",        "dispatch_subagents")
    g.add_edge("dispatch_subagents", "compile_results")
    g.add_edge("compile_results",    END)

    return g.compile(checkpointer=MemorySaver())


planner_graph = _build_graph()

# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────

def run_planner_agent(architecture_json: dict, thread_id: str = "default") -> dict:
    """
    Called by the FastAPI server.

    Args:
        architecture_json: ArchCanvas graph JSON  {nodes, edges}  or
                           ArchitecturalGraph JSON {components, ...} from the image parser
        thread_id: per-user session ID for LangGraph checkpointing

    Returns:
        Full final state dict including review_report (JSON string).
    """
    config = {"configurable": {"thread_id": thread_id}}
    initial: PlannerState = {
        "raw_graph": architecture_json,
        "nodes": [], "edges": [],
        "architecture_summary": "",
        "risk_domains": [], "plan": {},
        "agent_findings": [], "review_report": "",
        "messages": [HumanMessage(content="Review this architecture.")],
    }
    return planner_graph.invoke(initial, config=config)
