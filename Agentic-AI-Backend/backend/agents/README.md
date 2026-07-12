# Agent System — Cloud Architecture Review Platform

## Structure

```
agents/
├── __init__.py           # Package exports: run_review()
├── base.py               # PlannerState, BaseAgent, FINDING_SCHEMA, get_llm()
├── security_agent.py     # IAM, encryption, network, secrets
├── scalability_agent.py  # SPOFs, auto-scaling, caching, load balancing
├── cost_agent.py         # Spend, waste, pricing models, storage tiers
├── reliability_agent.py  # Backups, multi-AZ, DLQ, health checks, DR
├── compliance_agent.py   # Well-Architected, GDPR surface, audit logging
├── reviewer_agent.py     # Synthesizes all findings into scored report
└── orchestrator.py       # LangGraph 5-node pipeline connecting everything
```

## Pipeline flow

```
raw_graph JSON
     │
     ▼
[1] parse_architecture     — deterministic, no LLM, builds summary
     │
     ▼
[2] identify_domains       — LLM selects relevant risk domains
     │
     ▼
[3] create_plan            — LLM assigns specific checks per agent
     │
     ▼
[4] dispatch_agents        — runs each specialist agent sequentially
     │   ├── SecurityAgent.run()
     │   ├── ScalabilityAgent.run()
     │   ├── CostAgent.run()
     │   ├── ReliabilityAgent.run()
     │   └── ComplianceAgent.run()
     │
     ▼
[5] compile_results        — ReviewerAgent synthesizes final report
     │
     ▼
  review_report (JSON string with score, grade, priority fixes)
```

## How to call from FastAPI

```python
from agents import run_review

result = run_review(architecture_json=canvas_json, thread_id=user_session_id)
report = result["review_report"]   # JSON string
```

## How to add a new agent

1. Create `agents/your_agent.py` extending `BaseAgent`
2. Set `name = "your_agent"` and implement `system_prompt`
3. Import and instantiate in `orchestrator.py`
4. Add to `DOMAIN_AGENT_MAP` with a domain key
5. Add the domain string to `identify_domains` system prompt

```python
# agents/performance_agent.py
from agents.base import BaseAgent

class PerformanceAgent(BaseAgent):
    name = "performance_agent"

    @property
    def system_prompt(self) -> str:
        return "You are a performance engineer. Focus on: latency, throughput, ..."
```

## Environment variables required

```
GROQ_API_KEY=your_groq_key_here
```

## Run a single agent for testing

```bash
python -m agents.security_agent
python -m agents.scalability_agent
python -m agents.cost_agent
python -m agents.reliability_agent
python -m agents.compliance_agent
python -m agents.reviewer_agent
```

## Run the full pipeline

```bash
python -m agents.orchestrator
```
