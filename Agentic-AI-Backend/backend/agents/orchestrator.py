"""
orchestrator.py — LangGraph pipeline, 3 LLM calls.

Call 1 (plan_review)     — identify domains + per-agent checks
Call 2 (run_all_agents)  — all agents batched, but with rich deterministic context injected
Call 3 (compile_results) — reviewer synthesizes final scored report

Key improvement: a deterministic pre-analysis step (zero LLM calls) builds
concrete, factual observations about the architecture before any LLM runs.
This grounds agents in reality instead of letting them hallucinate generic findings.
"""

import json
import os
from typing import Annotated
import operator

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agents.base import PlannerState, get_llm, strip_fences
from agents.reviewer_agent import ReviewerAgent

_reviewer = ReviewerAgent()
llm = get_llm()

# ─────────────────────────────────────────────────────────────────
# Agent personas — richer, domain-focused
# ─────────────────────────────────────────────────────────────────

AGENT_PERSONAS = {
    "security": (
        "You are a senior AWS security engineer conducting a threat-focused architecture review. "
        "You think like an attacker — look for paths to data exfiltration, privilege escalation, "
        "and lateral movement. Focus on: IAM least privilege, encryption at rest and in transit, "
        "VPC isolation, security groups open to 0.0.0.0/0, WAF presence, secrets management, "
        "exposed public endpoints, API Gateway authorization, public S3 buckets, unencrypted databases."
    ),
    "scalability": (
        "You are a senior cloud scalability engineer who has debugged production outages. "
        "Find every single point of failure and every bottleneck that will hurt under load. "
        "Focus on: missing Auto Scaling Groups, Lambda concurrency limits, single-AZ deployments, "
        "databases with no read replicas or RDS Proxy, missing ElastiCache/CloudFront caching, "
        "synchronous chains that should be async via SQS/SNS, stateful EC2 design, missing CDN."
    ),
    "cost": (
        "You are a FinOps engineer who saves companies 40% on their AWS bills. "
        "Find every dollar being wasted in this architecture. "
        "Focus on: over-provisioned or wrong-sized instances, on-demand where Reserved/Savings Plans apply, "
        "cross-AZ data transfer, NAT Gateway traffic that could use VPC endpoints, "
        "wrong S3 storage class, high-frequency Lambdas that would be cheaper as Fargate, "
        "missing cost allocation tags, idle dev resources running 24/7."
    ),
    "reliability": (
        "You are an SRE who designs systems for 99.99% uptime. "
        "Find every failure mode that could cause downtime or data loss. "
        "Focus on: single-AZ components, missing RDS Multi-AZ, missing automated backups, "
        "SQS queues without dead-letter queues, missing CloudWatch alarms, "
        "no circuit breakers on external dependencies, missing health checks, "
        "no cross-region replication for critical data, synchronous failure cascades."
    ),
    "compliance": (
        "You are an AWS Well-Architected Framework specialist and compliance architect. "
        "Map every finding to a specific WAF pillar or regulation. "
        "Focus on: missing CloudTrail, missing VPC Flow Logs, no ALB/S3 access logs, "
        "GDPR surface (PII without encryption, no retention policy), "
        "missing IaC (Terraform/CDK/CloudFormation), untagged resources, "
        "wrong service selection anti-patterns, missing distributed tracing (X-Ray)."
    ),
}


# ─────────────────────────────────────────────────────────────────
# Deterministic pre-analysis — zero LLM calls, pure Python logic.
#
# Every observation is tagged with a confidence level:
#   OBSERVED       — component/connection is explicitly present in the diagram
#   INFERRED       — component is absent but the absence is structurally significant
#                    (e.g. EC2 is present but no ASG node exists)
#   NOT_VISIBLE    — configuration detail that cannot be read from a diagram
#                    (e.g. whether encryption is enabled on an RDS instance)
#
# Agents must use this tagging to calibrate their language:
#   OBSERVED       → "X is present / X is configured as Y"
#   INFERRED       → "X does not appear in the diagram"
#   NOT_VISIBLE    → "X is not visible in the diagram — cannot be confirmed or ruled out"
# ─────────────────────────────────────────────────────────────────

