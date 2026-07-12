# ArchEval — Setup & Implementation Guide

ArchEval is an AI-powered cloud architecture review tool. Upload any architecture diagram image and get a professional multi-agent report covering security, scalability, cost, reliability, and compliance.

---

## Prerequisites

Make sure you have these installed before starting:

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git**

---

## API Keys Required

You need two API keys. Create a file at `backend/.env` with the following:

```
GEMINI_API_KEY=your_google_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

- **Gemini API key** — Get it free at [aistudio.google.com](https://aistudio.google.com/app/apikey)  
  Used for parsing architecture diagram images (vision model).

- **Groq API key** — Get it free at [console.groq.com](https://console.groq.com/)  
  Used for all agent reasoning (LLaMA 3.3 70B). Free tier is sufficient.

---

## Project Structure

```
├── backend/
│   ├── server.py              ← Main FastAPI server (single entry point)
│   ├── .env                   ← Your API keys (create this)
│   └── agents/
│       ├── orchestrator.py    ← LangGraph 4-node pipeline
│       ├── reviewer_agent.py  ← Final synthesis agent
│       ├── base.py            ← Shared state & LLM config
│       ├── requirements.txt   ← Python dependencies
│       └── venv/              ← Python virtual environment (you create this)
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── UploadPage.jsx
    │   │   └── ReportPage.jsx ← Full report with dark/light mode
    │   └── ...
    ├── package.json
    └── vite.config.js
```

---

## Backend Setup

### 1. Create and activate a virtual environment

Navigate to the `backend/agents` folder:

```bash
cd backend/agents
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create your `.env` file

Go back to the `backend` folder and create `.env`:

```bash
cd ..
```

Create `backend/.env` with your keys (see API Keys section above).

### 4. Start the backend server

From the `backend` folder:

**Windows:**
```bash
agents\venv\Scripts\python.exe -m uvicorn server:app --reload --port 8000
```

**Mac / Linux:**
```bash
agents/venv/bin/python -m uvicorn server:app --reload --port 8000
```

The server starts at `http://localhost:8000`.  
You can verify it's running by visiting `http://localhost:8000/health`.

---

## Frontend Setup

Open a new terminal and navigate to the `frontend` folder:

```bash
cd frontend
```

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

The app opens at `http://localhost:5173`.

---

## Running the App

You need **two terminals** running at the same time:

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 — Backend | `backend/` | `agents\venv\Scripts\python.exe -m uvicorn server:app --reload --port 8000` (Windows) |
| 1 — Backend | `backend/` | `agents/venv/bin/python -m uvicorn server:app --reload --port 8000` (Mac/Linux) |
| 2 — Frontend | `frontend/` | `npm run dev` |

Then open `http://localhost:5173` in your browser.

---

## How It Works

1. **Upload** — Drop a JPG/PNG of your architecture diagram on the Upload page
2. **Parse** — Google Gemini (vision model) extracts every component, connection, and network boundary into a structured JSON graph
3. **Review** — Click "Run Agent Review". A 4-stage LangGraph pipeline runs:
   - Stage 1: Parse the graph into nodes/edges + deterministic pre-analysis
   - Stage 2: Planner LLM assigns specific checks to each domain agent
   - Stage 3: All 5 specialist agents run (Security, Scalability, Cost, Reliability, Compliance) — each finding is tagged OBSERVED / INFERRED / NOT_VISIBLE
   - Stage 4: Reviewer LLM synthesises a scored final report
4. **Report** — A full-page report shows your architecture score, critical blockers, priority fixes with effort estimates, quick wins, and sprint-level next steps

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/parse` | Upload image → returns ArchitecturalGraph JSON |
| `POST` | `/review` | Send graph JSON → returns full agent review report |

---

## Troubleshooting

**`Cannot reach the server` error in browser**  
Make sure the backend is running on port 8000 and `.env` has valid API keys.

**`429 / RESOURCE_EXHAUSTED` from Gemini**  
You've hit the free-tier rate limit. Wait 1 minute and retry.

**`ModuleNotFoundError`**  
Make sure you activated the venv and ran `pip install -r requirements.txt` from `backend/agents/`.

**Agents return generic findings**  
Check your `GROQ_API_KEY` in `.env`. If missing, the LLM calls will fail silently and fall back to empty findings.
