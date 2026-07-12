# ArchitectureAI

An AI-powered system architecture review platform. Upload a diagram or draw one on the canvas — a 5-agent LangGraph pipeline analyses it for security, scalability, cost, reliability, and compliance, then generates a full scored report.

---

## How it works

```
Browser (React @ 5173)
        │  JWT REST
        ▼
Spring Boot (@ 8080)
  - Auth, Projects, Upload, Reports
  - Stores diagrams on Cloudinary
  - Persists data in MongoDB Atlas
        │  HTTP
        ▼
Python FastAPI (@ 8000)
  POST /parse  → Gemini Vision parses diagram image → ArchitecturalGraph JSON
  POST /review → LangGraph pipeline runs 5 specialist agents → scored report
```

### AI Pipeline stages
1. **parse_architecture** — builds a structured graph from the diagram
2. **plan_review** — LLM identifies risk domains to focus on
3. **run_all_agents** — 5 agents run in parallel:
   - `security_agent`
   - `scalability_agent`
   - `cost_agent`
   - `reliability_agent`
   - `compliance_agent`
4. **compile_results** — `reviewer_agent` aggregates findings into a final JSON scored report

---

## Project structure

```
├── ArchitectureAI-main/
│   ├── backend/          Spring Boot app (Java 21, Maven)
│   └── frontend/         React + Vite app
│
└── Agentic-AI-Backend/
    └── backend/          Python FastAPI + LangGraph agents
```

---

## Prerequisites

- Java 21+
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account
- Gemini API key — https://aistudio.google.com/app/apikey
- Groq API key — https://console.groq.com/keys

---

## Setup

### 1. Python AI service — `Agentic-AI-Backend/backend/.env`

Create the file:
```
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
```

### 2. Spring Boot — `ArchitectureAI-main/backend/src/main/resources/application.properties`

Set these environment variables (or add directly to properties):
```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_hs256_secret_min_32_chars
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
AI_SERVICE_URL=http://localhost:8000
```

---

## Running locally

Open 3 terminals:

**Terminal 1 — Python AI service**
```bash
cd Agentic-AI-Backend/backend
pip install -r agents/requirements.txt
python -m uvicorn server:app --reload --port 8000
```

**Terminal 2 — React frontend**
```bash
cd ArchitectureAI-main/frontend
npm install
npm run dev
```

**Terminal 3 — Spring Boot**

Open `ArchitectureAI-main/backend` in IntelliJ and hit Run, or:
```bash
cd ArchitectureAI-main/backend
./mvnw spring-boot:run
```

App runs at **http://localhost:5173**

---

## User flow

1. Register / login
2. Create a project (name + description)
3. Choose how to add your architecture:
   - **Upload diagram** — drop a JPG/PNG, Gemini parses it automatically
   - **Draw on canvas** — use the interactive Konva canvas to build from scratch
4. The 5-agent pipeline runs automatically in the background
5. View the full scored report once complete — grade, per-agent findings, critical blockers, quick wins, recommendations

---

## API overview

Base URL: `http://localhost:8080/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/users/me` | Current user profile |
| POST | `/projects` | Create project |
| GET | `/projects` | List user's projects |
| GET | `/projects/:id` | Get project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/upload` | Upload diagram → triggers review |
| POST | `/projects/:id/review` | Manually re-trigger review |
| GET | `/projects/:id/report` | Fetch full review report |
| POST | `/projects/:id/chat` | Send chat message |
| GET | `/projects/:id/chat` | Get chat history |

Python service endpoints (called internally by Spring Boot):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse` | Image → ArchitecturalGraph JSON |
| POST | `/review` | Graph → full agent review report |
| GET | `/health` | Health check |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Konva |
| Backend | Spring Boot 3, Java 21, Spring Security (JWT), WebFlux |
| Database | MongoDB Atlas |
| File storage | Cloudinary |
| AI service | Python FastAPI, LangGraph, Groq (LLaMA), Gemini Vision |
