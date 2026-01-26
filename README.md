# GWeb

Graph Studio with 2D + 3D graph editing, grouping, and AI-assisted generation.

## Features
- 2D graph editor (nodes, edges, groups, drag/drop).
- 3D graph view with basic actions (add/delete/connect) and coordinate axes.
- Multi-graph list with create/delete, import/export JSON.
- Item + note system per node.
- Right-side node drawer + AI chat panel.
- Supabase auth (Google/GitHub) and test login UI.

## Tech stack
- Frontend: React + TypeScript + Vite + React Flow + react-force-graph-3d
- Backend: Go + pgx (Postgres)
- Database: Supabase Postgres
- Auth: Supabase Auth
- AI: OpenAI Responses API (server-side only)

## Repo layout
- `frontend/` React app
- `backend/` Go API

## Prerequisites
- Node.js (for frontend)
- Go (for backend)
- A Supabase project (Postgres + Auth)
- OpenAI API key (for AI graph generation)

## Environment variables
Backend (set in your shell or system env):
- `DATABASE_URL` - Supabase Postgres connection string
- `OPENAI_API_KEY` - OpenAI secret key
- `OPENAI_MODEL` - optional, default: `gpt-4o-mini`
- `CORS_ORIGIN` - optional, default: `http://localhost:5173`
- `PORT` - optional, default: `8080`

Frontend (optional):
- `VITE_API_URL` - backend URL (default: `http://localhost:8080`)

> Note: Supabase URL/anon key are currently hard-coded in `frontend/src/supabaseClient.ts`.
> If you want them in env vars instead, move them to `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.

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
- 3D view is read/write (add/delete/connect), but does not use the 2D layout.
- PowerShell script execution may be blocked by policy on Windows. If needed:
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## License
See `LICENSE`.