def _preanalyze(nodes: list[dict], edges: list[dict]) -> dict:
    """
    Returns per-domain dicts of {confidence, observation} pairs.
    """
    observations: dict[str, list[dict]] = {
        "security": [], "scalability": [], "cost": [],
        "reliability": [], "compliance": [], "general": [],
    }

    def obs(domain, confidence, text):
        observations[domain].append({"confidence": confidence, "text": text})

    # Normalize for pattern matching — search ALL text fields combined
    all_node_text = []
    for n in nodes:
        combined = " ".join([
            str(n.get("type", "")).lower(),
            str(n.get("technology", "")).lower(),
            str(n.get("name", "") or "").lower(),
            str(n.get("label", "") or "").lower(),
        ])
        all_node_text.append(combined)

    def has_any(*keywords):
        return any(kw in combined for combined in all_node_text for kw in keywords)

    def matching_nodes(*keywords):
        results = []
        for n in nodes:
            node_texts = [
                str(n.get("type", "")).lower(),
                str(n.get("technology", "")).lower(),
                str(n.get("name", "") or "").lower(),
                str(n.get("label", "") or "").lower(),
            ]
            combined = " ".join(node_texts)
            if any(kw in combined for kw in keywords):
                results.append(n.get("name") or n.get("label") or n.get("id", "?"))
        return results

    edge_labels = [str(e.get("label", "")).lower() for e in edges]

    # ── General structural facts (all OBSERVED) ─────────────────
    obs("general", "OBSERVED", f"{len(nodes)} component(s) and {len(edges)} connection(s) are present in the diagram.")

    cloud_managed = [n.get("name") or n.get("id","") for n in nodes if n.get("is_cloud_managed")]
    if cloud_managed:
        obs("general", "OBSERVED", f"Cloud-managed services present: {', '.join(cloud_managed)}.")

    boundaries = list(set(n.get("enclosed_within") for n in nodes if n.get("enclosed_within")))
    if boundaries:
        obs("general", "OBSERVED", f"Network boundary/groupings visible in diagram: {', '.join(str(b) for b in boundaries)}.")
    else:
        obs("general", "INFERRED", "No VPC, subnet, or network boundary groupings are drawn in the diagram — network isolation cannot be confirmed.")

    if any("http" == lbl for lbl in edge_labels):
        obs("general", "OBSERVED", "At least one connection is labelled HTTP (unencrypted).")
    if any("https" == lbl for lbl in edge_labels):
        obs("general", "OBSERVED", "At least one connection is labelled HTTPS (encrypted in transit).")

    # ── Security ────────────────────────────────────────────────
    waf_nodes = matching_nodes("waf", "firewall", "shield")
    if waf_nodes:
        obs("security", "OBSERVED", f"WAF/firewall component present: {', '.join(waf_nodes)}.")
    else:
        obs("security", "INFERRED", "No WAF, AWS Shield, or firewall node appears in the diagram — web-layer protection is not shown.")

    auth_nodes = matching_nodes("cognito", "auth", "authorizer", "oauth", "jwt", "keycloak", "okta")
    if auth_nodes:
        obs("security", "OBSERVED", f"Authentication/authorization service present: {', '.join(auth_nodes)}.")
    else:
        obs("security", "INFERRED", "No authentication or authorization service (e.g. Cognito, API Gateway Authorizer) appears in the diagram.")

    kms_nodes = matching_nodes("kms", "vault", "secrets manager", "parameter store", "secret")
    if kms_nodes:
        obs("security", "OBSERVED", f"Secrets/key management service present: {', '.join(kms_nodes)}.")
    else:
        obs("security", "INFERRED", "No KMS, Secrets Manager, or Parameter Store node appears in the diagram.")

    # Encryption on data stores — architecture diagrams never show this; must say NOT_VISIBLE
    db_nodes = matching_nodes("rds", "aurora", "dynamodb", "mysql", "postgres", "database")
    if db_nodes:
        obs("security", "NOT_VISIBLE",
            f"Whether encryption-at-rest is enabled on {', '.join(db_nodes)} is a configuration detail not visible in architecture diagrams.")

    s3_nodes = matching_nodes("s3", "bucket")
    if s3_nodes:
        obs("security", "NOT_VISIBLE",
            f"S3 Block Public Access setting, bucket policy, and server-side encryption for {', '.join(s3_nodes)} are configuration details not visible in the diagram.")

    vpc_nodes = matching_nodes("vpc", "subnet", "private subnet", "nacl", "security group")
    if vpc_nodes:
        obs("security", "OBSERVED", f"Network isolation components present: {', '.join(vpc_nodes)}.")
    else:
        obs("security", "INFERRED", "No VPC, subnet, or security group is shown — network isolation is not depicted in the diagram.")

    api_nodes = matching_nodes("api gateway", "apigw", "api gw")
    if api_nodes:
        obs("security", "INFERRED",
            f"{', '.join(api_nodes)} is internet-facing by default — verify it has an authorizer and resource policy configured (not visible in diagram).")

    # ── Scalability ─────────────────────────────────────────────
    ec2_nodes = matching_nodes("ec2", "instance", "app server")
    asg_nodes = matching_nodes("auto scaling", "asg", "autoscaling")
    if ec2_nodes and not asg_nodes:
        obs("scalability", "INFERRED",
            f"EC2 instance(s) present ({', '.join(ec2_nodes)}) but no Auto Scaling Group node appears in the diagram.")
    elif asg_nodes:
        obs("scalability", "OBSERVED", f"Auto Scaling Group present: {', '.join(asg_nodes)}.")

    cache_nodes = matching_nodes("elasticache", "redis", "memcached", "cache")
    cdn_nodes = matching_nodes("cloudfront", "cdn")
    if cache_nodes:
        obs("scalability", "OBSERVED", f"Caching layer present: {', '.join(cache_nodes)}.")
    if cdn_nodes:
        obs("scalability", "OBSERVED", f"CDN present: {', '.join(cdn_nodes)}.")
    if not cache_nodes and not cdn_nodes:
        obs("scalability", "INFERRED", "No caching layer (ElastiCache, CloudFront) appears in the diagram — all requests likely reach origin services directly.")

    if db_nodes:
        replica_nodes = matching_nodes("read replica", "rds proxy", "aurora serverless")
        if replica_nodes:
            obs("scalability", "OBSERVED", f"DB scaling components present: {', '.join(replica_nodes)}.")
        else:
            obs("scalability", "NOT_VISIBLE",
                f"Whether {', '.join(db_nodes)} has read replicas, Multi-AZ, or RDS Proxy configured is not visible in the diagram.")

    queue_nodes = matching_nodes("sqs", "sns", "queue", "eventbridge", "kinesis", "kafka")
    if queue_nodes:
        obs("scalability", "OBSERVED", f"Async messaging components present: {', '.join(queue_nodes)}.")
    else:
        obs("scalability", "INFERRED", "No async messaging (SQS, SNS, EventBridge) appears in the diagram — services appear to communicate synchronously.")

    lambda_nodes = matching_nodes("lambda", "function")
    if lambda_nodes:
        obs("scalability", "NOT_VISIBLE",
            f"Lambda concurrency limits and reserved concurrency for {', '.join(lambda_nodes)} are configuration details not visible in the diagram.")

    # ── Cost ────────────────────────────────────────────────────
    nat_nodes = matching_nodes("nat gateway", "nat")
    if nat_nodes and (s3_nodes or matching_nodes("dynamodb")):
        obs("cost", "INFERRED",
            f"NAT Gateway ({', '.join(nat_nodes)}) is present alongside S3/DynamoDB — traffic to these AWS services may be routing through NAT Gateway instead of free VPC endpoints.")
    if s3_nodes and not cdn_nodes:
        obs("cost", "INFERRED",
            f"S3 ({', '.join(s3_nodes)}) is present without CloudFront — static asset delivery likely incurs S3 egress charges.")
    if ec2_nodes or db_nodes:
        obs("cost", "NOT_VISIBLE",
            "Whether EC2/RDS instances use Reserved Instances or Savings Plans is a billing configuration not visible in architecture diagrams.")
    if ec2_nodes and not asg_nodes:
        obs("cost", "INFERRED",
            f"EC2 ({', '.join(ec2_nodes)}) without Auto Scaling likely runs at peak size 24/7, incurring cost during off-peak hours.")

    # ── Reliability ─────────────────────────────────────────────
    enclosed = [n.get("enclosed_within") for n in nodes if n.get("enclosed_within")]
    unique_zones = set(enclosed)
    if len(unique_zones) >= 2:
        obs("reliability", "OBSERVED", f"Components are distributed across {len(unique_zones)} boundaries: {', '.join(str(z) for z in unique_zones)}.")
    else:
        obs("reliability", "NOT_VISIBLE",
            "Multi-AZ deployment cannot be determined from the diagram — AZ placement is a deployment configuration detail.")

    if db_nodes:
        obs("reliability", "NOT_VISIBLE",
            f"Whether {', '.join(db_nodes)} has Multi-AZ enabled, automated backups, or a snapshot schedule is a configuration detail not visible in the diagram.")

    if queue_nodes:
        dlq_nodes = matching_nodes("dlq", "dead letter", "dead-letter")
        if dlq_nodes:
            obs("reliability", "OBSERVED", f"Dead Letter Queue present: {', '.join(dlq_nodes)}.")
        else:
            obs("reliability", "INFERRED",
                f"SQS/queue components ({', '.join(queue_nodes)}) are present but no Dead Letter Queue appears in the diagram.")

    monitoring_nodes = matching_nodes("cloudwatch", "alarm", "monitoring", "datadog", "grafana", "newrelic")
    if monitoring_nodes:
        obs("reliability", "OBSERVED", f"Monitoring/alerting component present: {', '.join(monitoring_nodes)}.")
    else:
        obs("reliability", "INFERRED", "No monitoring or alerting service (CloudWatch, Datadog, etc.) appears in the diagram.")

    backup_nodes = matching_nodes("backup", "snapshot", "glacier", "replication")
    if backup_nodes:
        obs("reliability", "OBSERVED", f"Backup/replication component present: {', '.join(backup_nodes)}.")
    else:
        obs("reliability", "NOT_VISIBLE",
            "Backup policies (RDS automated backups, S3 versioning, snapshot schedules) are configuration details not visible in architecture diagrams.")

    # ── Compliance ──────────────────────────────────────────────
    cloudtrail_nodes = matching_nodes("cloudtrail", "trail", "audit log")
    if cloudtrail_nodes:
        obs("compliance", "OBSERVED", f"CloudTrail or audit logging component present: {', '.join(cloudtrail_nodes)}.")
    else:
        obs("compliance", "INFERRED", "No CloudTrail node appears in the diagram — API call auditing is not depicted.")

    flowlog_nodes = matching_nodes("flow log", "vpc flow")
    if flowlog_nodes:
        obs("compliance", "OBSERVED", f"VPC Flow Logs component present: {', '.join(flowlog_nodes)}.")
    else:
        obs("compliance", "NOT_VISIBLE",
            "VPC Flow Logs is a feature toggle on VPC/ENI, not a separate component — cannot be confirmed or ruled out from the diagram alone.")

    iac_nodes = matching_nodes("terraform", "cloudformation", "cdk", "pulumi")
    if iac_nodes:
        obs("compliance", "OBSERVED", f"Infrastructure-as-Code tooling present: {', '.join(iac_nodes)}.")
    else:
        obs("compliance", "INFERRED", "No IaC tooling (Terraform, CDK, CloudFormation) appears in the diagram.")

    tracing_nodes = matching_nodes("xray", "x-ray", "tracing", "jaeger", "zipkin")
    if tracing_nodes:
        obs("compliance", "OBSERVED", f"Distributed tracing present: {', '.join(tracing_nodes)}.")
    else:
        obs("compliance", "INFERRED", "No distributed tracing service (X-Ray, Jaeger) appears in the diagram.")

    return {k: v for k, v in observations.items() if v}


