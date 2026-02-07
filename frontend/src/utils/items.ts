// Item tree helpers used by the node details drawer and item note modal.
import type { Item } from '../graphTypes'
import { generateId } from './id'

type updateResult = {
  items: Item[]
  found: boolean
}

export const cloneItemsWithNewIds = (items: Item[]): Item[] =>
  items.map((item) => ({
    ...item,
    id: generateId(),
    notes: item.notes.map((note) => ({ ...note, id: generateId() })),
    children: cloneItemsWithNewIds(item.children ?? []),
  }))

export const findItemById = (items: Item[], itemId: string): Item | null => {
  for (const item of items) {
    if (item.id === itemId) {
      return item
    }
    const nested = findItemById(item.children ?? [], itemId)
    if (nested) {
      return nested
    }
  }
  return null
}

export const updateItemById = (
  items: Item[],
  itemId: string,
  updater: (item: Item) => Item,
): updateResult => {
  let found = false
  const next = items.map((item) => {
    if (item.id === itemId) {
      found = true
      return updater(item)
    }
    const updatedChildren = updateItemById(item.children ?? [], itemId, updater)
    if (updatedChildren.found) {
      found = true
      return { ...item, children: updatedChildren.items }
    }
    return item
  })
  return { items: next, found }
}

export const removeItemById = (
  items: Item[],
  itemId: string,
): { items: Item[]; removed: Item | null } => {
  let removed: Item | null = null
  const next: Item[] = []
  for (const item of items) {
    if (item.id === itemId) {
      removed = item
      continue
    }
    const nested = removeItemById(item.children ?? [], itemId)
    if (nested.removed) {
      removed = nested.removed
      next.push({ ...item, children: nested.items })
      continue
    }
    next.push(item)
  }
  return { items: next, removed }
}

const appendChildById = (items: Item[], targetId: string, child: Item): updateResult =>
  updateItemById(items, targetId, (item) => ({
    ...item,
    children: [...(item.children ?? []), child],
  }))

export const moveItemUnderItem = (
  items: Item[],
  itemId: string,
  targetId: string,
): { items: Item[]; moved: boolean } => {
  if (!itemId || !targetId || itemId === targetId) {
    return { items, moved: false }
  }

  const movingItem = findItemById(items, itemId)
  if (!movingItem) {
    return { items, moved: false }
  }

  // Prevent cycles (moving an item into one of its descendants).
  if (findItemById(movingItem.children ?? [], targetId)) {
    return { items, moved: false }
  }

  const removed = removeItemById(items, itemId)
  if (!removed.removed) {
    return { items, moved: false }
  }

  const appended = appendChildById(removed.items, targetId, removed.removed)
  if (!appended.found) {
    return { items, moved: false }
  }
  return { items: appended.items, moved: true }
}
