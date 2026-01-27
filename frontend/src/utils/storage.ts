import type { GraphSummary } from '../graphTypes'
export const readLocalGraphList = (storageKey: string): GraphSummary[] => {
  if (typeof window === 'undefined') {
    return []
  }
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as GraphSummary[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((entry) => entry && typeof entry.id === 'string')
  } catch {
    return []
  }
}
