# GraphNotes Maintenance Guide

This document highlights the parts of the codebase that are most important
to understand before you maintain or extend the project.

## High-level architecture
- `frontend/`: React + React Flow (Graph Notes UI).
- `backend/`: Go REST API for persistence + OpenAI graph generation.
- Supabase Postgres: stores graphs in the `graphs` table (`backend/schema.sql`).

## Core data model
- `GraphPayload`: `{ name, nodes, edges, kind }`
- `NodeData`: `{ label, items[], position3d?, progress?, scriptName? }`
- `Item`: `{ id, title, notes[] }`
- `Note`: `{ id, title }`
- `kind` is used to keep different apps separate (Graph Notes uses `"note"`).

Frontend types live in `frontend/src/graphTypes.ts` and are mirrored in
backend `backend/types.go`.

## Graph lifecycle (Graph Notes)
1. List graphs: `GET /api/graphs?kind=note`.
2. Create graph: `POST /api/graphs` (empty or named payload).
3. Fetch graph: `GET /api/graphs/:id`.
4. Save graph: `PUT /api/graphs/:id` after edits.
5. Delete graph: `DELETE /api/graphs/:id`.

If the API is unavailable, the app falls back to localStorage for the graph
list and active graph ID. See `frontend/src/constants.ts` for storage keys.

## React Flow editor
- `frontend/src/App.tsx` orchestrates state + side effects.
- `frontend/src/hooks/useGraphState.ts` wraps React Flow's node/edge state.
- `frontend/src/utils/graph.ts` normalizes payloads and handles grouping math.
- `frontend/src/components/nodes.tsx` defines custom node renderers.

## UI surfaces
- `GraphListWidget`: left widget with rename, import/export, delete, resize.
- `ActionsWidget`: floating toolbar for add/group/delete actions.
- `NoteDrawer`: right-side node settings drawer.
- `ItemModal`: edit item title and notes.
- `ChatPanel`: AI prompt entry (calls backend AI endpoint).
- `QuickFactsView`: static educational view with inline SVGs.

## Auth & settings
- Supabase auth is configured in `frontend/src/supabaseClient.ts`.
- Admin test login is local-only (localStorage flag).
- Settings are stored in localStorage (theme, accent, minimap, sidebar state).

## AI graph generation
- `POST /api/ai/graph` uses OpenAI Responses API (`backend/openai.go`).
- The server enforces strict JSON schema output and sanitizes nodes/edges.
- If `OPENAI_API_KEY` is missing, the endpoint returns 501.

## Future / beta scaffolding
There are components for Graph Application and 3D graph work that are not
wired into the UI by default:
- `Graph3DView`, `TaskDrawer`, `SshModal`, `SshConsole`, `TaskNode`

Keep them isolated until the beta toggle is reintroduced.

## Adding new fields
If you add fields to node data or payloads:
1. Update `frontend/src/graphTypes.ts`.
2. Update normalization in `frontend/src/utils/graph.ts`.
3. Update backend payload types (`backend/types.go`).
4. If AI should emit the field, update `backend/openai.go` schema + sanitizer.

## Production checks (quick list)
- Verify `.env` / env vars for backend and frontend.
- Apply `backend/schema.sql`.
- Confirm CORS origin and API URLs.
- Run `npm run build` and `go build` in CI.
