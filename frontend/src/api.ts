import type { GraphPayload } from './graphTypes'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export async function fetchGraph(): Promise<GraphPayload> {
  const response = await fetch(`${API_URL}/api/graph`)
  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.status}`)
  }
  return response.json()
}

export async function saveGraph(payload: GraphPayload): Promise<void> {
  const response = await fetch(`${API_URL}/api/graph`, {
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