# ─────────────────────────────────────────────────────────────────
# Stage 1 — Parse Architecture (no LLM, deterministic)
# ─────────────────────────────────────────────────────────────────

def parse_architecture(state: PlannerState) -> dict:
    print("\n[1/4] parse_architecture")
    raw = state["raw_graph"]

    nodes = raw.get("nodes") or raw.get("components") or []
    edges = raw.get("edges") or []

    if not edges and nodes:
        for node in nodes:
            for target_id in node.get("connections", []):
                edges.append({
                    "id": f"{node['id']}__{target_id}",
                    "source": node["id"],
                    "target": target_id,
                    "label": "→",
                })

    node_map = {n["id"]: n for n in nodes}

    # Build richer per-node descriptions including all available metadata
    node_descs = []
    for n in nodes:
        parts = [n.get("technology") or n.get("type", "Service")]
        if n.get("name") or n.get("label"):
            parts.append(f"named '{n.get('name') or n.get('label')}'")
        if n.get("is_cloud_managed"):
            parts.append("(cloud-managed)")
        if n.get("enclosed_within"):
            parts.append(f"[inside: {n['enclosed_within']}]")
        node_descs.append(" ".join(parts))

    edge_descs = []
    for e in edges:
        src = node_map.get(e.get("source", ""), {})
        tgt = node_map.get(e.get("target", ""), {})
        s = src.get("label") or src.get("name") or src.get("technology") or e.get("source", "?")
        t = tgt.get("label") or tgt.get("name") or tgt.get("technology") or e.get("target", "?")
        lbl = e.get("label", "→")
        edge_descs.append(f"{s} --[{lbl}]--> {t}")

    summary = (
        f"Architecture with {len(nodes)} component(s): {', '.join(node_descs) or 'none'}. "
        f"Data flows: {'; '.join(edge_descs) if edge_descs else 'none defined'}."
    )

    # Run deterministic pre-analysis
    pre_analysis = _preanalyze(nodes, edges)

    print(f"   Summary: {summary[:160]}...")
    print(f"   Pre-analysis observations: {sum(len(v) for v in pre_analysis.values())} facts")
    return {
        "nodes": nodes,
        "edges": edges,
        "architecture_summary": summary,
        "pre_analysis": pre_analysis,
        "messages": [AIMessage(content=f"[parse_architecture] {summary}")],
    }


