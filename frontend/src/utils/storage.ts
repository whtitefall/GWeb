import type { GraphSummary } from '../graphTypes'
import { STORAGE_LIST_KEY } from '../constants'

export const readLocalGraphList = (): GraphSummary[] => {
  if (typeof window === 'undefined') {
    return []
  }
  const raw = window.localStorage.getItem(STORAGE_LIST_KEY)
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
