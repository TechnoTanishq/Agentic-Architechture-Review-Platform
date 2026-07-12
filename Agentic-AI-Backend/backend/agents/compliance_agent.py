"""
compliance_agent.py — Autonomous compliance & best practices agent.

Checks: AWS Well-Architected Framework pillars, GDPR/SOC2/HIPAA
surface violations, IaC gaps, tagging standards, audit logging,
observability, service selection anti-patterns.
"""

from agents.base import BaseAgent, PlannerState


class ComplianceAgent(BaseAgent):

    name = "compliance_agent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are a senior AWS compliance architect and Well-Architected Framework specialist.\n"
            "Your ONLY job is to find compliance gaps and architectural best-practice violations.\n\n"
            "Areas to investigate:\n"
            "  • Well-Architected — violations across all 6 pillars "
            "(security, reliability, performance, cost, ops excellence, sustainability)\n"
            "  • Audit logging — missing CloudTrail, missing VPC Flow Logs, no access logs on ALB/S3\n"
            "  • GDPR surface — PII in logs, no data retention policy, missing encryption for personal data\n"
            "  • SOC 2 surface — no change management (IaC), no monitoring, no incident response plan\n"
            "  • Tagging — missing cost allocation, environment, owner, and data-classification tags\n"
            "  • IaC — manually provisioned resources with no Terraform/CDK/CloudFormation coverage\n"
            "  • Observability — missing CloudWatch dashboards, no distributed tracing (X-Ray)\n"
            "  • Anti-patterns — wrong service for the job "
            "(e.g. Lambda for long-running jobs, EC2 for trivial scripts)\n"
            "  • Data residency — services in regions that violate data locality requirements\n\n"
            "Severity guide:\n"
            "  critical — active compliance violation that would fail an audit today\n"
            "  high     — significant gap that blocks certification or causes audit findings\n"
            "  medium   — needs remediation before next audit cycle\n"
            "  low      — best practice gap, low risk but should be addressed\n\n"
            "Map each finding to the relevant AWS Well-Architected pillar or regulation."
        )


if __name__ == "__main__":
    import json

    test_state: PlannerState = {
        "raw_graph": {},
        "nodes": [
            {"id": "1", "label": "EC2 App", "type": "aws-ec2"},
            {"id": "2", "label": "RDS with PII", "type": "aws-rds"},
            {"id": "3", "label": "S3 Logs", "type": "aws-s3"},
        ],
        "edges": [
            {"source": "1", "target": "2", "label": "SQL"},
            {"source": "1", "target": "3", "label": "write logs"},
        ],
        "architecture_summary": "App stores PII in RDS. No CloudTrail shown. No IaC mentioned.",
        "risk_domains": ["compliance"],
        "plan": {
            "compliance_agent": {
                "focus": "GDPR, audit logging, Well-Architected",
                "checks": ["check CloudTrail", "check PII encryption", "check tagging"],
            }
        },
        "agent_findings": [],
        "review_report": "",
        "messages": [],
    }

    agent = ComplianceAgent()
    result = agent.run(test_state)
    print(json.dumps(result, indent=2))
