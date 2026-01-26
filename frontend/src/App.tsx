
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type FormEvent as ReactFormEvent,
} from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'
import { createGraph, fetchGraph, listGraphs, saveGraph } from './api'
import type { GraphNode, GraphPayload, GraphSummary, Item, NodeData, Note } from './graphTypes'
import { supabase } from './supabaseClient'

const STORAGE_GRAPH_PREFIX = 'gweb.graph.data.v1.'
const STORAGE_LIST_KEY = 'gweb.graph.list.v1'
const STORAGE_ACTIVE_KEY = 'gweb.graph.active.v1'
const THEME_KEY = 'gweb.theme.v1'

const GROUP_PADDING = 32
const DEFAULT_GROUP_SIZE = { width: 300, height: 180 }
const DEFAULT_NODE_SIZE = { width: 150, height: 52 }
const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 420
const SIDEBAR_COLLAPSED = 64
const DRAWER_MIN = 280
const DRAWER_MAX = 900

type ThemePreference = 'dark' | 'light' | 'system'
type ViewMode = 'graph' | 'facts'
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const defaultGraph: GraphPayload = {
  name: 'Starter Graph',
  nodes: [
    {
      id: 'group-1',
      type: 'group',
      position: { x: 140, y: 120 },
      data: {
        label: 'Core Cluster',
        items: [],
      },
      style: {
        width: 300,
        height: 180,
      },
    },
    {
      id: 'node-1',
      type: 'default',
      position: { x: 24, y: 36 },
      parentNode: 'group-1',
      extent: 'parent' as const,
      data: {
        label: 'Launch Plan',
        items: [
          {
            id: 'item-1',
            title: 'Visual theme',
            notes: [{ id: 'note-1', title: 'Finalize palette' }],
          },
          {
            id: 'item-2',
            title: 'Demo flow',
            notes: [{ id: 'note-2', title: 'Storyboard walkthrough' }],
          },
        ],
      },
    },
    {
      id: 'node-2',
      type: 'default',
      position: { x: 140, y: 90 },
      parentNode: 'group-1',
      extent: 'parent' as const,
      data: {
        label: 'User Research',
        items: [
          {
            id: 'item-3',
            title: 'Interviews',
            notes: [{ id: 'note-3', title: 'Schedule 3 sessions' }],
          },
        ],
      },
    },
    {
      id: 'node-3',
      type: 'default',
      position: { x: 560, y: 200 },
      data: {
        label: 'Prototype Sprint',
        items: [
          {
            id: 'item-4',
            title: 'Interaction map',
            notes: [{ id: 'note-4', title: 'Map interactions' }],
          },
          {
            id: 'item-5',
            title: 'Storyboard',
            notes: [{ id: 'note-5', title: 'Storyboard flow' }],
          },
        ],
      },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      type: 'smoothstep',
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-3',
      type: 'smoothstep',
    },
  ],
}

const QUICK_FACTS = [
  {
    title: 'Vertices + Edges',
    detail: 'A graph is made of vertices (nodes) and edges (links) that connect them.',
  },
  {
    title: 'Directed vs Undirected',
    detail: 'Directed graphs have arrows on edges, undirected graphs do not.',
  },
  {
    title: 'Trees',
    detail: 'A tree is a connected, acyclic graph with exactly n-1 edges.',
  },
  {
    title: 'Shortest Paths',
    detail: 'BFS solves unweighted shortest paths; Dijkstra handles weighted edges.',
  },
  {
    title: 'Graph Coloring',
    detail: 'Coloring assigns labels so adjacent nodes never share the same color.',
  },
  {
    title: 'Planar Graphs',
    detail: 'Planar graphs can be drawn without any edges crossing.',
  },
]

const statusLabels = {
  idle: 'Idle',
  saving: 'Saving...',
  saved: 'Synced',
  offline: 'Local only',
} as const

const ensureNotes = (value: unknown): Note[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((note) => note && typeof (note as Note).title === 'string')
    .map((note) => ({
      id:
        typeof (note as Note).id === 'string'
          ? (note as Note).id
          : crypto.randomUUID(),
      title: String((note as Note).title),
    }))
}

const ensureItems = (value: unknown, fallbackNotes: unknown): Item[] => {
  if (Array.isArray(value)) {
    const items = value
      .filter((item) => item && typeof (item as Item).title === 'string')
      .map((item) => ({
        id: typeof (item as Item).id === 'string' ? (item as Item).id : crypto.randomUUID(),
        title: String((item as Item).title),
        notes: ensureNotes((item as Item).notes),
      }))
    if (items.length > 0) {
      return items
    }
  }

  if (Array.isArray(fallbackNotes)) {
    return fallbackNotes
      .filter((note) => note && typeof (note as Note).title === 'string')
      .map((note) => ({
        id: typeof (note as Note).id === 'string' ? (note as Note).id : crypto.randomUUID(),
        title: String((note as Note).title),
        notes: [],
      }))
  }

  return []
}

const coerceNumber = (value: unknown, fallback: number): number => {
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

const normalizeGraph = (payload: GraphPayload | null): GraphPayload => {
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return defaultGraph
  }

  const name =
    typeof payload.name === 'string' && payload.name.trim().length > 0
      ? payload.name.trim()
      : 'Untitled Graph'

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

    return {
      ...node,
      type: node.type ?? 'default',
      position: node.position ?? { x: 0, y: 0 },
      extent: node.parentNode ? ('parent' as const) : node.extent,
      data: {
        label,
        items: ensureItems((rawData as NodeData).items, (rawData as { notes?: Note[] }).notes),
      },
      style,
    }
  })

  const edges = (payload.edges as Edge[]).map((edge, index) => ({
    ...edge,
    id: edge.id ?? `edge-${index}`,
    type: edge.type ?? 'smoothstep',
  }))

  return { name, nodes, edges }
}

