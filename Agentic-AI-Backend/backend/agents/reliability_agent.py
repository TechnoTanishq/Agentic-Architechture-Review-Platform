"""
reliability_agent.py — Autonomous reliability & resilience agent.

Checks: multi-AZ deployment, backup policies, circuit breakers,
retry logic, health checks, DR strategy, RTO/RPO alignment,
graceful degradation, chaos readiness.
"""

from agents.base import BaseAgent, PlannerState


class ReliabilityAgent(BaseAgent):

    name = "reliability_agent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are a senior site reliability engineer (SRE) specializing in AWS architectures.\n"
            "Your ONLY job is to find reliability gaps and disaster recovery weaknesses.\n\n"
            "Areas to investigate:\n"
            "  • Multi-AZ — services deployed in a single AZ with no failover\n"
            "  • Backups — missing RDS automated backups, no S3 versioning, no snapshot policy\n"
            "  • Health checks — missing ALB health checks, no EC2 auto-recovery\n"
            "  • Circuit breakers — cascading failure risk when a downstream service goes down\n"
            "  • Retry logic — no retry with backoff on Lambda/SQS consumers\n"
            "  • Dead letter queues — SQS without DLQ means failed messages are lost silently\n"
            "  • Disaster recovery — no cross-region replication, no RTO/RPO strategy\n"
            "  • Graceful degradation — no fallback when dependent services fail\n"
            "  • Observability — missing CloudWatch alarms, no X-Ray tracing for failure diagnosis\n"
            "  • Data loss — synchronous writes with no durability guarantees\n\n"
            "Severity guide:\n"
            "  critical — total data loss or multi-hour outage possible from a single failure\n"
            "  high     — significant downtime risk from predictable failure scenarios\n"
            "  medium   — manual recovery required, hours of engineer effort\n"
            "  low      — resilience hardening opportunity, low immediate risk\n\n"
            "Always describe the failure scenario that would trigger the issue."
        )


if __name__ == "__main__":
    import json

    test_state: PlannerState = {
        "raw_graph": {},
        "nodes": [
            {"id": "1", "label": "EC2 App", "type": "aws-ec2"},
            {"id": "2", "label": "RDS MySQL", "type": "aws-rds"},
            {"id": "3", "label": "SQS Queue", "type": "aws-sqs"},
        ],
        "edges": [
            {"source": "1", "target": "2", "label": "SQL"},
            {"source": "1", "target": "3", "label": "enqueue"},
        ],
        "architecture_summary": "Single EC2, single-AZ RDS, SQS without DLQ. No backups shown.",
        "risk_domains": ["reliability"],
        "plan": {
            "reliability_agent": {
                "focus": "multi-AZ, backups, DLQ, health checks",
                "checks": ["check RDS multi-AZ", "check SQS DLQ", "check backup policy"],
            }
        },
        "agent_findings": [],
        "review_report": "",
        "messages": [],
    }

    agent = ReliabilityAgent()
    result = agent.run(test_state)
    print(json.dumps(result, indent=2))