# ─────────────────────────────────────────────────────────────────
# Stage 2 — Plan Review  ← LLM CALL 1
# ─────────────────────────────────────────────────────────────────

def plan_review(state: PlannerState) -> dict:
    print("\n[2/4] plan_review  (LLM call 1/3)")

    pre = state.get("pre_analysis", {})
    pre_summary = ""
    if pre:
        lines = []
        for domain, obs_list in pre.items():
            for o in obs_list:
                conf = o.get("confidence", "INFERRED") if isinstance(o, dict) else "INFERRED"
                text = o.get("text", o) if isinstance(o, dict) else o
                lines.append(f"  [{conf}] [{domain.upper()}] {text}")
        pre_summary = "Diagram evidence (use to guide specific checks):\n" + "\n".join(lines)

    system = SystemMessage(content=(
        "You are the Orchestrator for a cloud architecture review system.\n"
        "In ONE response, identify the most relevant risk domains and assign specific checks to each agent.\n\n"
        "Available domains: security, scalability, cost, reliability, compliance\n\n"
        "Respond ONLY with this JSON — no markdown:\n"
        "{\n"
        '  "domains": ["security", "scalability", "cost", "reliability", "compliance"],\n'
        '  "plan": {\n'
        '    "security_agent":    { "focus": "...", "checks": ["check1", "check2", "check3"] },\n'
        '    "scalability_agent": { "focus": "...", "checks": ["check1", "check2", "check3"] },\n'
        '    "cost_agent":        { "focus": "...", "checks": ["check1", "check2", "check3"] },\n'
        '    "reliability_agent": { "focus": "...", "checks": ["check1", "check2", "check3"] },\n'
        '    "compliance_agent":  { "focus": "...", "checks": ["check1", "check2", "check3"] },\n'
        '    "reviewer_agent":    { "focus": "full synthesis", "checks": [] }\n'
        "  }\n"
        "}\n\n"
        "Always include all 5 domains.\n"
        "Checks must reference SPECIFIC component names from the architecture, not generic categories."
    ))
    human = HumanMessage(content=(
        f"Architecture summary:\n{state['architecture_summary']}\n\n"
        f"{pre_summary}\n\n"
        f"Components:\n{json.dumps(state['nodes'], indent=2)}"
    ))

    response = llm.invoke([system, human])
    raw = strip_fences(response.content)

    valid_domains = {"security", "scalability", "cost", "reliability", "compliance"}
    try:
        parsed = json.loads(raw)
        domains = [d for d in parsed.get("domains", []) if d in valid_domains]
        plan = parsed.get("plan", {})
        if not domains:
            raise ValueError("no valid domains")
    except (json.JSONDecodeError, ValueError):
        domains = list(valid_domains)
        plan = {f"{d}_agent": {"focus": "general review", "checks": []} for d in domains}
        plan["reviewer_agent"] = {"focus": "full synthesis", "checks": []}

    print(f"   Domains: {domains}  |  Plan keys: {list(plan.keys())}")
    return {
        "risk_domains": domains,
        "plan": plan,
        "messages": [AIMessage(content=f"[plan_review] domains={domains}")],
    }