const useGraphState = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  return { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange }
}

const getNodeSize = (node: GraphNode) => {
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

const getAbsolutePosition = (node: GraphNode, nodeMap: Map<string, GraphNode>) => {
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

const getNodeRect = (node: GraphNode, nodeMap: Map<string, GraphNode>) => {
  const position = getAbsolutePosition(node, nodeMap)
  const size = getNodeSize(node)
  return {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  }
}

const resolveTheme = (preference: ThemePreference, prefersDark: boolean) => {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return preference
}

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const resolveAuthName = (session: {
  user?: { user_metadata?: { full_name?: string }; email?: string }
} | null) => {
  const fullName = session?.user?.user_metadata?.full_name?.trim()
  if (fullName) {
    return fullName
  }
  const email = session?.user?.email
  return email ? email.split('@')[0] || 'Graph Maker' : 'Graph Maker'
}

const createEmptyGraphPayload = (name: string): GraphPayload => ({
  name,
  nodes: [],
  edges: [],
})

const readLocalGraphList = (): GraphSummary[] => {
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

function GroupNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className={`group-node ${selected ? 'group-node--selected' : ''}`}>
      <div className="group-node__header">
        <span>{data.label}</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default function App() {
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange } = useGraphState()
  const [graphList, setGraphList] = useState<GraphSummary[]>([])
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null)
  const [graphName, setGraphName] = useState(defaultGraph.name)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [itemTitle, setItemTitle] = useState('')
  const [itemModal, setItemModal] = useState<{ nodeId: string; itemId: string } | null>(null)
  const [itemNoteTitle, setItemNoteTitle] = useState('')
  const [saveState, setSaveState] = useState<keyof typeof statusLabels>('idle')
  const [hydrated, setHydrated] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return 260
    }
    const stored = window.localStorage.getItem('gweb.sidebar.width')
    const parsed = stored ? Number(stored) : 260
    return Number.isFinite(parsed) ? parsed : 260
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [contextMenu, setContextMenu] = useState<
    | { kind: 'node'; id: string; x: number; y: number }
    | { kind: 'edge'; id: string; x: number; y: number }
    | null
  >(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
    return 'dark'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const spawnIndex = useRef(0)
  const pendingGraphRef = useRef<{ id: string; payload: GraphPayload } | null>(null)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const resizingRef = useRef(false)
  const flowShellRef = useRef<HTMLElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const drawerResizingRef = useRef(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const [drawerWidth, setDrawerWidth] = useState(340)

  const nodeTypes = useMemo(() => ({ group: GroupNode }), [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolved = resolveTheme(themePreference, media.matches)
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.setProperty('color-scheme', resolved)
      setResolvedTheme(resolved)
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [themePreference])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, themePreference)
    }
  }, [themePreference])

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      if (data.session) {
        setIsLoggedIn(true)
        setUserName(resolveAuthName(data.session))
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (session) {
        setIsLoggedIn(true)
        setUserName(resolveAuthName(session))
      } else {
        setIsLoggedIn(false)
        setUserName('')
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gweb.sidebar.width', String(sidebarWidth))
    }
  }, [sidebarWidth])

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (resizingRef.current && sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect()
        const nextWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, event.clientX - rect.left))
        setSidebarWidth(nextWidth)
      }

      if (drawerResizingRef.current && drawerRef.current) {
        const rect = drawerRef.current.getBoundingClientRect()
        const nextWidth = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, rect.right - event.clientX))
        setDrawerWidth(nextWidth)
      }
    }

    const handleUp = () => {
      resizingRef.current = false
      drawerResizingRef.current = false
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
        setItemModal(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [chatMessages])

  useEffect(() => {
    let isMounted = true
    const loadGraphs = async () => {
      let graphs: GraphSummary[] = []
      try {
        graphs = await listGraphs()
      } catch {
        graphs = readLocalGraphList()
      }

      if (!isMounted) {
        return
      }

      if (graphs.length === 0) {
        const payload = defaultGraph
        try {
          const created = await createGraph(payload)
          graphs = [created]
          pendingGraphRef.current = { id: created.id, payload }
        } catch {
          const localId = `local-${crypto.randomUUID()}`
          const summary: GraphSummary = {
            id: localId,
            name: payload.name,
            updatedAt: new Date().toISOString(),
          }
          graphs = [summary]
          pendingGraphRef.current = { id: localId, payload }
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(`${STORAGE_GRAPH_PREFIX}${localId}`, JSON.stringify(payload))
          }
        }
      }

      setGraphList(graphs)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(graphs))
      }

      const storedActive = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_ACTIVE_KEY) : null
      const activeId = storedActive && graphs.some((graph) => graph.id === storedActive)
        ? storedActive
        : graphs[0].id
      setActiveGraphId(activeId)
    }

    loadGraphs()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!activeGraphId) {
      return
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_ACTIVE_KEY, activeGraphId)
    }
  }, [activeGraphId])

  useEffect(() => {
    if (!activeGraphId) {
      return
    }
    setHydrated(false)
    setSelectedNodeId(null)
    setItemTitle('')
    setItemModal(null)
    setItemNoteTitle('')
    let isMounted = true

    const loadGraph = async () => {
      const pending = pendingGraphRef.current
      if (pending && pending.id === activeGraphId) {
        pendingGraphRef.current = null
        const normalized = normalizeGraph(pending.payload)
        if (!isMounted) return
        setGraphName(normalized.name)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        setSaveState('saved')
        setHydrated(true)
        return
      }

      try {
        const payload = await fetchGraph(activeGraphId)
        if (!isMounted) return
        const normalized = normalizeGraph(payload)
        setGraphName(normalized.name)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        setSaveState('saved')
      } catch {
        const local =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(`${STORAGE_GRAPH_PREFIX}${activeGraphId}`)
            : null
        if (local) {
          try {
            const parsed = JSON.parse(local) as GraphPayload
            const normalized = normalizeGraph(parsed)
            setGraphName(normalized.name)
            setNodes(normalized.nodes)
            setEdges(normalized.edges)
          } catch {
            const fallback = { ...defaultGraph, name: graphName }
            setGraphName(fallback.name)
            setNodes(fallback.nodes)
            setEdges(fallback.edges)
          }
        } else {
          const fallback = { ...defaultGraph, name: graphName }
          setGraphName(fallback.name)
          setNodes(fallback.nodes)
          setEdges(fallback.edges)
        }
        setSaveState('offline')
      } finally {
        if (isMounted) {
          setHydrated(true)
        }
      }
    }

    loadGraph()
    return () => {
      isMounted = false
    }
  }, [activeGraphId, graphName, setEdges, setNodes])

  useEffect(() => {
    if (!activeGraphId) {
      return
    }
    setGraphList((current) =>
      current.map((graph) =>
        graph.id === activeGraphId ? { ...graph, name: graphName } : graph,
      ),
    )
  }, [activeGraphId, graphName])

  useEffect(() => {
    if (!hydrated || !activeGraphId) {
      return
    }

    const payload: GraphPayload = { name: graphName, nodes, edges }
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      if (activeGraphId.startsWith('local-')) {
        localStorage.setItem(`${STORAGE_GRAPH_PREFIX}${activeGraphId}`, JSON.stringify(payload))
        setSaveState('offline')
        return
      }

      saveGraph(activeGraphId, payload)
        .then(() => {
          localStorage.setItem(`${STORAGE_GRAPH_PREFIX}${activeGraphId}`, JSON.stringify(payload))
          setGraphList((current) =>
            current.map((graph) =>
              graph.id === activeGraphId
                ? { ...graph, name: graphName, updatedAt: new Date().toISOString() }
                : graph,
            ),
          )
          setSaveState('saved')
        })
        .catch(() => {
          localStorage.setItem(`${STORAGE_GRAPH_PREFIX}${activeGraphId}`, JSON.stringify(payload))
          setSaveState('offline')
        })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [activeGraphId, edges, graphName, hydrated, nodes])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(graphList))
    }
  }, [graphList])

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (!itemModal) {
      return
    }
    const node = nodes.find((itemNode) => itemNode.id === itemModal.nodeId)
    const item = node?.data.items.find((entry) => entry.id === itemModal.itemId)
    if (!node || !item) {
      setItemModal(null)
    }
  }, [itemModal, nodes])

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
          },
          current,
        ),
      )
    },
    [setEdges],
  )

  const onNodesDelete = useCallback(
    (deleted: GraphNode[]) => {
      const deletedIds = new Set(deleted.map((node) => node.id))
      const deletedGroups = new Map(
        deleted.filter((node) => node.type === 'group').map((node) => [node.id, node]),
      )

      setNodes((current) =>
        current.map((node) => {
          if (!node.parentNode || !deletedIds.has(node.parentNode)) {
            return node
          }
          const parent = deletedGroups.get(node.parentNode)
          const parentPosition = parent?.position ?? { x: 0, y: 0 }
          return {
            ...node,
            parentNode: undefined,
            extent: undefined,
            position: {
              x: node.position.x + parentPosition.x,
              y: node.position.y + parentPosition.y,
            },
          }
        }),
      )

      setEdges((current) =>
        current.filter(
          (edge) =>
            !deleted.some((node) => node.id === edge.source || node.id === edge.target),
        ),
      )
    },
    [setEdges, setNodes],
  )

  const updateNodeData = useCallback(
    (nodeId: string, updater: (data: NodeData) => NodeData) => {
      setNodes((current) =>
        current.map((node) => (node.id === nodeId ? { ...node, data: updater(node.data) } : node)),
      )
    },
    [setNodes],
  )

  const addItem = useCallback(
    (nodeId: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return

      updateNodeData(nodeId, (data) => ({
        ...data,
        items: [...data.items, { id: crypto.randomUUID(), title: trimmed, notes: [] }],
      }))
    },
    [updateNodeData],
  )

  const removeItem = useCallback(
    (nodeId: string, itemId: string) => {
      updateNodeData(nodeId, (data) => ({
        ...data,
        items: data.items.filter((item) => item.id !== itemId),
      }))
      setItemModal((current) => (current?.itemId === itemId ? null : current))
    },
    [updateNodeData],
  )

  const addItemNote = useCallback(
    (nodeId: string, itemId: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return

      updateNodeData(nodeId, (data) => ({
        ...data,
        items: data.items.map((item) =>
          item.id === itemId
            ? { ...item, notes: [...item.notes, { id: crypto.randomUUID(), title: trimmed }] }
            : item,
        ),
      }))
    },
    [updateNodeData],
  )

  const removeItemNote = useCallback(
    (nodeId: string, itemId: string, noteId: string) => {
      updateNodeData(nodeId, (data) => ({
        ...data,
        items: data.items.map((item) =>
          item.id === itemId
            ? { ...item, notes: item.notes.filter((note) => note.id !== noteId) }
            : item,
        ),
      }))
    },
    [updateNodeData],
  )

  const addNode = useCallback(() => {
    const id = crypto.randomUUID()
    const offset = spawnIndex.current * 24
    spawnIndex.current += 1
    const centerPosition = reactFlowInstance.current
      ? reactFlowInstance.current.screenToFlowPosition({
          x: window.innerWidth / 2 + offset,
          y: window.innerHeight / 2 + offset,
        })
      : { x: 140 + offset, y: 140 + offset }

    const newNode: GraphNode = {
      id,
      type: 'default',
      position: centerPosition,
      data: {
        label: 'New node',
        items: [],
      },
    }

    setNodes((current) => current.concat(newNode))
    setSelectedNodeId(id)
  }, [setNodes])

  const addGroup = useCallback(() => {
    const id = crypto.randomUUID()
    const offset = spawnIndex.current * 24
    spawnIndex.current += 1
    const centerPosition = reactFlowInstance.current
      ? reactFlowInstance.current.screenToFlowPosition({
          x: window.innerWidth / 2 + offset,
          y: window.innerHeight / 2 + offset,
        })
      : { x: 120 + offset, y: 120 + offset }

    const newGroup: GraphNode = {
      id,
      type: 'group',
      position: centerPosition,
      data: {
        label: 'New group',
        items: [],
      },
      style: {
        width: DEFAULT_GROUP_SIZE.width,
        height: DEFAULT_GROUP_SIZE.height,
      },
    }

    setNodes((current) => current.concat(newGroup))
    setSelectedNodeId(id)
  }, [setNodes])

  const groupSelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)
    if (selectedNodes.length === 0) {
      return
    }

    const selectedGroup = selectedNodes.find((node) => node.type === 'group') ?? null
    const memberNodes = selectedNodes.filter((node) => node.id !== selectedGroup?.id)
    if (selectedGroup && memberNodes.length === 0) {
      setSelectedNodeId(selectedGroup.id)
      return
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const targetRects = memberNodes.map((node) => getNodeRect(node, nodeMap))

    if (selectedGroup) {
      targetRects.push(getNodeRect(selectedGroup, nodeMap))
    }

    if (targetRects.length === 0) {
      return
    }

    const minX = Math.min(...targetRects.map((rect) => rect.x))
    const minY = Math.min(...targetRects.map((rect) => rect.y))
    const maxX = Math.max(...targetRects.map((rect) => rect.x + rect.width))
    const maxY = Math.max(...targetRects.map((rect) => rect.y + rect.height))

    const groupPosition = { x: minX - GROUP_PADDING, y: minY - GROUP_PADDING }
    const groupWidth = Math.max(DEFAULT_GROUP_SIZE.width, maxX - minX + GROUP_PADDING * 2)
    const groupHeight = Math.max(DEFAULT_GROUP_SIZE.height, maxY - minY + GROUP_PADDING * 2)

    const groupId = selectedGroup?.id ?? crypto.randomUUID()
    const memberIds = new Set(memberNodes.map((node) => node.id))

    setNodes((current) => {
      const currentMap = new Map(current.map((node) => [node.id, node]))
      const updated = current.map((node) => {
        if (node.id === groupId) {
          return {
            ...node,
            type: 'group',
            position: groupPosition,
            style: {
              ...node.style,
              width: groupWidth,
              height: groupHeight,
            },
          }
        }

        if (memberIds.has(node.id) || node.parentNode === groupId) {
          const absolute = getAbsolutePosition(node, currentMap)
          return {
            ...node,
            parentNode: groupId,
            extent: 'parent' as const,
            position: {
              x: absolute.x - groupPosition.x,
              y: absolute.y - groupPosition.y,
            },
          }
        }

        return node
      })

      if (!selectedGroup) {
        updated.push({
          id: groupId,
          type: 'group',
          position: groupPosition,
          data: {
            label: 'Group',
            items: [],
          },
          style: {
            width: groupWidth,
            height: groupHeight,
          },
        })
      }

      return updated
    })

    setSelectedNodeId(groupId)
  }, [nodes, setNodes])

  const removeNode = useCallback(
    (nodeId: string) => {
      const groupNode = nodes.find((node) => node.id === nodeId && node.type === 'group')
      setNodes((current) =>
        current
          .filter((node) => node.id !== nodeId)
          .map((node) => {
            if (!groupNode || node.parentNode !== nodeId) {
              return node
            }
            return {
              ...node,
              parentNode: undefined,
              extent: undefined,
              position: {
                x: node.position.x + groupNode.position.x,
                y: node.position.y + groupNode.position.y,
              },
            }
          }),
      )
      setEdges((current) =>
        current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      )
      setSelectedNodeId(null)
    },
    [nodes, setEdges, setNodes],
  )

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id))

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) {
      return
    }

    const deletedGroups = new Map(
      nodes
        .filter((node) => selectedNodeIds.has(node.id) && node.type === 'group')
        .map((node) => [node.id, node]),
    )

    setNodes((current) =>
      current
        .filter((node) => !selectedNodeIds.has(node.id))
        .map((node) => {
          if (!node.parentNode || !selectedNodeIds.has(node.parentNode)) {
            return node
          }
          const parent = deletedGroups.get(node.parentNode)
          const parentPosition = parent?.position ?? { x: 0, y: 0 }
          return {
            ...node,
            parentNode: undefined,
            extent: undefined,
            position: {
              x: node.position.x + parentPosition.x,
              y: node.position.y + parentPosition.y,
            },
          }
        }),
    )
    setEdges((current) =>
      current.filter(
        (edge) =>
          !selectedEdgeIds.has(edge.id) &&
          !selectedNodeIds.has(edge.source) &&
          !selectedNodeIds.has(edge.target),
      ),
    )

    if (selectedNodeId && selectedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [edges, nodes, selectedNodeId, setEdges, setNodes])

  const detachFromGroup = useCallback(
    (nodeId: string) => {
      setNodes((current) => {
        const nodeMap = new Map(current.map((node) => [node.id, node]))
        const target = nodeMap.get(nodeId)
        if (!target || !target.parentNode) {
          return current
        }
        const absolute = getAbsolutePosition(target, nodeMap)
        return current.map((node) =>
          node.id === nodeId
            ? { ...node, parentNode: undefined, extent: undefined, position: absolute }
            : node,
        )
      })
    },
    [setNodes],
  )

  const ungroupChildren = useCallback(
    (groupId: string) => {
      setNodes((current) => {
        const group = current.find((node) => node.id === groupId)
        if (!group) {
          return current
        }
        return current.map((node) => {
          if (node.parentNode !== groupId) {
            return node
          }
          return {
            ...node,
            parentNode: undefined,
            extent: undefined,
            position: {
              x: node.position.x + group.position.x,
              y: node.position.y + group.position.y,
            },
          }
        })
      })
    },
    [setNodes],
  )

  const removeEdgeById = useCallback(
    (edgeId: string) => {
      setEdges((current) => current.filter((edge) => edge.id !== edgeId))
    },
    [setEdges],
  )

  const handleCreateGraph = useCallback(async () => {
    const payload = createEmptyGraphPayload(`New Graph ${graphList.length + 1}`)
    try {
      const summary = await createGraph(payload)
      pendingGraphRef.current = { id: summary.id, payload }
      setGraphList((current) => [summary, ...current])
      setActiveGraphId(summary.id)
    } catch {
      const localId = `local-${crypto.randomUUID()}`
      const summary: GraphSummary = {
        id: localId,
        name: payload.name,
        updatedAt: new Date().toISOString(),
      }
      pendingGraphRef.current = { id: localId, payload }
      setGraphList((current) => [summary, ...current])
      setActiveGraphId(localId)
      localStorage.setItem(`${STORAGE_GRAPH_PREFIX}${localId}`, JSON.stringify(payload))
    }
  }, [graphList.length])

  const selectionCount =
    nodes.filter((node) => node.selected).length + edges.filter((edge) => edge.selected).length

  const sidebarWidthValue = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth
  const workspaceStyle = useMemo(
    () => ({ ['--sidebar-width' as string]: `${sidebarWidthValue}px` } as CSSProperties),
    [sidebarWidthValue],
  )
  const drawerWidthValue = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, drawerWidth))
  const drawerStyle = useMemo(
    () => ({ ['--drawer-width' as string]: `${drawerWidthValue}px` } as CSSProperties),
    [drawerWidthValue],
  )

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (sidebarCollapsed) {
      setSidebarCollapsed(false)
    }
    resizingRef.current = true
  }

  const handleDrawerResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    drawerResizingRef.current = true
  }

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthOpen(true)
    setAuthError('')
    setAuthNotice('')
  }

  const handleAuthSubmit = async (event: ReactFormEvent) => {
    event.preventDefault()
    const trimmedEmail = authEmail.trim()
    const trimmedPassword = authPassword.trim()
    setAuthError('')
    setAuthNotice('')
    if (!trimmedEmail || !trimmedPassword) {
      setAuthError('Enter both email and password to continue.')
      return
    }

    if (authMode === 'login' && trimmedEmail === 'admin' && trimmedPassword === 'admin123!') {
      setUserName('admin')
      setIsLoggedIn(true)
      setAuthOpen(false)
      setSettingsOpen(true)
      setAuthName('')
      setAuthEmail('')
      setAuthPassword('')
      return
    }

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: { full_name: authName.trim() || undefined },
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        })
        if (error) {
          throw error
        }
        if (data.session) {
          setUserName(resolveAuthName(data.session))
          setIsLoggedIn(true)
          setAuthOpen(false)
          setSettingsOpen(true)
          setAuthName('')
          setAuthEmail('')
          setAuthPassword('')
        } else {
          setAuthNotice('Check your email to confirm your account before logging in.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        })
        if (error) {
          throw error
        }
        if (data.session) {
          setUserName(resolveAuthName(data.session))
          setIsLoggedIn(true)
          setAuthOpen(false)
          setSettingsOpen(true)
          setAuthName('')
          setAuthEmail('')
          setAuthPassword('')
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to authenticate right now.')
    }
  }

  const handleLogout = async () => {
    if (userName !== 'admin') {
      try {
        await supabase.auth.signOut()
      } catch {
        // Ignore sign-out errors for now; local state still clears.
      }
    }
    setIsLoggedIn(false)
    setUserName('')
    setSettingsOpen(false)
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setAuthError('')
    setAuthNotice('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    setAuthOpen(false)
  }

  const handleChatSend = useCallback(
    (event?: ReactFormEvent) => {
      if (event) {
        event.preventDefault()
      }
      const trimmed = chatInput.trim()
      if (!trimmed) {
        return
      }
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      }
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Thanks! The AI backend is on hold, but I saved your prompt for later.',
      }
      setChatMessages((current) => current.concat(userMessage, assistantMessage))
      setChatInput('')
    },
    [chatInput],
  )

  const changeView = (mode: ViewMode) => {
    setViewMode(mode)
    setSelectedNodeId(null)
    setChatOpen(false)
  }

  const contextNode = useMemo(
    () => (contextMenu?.kind === 'node' ? nodes.find((node) => node.id === contextMenu.id) ?? null : null),
    [contextMenu, nodes],
  )
  const contextEdge = useMemo(
    () => (contextMenu?.kind === 'edge' ? edges.find((edge) => edge.id === contextMenu.id) ?? null : null),
    [contextMenu, edges],
  )
  const menuPosition = useMemo(() => {
    if (!contextMenu) {
      return null
    }
    const menuWidth = 200
    const menuHeight = 180
    const rect = flowShellRef.current?.getBoundingClientRect()
    if (!rect) {
      return { x: contextMenu.x, y: contextMenu.y }
    }
    const maxX = Math.max(8, rect.width - menuWidth - 8)
    const maxY = Math.max(8, rect.height - menuHeight - 8)
    const x = Math.max(8, Math.min(contextMenu.x, maxX))
    const y = Math.max(8, Math.min(contextMenu.y, maxY))
    return { x, y }
  }, [contextMenu])

  const itemModalNode = useMemo(() => {
    if (!itemModal) {
      return null
    }
    return nodes.find((node) => node.id === itemModal.nodeId) ?? null
  }, [itemModal, nodes])

  const itemModalItem = useMemo(() => {
    if (!itemModalNode || !itemModal) {
      return null
    }
    return itemModalNode.data.items.find((item) => item.id === itemModal.itemId) ?? null
  }, [itemModal, itemModalNode])

    return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" />
          <div>
            <div className="brand__title">Graph Studio</div>
            <div className="brand__subtitle">Organize ideas into connected flows.</div>
          </div>
        </div>

        <nav className="topbar__nav">
          <button
            type="button"
            className={`nav-btn ${viewMode === 'graph' ? 'is-active' : ''}`}
            onClick={() => changeView('graph')}
          >
            Graph
          </button>
          <button
            type="button"
            className={`nav-btn ${viewMode === 'facts' ? 'is-active' : ''}`}
            onClick={() => changeView('facts')}
          >
            Quick Facts
          </button>
        </nav>

        <div className="topbar__actions">
          <div className={`status status--${saveState}`}>
            <span className="status__dot" />
            <span>{statusLabels[saveState]}</span>
          </div>
          {isLoggedIn ? (
            <>
              <div className="user-chip">Hi, {userName}</div>
              <button className="btn btn--ghost" type="button" onClick={() => setSettingsOpen(true)}>
                Settings
              </button>
              <button className="btn btn--ghost" type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--ghost" type="button" onClick={() => handleOpenAuth('register')}>
                Register
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => handleOpenAuth('login')}>
                Login
              </button>
            </>
          )}
          <button
            className="btn btn--ai"
            type="button"
            onClick={() => {
              setChatOpen((open) => {
                const next = !open
                if (next) {
                  setSelectedNodeId(null)
                  setContextMenu(null)
                }
                return next
              })
            }}
          >
            AI
          </button>
        </div>
      </header>

      <main
        className={`workspace ${viewMode === 'facts' ? 'workspace--facts' : ''}`}
        style={workspaceStyle}
      >
        <aside
          className={`graph-list ${sidebarCollapsed ? 'graph-list--collapsed' : ''}`}
          ref={sidebarRef}
        >
          <div className="graph-list__header">
            <div>
              <div className="graph-list__title">Your Graphs</div>
              <div className="graph-list__subtitle">{graphList.length} saved</div>
            </div>
            {sidebarCollapsed ? (
              <button
                className="icon-btn graph-list__expand"
                type="button"
                aria-label="Expand sidebar"
                onClick={() => setSidebarCollapsed(false)}
              >
                &gt;
              </button>
            ) : (
              <div className="graph-list__actions">
                <button className="icon-btn" type="button" onClick={handleCreateGraph}>
                  +
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="Collapse sidebar"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  &lt;
                </button>
              </div>
            )}
          </div>

          <label className="graph-list__field">
            <span>Active graph</span>
            <input
              type="text"
              value={graphName}
              onChange={(event) => setGraphName(event.target.value)}
              placeholder="Graph name"
            />
          </label>

          <div className="graph-list__items">
            {graphList.length === 0 ? (
              <div className="graph-list__empty">Create your first graph.</div>
            ) : (
              graphList.map((graph) => (
                <button
                  key={graph.id}
                  type="button"
                  className={`graph-list__item ${graph.id === activeGraphId ? 'is-active' : ''}`}
                  onClick={() => setActiveGraphId(graph.id)}
                >
                  <div className="graph-list__name">{graph.name}</div>
                  <div className="graph-list__meta">{formatUpdatedAt(graph.updatedAt)}</div>
                </button>
              ))
            )}
          </div>

          <button className="btn btn--primary graph-list__cta" type="button" onClick={handleCreateGraph}>
            New Graph
          </button>
          <div className="graph-list__resizer" onMouseDown={handleResizeStart} />
        </aside>

        <section className="flow-shell" ref={flowShellRef}>
          {viewMode === 'graph' ? (
            <>
              <div className="toolbar">
                <div className="toolbar__label">Actions</div>
                <button className="btn btn--primary" type="button" onClick={addNode}>
                  Add Node
                </button>
                <button className="btn btn--ghost" type="button" onClick={addGroup}>
                  Add Group
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={groupSelected}
                  disabled={nodes.filter((node) => node.selected).length === 0}
                >
                  Group Selected
                </button>
                <button
                  className="btn btn--danger"
                  type="button"
                  onClick={deleteSelected}
                  disabled={selectionCount === 0}
                >
                  Delete Selected
                </button>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onConnect={onConnect}
                onInit={(instance) => {
                  reactFlowInstance.current = instance
                }}
                onNodeClick={(_, node) => {
                  setChatOpen(false)
                  setContextMenu(null)
                  setSelectedNodeId(node.id)
                }}
                onNodeContextMenu={(event, node) => {
                  event.preventDefault()
                  setSelectedNodeId(node.id)
                  const rect = flowShellRef.current?.getBoundingClientRect()
                  const x = rect ? event.clientX - rect.left : event.clientX
                  const y = rect ? event.clientY - rect.top : event.clientY
                  setContextMenu({
                    kind: 'node',
                    id: node.id,
                    x,
                    y,
                  })
                }}
                onEdgeContextMenu={(event, edge) => {
                  event.preventDefault()
                  const rect = flowShellRef.current?.getBoundingClientRect()
                  const x = rect ? event.clientX - rect.left : event.clientX
                  const y = rect ? event.clientY - rect.top : event.clientY
                  setContextMenu({
                    kind: 'edge',
                    id: edge.id,
                    x,
                    y,
                  })
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null)
                  setContextMenu(null)
                }}
                onPaneContextMenu={(event) => {
                  event.preventDefault()
                  setContextMenu(null)
                }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                deleteKeyCode={['Backspace', 'Delete']}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--edge)',
                  },
                }}
              >
                <Background color="var(--grid)" gap={26} size={1} />
                <Controls position="bottom-right" />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) => (node.selected ? 'var(--accent)' : 'var(--minimap-node)')}
                  maskColor="var(--minimap-mask)"
                  position="bottom-left"
                />
              </ReactFlow>
              {contextMenu && menuPosition ? (
                <div
                  className="context-menu"
                  style={{ top: menuPosition.y, left: menuPosition.x }}
                  onClick={(event) => event.stopPropagation()}
                >
                  {contextMenu.kind === 'node' && contextNode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          removeNode(contextNode.id)
                          setContextMenu(null)
                        }}
                      >
                        Delete Node
                      </button>
                      {contextNode.parentNode ? (
                        <button
                          type="button"
                          onClick={() => {
                            detachFromGroup(contextNode.id)
                            setContextMenu(null)
                          }}
                        >
                          Remove from Group
                        </button>
                      ) : null}
                      {contextNode.type === 'group' ? (
                        <button
                          type="button"
                          onClick={() => {
                            ungroupChildren(contextNode.id)
                            setContextMenu(null)
                          }}
                        >
                          Ungroup Children
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {contextMenu.kind === 'edge' && contextEdge ? (
                    <button
                      type="button"
                      onClick={() => {
                        removeEdgeById(contextEdge.id)
                        setContextMenu(null)
                      }}
                    >
                      Delete Edge
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="facts">
              <div className="facts__header">
                <h2>Quick Facts</h2>
                <p>Build sharper graphs with these core ideas from graph theory.</p>
              </div>
              <div className="facts__grid">
                {QUICK_FACTS.map((fact) => (
                  <article key={fact.title} className="facts__card">
                    <h3>{fact.title}</h3>
                    <p>{fact.detail}</p>
                  </article>
                ))}
              </div>
              <div className="facts__footer">
                Want more? Try describing your ideal layout in the AI panel.
              </div>
            </div>
          )}
        </section>

        <aside
          className={`drawer ${activeNode ? 'drawer--open' : ''}`}
          aria-hidden={!activeNode}
          ref={drawerRef}
          style={drawerStyle}
        >
          {activeNode ? (
            <>
              <div className="drawer__resizer" onMouseDown={handleDrawerResizeStart} />
              <div className="drawer__content">
              <div className="drawer__header">
                <div>
                  <div className="drawer__eyebrow">Node Settings</div>
                  <h2>{activeNode.data.label}</h2>
                </div>
                <div className="drawer__actions">
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                  >
                    Close
                  </button>
                  {activeNode.parentNode ? (
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => detachFromGroup(activeNode.id)}
                    >
                      Remove from Group
                    </button>
                  ) : null}
                  <button
                    className="btn btn--danger"
                    type="button"
                    onClick={() => removeNode(activeNode.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  value={activeNode.data.label}
                  onChange={(event) =>
                    updateNodeData(activeNode.id, (data) => ({
                      ...data,
                      label: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="items">
                <div className="items__header">
                  <h3>Items</h3>
                  <span>{activeNode.data.items.length} items</span>
                </div>
                <ul className="items__list">
                  {activeNode.data.items.map((item) => (
                    <li key={item.id} className="items__item">
                      <button
                        className="items__button"
                        type="button"
                        onClick={() => {
                          setItemModal({ nodeId: activeNode.id, itemId: item.id })
                          setItemNoteTitle('')
                        }}
                      >
                        <span>{item.title}</span>
                        <span className="items__meta">{item.notes.length} notes</span>
                      </button>
                      <button
                        className="items__remove"
                        type="button"
                        onClick={() => removeItem(activeNode.id, item.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="items__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    addItem(activeNode.id, itemTitle)
                    setItemTitle('')
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add an item..."
                    value={itemTitle}
                    onChange={(event) => setItemTitle(event.target.value)}
                  />
                  <button className="btn btn--primary" type="submit">
                    Add Item
                  </button>
                </form>
              </div>
            </div>
            </>
          ) : null}
        </aside>

        <aside className={`chat-panel ${chatOpen ? 'chat-panel--open' : ''}`} aria-hidden={!chatOpen}>
          <div className="chat-panel__header">
            <div>
              <div className="chat-panel__eyebrow">AI Assistant</div>
              <h2>Describe your graph</h2>
            </div>
            <button className="btn btn--ghost" type="button" onClick={() => setChatOpen(false)}>
              Close
            </button>
          </div>
          <div className="chat-panel__body">
            <p className="chat-panel__note">
              This panel is reserved for the upcoming AI experience. Soon you will be able to
              describe the structure and we will sketch it instantly.
            </p>
            {chatMessages.length > 0 ? (
              <div className="chat-panel__messages">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`chat-message chat-message--${message.role}`}>
                    {message.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <div className="chat-panel__placeholder">
                <div className="chip">Example: “Group nodes by theme and connect milestones.”</div>
                <div className="chip">Example: “Create a hub and spoke layout with 6 clusters.”</div>
              </div>
            )}
          </div>
          <form className="chat-panel__input" onSubmit={handleChatSend}>
            <input
              type="text"
              placeholder="Tell us about your graph..."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button className="btn btn--ghost" type="submit">
              Send
            </button>
          </form>
        </aside>
      </main>

      {authOpen ? (
        <div className="modal-overlay" onClick={() => setAuthOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__tabs">
              <button
                type="button"
                className={`modal__tab ${authMode === 'register' ? 'is-active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
              <button
                type="button"
                className={`modal__tab ${authMode === 'login' ? 'is-active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
            </div>
            <h2>{authMode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
            <p className="modal__subtitle">Authentication is a reserved feature for now.</p>
            <div className="oauth">
              <button
                className="btn btn--oauth"
                type="button"
                onClick={() => handleOAuthLogin('google')}
              >
                Continue with Google
              </button>
              <button
                className="btn btn--oauth"
                type="button"
                onClick={() => handleOAuthLogin('github')}
              >
                Continue with GitHub
              </button>
            </div>
            <div className="oauth__divider">or</div>
            <form className="modal__form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' ? (
                <label className="field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Graph explorer"
                  />
                </label>
              ) : null}
              <label className="field">
                <span>{authMode === 'login' ? 'Email or username' : 'Email'}</span>
                <input
                  type={authMode === 'login' ? 'text' : 'email'}
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder={authMode === 'login' ? 'email or admin' : 'you@example.com'}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </label>
              {authError ? <div className="auth-error">{authError}</div> : null}
              {authNotice ? <div className="auth-notice">{authNotice}</div> : null}
              <div className="modal__actions">
                <button className="btn btn--ghost" type="button" onClick={() => setAuthOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit">
                  {authMode === 'register' ? 'Register' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {itemModal && itemModalNode && itemModalItem ? (
        <div className="modal-overlay" onClick={() => setItemModal(null)}>
          <div className="modal item-modal" onClick={(event) => event.stopPropagation()}>
            <div className="item-modal__header">
              <div>
                <div className="item-modal__eyebrow">Item Notes</div>
                <h2>{itemModalItem.title}</h2>
              </div>
              <button className="btn btn--ghost" type="button" onClick={() => setItemModal(null)}>
                Close
              </button>
            </div>
            <div className="item-modal__count">{itemModalItem.notes.length} notes</div>
            {itemModalItem.notes.length === 0 ? (
              <div className="item-modal__empty">No notes yet. Add the first one below.</div>
            ) : (
              <ul className="item-modal__list">
                {itemModalItem.notes.map((note) => (
                  <li key={note.id} className="item-modal__item">
                    <span>{note.title}</span>
                    <button
                      className="item-modal__remove"
                      type="button"
                      onClick={() => removeItemNote(itemModalNode.id, itemModalItem.id, note.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="item-modal__form"
              onSubmit={(event) => {
                event.preventDefault()
                addItemNote(itemModalNode.id, itemModalItem.id, itemNoteTitle)
                setItemNoteTitle('')
              }}
            >
              <textarea
                className="item-modal__textarea"
                placeholder="Add a note description..."
                value={itemNoteTitle}
                onChange={(event) => setItemNoteTitle(event.target.value)}
              />
              <button className="btn btn--primary" type="submit">
                Add Note
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal modal--compact" onClick={(event) => event.stopPropagation()}>
            <h2>Settings</h2>
            <p className="modal__subtitle">Tune the workspace to your style.</p>
            <div className="modal__section">
              <div className="modal__label">Theme</div>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-toggle__btn ${themePreference === 'dark' ? 'is-active' : ''}`}
                  onClick={() => setThemePreference('dark')}
                >
                  Dark
                </button>
                <button
                  type="button"
                  className={`mode-toggle__btn ${themePreference === 'light' ? 'is-active' : ''}`}
                  onClick={() => setThemePreference('light')}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={`mode-toggle__btn ${themePreference === 'system' ? 'is-active' : ''}`}
                  onClick={() => setThemePreference('system')}
                >
                  System
                </button>
              </div>
              <div className="modal__hint">Currently in {resolvedTheme} mode.</div>
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
