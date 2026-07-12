"""
cost_agent.py — Autonomous cost optimization agent.

Checks: over-provisioned instances, on-demand vs reserved/spot,
data transfer costs, unused resources, storage tier mismatches,
NAT Gateway overuse, Lambda pricing traps, missing cost allocation tags.
"""

from agents.base import BaseAgent, PlannerState


class CostAgent(BaseAgent):

    name = "cost_agent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are a senior FinOps engineer specializing in AWS cost optimization.\n"
            "Your ONLY job is to find cost inefficiencies and waste in the architecture.\n\n"
            "Areas to investigate:\n"
            "  • Instance sizing — over-provisioned EC2, RDS, ElastiCache instances\n"
            "  • Pricing model — on-demand where Reserved Instances or Savings Plans apply\n"
            "  • Data transfer — cross-AZ traffic, egress without CloudFront, S3 transfer acceleration\n"
            "  • NAT Gateway — traffic routed through NAT Gateway that could use VPC endpoints\n"
            "  • Storage — wrong S3 storage class (Standard vs Infrequent Access vs Glacier)\n"
            "  • Lambda — high-frequency Lambdas that would be cheaper as ECS/Fargate\n"
            "  • Idle resources — dev/staging resources running 24/7, unattached EBS volumes\n"
            "  • Missing tags — no cost allocation tags making cost tracking impossible\n"
            "  • Database — single large RDS vs Aurora Serverless for variable workloads\n\n"
            "Severity guide:\n"
            "  critical — cost will grow unboundedly or unexpectedly under load\n"
            "  high     — likely wasting >30% of spend for this component\n"
            "  medium   — 10-30% savings opportunity with low effort\n"
            "  low      — minor optimization, worth doing but not urgent\n\n"
            "Provide rough % savings estimate in the recommendation where possible."
        )


if __name__ == "__main__":
    import json

    test_state: PlannerState = {
        "raw_graph": {},
        "nodes": [
            {"id": "1", "label": "EC2 t2.xlarge", "type": "aws-ec2"},
            {"id": "2", "label": "RDS db.r5.2xlarge", "type": "aws-rds"},
            {"id": "3", "label": "NAT Gateway", "type": "service"},
            {"id": "4", "label": "S3 Standard", "type": "aws-s3"},
        ],
        "edges": [
            {"source": "1", "target": "2", "label": "SQL"},
            {"source": "1", "target": "3", "label": "egress"},
            {"source": "3", "target": "4", "label": "PUT"},
        ],
        "architecture_summary": "Large EC2 and RDS instances on on-demand pricing. Heavy NAT Gateway usage.",
        "risk_domains": ["cost"],
        "plan": {
            "cost_agent": {
                "focus": "instance sizing, NAT Gateway, storage tiers",
                "checks": ["check instance types", "check pricing models", "check NAT usage"],
            }
        },
        "agent_findings": [],
        "review_report": "",
        "messages": [],
    }

    agent = CostAgent()
    result = agent.run(test_state)
    print(json.dumps(result, indent=2))
