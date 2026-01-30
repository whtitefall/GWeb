// Thin API client for the Go backend. Keep response shapes in sync with backend/types.go.
import type { GraphKind, GraphPayload, GraphSummary } from './graphTypes'
import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// Attach Supabase access tokens so the backend can scope graphs per user.
const authHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function listGraphs(kind: GraphKind): Promise<GraphSummary[]> {
  const response = await fetch(`${API_URL}/api/graphs?kind=${encodeURIComponent(kind)}`, {
    headers: {
      ...(await authHeaders()),
    },
  })
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
      ...(await authHeaders()),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to create graph: ${response.status}`)
  }

  return response.json()
}

export async function fetchGraph(graphId: string): Promise<GraphPayload> {
  const response = await fetch(`${API_URL}/api/graphs/${graphId}`, {
    headers: {
      ...(await authHeaders()),
    },
  })
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
      ...(await authHeaders()),
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
    headers: {
      ...(await authHeaders()),
    },
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
      ...(await authHeaders()),
    },
    body: JSON.stringify({ prompt, maxNodes }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate graph: ${response.status}`)
  }

  const data = (await response.json()) as { graph: GraphPayload }
  return data.graph
}
