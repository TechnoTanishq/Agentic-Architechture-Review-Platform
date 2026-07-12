"""
security_agent.py — Autonomous security review agent.

Checks: IAM least privilege, encryption at rest/transit, VPC config,
security groups, WAF presence, secrets management, exposed endpoints,
missing authentication, public S3 buckets, unencrypted databases.
"""

from agents.base import BaseAgent, PlannerState


class SecurityAgent(BaseAgent):

    name = "security_agent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are a senior cloud security engineer specializing in AWS architecture reviews.\n"
            "Your ONLY job is to find security vulnerabilities in the architecture.\n\n"
            "Areas to investigate:\n"
            "  • IAM — overly permissive roles, missing least-privilege, no MFA enforcement\n"
            "  • Network — security groups open to 0.0.0.0/0, missing WAF, no VPC isolation\n"
            "  • Encryption — databases not encrypted at rest, traffic over HTTP not HTTPS\n"
            "  • Secrets — hardcoded credentials, missing Secrets Manager / Parameter Store\n"
            "  • Endpoints — public-facing services without auth, API Gateway without authorizer\n"
            "  • Data — public S3 buckets, unencrypted EBS volumes, exposed RDS instances\n"
            "  • Auth — missing Cognito/JWT validation, no rate limiting on auth endpoints\n\n"
            "Severity guide:\n"
            "  critical — exploitable remotely right now, data breach risk\n"
            "  high     — significant exposure, exploitable with low effort\n"
            "  medium   — needs fixing but not immediately dangerous\n"
            "  low      — best practice violation, hardening opportunity\n\n"
            "Be specific. Don't mention services not present in the architecture."
        )


# ─────────────────────────────────────────────────────────────────
# Standalone entrypoint — run this agent directly for testing
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    # Minimal test state
    test_state: PlannerState = {
        "raw_graph": {},
        "nodes": [
            {"id": "1", "label": "EC2", "type": "aws-ec2"},
            {"id": "2", "label": "RDS", "type": "aws-rds"},
            {"id": "3", "label": "S3",  "type": "aws-s3"},
        ],
        "edges": [
            {"source": "1", "target": "2", "label": "SQL"},
            {"source": "1", "target": "3", "label": "PUT"},
        ],
        "architecture_summary": "EC2 instance connects to RDS PostgreSQL and S3 bucket.",
        "risk_domains": ["security"],
        "plan": {
            "security_agent": {
                "focus": "IAM, encryption, network exposure",
                "checks": ["check S3 bucket policy", "check RDS encryption", "check security groups"],
            }
        },
        "agent_findings": [],
        "review_report": "",
        "messages": [],
    }

    agent = SecurityAgent()
    result = agent.run(test_state)
    print(json.dumps(result, indent=2))
