// Graph helpers for normalization, sizing, and safe data coercion.
import { MarkerType } from 'reactflow'
import type { GraphKind, GraphNode, GraphPayload, Item, NodeData, Note, GraphEdge } from '../graphTypes'
import { DEFAULT_GROUP_SIZE, DEFAULT_NODE_SIZE, defaultGraph } from '../constants'
import { generateId } from './id'
import { editorContentToPlainText } from './richText'

// Normalize notes to a consistent shape and generate IDs when missing.
export const ensureNotes = (value: unknown): Note[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((note) => note && typeof note === 'object')
    .map((note) => {
      const rawNote = note as Partial<Note> & { content?: unknown }
      const normalizedContent = typeof rawNote.content === 'string' ? rawNote.content : ''
      const titleFromContent = editorContentToPlainText(normalizedContent)
      const normalizedTitle =
        typeof rawNote.title === 'string' && rawNote.title.trim().length > 0
          ? String(rawNote.title)
          : titleFromContent
      return {
        id: typeof rawNote.id === 'string' ? rawNote.id : generateId(),
        title: normalizedTitle,
        content: normalizedContent,
      }
    })
    .filter((note) => note.title.trim().length > 0 || (note.content?.trim().length ?? 0) > 0)
}

// Normalize items (and legacy notes) into the current Item[] structure.
export const ensureItems = (value: unknown, fallbackNotes: unknown): Item[] => {
  if (Array.isArray(value)) {
    const items = value
      .filter((item) => item && typeof (item as Item).title === 'string')
      .map((item) => ({
        id: typeof (item as Item).id === 'string' ? (item as Item).id : generateId(),
        title: String((item as Item).title),
        notes: ensureNotes((item as Item).notes),
        children: ensureItems((item as Item).children, []),
      }))
    if (items.length > 0) {
      return items
    }
  }

  if (Array.isArray(fallbackNotes)) {
    return fallbackNotes
      .filter((note) => note && typeof (note as Note).title === 'string')
      .map((note) => ({
        id: typeof (note as Note).id === 'string' ? (note as Note).id : generateId(),
        title: String((note as Note).title),
        notes: [],
        children: [],
      }))
  }

  return []
}

export const coerceNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

export const isEdgeDirected = (edge: GraphEdge | null | undefined): boolean =>
  Boolean(edge?.data?.directed)

export const withEdgeDirection = (edge: GraphEdge, directed: boolean): GraphEdge => ({
  ...edge,
  type: edge.type ?? 'smoothstep',
  data: {
    ...(edge.data ?? {}),
    directed,
  },
  markerEnd: directed
    ? {
        type: MarkerType.ArrowClosed,
        color: 'var(--edge)',
      }
    : undefined,
})

export const resolvePosition3d = (
  value: unknown,
  fallback: { x: number; y: number },
  index: number,
) => {
  if (value && typeof value === 'object') {
    const maybe = value as { x?: unknown; y?: unknown; z?: unknown }
    const x = coerceNumber(maybe.x, NaN)
    const y = coerceNumber(maybe.y, NaN)
    const z = coerceNumber(maybe.z, NaN)
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return { x, y, z }
    }
  }

  const offset = (index % 5) - 2
  return {
    x: fallback.x * 0.6,
    y: fallback.y * 0.6,
    z: offset * 60,
  }
}

// Ensure a graph payload has required fields, sane defaults, and stable IDs.
export const normalizeGraph = (payload: GraphPayload | null, fallbackKind: GraphKind = 'note'): GraphPayload => {
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return fallbackKind === 'note' ? defaultGraph : createEmptyGraphPayload('Starter Graph', fallbackKind)
  }

  const name =
    typeof payload.name === 'string' && payload.name.trim().length > 0
      ? payload.name.trim()
      : 'Untitled Graph'
  const shouldPreferVerticalRoadmapHandles =
    fallbackKind === 'note' && name.toLowerCase() === 'graph roadmap'

  const nodes = (payload.nodes as GraphNode[]).map((node, index) => {
    const rawData = (node as GraphNode).data ?? { label: `Node ${index + 1}`, items: [] }
    const label =
      typeof rawData.label === 'string' && rawData.label.trim().length > 0
        ? rawData.label
        : node.type === 'group'
          ? `Group ${index + 1}`
          : `Node ${index + 1}`

    const style =
      node.type === 'group'
        ? {
            ...node.style,
            width: coerceNumber(node.style?.width, DEFAULT_GROUP_SIZE.width),
            height: coerceNumber(node.style?.height, DEFAULT_GROUP_SIZE.height),
          }
        : node.style

    const basePosition = node.position ?? { x: 0, y: 0 }
    const position3d = resolvePosition3d((rawData as NodeData).position3d, basePosition, index)
    const progress = coerceNumber((rawData as NodeData).progress, 0)
    const scriptName =
      typeof (rawData as NodeData).scriptName === 'string' ? (rawData as NodeData).scriptName : ''
    return {
      ...node,
      type: node.type ?? 'default',
      position: basePosition,
      extent: node.parentNode ? ('parent' as const) : node.extent,
      data: {
        label,
        items: ensureItems((rawData as NodeData).items, (rawData as { notes?: Note[] }).notes),
        position3d,
        progress,
        scriptName,
      },
      style,
    }
  })

  const edges = (payload.edges as GraphEdge[]).map((edge, index) => {
    // For the built-in roadmap, always render as undirected even if legacy data still
    // contains markerEnd from earlier directed defaults.
    const directed = shouldPreferVerticalRoadmapHandles
      ? false
      : Boolean(edge.data?.directed || edge.markerEnd)
    const normalizedEdge: GraphEdge = {
      ...edge,
      id: edge.id ?? `edge-${index}`,
      type: edge.type ?? 'smoothstep',
    }
    if (shouldPreferVerticalRoadmapHandles) {
      if (!normalizedEdge.sourceHandle) {
        normalizedEdge.sourceHandle = 'bottom-out'
      }
      if (!normalizedEdge.targetHandle) {
        normalizedEdge.targetHandle = 'top-in'
      }
    }
    return withEdgeDirection(normalizedEdge, directed)
  })

  const kind = payload.kind ?? fallbackKind

  return { name, nodes, edges, kind }
}

export const getNodeSize = (node: GraphNode) => {
  if (node.type === 'group') {
    return {
      width: coerceNumber(node.style?.width ?? node.width, DEFAULT_GROUP_SIZE.width),
      height: coerceNumber(node.style?.height ?? node.height, DEFAULT_GROUP_SIZE.height),
    }
  }
  return {
    width: coerceNumber(node.width, DEFAULT_NODE_SIZE.width),
    height: coerceNumber(node.height, DEFAULT_NODE_SIZE.height),
  }
}

// Resolve absolute position for group child nodes.
export const getAbsolutePosition = (node: GraphNode, nodeMap: Map<string, GraphNode>) => {
  if (node.positionAbsolute) {
    return node.positionAbsolute
  }
  let position = { ...node.position }
  let parentId = node.parentNode
  while (parentId) {
    const parent = nodeMap.get(parentId)
    if (!parent) {
      break
    }
    position = { x: position.x + parent.position.x, y: position.y + parent.position.y }
    parentId = parent.parentNode
  }
  return position
}

export const getNodeRect = (node: GraphNode, nodeMap: Map<string, GraphNode>) => {
  const position = getAbsolutePosition(node, nodeMap)
  const size = getNodeSize(node)
  return {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  }
}

export const createEmptyGraphPayload = (name: string, kind: GraphKind): GraphPayload => ({
  name,
  nodes: [],
  edges: [],
  kind,
})