# ─────────────────────────────────────────────────────────────────
# Stage 3 — Run All Agents  ← LLM CALL 2
# ─────────────────────────────────────────────────────────────────

def run_all_agents(state: PlannerState) -> dict:
    print(f"\n[3/4] run_all_agents  (LLM call 2/3)  domains={state['risk_domains']}")

    pre = state.get("pre_analysis", {})

    # Build rich agent instruction blocks with confidence-tagged facts
    agent_instructions = []
    for domain in state["risk_domains"]:
        agent_name = f"{domain}_agent"
        persona = AGENT_PERSONAS.get(domain, f"You are a {domain} expert.")
        agent_plan = state["plan"].get(agent_name, {})
        domain_facts = pre.get(domain, [])
        general_facts = pre.get("general", [])

        facts_block = ""
        all_facts = general_facts + domain_facts
        if all_facts:
            facts_block = "\n  DIAGRAM EVIDENCE (confidence-tagged):\n"
            for f in all_facts:
                conf = f.get("confidence", "INFERRED")
                text = f.get("text", f) if isinstance(f, dict) else f
                facts_block += f"    [{conf}] {text}\n"

        agent_instructions.append(
            f'AGENT: "{agent_name}"\n'
            f'  Persona: {persona}\n'
            f'  Assigned focus: {agent_plan.get("focus", "general review")}\n'
            f'  Specific checks: {json.dumps(agent_plan.get("checks", []))}\n'
            f'{facts_block}'
        )

    finding_shape = (
        '{\n'
        '  "severity": "critical|high|medium|low",\n'
        '  "confidence": "OBSERVED|INFERRED|NOT_VISIBLE",\n'
        '  "issue": "concise title naming the specific component",\n'
        '  "evidence": "quote the diagram evidence this finding is based on (component names, connections, labels)",\n'
        '  "description": "what is wrong or at risk, and why it matters",\n'
        '  "recommendation": "specific action with exact AWS service and configuration detail"\n'
        '}'
    )

    system = SystemMessage(content=(
        "You are a cloud architecture review engine acting as a real AWS Solutions Architect.\n"
        "You review ONLY what is visible or structurally inferable from the diagram.\n\n"

        "CONFIDENCE LEVELS — assign the correct one to every finding:\n"
        "  OBSERVED    — component or connection is explicitly drawn in the diagram\n"
        "                Example: 'AWS API Gateway is present and internet-facing'\n"
        "  INFERRED    — a component is absent from the diagram but its absence matters\n"
        "                Example: 'No WAF node appears in the diagram alongside API Gateway'\n"
        "  NOT_VISIBLE — a configuration detail that no architecture diagram can ever show\n"
        "                Example: 'Whether DynamoDB encryption-at-rest is enabled'\n"
        "                Required phrasing: 'not visible in diagram — verify in AWS Console'\n\n"

        "SEVERITY HARD RULES (these are absolute — no exceptions):\n"
        "  Rule 1: NOT_VISIBLE findings → severity is always 'medium' or 'low'. Never critical or high.\n"
        "  Rule 2: INFERRED findings (absent from diagram) → severity max 'high'. Never critical.\n"
        "          Critical is reserved for confirmed present problems (OBSERVED).\n"
        "  Rule 3: Do not claim something is 'missing' if it is NOT_VISIBLE — say 'not visible in diagram'.\n"
        "  Rule 4: Do not invent components not shown in the diagram.\n"
        "  Rule 5: Every finding must cite specific component names from the diagram in the evidence field.\n\n"

        "FINDING COUNT: 3-5 per agent. Rank by severity descending. Quality over quantity.\n\n"

        "Respond ONLY with this JSON:\n"
        "{\n"
        '  "<agent_name>": {\n'
        '    "agent": "<agent_name>",\n'
        f'    "findings": [ {finding_shape} ],\n'
        '    "summary": "one sentence naming specific components and what was found or not found in the diagram"\n'
        "  }\n"
        "}"
    ))

    human = HumanMessage(content=(
        f"Architecture summary:\n{state['architecture_summary']}\n\n"
        f"Full component list:\n{json.dumps(state['nodes'], indent=2)}\n\n"
        f"All connections:\n{json.dumps(state['edges'], indent=2)}\n\n"
        "━━━ AGENTS TO RUN ━━━\n\n" +
        "\n\n".join(agent_instructions)
    ))

    response = llm.invoke([system, human])
    raw = strip_fences(response.content)

    try:
        batched = json.loads(raw)
        findings = []
        for agent_name, block in batched.items():
            block["agent"] = agent_name
            # Hard-enforce severity caps by confidence level — do not trust the LLM
            for finding in block.get("findings", []):
                conf = finding.get("confidence", "INFERRED")
                sev = finding.get("severity", "low")
                if conf == "NOT_VISIBLE" and sev in ("critical", "high"):
                    finding["severity"] = "medium"
                elif conf == "INFERRED" and sev == "critical":
                    finding["severity"] = "high"
            findings.append(block)
    except (json.JSONDecodeError, KeyError):
        findings = [{
            "agent": f"{d}_agent",
            "findings": [],
            "summary": f"Parse error for {d}_agent."
        } for d in state["risk_domains"]]

    total = sum(len(f.get("findings", [])) for f in findings)
    print(f"   {len(findings)} agents  |  {total} findings total")
    return {
        "agent_findings": findings,
        "messages": [AIMessage(content=f"[run_all_agents] {len(findings)} agents, {total} findings")],
    }


