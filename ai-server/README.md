# AI Server (Python + vLLM)

This service exposes `POST /generate` for Graph Note AI generation and is intended to be used by the Go backend as the `model_server` provider.

## Requirements
- Python 3.10+
- A running vLLM server with OpenAI-compatible API (`/v1/chat/completions`)

## Setup
```bash
cd ai-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Windows PowerShell activate:
```powershell
.\.venv\Scripts\Activate.ps1
```

## Run
```bash
uvicorn main:app --host 0.0.0.0 --port 8090
```

Example vLLM startup:
```bash
vllm serve Qwen/Qwen2.5-14B-Instruct --host 0.0.0.0 --port 8001
```

## Endpoint
`POST /generate`

Request:
```json
{
  "prompt": "Create a graph for deployment workflow",
  "maxNodes": 28,
  "model": "Qwen/Qwen2.5-14B-Instruct"
}
```

Response:
```json
{
  "name": "Deployment Workflow",
  "nodes": [],
  "edges": []
}
```

## Security
- If `MODEL_SERVER_API_KEY` is set, client must send `Authorization: Bearer <key>`.
- If `VLLM_API_KEY` is set, this service forwards it to vLLM.
