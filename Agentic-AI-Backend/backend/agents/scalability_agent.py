"""
scalability_agent.py — Autonomous scalability review agent.

Checks: auto-scaling, single points of failure, caching layers,
load balancer placement, stateless design, DB connection limits,
queue-based decoupling, CDN usage, read replicas.
"""

from agents.base import BaseAgent, PlannerState


class ScalabilityAgent(BaseAgent):

    name = "scalability_agent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are a senior cloud scalability engineer specializing in AWS architecture reviews.\n"
            "Your ONLY job is to find scalability bottlenecks and single points of failure.\n\n"
            "Areas to investigate:\n"
            "  • SPOFs — any single component whose failure takes down the system\n"
            "  • Auto-scaling — missing ASGs, Lambda concurrency limits, ECS task limits\n"
            "  • Load balancing — missing ALB/NLB, uneven traffic distribution\n"
            "  • Databases — single DB instance (no read replicas), no connection pooling (RDS Proxy)\n"
            "  • Caching — missing ElastiCache/CloudFront causing DB overload\n"
            "  • Queues — synchronous chains that should be async (SQS/SNS decoupling)\n"
            "  • Stateful design — sessions stored in memory instead of Redis/DynamoDB\n"
            "  • CDN — missing CloudFront for static assets causing origin overload\n"
            "  • Multi-AZ — services deployed in only one availability zone\n\n"
            "Severity guide:\n"
            "  critical — entire system fails under moderate load or single AZ outage\n"
            "  high     — significant degradation under expected peak load\n"
            "  medium   — scaling will require manual intervention or cause slowdowns\n"
            "  low      — suboptimal but functional at current scale\n\n"
            "Always estimate the impact in terms of user-facing effect (latency, downtime)."
        )


if __name__ == "__main__":
    import json

    test_state: PlannerState = {
        "raw_graph": {},
        "nodes": [
            {"id": "1", "label": "Load Balancer", "type": "aws-lb"},
            {"id": "2", "label": "EC2 App Server", "type": "aws-ec2"},
            {"id": "3", "label": "RDS PostgreSQL", "type": "aws-rds"},
        ],
        "edges": [
            {"source": "1", "target": "2", "label": "HTTP"},
            {"source": "2", "target": "3", "label": "SQL"},
        ],
        "architecture_summary": "ALB → single EC2 → single RDS. No caching, no read replicas.",
        "risk_domains": ["scalability"],
        "plan": {
            "scalability_agent": {
                "focus": "SPOF, auto-scaling, caching",
                "checks": ["check for single EC2", "check for read replicas", "check for caching layer"],
            }
        },
        "agent_findings": [],
        "review_report": "",
        "messages": [],
    }

    agent = ScalabilityAgent()
    result = agent.run(test_state)
    print(json.dumps(result, indent=2))
