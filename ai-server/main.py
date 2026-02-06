import json
import os
from typing import Any, Optional

import requests
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

DEFAULT_VLLM_BASE_URL = "http://localhost:8001"
DEFAULT_VLLM_MODEL = "Qwen/Qwen2.5-14B-Instruct"
DEFAULT_MAX_NODES = 28
MAX_MAX_NODES = 80
MAX_PROMPT_CHARS = 4000

app = FastAPI(title="GraphNote AI Server", version="0.1.0")


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1)
    maxNodes: int = Field(default=DEFAULT_MAX_NODES, ge=1, le=MAX_MAX_NODES)
    model: Optional[str] = None


def clamp_max_nodes(value: int) -> int:
    if value <= 0:
        return DEFAULT_MAX_NODES
    if value > MAX_MAX_NODES:
        return MAX_MAX_NODES
    return value


def build_system_prompt(max_nodes: int) -> str:
    return f"""You are a graph builder. Return ONLY valid JSON.
Rules:
- Keep node count <= {max_nodes}.
- Use unique ids for nodes and edges.
- Provide position.x and position.y for each node.
- Use type="group" for containers and set child nodes' parentNode to the group id.
- Include items/notes only if they add value; otherwise use empty arrays.
- Use edge type "smoothstep".
- Edges must reference existing node ids.

Return this JSON shape:
{{
  "name": "Graph name",
  "nodes": [
    {{
      "id": "node-1",
      "type": "default",
      "position": {{"x": 0, "y": 0}},
      "parentNode": null,
      "extent": null,
      "style": null,
      "data": {{
        "label": "Node label",
        "position3d": null,
        "items": [
          {{
            "id": "item-1",
            "title": "Item title",
            "notes": [{{"id": "note-1", "title": "Note title"}}]
          }}
        ]
      }}
    }}
  ],
  "edges": [
    {{"id": "edge-1", "source": "node-1", "target": "node-2", "type": "smoothstep"}}
  ]
}}
"""


def _extract_json_block(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        # Handle fenced blocks like ```json ... ```
        if stripped.startswith("json"):
            stripped = stripped[4:].strip()
    # Fast path.
    try:
        json.loads(stripped)
        return stripped
    except Exception:
        pass

    # Fallback: bracket matching first object.
    start = stripped.find("{")
    if start < 0:
        raise ValueError("model output does not contain JSON object")
    depth = 0
    for index in range(start, len(stripped)):
        char = stripped[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                candidate = stripped[start : index + 1]
                json.loads(candidate)
                return candidate
    raise ValueError("unable to extract complete JSON object")


def _require_server_api_key(authorization: Optional[str]) -> None:
    expected = os.getenv("MODEL_SERVER_API_KEY", "").strip()
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="unauthorized")


def _call_vllm(prompt: str, max_nodes: int, model: Optional[str]) -> dict[str, Any]:
    base_url = os.getenv("VLLM_BASE_URL", DEFAULT_VLLM_BASE_URL).rstrip("/")
    target_model = (model or os.getenv("VLLM_MODEL", DEFAULT_VLLM_MODEL)).strip()
    vllm_key = os.getenv("VLLM_API_KEY", "").strip()

    request_payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": build_system_prompt(max_nodes)},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
    }

    headers = {"Content-Type": "application/json"}
    if vllm_key:
        headers["Authorization"] = f"Bearer {vllm_key}"

    try:
        response = requests.post(
            f"{base_url}/v1/chat/completions",
            json=request_payload,
            headers=headers,
            timeout=45,
        )
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail=f"vLLM request failed: {error}") from error

    if response.status_code >= 400:
        detail = response.text.strip()
        if len(detail) > 600:
            detail = detail[:600]
        raise HTTPException(status_code=502, detail=f"vLLM error: {detail}")

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="invalid JSON from vLLM") from error

    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise HTTPException(status_code=502, detail="missing completion content from vLLM") from error

    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="empty completion content from vLLM")

    try:
        json_block = _extract_json_block(content)
        graph = json.loads(json_block)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"failed to parse graph JSON: {error}") from error

    if not isinstance(graph, dict):
        raise HTTPException(status_code=502, detail="graph payload is not an object")
    if not isinstance(graph.get("name"), str):
        raise HTTPException(status_code=502, detail="graph payload missing string field: name")
    if not isinstance(graph.get("nodes"), list):
        raise HTTPException(status_code=502, detail="graph payload missing array field: nodes")
    if not isinstance(graph.get("edges"), list):
        raise HTTPException(status_code=502, detail="graph payload missing array field: edges")

    return graph


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate")
def generate_graph(request: GenerateRequest, authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    _require_server_api_key(authorization)

    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    if len(prompt) > MAX_PROMPT_CHARS:
        raise HTTPException(status_code=400, detail="prompt is too long")

    graph = _call_vllm(prompt, clamp_max_nodes(request.maxNodes), request.model)
    return graph

