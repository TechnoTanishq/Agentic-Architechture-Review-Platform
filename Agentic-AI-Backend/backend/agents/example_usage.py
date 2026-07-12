"""
example_usage.py — Test the Planner Agent locally without the frontend.

Run:
    export ANTHROPIC_API_KEY=sk-ant-...
    python example_usage.py
"""

import json
from planner_agent import run_planner_agent

# Sample JSON that mirrors what ArchCanvas sends
# (matches the Parsed JSON visible in the screenshot)
sample_graph = {
    "nodes": [
        {
            "id": "client",
            "name": "Client",
            "type": "Compute / Compute Layer",
            "technology": "Browser",
            "is_cloud_managed": False,
            "enclosed_within": None,
            "connections": ["api_gateway"]
        },
        {
            "id": "api_gateway",
            "name": "API Gateway",
            "type": "Networking",
            "technology": "API Gateway",
            "is_cloud_managed": True,
            "enclosed_within": None,
            "connections": ["server"]
        },
        {
            "id": "server",
            "name": "Server",
            "type": "Compute / Compute Layer",
            "technology": "EC2",
            "is_cloud_managed": False,
            "enclosed_within": "vpc",
            "connections": ["database"]
        },
        {
            "id": "database",
            "name": "Database",
            "type": "Storage",
            "technology": "RDS",
            "is_cloud_managed": True,
            "enclosed_within": "vpc",
            "connections": []
        }
    ],
    "edges": [
        {"id": "e1", "source": "client", "target": "api_gateway", "label": "HTTPS"},
        {"id": "e2", "source": "api_gateway", "target": "server", "label": "HTTP"},
        {"id": "e3", "source": "server", "target": "database", "label": "SQL"}
    ]
}

if __name__ == "__main__":
    print("Running Planner Agent...\n")
    result = run_planner_agent(sample_graph, thread_id="test-session-1")

    print("=" * 60)
    print("ARCHITECTURE SUMMARY")
    print("=" * 60)
    print(result["architecture_summary"])

    print("\n" + "=" * 60)
    print("RISK DOMAINS")
    print("=" * 60)
    print(result["risk_domains"])

    print("\n" + "=" * 60)
    print("PLAN")
    print("=" * 60)
    print(json.dumps(result["plan"], indent=2))

    print("\n" + "=" * 60)
    print("AGENT FINDINGS")
    print("=" * 60)
    for finding in result["agent_findings"]:
        print(f"\n[{finding.get('agent', 'unknown').upper()}]")
        print(f"Summary: {finding.get('summary', '')}")
        for f in finding.get("findings", []):
            print(f"  [{f['severity'].upper()}] {f['issue']}")
            print(f"    → {f['recommendation']}")

    print("\n" + "=" * 60)
    print("FINAL REVIEW REPORT")
    print("=" * 60)
    try:
        report = json.loads(result["review_report"])
        print(f"Score: {report.get('overall_score')}/100")
        print(f"Verdict: {report.get('verdict')}")
        print(f"\nCritical blockers:")
        for b in report.get("critical_blockers", []):
            print(f"  ✗ {b}")
        print(f"\nPriority fixes:")
        for fix in report.get("priority_fixes", []):
            print(f"  {fix['priority']}. [{fix['agent']}] {fix['issue']}")
            print(f"     Fix: {fix['fix']}")
        print(f"\nQuick wins:")
        for qw in report.get("quick_wins", []):
            print(f"  ✓ {qw}")
    except (json.JSONDecodeError, TypeError):
        print(result["review_report"])