# ─────────────────────────────────────────────────────────────────
# Stage 4 — Compile Results  ← LLM CALL 3
# ─────────────────────────────────────────────────────────────────

def compile_results(state: PlannerState) -> dict:
    print("\n[4/4] compile_results  (LLM call 3/3)")
    report = _reviewer.run(state)
    review_report = json.dumps(report, indent=2)
    print(f"   Score: {report.get('overall_score','N/A')}/100  Grade: {report.get('grade','?')}")
    return {
        "review_report": review_report,
        "messages": [AIMessage(content=f"[compile_results] score={report.get('overall_score')}")],
    }


# ─────────────────────────────────────────────────────────────────
# Build LangGraph pipeline
# ─────────────────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    g = StateGraph(PlannerState)

    g.add_node("parse_architecture", parse_architecture)
    g.add_node("plan_review",        plan_review)
    g.add_node("run_all_agents",     run_all_agents)
    g.add_node("compile_results",    compile_results)

    g.set_entry_point("parse_architecture")
    g.add_edge("parse_architecture", "plan_review")
    g.add_edge("plan_review",        "run_all_agents")
    g.add_edge("run_all_agents",     "compile_results")
    g.add_edge("compile_results",    END)

    return g.compile(checkpointer=MemorySaver())


planner_graph = _build_graph()


