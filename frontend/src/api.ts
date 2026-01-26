import type { GraphPayload, GraphSummary } from './graphTypes'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export async function listGraphs(): Promise<GraphSummary[]> {
  const response = await fetch(`${API_URL}/api/graphs`)
  if (!response.ok) {
    throw new Error(`Failed to list graphs: ${response.status}`)
  }
  return response.json()
}

export async function createGraph(payload: GraphPayload): Promise<GraphSummary> {
  const response = await fetch(`${API_URL}/api/graphs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to create graph: ${response.status}`)
  }

  return response.json()
}

export async function fetchGraph(graphId: string): Promise<GraphPayload> {
  const response = await fetch(`${API_URL}/api/graphs/${graphId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.status}`)
  }
  return response.json()
}

export async function saveGraph(graphId: string, payload: GraphPayload): Promise<void> {
  const response = await fetch(`${API_URL}/api/graphs/${graphId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to save graph: ${response.status}`)
  }
}

export async function deleteGraph(graphId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/graphs/${graphId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete graph: ${response.status}`)
  }
}

export async function generateGraph(prompt: string, maxNodes = 28): Promise<GraphPayload> {
  const response = await fetch(`${API_URL}/api/ai/graph`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, maxNodes }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate graph: ${response.status}`)
  }

  const data = (await response.json()) as { graph: GraphPayload }
  return data.graph
}
