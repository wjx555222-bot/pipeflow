# pipeflow# PipeFlow

Visual AI Pipeline Orchestration Engine — drag-and-drop workflow editor with DAG parallel execution and real-time progress tracking.

## Features

- **Visual Workflow Editor** — Drag-and-drop canvas with React Flow. Connect nodes, build DAG pipelines
- **DAG Parallel Engine** — Topological sort + grouped parallel execution via asyncio
- **10+ Node Types** — LLM, Code, HTTP, Branch, Loop, Merge, Normalize, Input/Output, Sub-Workflow, Tool
- **Real-Time Tracking** — WebSocket live logs, per-node progress, execution snapshots
- **Publish as API** — Deploy any workflow as a REST endpoint
- **Template Marketplace** — 5 built-in workflow templates, import with one click
- **Version History** — Full version tracking and rollback
- **JWT Authentication** — User registration/login with role-based access
- **Dark Mode** — Full light/dark theme

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│   React Flow     │────▶│   FastAPI     │────▶│   SQLite     │
│   Canvas Editor  │     │   Backend     │     │  (Metadata)  │
└─────────────────┘     └──────┬───────┘     └──────────────┘
                               │
                        ┌──────▼───────┐     ┌──────────────┐
                        │   Celery     │────▶│    Redis     │
                        │   Workers    │     │   (Queue)    │
                        └──────┬───────┘     └──────────────┘
                               │
                        ┌──────▼───────┐
                        │   DeepSeek   │
                        │   AI Nodes   │
                        └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python + FastAPI + SQLAlchemy (async) + SQLite |
| Task Queue | Celery + Redis |
| AI Engine | LangChain + DeepSeek |
| Real-Time | WebSocket |
| Frontend | React 18 + TypeScript + Tailwind CSS + React Flow |
| State | Zustand |
| Auth | JWT + sha256_crypt |

## Quick Start

### Prerequisites

- Python 3.10+, Node.js 18+, Redis
- DeepSeek API key

### 1. Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
# or use your system Redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DEEPSEEK_API_KEY=sk-xxx
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Worker (optional — for distributed execution)

If you want async task execution via Celery:

```bash
cd backend
celery -A app.services.worker worker --loglevel=info
```

The app can also run without Redis/Celery — workflows execute inline via asyncio.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 5. Docker Compose (all-in-one)

```bash
DEEPSEEK_API_KEY=sk-xxx docker-compose up
```

## Node Types

| Node | Icon | Description |
|------|------|-------------|
| Input | ↓ | Workflow entry point |
| LLM | 🧠 | DeepSeek-powered AI text generation |
| Code | ⌨ | Execute Python code in sandbox |
| HTTP | 🌐 | Make API requests |
| Branch | 🔀 | Conditional routing (true/false) |
| Loop | 🔁 | Iterate over items |
| Merge | 🔗 | Combine multiple inputs |
| Normalize | 🔧 | Transform/format data |
| Output | ↑ | Workflow exit point |
| Sub-Workflow | 📋 | Nest another workflow |
| Tool | 🔨 | Dispatch to external tool |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |
| GET/POST | `/api/workflows` | List / Create workflows |
| GET/PUT/DELETE | `/api/workflows/:id` | CRUD workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow (creates run) |
| GET | `/api/workflows/:id/runs` | List workflow runs |
| GET | `/api/workflows/:id/runs/:run` | Get run details + snapshots |
| WS | `/api/workflows/ws/:run_id` | Live progress via WebSocket |
| POST | `/api/workflows/:id/publish` | Publish as API endpoint |
| GET | `/api/workflows/:id/versions` | List versions |
| POST | `/api/workflows/:id/rollback/:v` | Rollback to version |
| GET | `/api/templates` | Browse templates |
| POST | `/api/templates/:id/import` | Import template |
| POST | `/api/published/:path` | Execute published workflow |

## Project Structure

```
pipeflow/
├── backend/
│   ├── app/
│   │   ├── core/               # Config, database, auth, logging, websocket
│   │   ├── models/             # User, Workflow, Run, Snapshot, Template
│   │   ├── schemas/            # Pydantic validation
│   │   ├── services/           # DAG engine, template seeder
│   │   ├── routers/            # Auth, workflows, templates, published
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                # API client + WebSocket
│   │   ├── components/
│   │   │   ├── nodes/          # LLMNode, CodeNode, HttpNode, BranchNode
│   │   │   └── panels/         # NodeConfig, ExecutionLog, Template
│   │   ├── pages/              # Dashboard, Workflows, Editor
│   │   ├── stores/             # Auth, Workflow, Editor stores
│   │   └── hooks/              # useWebSocket
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Built-in Templates

| Template | Description |
|----------|-------------|
| Simple Q&A | Input → LLM → Output |
| Code Review | Input → LLM → Code → LLM (review) → Output |
| Web Research | Input → LLM → HTTP → Normalize → LLM → Output |
| Multi-Branch | Input → Branch → [LLM-A, LLM-B] → Merge → Output |
| Data Processing | Input → Code → Code → Code → Output |

## License

MIT