# ─────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────

def run_planner_agent(architecture_json: dict, thread_id: str = "default") -> dict:
    return run_review(architecture_json, thread_id)


def run_review(architecture_json: dict, thread_id: str = "default") -> dict:
    config = {"configurable": {"thread_id": thread_id}}
    initial: PlannerState = {
        "raw_graph": architecture_json,
        "nodes": [], "edges": [],
        "architecture_summary": "",
        "pre_analysis": {},
        "risk_domains": [], "plan": {},
        "agent_findings": [], "review_report": "",
        "messages": [HumanMessage(content="Review this architecture.")],
    }
    return planner_graph.invoke(initial, config=config)


# ─────────────────────────────────────────────────────────────────
# Smoke test
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sample = {
        "nodes": [
            {"id": "1", "name": "React Frontend",  "type": "client",   "is_cloud_managed": False},
            {"id": "2", "name": "ALB",              "type": "aws-lb",   "is_cloud_managed": True},
            {"id": "3", "name": "EC2 App Server",   "type": "aws-ec2",  "is_cloud_managed": False},
            {"id": "4", "name": "RDS PostgreSQL",   "type": "aws-rds",  "is_cloud_managed": True},
            {"id": "5", "name": "S3 Assets",        "type": "aws-s3",   "is_cloud_managed": True},
            {"id": "6", "name": "SQS Jobs",         "type": "aws-sqs",  "is_cloud_managed": True},
        ],
        "edges": [
            {"source": "1", "target": "2", "label": "HTTPS"},
            {"source": "2", "target": "3", "label": "HTTP"},
            {"source": "3", "target": "4", "label": "SQL"},
            {"source": "3", "target": "5", "label": "PUT"},
            {"source": "3", "target": "6", "label": "enqueue"},
        ],
    }
    result = run_review(sample, thread_id="test-enriched")
    print("\n" + "="*60)
    print(result["review_report"])
