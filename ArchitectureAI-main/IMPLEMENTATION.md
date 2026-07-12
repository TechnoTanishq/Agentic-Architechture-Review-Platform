# ArchitectureAI — Integration Implementation

This document describes the integration between the **ArchitectureAI** platform
(Spring Boot + MongoDB + React) and the **Agentic-Architecture-Review-System**
(Python FastAPI + LangGraph AI pipeline).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│                                                                 │
│  Landing → Auth → Dashboard → Upload → ReportPage              │
│                               CanvasPage                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │ JWT-authenticated REST (port 5173 → 8080)
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│               Spring Boot Backend  (port 8080)                  │
│                                                                 │
│  AuthController     POST /auth/register, /auth/login            │
│  ProjectController  CRUD /projects, POST /{id}/upload ──────┐  │
│  ReviewController   POST /{id}/review, GET /{id}/report      │  │
│  ProjectChatController  /projects/{id}/chat                  │  │
│                                                              │  │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  ProjectService │  │ReviewService │  │ AiReviewService│◄─┘  │
│  │  CloudinaryService│ │  @Async      │  │  WebClient     │     │
│  └─────────────────┘  └──────┬───────┘  └───────┬────────┘     │
│                              │                  │               │
│  MongoDB Atlas               │   calls          │               │
│  ┌──────────┐ ┌───────────┐  │   POST /parse    │               │
│  │ projects │ │   users   │  │   POST /review   │               │
│  │ review_  │ │ agent_    │  │                  │               │
│  │ reports  │ │ outputs   │  │                  │               │
│  └──────────┘ └───────────┘  │                  │               │
└──────────────────────────────┼──────────────────┼───────────────┘
                               │                  │
                        ┌──────▼──────────────────▼──────┐
                        │  Python FastAPI  (port 8000)    │
                        │  Agentic-Architecture-Review    │
                        │                                 │
                        │  POST /parse  ← Gemini Vision   │
                        │    └─ image → ArchitecturalGraph│
                        │                                 │
                        │  POST /review ← LangGraph       │
                        │    Stage 1: parse_architecture  │
                        │    Stage 2: plan_review (LLM 1) │
                        │    Stage 3: run_all_agents (LLM2│
                        │      security_agent             │
                        │      scalability_agent          │
                        │      cost_agent                 │
                        │      reliability_agent          │
                        │      compliance_agent           │
                        │    Stage 4: compile_results(LLM3│
                        │      reviewer_agent → JSON score│
                        └─────────────────────────────────┘
```

---

## Request / Response Flow

### 1. Register / Login
```
POST /auth/register  { username, email, password, organization }
POST /auth/login     { username, password }
← { token, username, email }
```
JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>` on
every subsequent request.

### 2. Create Project
```
POST /projects  { projectName, description }
← ProjectResponse { id, projectName, status: "UPLOADING", ... }
```

### 3. Upload Diagram + Auto-trigger Review
```
POST /projects/{id}/upload  multipart/form-data  file=<image>
```
1. Spring Boot uploads the image to **Cloudinary**, persists the URL.
2. Sets project `status → REVIEWING`.
3. Returns `200 ProjectResponse` immediately.
4. Fires `ReviewService.triggerReview(projectId)` on a virtual-thread `@Async` executor.

In the background:
```
AiReviewService.parseImage(diagramUrl)
  → downloads image bytes from Cloudinary URL
  → POST http://localhost:8000/parse  multipart  image=<bytes>
  ← ArchitecturalGraph JSON

AiReviewService.runReview(parsedGraph)
  → POST http://localhost:8000/review  { "graph": <ArchitecturalGraph> }
  ← { thread_id, architecture_summary, risk_domains,
      plan, agent_findings, review_report }

ReviewService.persistResults(...)
  → upsert ReviewReport in MongoDB
  → save individual AgentOutput documents
  → project status → COMPLETED  (or FAILED on error)
```

### 4. Poll Project Status
```
GET /projects/{id}
← ProjectResponse { status: "REVIEWING" | "COMPLETED" | "FAILED", ... }
```
The React frontend polls every 6 seconds until status leaves `REVIEWING`.

### 5. Fetch Report
```
GET /projects/{id}/report
← ReviewReportResponse {
    overallScore, grade, verdict, summary,
    criticalBlockers, priorityFixes, quickWins, strengths,
    recommendedNextSteps, perAgentSummary, agentFindings,
    riskDomains, reviewReportJson,
    createdAt, updatedAt
  }
```
`reviewReportJson` is the raw JSON string from the Python `reviewer_agent`,
parsed by the frontend for the full scored report UI.

### 6. Manual Re-trigger (optional)
```
POST /projects/{id}/review
← 202  { projectId, message, status: "REVIEWING" }
```

---

## New Backend Files

| File | Purpose |
|------|---------|
| `entity/ReviewReport.java` | Enriched MongoDB document — all agent output fields |
| `dto/ReviewReportResponse.java` | Response DTO for the full report |
| `dto/AgentOutputResponse.java` | Response DTO for individual agent outputs |
| `dto/TriggerReviewResponse.java` | Immediate 202 response from review trigger |
| `config/WebClientConfig.java` | WebClient bean with configurable timeouts |
| `service/AiReviewService.java` | HTTP client — calls Python `/parse` and `/review` |
| `service/ReviewService.java` | Orchestrates pipeline, persists results, updates status |
| `controller/ReviewController.java` | `POST /{id}/review`, `GET /{id}/report` |

### Modified Backend Files

| File | Change |
|------|--------|
| `controller/ProjectController.java` | Injects `ReviewService`; calls `triggerReview` after upload |
| `BackendApplication.java` | Added `@EnableAsync` |
| `exception/GlobalExceptionHandler.java` | Added `AiServiceException → 502` handler |
| `pom.xml` | Added `spring-boot-starter-webflux` |
| `application.properties` | Added `ai.service.url`, connect/read timeout properties |

---

## New Frontend Files (`ArchitectureAI-main/frontend/`)

| File | Purpose |
|------|---------|
| `src/api.js` | Centralised API client — all Spring Boot calls |
| `src/main.jsx` | Router with `Private` guard, 6 routes |
| `src/pages/Landing.jsx` | Marketing landing page |
| `src/pages/AuthPage.jsx` | Register / Login form |
| `src/pages/Dashboard.jsx` | Project list, create, delete, auto-poll |
| `src/pages/UploadPage.jsx` | Diagram upload → Spring Boot |
| `src/pages/ReportPage.jsx` | Polls status, renders full scored report UI |
| `src/pages/CanvasPage.jsx` | Draw architecture, submit review via backend |
| `src/components/ReviewModal.jsx` | Project-aware review trigger modal |
| `vite.config.js` | Dev proxy: `/api → http://localhost:8080` |

Canvas components (`CanvasArea`, `Sidebar`, `Toolbar`, `PropertiesPanel`) and
`utils/parser.js` are copied unchanged from the Agentic-Architecture-Review-System.

---

## Environment Variables

### Spring Boot (`application.properties` / env)
| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | — | MongoDB Atlas connection string |
| `JWT_SECRET` | — | HS256 signing key (≥ 32 chars) |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |
| `AI_SERVICE_URL` | `http://localhost:8000` | Base URL of the Python FastAPI service |

### Python FastAPI (`.env` in `Agentic-Architechture-Review-System-main/backend/`)
| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Gemini API key for image parsing |
| `GROQ_API_KEY` | Groq API key for LangGraph LLM calls |

### React (`VITE_API_BASE`)
In development the Vite proxy rewrites `/api → http://localhost:8080` so no env
var is needed. In production set:
```
VITE_API_BASE=https://your-backend-domain.com
```

---

## Running Locally

```bash
# 1. Python AI service
cd Agentic-Architechture-Review-System-main/backend
pip install -r agents/requirements.txt
uvicorn server:app --reload --port 8000

# 2. Spring Boot backend
cd ArchitectureAI-main/backend
# set env vars: MONGODB_URI, JWT_SECRET, CLOUDINARY_*, AI_SERVICE_URL
./mvnw spring-boot:run

# 3. React frontend
cd ArchitectureAI-main/frontend
npm install
npm run dev          # http://localhost:5173
```

---

## Data Model Changes

### `ReviewReport` (MongoDB collection: `review_reports`)

New fields added to support the full Python pipeline output:

| Field | Type | Source |
|-------|------|--------|
| `verdict` | String | `review_report.verdict` |
| `quickWins` | List\<String\> | `review_report.quick_wins` (JSON strings) |
| `strengths` | List\<String\> | `review_report.strengths` |
| `recommendedNextSteps` | List\<String\> | `review_report.recommended_next_steps` |
| `perAgentSummary` | Map\<String,String\> | `review_report.per_agent_summary` |
| `agentFindings` | List\<String\> | `agent_findings[]` (JSON strings) |
| `architectureSummary` | String | `architecture_summary` |
| `riskDomains` | List\<String\> | `risk_domains` |
| `reviewReportJson` | String | raw `review_report` JSON string |
| `updatedAt` | Instant | set on upsert |

`criticalBlockers` and `priorityFixes` remain `List<String>` but each entry is
now a compact JSON object string (e.g. `{"issue":"...","why":"..."}`) instead of
a plain string, allowing the frontend to render structured cards.
