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
- AI: OpenAI Responses API (server-side only)

## Repo layout
- `frontend/` React app
- `backend/` Go API
 - `docs/` maintenance notes

## Prerequisites
- Node.js (for frontend)
- Go (for backend)
- A Supabase project (Postgres + Auth)
- OpenAI API key (for AI graph generation)

## Environment variables
Backend (`backend/.env` auto-loaded on startup):
- `DATABASE_URL` - Supabase Postgres connection string
- `OPENAI_API_KEY` - OpenAI secret key
- `OPENAI_MODEL` - optional, default: `gpt-4o-mini`
- `CORS_ORIGIN` - optional, default: `http://localhost:5173`
- `PORT` - optional, default: `8080`

Frontend (`frontend/.env`):
- `VITE_API_URL` - backend URL (default: `http://localhost:8080`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon public key

## Database schema
Apply `backend/schema.sql` to your Supabase database.

## Running locally
Backend:
```
cd backend
# Ensure DATABASE_URL + OPENAI_API_KEY are set in your environment
go run .
```

Frontend:
```
cd frontend
npm install
npm run dev
```

## API endpoints
- `GET /health` - health check
- `GET /api/graphs` - list graphs
- `POST /api/graphs` - create graph
- `GET /api/graphs/:id` - fetch graph
- `PUT /api/graphs/:id` - save graph
- `DELETE /api/graphs/:id` - delete graph
- `POST /api/ai/graph` - generate a graph from a prompt (OpenAI)

### AI endpoint payload
Request:
```json
{ "prompt": "...", "maxNodes": 28 }
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

## Maintenance
See `docs/MAINTENANCE.md` for architecture and extension notes.

## License
See `LICENSE`.
