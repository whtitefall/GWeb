# GWeb

Graph Notes studio with 2D graph editing, grouping, and AI-assisted generation.

## Features
- Graph Notes 2D editor (nodes, edges, groups, drag/drop).
- Multi-graph list with create/delete, import/export JSON.
- Item + note system per node.
- Right-side node drawer + AI chat panel.
- Quick Facts page for graph theory basics.
- Supabase auth (Google/GitHub) and test login UI.
- Beta scaffolding for 3D/graph-application features exists in code but is not enabled by default.

## Tech stack
- Frontend: React + TypeScript + Vite + React Flow (3D dependencies are present for future beta work)
- Backend: Go + pgx (Postgres)
- Database: Supabase Postgres
- Auth: Supabase Auth
- AI: Selectable provider (`model_server` via Python/vLLM, or OpenAI)

## Repo layout
- `frontend/` React app
- `backend/` Go API
- `ai-server/` optional Python AI service (vLLM bridge)
- `docs/` maintenance notes

## Prerequisites
- Node.js (for frontend)
- Go (for backend)
- A Supabase project (Postgres + Auth)
- OpenAI API key (for AI graph generation)
- Python 3.10+ (only if running `ai-server`)

## Environment variables
Backend (`backend/.env` auto-loaded on startup):
- `DATABASE_URL` - Supabase Postgres connection string
- `SUPABASE_JWT_SECRET` - Supabase JWT secret (required for per-user graph auth)
- `AI_DEFAULT_PROVIDER` - `model_server` (default) or `openai`
- `MODEL_SERVER_ENDPOINT` - Python AI server URL, default: `http://localhost:8090`
- `MODEL_SERVER_MODEL` - optional model hint passed to model server
- `MODEL_SERVER_API_KEY` - optional bearer token to secure model server calls
- `OPENAI_API_KEY` - optional OpenAI secret key (required only for `openai` provider)
- `OPENAI_MODEL` - optional, default: `gpt-4o-mini`
- `OPENAI_ENDPOINT` - optional OpenAI-compatible endpoint override
- `CORS_ORIGIN` - optional, default: `http://localhost:5173`
- `PORT` - optional, default: `8080`

Frontend (`frontend/.env`):
- `VITE_API_URL` - backend URL (default: `http://localhost:8080`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon public key

AI server (`ai-server/.env`, optional):
- `PORT` - default: `8090`
- `MODEL_SERVER_API_KEY` - optional token required by `/generate`
- `VLLM_BASE_URL` - vLLM OpenAI-compatible endpoint, default: `http://localhost:8001`
- `VLLM_MODEL` - default model name for completions
- `VLLM_API_KEY` - optional token for vLLM server

## Database schema
Apply `backend/schema.sql` to your Supabase database.

## Running locally
Backend:
```
cd backend
# Ensure DATABASE_URL is set.
# Set OPENAI_API_KEY only if using provider=openai.
go run .
```

Frontend:
```
cd frontend
npm install
npm run dev
```

Optional AI model server (default provider):
```
cd ai-server
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8090
```

## EC2 deployment (optional self-hosted AI)
If you are not using self-hosted AI now, keep `AI_DEFAULT_PROVIDER=openai` and skip this section.

For future self-hosted AI on EC2:
1. Use a GPU instance for vLLM (for example `g5`). CPU-only small instances are not enough for practical LLM serving.
2. Run `vLLM` privately (for example `127.0.0.1:8001`).
3. Run `ai-server` privately (for example `127.0.0.1:8090`).
4. Point backend to model server:
   - `AI_DEFAULT_PROVIDER=model_server`
   - `MODEL_SERVER_ENDPOINT=http://127.0.0.1:8090`
   - `MODEL_SERVER_API_KEY=<shared-secret>`
5. Keep public exposure only at Nginx (`80/443`). Do not expose `8001`/`8090` publicly.

Example `vLLM` run command:
```bash
vllm serve Qwen/Qwen2.5-14B-Instruct --host 127.0.0.1 --port 8001
```

## API endpoints
- `GET /health` - health check
- `GET /api/graphs` - list graphs
- `POST /api/graphs` - create graph
- `GET /api/graphs/:id` - fetch graph
- `PUT /api/graphs/:id` - save graph
- `DELETE /api/graphs/:id` - delete graph
- `POST /api/ai/graph` - generate a graph from a prompt (`model_server` or `openai`)

### AI endpoint payload
Request:
```json
{ "prompt": "...", "maxNodes": 28, "provider": "model_server" }
```
Response:
```json
{ "graph": { "name": "...", "nodes": [], "edges": [] } }
```

## Import/export
Use the buttons on the left widget to export or import JSON. The export includes nodes, edges, groups, items, and notes.

## Notes
- The AI chat applies the generated graph immediately.
- PowerShell script execution may be blocked by policy on Windows. If needed:
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
 - Graphs are scoped per authenticated user; the backend expects a Supabase access token.

## Maintenance
See `docs/MAINTENANCE.md` for architecture and extension notes.

## License
See `LICENSE`.
