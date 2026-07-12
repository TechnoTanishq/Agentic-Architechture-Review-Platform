"""
base.py — Shared state schema, base agent class, and finding schema.

Every agent inherits from BaseAgent and returns AgentFinding objects.
This ensures a consistent contract across all agents.
"""

import json
import os
from abc import ABC, abstractmethod
from typing import TypedDict, Annotated
import operator

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage


# ─────────────────────────────────────────────────────────────────
# Shared LangGraph state — passed through every node in the pipeline
# ─────────────────────────────────────────────────────────────────

class PlannerState(TypedDict):
    raw_graph: dict                                          # raw canvas/image JSON input
    nodes: list[dict]                                        # parsed component list
    edges: list[dict]                                        # parsed connection list
    architecture_summary: str                                # plain-English summary
    pre_analysis: dict                                       # deterministic facts per domain
    risk_domains: list[str]                                  # domains to investigate
    plan: dict                                               # per-agent task assignments
    agent_findings: Annotated[list[dict], operator.add]      # each agent appends its block
    review_report: str                                       # final compiled report
    messages: Annotated[list, operator.add]                  # LangGraph message history


# ─────────────────────────────────────────────────────────────────
# Shared LLM instance — all agents use this, swap model here once
# ─────────────────────────────────────────────────────────────────

def get_llm() -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        groq_api_key=os.environ.get("GROQ_API_KEY"),
    )


# ─────────────────────────────────────────────────────────────────
# Finding schema — every agent must return findings in this shape
# ─────────────────────────────────────────────────────────────────

FINDING_SCHEMA = """
Respond ONLY with a valid JSON object — no markdown, no explanation:
{
  "agent": "<your agent name>",
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "issue": "short title (max 10 words)",
      "description": "what is wrong and why it matters",
      "recommendation": "specific fix referencing actual AWS/GCP service names"
    }
  ],
  "summary": "one sentence overall verdict for your domain"
}
Reference only services that actually appear in the architecture.
"""


# ─────────────────────────────────────────────────────────────────
# Utility: strip LLM markdown code fences before JSON parsing
# ─────────────────────────────────────────────────────────────────

def strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


# ─────────────────────────────────────────────────────────────────
# BaseAgent — all specialist agents extend this
# ─────────────────────────────────────────────────────────────────

class BaseAgent(ABC):
    """
    Every specialist agent (security, scalability, cost, etc.) extends this.
    Subclasses implement `system_prompt` and optionally override `build_human_message`.
    The `run()` method is the single entry point called by the orchestrator.
    """

    name: str = "base_agent"

    def __init__(self):
        self.llm = get_llm()

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Domain-specific expert persona + instructions."""
        ...

    def build_human_message(self, state: PlannerState) -> str:
        """
        Builds the user turn sent to the LLM.
        Agents can override this to add domain-specific context.
        """
        agent_plan = state["plan"].get(self.name, {})
        return (
            f"Architecture summary:\n{state['architecture_summary']}\n\n"
            f"Your assigned focus: {agent_plan.get('focus', 'general review')}\n"
            f"Specific checks to perform: {agent_plan.get('checks', [])}\n\n"
            f"Components:\n{json.dumps(state['nodes'], indent=2)}\n\n"
            f"Connections:\n{json.dumps(state['edges'], indent=2)}"
        )

    def run(self, state: PlannerState) -> dict:
        """
        Called by the orchestrator. Invokes the LLM with this agent's
        persona + the shared architecture context. Returns a findings dict.
        """
        print(f"\n  → [{self.name}] running...")

        system = SystemMessage(content=self.system_prompt + "\n\n" + FINDING_SCHEMA)
        human = HumanMessage(content=self.build_human_message(state))

        response = self.llm.invoke([system, human])
        raw = strip_fences(response.content)

        try:
            result = json.loads(raw)
            result["agent"] = self.name  # ensure agent name is always set
        except json.JSONDecodeError:
            result = {
                "agent": self.name,
                "findings": [],
                "summary": f"[{self.name}] failed to parse LLM response.",
            }

        count = len(result.get("findings", []))
        print(f"     [{self.name}] completed — {count} finding(s)")
        return result
