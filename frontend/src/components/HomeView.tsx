// Home dashboard with graph cards and live mini snapshots from graph payloads.
import type { GraphPayload, GraphSummary, GraphNode } from '../graphTypes'
import { useI18n } from '../i18n'
import { formatUpdatedAt } from '../utils/time'

type HomeViewProps = {
  graphList: GraphSummary[]
  activeGraphId: string | null
  thumbnails: Record<string, GraphPayload | null>
  onOpenGraph: (graphId: string) => void
}

type PreviewNode = {
  id: string
  x: number
  y: number
  width: number
  height: number
  isGroup: boolean
  label: string
}
type PreviewEdge = { id: string; x1: number; y1: number; x2: number; y2: number; directed: boolean }
type PreviewSnapshot = { viewBox: string; nodes: PreviewNode[]; edges: PreviewEdge[] }

function parseSize(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function getNodeSize(node: GraphNode) {
  if (node.type === 'group') {
    return {
      width: parseSize(node.width ?? node.style?.width, 320),
      height: parseSize(node.height ?? node.style?.height, 220),
    }
  }
  return {
    width: parseSize(node.width ?? node.style?.width, 170),
    height: parseSize(node.height ?? node.style?.height, 58),
  }
}

function compactLabel(label: string, max = 18) {
  const trimmed = label.trim()
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, Math.max(0, max - 3))}...`
}

function resolveAbsolutePosition(
  node: GraphNode,
  nodeMap: Map<string, GraphNode>,
  cache: Map<string, { x: number; y: number }>,
  stack: Set<string>,
): { x: number; y: number } {
  const cached = cache.get(node.id)
  if (cached) {
    return cached
  }

  if (stack.has(node.id)) {
    const fallback = { x: node.position.x, y: node.position.y }
    cache.set(node.id, fallback)
    return fallback
  }

  stack.add(node.id)
  const parentId = node.parentNode
  if (!parentId) {
    const position = { x: node.position.x, y: node.position.y }
    cache.set(node.id, position)
    stack.delete(node.id)
    return position
  }

  const parent = nodeMap.get(parentId)
  if (!parent) {
    const position = { x: node.position.x, y: node.position.y }
    cache.set(node.id, position)
    stack.delete(node.id)
    return position
  }

  const parentAbsolute: { x: number; y: number } = resolveAbsolutePosition(parent, nodeMap, cache, stack)
  const position: { x: number; y: number } = {
    x: parentAbsolute.x + node.position.x,
    y: parentAbsolute.y + node.position.y,
  }
  cache.set(node.id, position)
  stack.delete(node.id)
  return position
}

function buildSnapshot(payload: GraphPayload | null | undefined): PreviewSnapshot | null {
  if (!payload || payload.nodes.length === 0) {
    return null
  }

  const nodeMap = new Map(payload.nodes.map((node) => [node.id, node]))
  const absoluteCache = new Map<string, { x: number; y: number }>()
  const previewNodes = payload.nodes.map((node) => {
    const absolute = resolveAbsolutePosition(node, nodeMap, absoluteCache, new Set())
    const size = getNodeSize(node)
    return {
      id: node.id,
      x: absolute.x,
      y: absolute.y,
      width: size.width,
      height: size.height,
      isGroup: node.type === 'group',
      label: compactLabel(node.data.label, node.type === 'group' ? 16 : 18),
    }
  })

  const byId = new Map(previewNodes.map((node) => [node.id, node]))
  const previewEdges = payload.edges
    .map((edge) => {
      const source = byId.get(edge.source)
      const target = byId.get(edge.target)
      if (!source || !target) {
        return null
      }
      return {
        id: edge.id,
        x1: source.x + source.width / 2,
        y1: source.y + source.height / 2,
        x2: target.x + target.width / 2,
        y2: target.y + target.height / 2,
        directed: Boolean(edge.data?.directed || edge.markerEnd),
      }
    })
    .filter((edge): edge is PreviewEdge => edge !== null)

  const minX = Math.min(...previewNodes.map((node) => node.x))
  const minY = Math.min(...previewNodes.map((node) => node.y))
  const maxX = Math.max(...previewNodes.map((node) => node.x + node.width))
  const maxY = Math.max(...previewNodes.map((node) => node.y + node.height))
  const padding = 18
  const originX = minX - padding
  const originY = minY - padding
  const width = Math.max(140, maxX - minX + padding * 2)
  const height = Math.max(80, maxY - minY + padding * 2)

  const nodes = previewNodes.map((node) => ({
    ...node,
    x: node.x - originX,
    y: node.y - originY,
  }))
  const edges = previewEdges.map((edge) => ({
    ...edge,
    x1: edge.x1 - originX,
    y1: edge.y1 - originY,
    x2: edge.x2 - originX,
    y2: edge.y2 - originY,
  }))

  return {
    viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`,
    nodes,
    edges,
  }
}

