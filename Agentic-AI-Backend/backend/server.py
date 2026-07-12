"""
ArchEval — Unified FastAPI backend
===================================
Runs both services on port 8000:

  POST /parse    — Upload architecture image → ArchitecturalGraph JSON
                   (replaces the old Flask server)

  POST /review   — Send ArchCanvas graph JSON → full agent review report
                   (runs the 5-node LangGraph planner pipeline)

  GET  /health   — Health check

Run:
    uvicorn server:app --reload --port 8000
"""

import io
import json
import os
import uuid
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, List
from PIL import Image
from google import genai
from google.genai import types

from agents.orchestrator import run_planner_agent

# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────

app = FastAPI(
    title="ArchEval API",
    description="Image parser + multi-agent architecture review",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Gemini client (shared)
# ─────────────────────────────────────────────

import os
_gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
gemini_client = genai.Client(api_key=_gemini_key)

# ─────────────────────────────────────────────
# Parser schemas  (same as old Flask app.py)
# ─────────────────────────────────────────────

class ArchitectureComponent(BaseModel):
    id: str = Field(description="Unique snake_case identifier")
    name: str = Field(description="Exact label text from the diagram")
    type: Literal[
        "Network Boundary", "DNS / Routing", "Load Balancer",
        "Frontend / Client", "Compute / Compute Layer", "Database",
        "Storage", "Cache / Queue", "Management / Governance",
        "Generic Backend / Workload",
    ]
    technology: Optional[str] = None
    is_cloud_managed: bool
    enclosed_within: Optional[str] = None
    connections: List[str]

class ArchitecturalGraph(BaseModel):
    detected_architecture_type: str
    primary_tech_stack: List[str]
    components: List[ArchitectureComponent]
    visual_anomalies_or_notes: List[str]

# ─────────────────────────────────────────────
# Parser logic (model fallback chain)
# ─────────────────────────────────────────────

PARSE_MODELS = [
    "models/gemini-3.1-flash-lite",
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash",
]

PARSE_SYSTEM_PROMPT = """
You are an advanced, industry-grade Multimodal System Architecture Parser.
Translate system design diagrams into an exact, machine-readable infrastructure dependency graph.

Rules:
1. Large background boxes (VPC, AZ-1) → type 'Network Boundary'. Use enclosed_within for containment.
2. Extract every labeled element including those without arrows.
3. Distinguish Storage (S3, EBS) from Database (RDS) from Compute (EC2, Lambda).
4. is_cloud_managed = True only for fully managed services. False for VMs/custom software.
5. Only use explicit arrow lines for connections — do NOT infer from proximity.
"""

def _parse_image(img: Image.Image) -> str:
    last_err = None
    for model in PARSE_MODELS:
        print(f"  → Trying {model}")
        try:
            resp = gemini_client.models.generate_content(
                model=model,
                contents=[img, "Analyze this architecture diagram and translate it into the required schema."],
                config=types.GenerateContentConfig(
                    system_instruction=PARSE_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ArchitecturalGraph,
                    temperature=0.1,
                ),
            )
            print(f"  ✓ {model}")
            return resp.text
        except Exception as e:
            err = str(e)
            print(f"  ✗ {model}: {err[:100]}")
            last_err = e
            if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
                continue
            raise
    raise last_err

# ─────────────────────────────────────────────
# Review schemas
# ─────────────────────────────────────────────

class ReviewRequest(BaseModel):
    graph: dict           # ArchCanvas JSON {nodes, edges} or ArchitecturalGraph {components, ...}
    thread_id: str = ""   # Optional session ID for LangGraph checkpointing

class ReviewResponse(BaseModel):
    thread_id: str
    architecture_summary: str
    risk_domains: list[str]
    plan: dict
    agent_findings: list[dict]
    review_report: str    # JSON string — parse on the frontend

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "parse_models": PARSE_MODELS,
        "agent_pipeline": "5-node LangGraph (parse → domains → plan → agents → review)",
    }


@app.post("/parse", response_model=ArchitecturalGraph)
async def parse_endpoint(image: UploadFile = File(...)):
    """
    Upload an architecture diagram image.
    Returns an ArchitecturalGraph JSON — the same schema as the old Flask /parse route.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPG, PNG, WEBP, etc.)")

    raw = await image.read()
    try:
        img = Image.open(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not open image: {e}")

    try:
        result_text = _parse_image(img)
        parsed = json.loads(result_text)
        return parsed
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(
                status_code=429,
                detail="Gemini quota exhausted. Wait a minute and retry, or check https://ai.dev/rate-limit",
            )
        raise HTTPException(status_code=500, detail=f"Parsing failed: {err[:400]}")


@app.post("/review", response_model=ReviewResponse)
async def review_endpoint(request: ReviewRequest):
    """
    Send an ArchCanvas graph (or parsed ArchitecturalGraph) to the
    5-agent LangGraph pipeline. Returns a full architecture review report.
    """
    thread_id = request.thread_id or str(uuid.uuid4())
    try:
        result = run_planner_agent(
            architecture_json=request.graph,
            thread_id=thread_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ReviewResponse(
        thread_id=thread_id,
        architecture_summary=result.get("architecture_summary", ""),
        risk_domains=result.get("risk_domains", []),
        plan=result.get("plan", {}),
        agent_findings=result.get("agent_findings", []),
        review_report=result.get("review_report", ""),
    )
