"""
reviewer_agent.py — Autonomous synthesis and review agent.

This is the final agent in the pipeline. It receives all findings
from every specialist agent and synthesizes them into a single
prioritized, actionable report with an overall architecture score.

It does NOT inherit BaseAgent — its input and output schema are
different from specialist agents since it aggregates, not investigates.
"""

import json
import os

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from agents.base import PlannerState, get_llm, strip_fences


REVIEWER_SYSTEM_PROMPT = """
You are the Lead Architecture Reviewer — the final synthesizer in an AI-powered cloud review pipeline.
You receive structured findings from specialist agents (Security, Scalability, Cost, Reliability, Compliance).
Each finding carries a confidence level: OBSERVED, INFERRED, or NOT_VISIBLE.

Synthesis rules:
  • Only include findings supported by agent reports — do NOT invent new issues
  • De-duplicate overlapping findings; escalate severity when multiple agents flag the same component
  • Score out of 100: deduct per finding — OBSERVED critical: -15, high: -8 / INFERRED critical: -10, high: -5 / NOT_VISIBLE: max -2 each
  • critical_blockers: ONLY from OBSERVED or strongly INFERRED findings — never from NOT_VISIBLE
  • For INFERRED findings use language like: "does not appear in the diagram"
  • For NOT_VISIBLE findings use: "not visible in diagram — verify in AWS Console or IaC"
  • priority_fixes: concrete AWS-specific actions, not generic advice
  • quick_wins: changes under 2 hours with high value
  • recommended_next_steps: sprint-level actions for the team

Respond ONLY with valid JSON:
{
  "overall_score": <0-100>,
  "grade": "A|B|C|D|F",
  "verdict": "one sentence naming specific components and their primary risk",
  "critical_blockers": [
    { "issue": "...", "agent": "...", "why": "specific risk with component name and diagram evidence" }
  ],
  "priority_fixes": [
    {
      "priority": 1,
      "issue": "...",
      "agent": "...",
      "fix": "exact AWS action: service name, console path or CLI command",
      "estimated_effort": "1 hour|half day|1 day|2-3 days|1 week"
    }
  ],
  "quick_wins": [
    { "action": "specific action on named component", "benefit": "measurable outcome" }
  ],
  "strengths": ["specific strength referencing actual component names from the diagram"],
  "recommended_next_steps": [
    "Sprint 1: ...",
    "Sprint 2: ...",
    "Sprint 3: ..."
  ],
  "per_agent_summary": {
    "<agent_name>": {
      "summary": "one sentence naming what was found or confirmed not present",
      "finding_count": <N>,
      "highest_severity": "critical|high|medium|low|none"
    }
  }
}
"""


class ReviewerAgent:
    """
    Standalone reviewer/synthesizer. Not a specialist agent —
    it reads all findings and produces the final report.
    """

    name = "reviewer_agent"

    def __init__(self):
        self.llm = get_llm()

    def run(self, state: PlannerState) -> dict:
        print(f"\n  → [{self.name}] synthesizing {len(state['agent_findings'])} agent reports...")

        reviewer_plan = state["plan"].get(self.name, {})

        human_content = (
            f"Architecture summary:\n{state['architecture_summary']}\n\n"
            f"Reviewer focus: {reviewer_plan.get('focus', 'full synthesis')}\n\n"
            f"Specialist agent findings:\n{json.dumps(state['agent_findings'], indent=2)}"
        )

        system = SystemMessage(content=REVIEWER_SYSTEM_PROMPT)
        human = HumanMessage(content=human_content)

        response = self.llm.invoke([system, human])
        raw = strip_fences(response.content)

        try:
            report = json.loads(raw)
            # Hard-enforce: critical_blockers must only come from OBSERVED or strongly INFERRED findings.
            # Filter out any blocker whose issue text suggests it's about something "not shown" / "not visible".
            not_visible_phrases = ("not visible", "not shown", "not in the diagram", "cannot be determined")
            if "critical_blockers" in report:
                report["critical_blockers"] = [
                    b for b in report["critical_blockers"]
                    if not any(phrase in (b.get("why", "") + b.get("issue", "")).lower()
                               for phrase in not_visible_phrases)
                ]
            score = report.get("overall_score", "N/A")
            grade = report.get("grade", "?")
        except json.JSONDecodeError:
            report = {"error": "Failed to parse reviewer output", "raw": raw}
            score, grade = "N/A", "?"

        print(f"     [{self.name}] score: {score}/100  grade: {grade}")
        return report


# ─────────────────────────────────────────────────────────────────
# Standalone test
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mock_findings = [
        {
            "agent": "security_agent",
            "findings": [
                {"severity": "critical", "issue": "S3 bucket public", "description": "All objects exposed", "recommendation": "Enable Block Public Access"}
            ],
            "summary": "Critical public S3 exposure found.",
        },
        {
            "agent": "scalability_agent",
            "findings": [
                {"severity": "high", "issue": "No auto-scaling", "description": "Single EC2 with no ASG", "recommendation": "Add Auto Scaling Group with min 2, max 10"}
            ],
            "summary": "Single EC2 is a scalability bottleneck.",
        },
    ]

    test_state: PlannerState = {
        "raw_graph": {},
        "nodes": [],
        "edges": [],
        "architecture_summary": "EC2 + S3 + RDS basic setup.",
        "risk_domains": ["security", "scalability"],
        "plan": {"reviewer_agent": {"focus": "full synthesis"}},
        "agent_findings": mock_findings,
        "review_report": "",
        "messages": [],
    }

    agent = ReviewerAgent()
    result = agent.run(test_state)
    print(json.dumps(result, indent=2))