const resolveGreetingKey = (date: Date) => {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) {
    return 'home.greeting.morning'
  }
  if (hour >= 12 && hour < 18) {
    return 'home.greeting.afternoon'
  }
  return 'home.greeting.evening'
}

export default function HomeView({ graphList, activeGraphId, thumbnails, onOpenGraph }: HomeViewProps) {
  const { t } = useI18n()
  const greeting = t(resolveGreetingKey(new Date()))

  const snapshots = graphList.map((graph) => ({
    id: graph.id,
    snapshot: buildSnapshot(thumbnails[graph.id]),
  }))
  const snapshotById = new Map(snapshots.map((entry) => [entry.id, entry.snapshot]))

  if (graphList.length === 0) {
    return (
      <section className="home-view">
        <div className="home-view__content">
          <header className="home-view__header">
            <h1>{greeting}</h1>
          </header>
          <div className="home-view__empty">{t('home.empty')}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="home-view">
      <div className="home-view__content">
        <header className="home-view__header">
          <h1>{greeting}</h1>
        </header>
        <div className="home-view__section-title">{t('home.recent')}</div>
        <div className="home-grid" role="list" aria-label={t('home.recent')}>
          {graphList.map((graph) => {
            const snapshot = snapshotById.get(graph.id) ?? null
            return (
              <button
                key={graph.id}
                type="button"
                role="listitem"
                className={`home-card ${activeGraphId === graph.id ? 'is-active' : ''}`}
                onClick={() => onOpenGraph(graph.id)}
              >
                <div className="home-card__thumb home-card__thumb--flow">
                  {snapshot ? (
                    <svg className="home-card__svg" viewBox={snapshot.viewBox} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <marker
                          id={`home-arrow-${graph.id}`}
                          markerWidth="9"
                          markerHeight="9"
                          refX="7"
                          refY="3.5"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M0,0 L0,7 L7,3.5 z" className="home-card__arrow" />
                        </marker>
                      </defs>
                      {snapshot.edges.map((edge) => (
                        <line
                          key={edge.id}
                          x1={edge.x1}
                          y1={edge.y1}
                          x2={edge.x2}
                          y2={edge.y2}
                          className="home-card__edge"
                          markerEnd={edge.directed ? `url(#home-arrow-${graph.id})` : undefined}
                        />
                      ))}
                      {snapshot.nodes.map((node) => (
                        <g key={node.id}>
                          <rect
                            x={node.x}
                            y={node.y}
                            width={node.width}
                            height={node.height}
                            rx={node.isGroup ? 10 : 7}
                            className={`home-card__node ${node.isGroup ? 'home-card__node--group' : ''}`}
                          />
                          {!node.isGroup ? (
                            <text
                              x={node.x + node.width / 2}
                              y={node.y + node.height / 2 + 3}
                              textAnchor="middle"
                              className="home-card__label"
                            >
                              {node.label}
                            </text>
                          ) : null}
                        </g>
                      ))}
                    </svg>
                  ) : (
                    <div className="home-card__thumb-empty">{t('home.thumbnailEmpty')}</div>
                  )}
                </div>
                <div className="home-card__body">
                  <div className="home-card__title">{graph.name}</div>
                  <div className="home-card__meta">{formatUpdatedAt(graph.updatedAt)}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
