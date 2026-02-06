// App orchestrates the Graph Notes experience: auth gate, graph editor,
// widgets, settings, and persistence. Keep state/effects grouped.
import {
  lazy,
  Suspense,
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
  MiniMap,
  SelectionMode,
  type Connection,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'
import { createGraph, deleteGraph, fetchGraph, generateGraph, listGraphs, saveGraph } from './api'
import type { GraphEdge, GraphKind, GraphNode, GraphPayload, GraphSummary, NodeData } from './graphTypes'
import ActionsWidget from './components/ActionsWidget'
import AuthModal from './components/AuthModal'
import ChatPanel from './components/ChatPanel'
import GraphContextMenu, { type ContextMenuState } from './components/GraphContextMenu'
import GraphListWidget from './components/GraphListWidget'
import HomeView from './components/HomeView'
import ItemModal from './components/ItemModal'
import NoteDrawer from './components/NoteDrawer'
import QuickFactsView from './components/QuickFactsView'
import SshConsole from './components/SshConsole'
import SshModal from './components/SshModal'
import SettingsModal from './components/SettingsModal'
import TaskDrawer from './components/TaskDrawer'
import { GroupNode, NoteNode, TaskNode } from './components/nodes'
import { useGraphState } from './hooks/useGraphState'
import {
  ACCENT_KEY,
  ACCENT_OPTIONS,
  BETA_KEY,
  DEFAULT_GROUP_SIZE,
  DRAWER_MAX,
  DRAWER_MIN,
  GROUP_PADDING,
  MINIMAP_KEY,
  NODE_DETAILS_LAYOUT_KEY,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  STORAGE_ACTIVE_KEY,
  STORAGE_GRAPH_PREFIX,
  STORAGE_LIST_KEY,
  THEME_KEY,
  defaultGraph,
  SOLAR_SYSTEM_GRAPH,
  statusLabels,
} from './constants'
import {
  createEmptyGraphPayload,
  getAbsolutePosition,
  getNodeRect,
  isEdgeDirected,
  normalizeGraph,
  withEdgeDirection,
} from './utils/graph'
import { generateId } from './utils/id'
import { resolveAuthName } from './utils/auth'
import { readLocalGraphList } from './utils/storage'
import { isLightColor, resolveTheme } from './utils/theme'
import type { ChatMessage, FactKey, NodeDetailsLayout, SshConfig, ThemePreference, ViewMode } from './types/ui'
import { supabase } from './supabaseClient'
import { useI18n } from './i18n'

const Graph3DView = lazy(() => import('./components/Graph3DView'))

const AUTOSAVE_IDLE_MS = 3000
const CHAT_DOCK_WIDTH = 420
const NODE_DOCK_WIDTH = 420
const DRAWER_HEIGHT_MIN = 360
const DRAWER_HEIGHT_MAX = 980

type queuedSave = {
  graphId: string
  payload: GraphPayload
  payloadHash: string
  storageKey: string
  contextKey: string
}

export default function App() {
  const { language, setLanguage, t } = useI18n()
  // Core React Flow state for the active graph.
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange } = useGraphState()
  // Graph list + metadata for the current Graph Notes view.
  const [graphList, setGraphList] = useState<GraphSummary[]>([])
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null)
  const [graphName, setGraphName] = useState(defaultGraph.name)
  const [createGraphOpen, setCreateGraphOpen] = useState(false)
  const [createGraphName, setCreateGraphName] = useState('')
  const [deleteGraphTarget, setDeleteGraphTarget] = useState<{ id: string; name: string } | null>(null)
  const [isRenamingGraph, setIsRenamingGraph] = useState(false)
  const [renameTargetGraphId, setRenameTargetGraphId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [sshConfigs, setSshConfigs] = useState<Record<string, SshConfig>>({})
  const [sshModal, setSshModal] = useState<{ graphId: string } | null>(null)
  const [sshDraft, setSshDraft] = useState<SshConfig>({
    host: '',
    port: '22',
    user: '',
    keyPath: '',
  })
  const [sshConsoleOpen, setSshConsoleOpen] = useState(false)
  const [sshConsoleMinimized, setSshConsoleMinimized] = useState(false)
  // Selected node/item state for the drawer + item modal.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [minimizedNodeIds, setMinimizedNodeIds] = useState<string[]>([])
  const [itemTitle, setItemTitle] = useState('')
  const [itemModal, setItemModal] = useState<{ nodeId: string; itemId: string } | null>(null)
  const [itemNoteTitle, setItemNoteTitle] = useState('')
  const [saveState, setSaveState] = useState<keyof typeof statusLabels>('idle')
  const [hydrated, setHydrated] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('home')
  const [appMenuOpen, setAppMenuOpen] = useState(false)
  // Graph kind keeps storage + API calls namespaced across app surfaces.
  const [graphKind, setGraphKind] = useState<GraphKind>('note')
  // Chat + quick facts state.
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)
  const [activeFactKey, setActiveFactKey] = useState<FactKey | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  // Display mode is read-only and hides editing widgets for clean presentation.
  const [displayMode, setDisplayMode] = useState(false)
  // Left panel sizing + collapse preferences (persisted in localStorage).
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return 260
    }
    const stored = window.localStorage.getItem('gweb.sidebar.width')
    const parsed = stored ? Number(stored) : 260
    return Number.isFinite(parsed) ? parsed : 260
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }
    const stored = window.localStorage.getItem('gweb.sidebar.collapsed')
    if (stored === 'true' || stored === 'false') {
      return stored === 'true'
    }
    return true
  })
  // Context menu + auth modal state.
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [supabaseLoggedIn, setSupabaseLoggedIn] = useState(false)
  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }
    return ''
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Beta toggle controls optional Graph Application + 3D tabs.
  const [betaFeaturesEnabled, setBetaFeaturesEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.localStorage.getItem(BETA_KEY) === 'true'
  })
  // Appearance settings (theme + accent + minimap).
  const [showMiniMap, setShowMiniMap] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    const stored = window.localStorage.getItem(MINIMAP_KEY)
    return stored === 'true'
  })
  const [accentChoice, setAccentChoice] = useState(() => {
    if (typeof window === 'undefined') {
      return 'blue'
    }
    const stored = window.localStorage.getItem(ACCENT_KEY)
    return stored ?? 'blue'
  })
  const [importError, setImportError] = useState('')
  // New connections default to undirected; users can switch modes from Actions.
  const [edgeMode, setEdgeMode] = useState<'undirected' | 'directed'>('undirected')
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
  const [nodeDetailsLayout, setNodeDetailsLayout] = useState<NodeDetailsLayout>(() => {
    if (typeof window === 'undefined') {
      return 'drawer'
    }
    const stored = window.localStorage.getItem(NODE_DETAILS_LAYOUT_KEY)
    return stored === 'panel' ? 'panel' : 'drawer'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  // Instance refs used for sizing, drag/resize, and scroll anchoring.
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const spawnIndex = useRef(0)
  const pendingGraphRef = useRef<{ id: string; payload: GraphPayload; kind: GraphKind } | null>(null)
  const hydratedKindRef = useRef<GraphKind>('note')
  const sidebarRef = useRef<HTMLElement | null>(null)
  const resizingRef = useRef(false)
  const flowShellRef = useRef<HTMLElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const drawerResizingRef = useRef(false)
  const drawerHeightResizingRef = useRef(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const appMenuRef = useRef<HTMLDivElement | null>(null)
  const [drawerWidth, setDrawerWidth] = useState(340)
  const [drawerHeight, setDrawerHeight] = useState(620)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarDragRef = useRef(false)
  const toolbarOffsetRef = useRef({ x: 0, y: 0 })
  const toolbarMovedRef = useRef(false)
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null)
  const seeded3dGraphsRef = useRef<Set<string>>(new Set())
  const didMountRef = useRef(false)
  // Autosave queue: one in-flight request with dedupe by payload hash.
  const autosaveTimerRef = useRef<number | null>(null)
  const autosaveInFlightRef = useRef(false)
  const autosavePendingRef = useRef<queuedSave | null>(null)
  const autosaveLastCommittedRef = useRef<{ graphId: string; payloadHash: string }>({
    graphId: '',
    payloadHash: '',
  })
  const autosaveContextRef = useRef('')

  // Derived auth state (Supabase session only).
  const isLoggedIn = supabaseLoggedIn

  // Local storage keys are namespaced by graph kind for future expansion.
  const listStorageKey = useMemo(() => `${STORAGE_LIST_KEY}.${graphKind}`, [graphKind])
  const activeStorageKey = useMemo(() => `${STORAGE_ACTIVE_KEY}.${graphKind}`, [graphKind])
  const graphStorageKey = useCallback(
    (graphId: string) => `${STORAGE_GRAPH_PREFIX}${graphKind}.${graphId}`,
    [graphKind],
  )
  const graphContextKey = `${graphKind}:${activeGraphId ?? ''}`

  const isHomeView = viewMode === 'home'
  const isGraphNoteView = viewMode === 'graph'
  const isApplicationView = viewMode === 'application'
  const isGraph3dView = viewMode === 'graph3d'
  const is2DView = isGraphNoteView || isApplicationView
  const isReadOnlyCanvas = is2DView && displayMode
  const useDockedNodeDrawer = is2DView && nodeDetailsLayout === 'drawer'
  const canShowDisplayMode = isGraphNoteView || isApplicationView

  const sshConsoleStyle = useMemo(() => {
    if (!isApplicationView || !sshConsoleOpen) {
      return undefined
    }
    const sidebarSpace = sidebarCollapsed ? 0 : sidebarWidth
    return { left: 16 + sidebarSpace + 12 }
  }, [isApplicationView, sshConsoleOpen, sidebarCollapsed, sidebarWidth])

  const chatExamples = isApplicationView
    ? [t('chat.appExample1'), t('chat.appExample2')]
    : [
        t('chat.example1'),
        t('chat.example2'),
      ]

  // Custom React Flow node renderers.
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      group: GroupNode,
      default: viewMode === 'application' ? TaskNode : NoteNode,
    }),
    [viewMode],
  )

  const hashPayload = useCallback((payload: GraphPayload) => JSON.stringify(payload), [])

  const persistQueuedSave = useCallback(async () => {
    if (autosaveInFlightRef.current) {
      return
    }

    const queued = autosavePendingRef.current
    if (!queued) {
      return
    }

    // Skip duplicate writes for already-persisted payload snapshots.
    if (
      autosaveLastCommittedRef.current.graphId === queued.graphId &&
      autosaveLastCommittedRef.current.payloadHash === queued.payloadHash
    ) {
      autosavePendingRef.current = null
      if (queued.contextKey === autosaveContextRef.current) {
        setSaveState('saved')
      }
      return
    }

    autosavePendingRef.current = null
    autosaveInFlightRef.current = true
    try {
      await saveGraph(queued.graphId, queued.payload)
      window.localStorage.setItem(queued.storageKey, JSON.stringify(queued.payload))
      setGraphList((current) =>
        current.map((graph) =>
          graph.id === queued.graphId
            ? { ...graph, name: queued.payload.name, updatedAt: new Date().toISOString() }
            : graph,
        ),
      )
      autosaveLastCommittedRef.current = {
        graphId: queued.graphId,
        payloadHash: queued.payloadHash,
      }
      if (queued.contextKey === autosaveContextRef.current) {
        setSaveState('saved')
      }
    } catch {
      window.localStorage.setItem(queued.storageKey, JSON.stringify(queued.payload))
      if (queued.contextKey === autosaveContextRef.current) {
        setSaveState('offline')
      }
    } finally {
      autosaveInFlightRef.current = false
      // If new edits arrived while saving, flush the newest snapshot immediately.
      if (autosavePendingRef.current) {
        void persistQueuedSave()
      }
    }
  }, [])

  useEffect(() => {
    autosaveContextRef.current = graphContextKey
  }, [graphContextKey])

  useEffect(() => {
    // Reset queued state when switching graph/view namespace.
    autosavePendingRef.current = null
    autosaveLastCommittedRef.current = { graphId: '', payloadHash: '' }
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [graphContextKey])

  // Theme + appearance: sync CSS variables with user preference/system theme.
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MINIMAP_KEY, String(showMiniMap))
    }
  }, [showMiniMap])

  useEffect(() => {
    const selected = ACCENT_OPTIONS.find((option) => option.id === accentChoice) ?? ACCENT_OPTIONS[0]
    if (typeof window !== 'undefined') {
      const nodeFill = resolvedTheme === 'light' ? selected.nodeFillLight : selected.nodeFill
      const nodeBorder = resolvedTheme === 'light' ? selected.nodeBorderLight : selected.nodeBorder
      window.localStorage.setItem(ACCENT_KEY, selected.id)
      const root = document.documentElement
      root.style.setProperty('--accent', selected.accent)
      root.style.setProperty('--accent-strong', selected.accentStrong)
      root.style.setProperty('--node-fill', nodeFill)
      root.style.setProperty('--node-border', nodeBorder)
      root.style.setProperty('--node-text', isLightColor(nodeFill) ? '#0f1114' : '#f5f6f8')
    }
  }, [accentChoice, resolvedTheme])

  useEffect(() => {
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      if (data.session) {
        setSupabaseLoggedIn(true)
        setUserName(resolveAuthName(data.session))
      } else {
        setSupabaseLoggedIn(false)
        setUserName('')
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (session) {
        setSupabaseLoggedIn(true)
        setUserName(resolveAuthName(session))
      } else {
        setSupabaseLoggedIn(false)
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
      const stored = window.localStorage.getItem('gweb.sidebar.collapsed')
      if (stored !== 'true' && stored !== 'false') {
        window.localStorage.setItem('gweb.sidebar.collapsed', 'true')
        setSidebarCollapsed(true)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gweb.sidebar.width', String(sidebarWidth))
    }
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gweb.sidebar.collapsed', String(sidebarCollapsed))
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NODE_DETAILS_LAYOUT_KEY, nodeDetailsLayout)
    }
  }, [nodeDetailsLayout])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    setHydrated(false)
    setActiveGraphId(null)
    setGraphList([])
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setItemModal(null)
    setItemTitle('')
    setItemNoteTitle('')
  }, [graphKind])

  useEffect(() => {
    if (!isReadOnlyCanvas) {
      return
    }
    // Close only mutation surfaces when entering display mode.
    setContextMenu(null)
    setChatOpen(false)
    setChatMinimized(false)
  }, [isReadOnlyCanvas])

  useEffect(() => {
    if (!isRenamingGraph) {
      setRenameValue(graphName)
    }
  }, [graphName, isRenamingGraph])

  useEffect(() => {
    setIsRenamingGraph(false)
    setRenameTargetGraphId(null)
  }, [activeGraphId])

  // Global mouse handlers for panel resizing + toolbar drag.
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

      if (drawerHeightResizingRef.current && drawerRef.current) {
        const rect = drawerRef.current.getBoundingClientRect()
        const maxHeight = Math.max(DRAWER_HEIGHT_MIN, Math.min(DRAWER_HEIGHT_MAX, window.innerHeight - 48))
        const nextHeight = Math.min(maxHeight, Math.max(DRAWER_HEIGHT_MIN, event.clientY - rect.top))
        setDrawerHeight(nextHeight)
      }

      if (toolbarDragRef.current && flowShellRef.current && toolbarRef.current) {
        const rect = flowShellRef.current.getBoundingClientRect()
        const toolbarRect = toolbarRef.current.getBoundingClientRect()
        const nextX = event.clientX - rect.left - toolbarOffsetRef.current.x
        const nextY = event.clientY - rect.top - toolbarOffsetRef.current.y
        const maxX = Math.max(16, rect.width - toolbarRect.width - 16)
        const maxY = Math.max(16, rect.height - toolbarRect.height - 16)
        setToolbarPos({
          x: Math.min(Math.max(16, nextX), maxX),
          y: Math.min(Math.max(16, nextY), maxY),
        })
      }
    }

    const handleUp = () => {
      resizingRef.current = false
      drawerResizingRef.current = false
      drawerHeightResizingRef.current = false
      toolbarDragRef.current = false
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

  // Initial graph list load + hydration of the active graph.
  useEffect(() => {
    let isMounted = true
    if (!supabaseLoggedIn) {
      setGraphList([])
      setActiveGraphId(null)
      setHydrated(false)
      return () => {
        isMounted = false
      }
    }
    const loadGraphs = async () => {
      let graphs: GraphSummary[] = []
      try {
        const listed = await listGraphs(graphKind)
        graphs = Array.isArray(listed) ? listed : []
      } catch {
        graphs = readLocalGraphList(listStorageKey)
      }

      if (!isMounted) {
        return
      }

      if (graphs.length === 0) {
          const payload =
            graphKind === 'note'
              ? defaultGraph
              : createEmptyGraphPayload(t('graphs.starterName'), graphKind)
        try {
          const created = await createGraph(payload)
          graphs = [created]
          pendingGraphRef.current = { id: created.id, payload, kind: graphKind }
        } catch {
          const localId = `local-${generateId()}`
          const summary: GraphSummary = {
            id: localId,
            name: payload.name,
            updatedAt: new Date().toISOString(),
          }
          graphs = [summary]
          pendingGraphRef.current = { id: localId, payload, kind: graphKind }
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(graphStorageKey(localId), JSON.stringify(payload))
          }
        }
      }

      setGraphList(graphs)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(listStorageKey, JSON.stringify(graphs))
      }

      const storedActive = typeof window !== 'undefined' ? window.localStorage.getItem(activeStorageKey) : null
      const activeId = storedActive && graphs.some((graph) => graph.id === storedActive)
        ? storedActive
        : graphs[0].id
      setActiveGraphId(activeId)
    }

    loadGraphs()
    return () => {
      isMounted = false
    }
  }, [activeStorageKey, graphKind, graphStorageKey, listStorageKey, supabaseLoggedIn, t])

  useEffect(() => {
    if (!activeGraphId) {
      return
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(activeStorageKey, activeGraphId)
    }
  }, [activeGraphId, activeStorageKey])

  useEffect(() => {
    if (!supabaseLoggedIn || !activeGraphId) {
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
      if (pending && pending.id === activeGraphId && pending.kind === graphKind) {
        pendingGraphRef.current = null
        const normalized = normalizeGraph(pending.payload, graphKind)
        if (!isMounted) return
        autosaveLastCommittedRef.current = {
          graphId: activeGraphId,
          payloadHash: hashPayload({
            name: normalized.name,
            nodes: normalized.nodes,
            edges: normalized.edges,
            kind: graphKind,
          }),
        }
        setGraphName(normalized.name)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        setSaveState('saved')
        hydratedKindRef.current = graphKind
        setHydrated(true)
        return
      }

      try {
        const payload = await fetchGraph(activeGraphId)
        if (!isMounted) return
        const normalized = normalizeGraph(payload, graphKind)
        autosaveLastCommittedRef.current = {
          graphId: activeGraphId,
          payloadHash: hashPayload({
            name: normalized.name,
            nodes: normalized.nodes,
            edges: normalized.edges,
            kind: graphKind,
          }),
        }
        setGraphName(normalized.name)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        setSaveState('saved')
      } catch {
        const local =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(graphStorageKey(activeGraphId))
            : null
        if (local) {
          try {
            const parsed = JSON.parse(local) as GraphPayload
            const normalized = normalizeGraph(parsed, graphKind)
            autosaveLastCommittedRef.current = {
              graphId: activeGraphId,
              payloadHash: hashPayload({
                name: normalized.name,
                nodes: normalized.nodes,
                edges: normalized.edges,
                kind: graphKind,
              }),
            }
            setGraphName(normalized.name)
            setNodes(normalized.nodes)
            setEdges(normalized.edges)
          } catch {
            const fallback =
              graphKind === 'note'
                ? defaultGraph
                : createEmptyGraphPayload(t('graphs.starterName'), graphKind)
            autosaveLastCommittedRef.current = {
              graphId: activeGraphId,
              payloadHash: hashPayload(fallback),
            }
            setGraphName(fallback.name)
            setNodes(fallback.nodes)
            setEdges(fallback.edges)
          }
        } else {
          const fallback =
            graphKind === 'note'
              ? defaultGraph
              : createEmptyGraphPayload(t('graphs.starterName'), graphKind)
          autosaveLastCommittedRef.current = {
            graphId: activeGraphId,
            payloadHash: hashPayload(fallback),
          }
          setGraphName(fallback.name)
          setNodes(fallback.nodes)
          setEdges(fallback.edges)
        }
        setSaveState('offline')
      } finally {
        if (isMounted) {
          hydratedKindRef.current = graphKind
          setHydrated(true)
        }
      }
    }

    loadGraph()
    return () => {
      isMounted = false
    }
  }, [activeGraphId, graphKind, graphStorageKey, hashPayload, setEdges, setNodes, t])

  useEffect(() => {
    if (!activeGraphId || !hydrated) {
      return
    }
    setGraphList((current) =>
      current.map((graph) =>
        graph.id === activeGraphId ? { ...graph, name: graphName } : graph,
      ),
    )
  }, [activeGraphId, graphName, hydrated])

  useEffect(() => {
    if (!hydrated || !activeGraphId || hydratedKindRef.current !== graphKind) {
      return
    }

    const payload: GraphPayload = { name: graphName, nodes, edges, kind: graphKind }
    const payloadHash = hashPayload(payload)
    const storageKey = graphStorageKey(activeGraphId)
    const contextKey = graphContextKey
    // Keep a local snapshot of every edit for fast recovery/offline fallback.
    window.localStorage.setItem(storageKey, JSON.stringify(payload))

    if (activeGraphId.startsWith('local-')) {
      autosaveLastCommittedRef.current = { graphId: activeGraphId, payloadHash }
      setSaveState('offline')
      return
    }

    if (
      autosaveLastCommittedRef.current.graphId === activeGraphId &&
      autosaveLastCommittedRef.current.payloadHash === payloadHash &&
      autosavePendingRef.current === null &&
      !autosaveInFlightRef.current
    ) {
      setSaveState('saved')
      return
    }

    autosavePendingRef.current = {
      graphId: activeGraphId,
      payload,
      payloadHash,
      storageKey,
      contextKey,
    }
    setSaveState('saving')

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null
      void persistQueuedSave()
    }, AUTOSAVE_IDLE_MS)
  }, [activeGraphId, edges, graphContextKey, graphKind, graphName, graphStorageKey, hashPayload, hydrated, nodes, persistQueuedSave])

  useEffect(() => {
    const flushOnHidden = () => {
      if (document.visibilityState !== 'hidden') {
        return
      }
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      void persistQueuedSave()
    }

    document.addEventListener('visibilitychange', flushOnHidden)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHidden)
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [persistQueuedSave])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(listStorageKey, JSON.stringify(graphList))
    }
  }, [graphList, listStorageKey])

  useEffect(() => {
    if (!activeGraphId || !hydrated || hydratedKindRef.current !== graphKind) {
      return
    }
    if (graphList.some((graph) => graph.id === activeGraphId)) {
      return
    }
    setGraphList((current) => [
      {
        id: activeGraphId,
        name: graphName || t('graphs.untitledGraph'),
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ])
  }, [activeGraphId, graphKind, graphList, graphName, hydrated])

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
    setMinimizedNodeIds((current) => current.filter((id) => nodes.some((node) => node.id === id)))
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (selectedNodeId) {
      setMinimizedNodeIds((current) => current.filter((id) => id !== selectedNodeId))
    }
  }, [selectedNodeId])

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
  const minimizedNodes = useMemo(
    () =>
      minimizedNodeIds
        .map((id) => nodes.find((node) => node.id === id) ?? null)
        .filter((node): node is GraphNode => node !== null),
    [minimizedNodeIds, nodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          withEdgeDirection(
            {
              ...(connection as GraphEdge),
              type: 'smoothstep',
            },
            edgeMode === 'directed',
          ),
          current,
        ),
      )
    },
    [edgeMode, setEdges],
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
        items: [...data.items, { id: generateId(), title: trimmed, notes: [] }],
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
            ? { ...item, notes: [...item.notes, { id: generateId(), title: trimmed }] }
            : item,
        ),
      }))
    },
    [updateNodeData],
  )

  const updateItemTitle = useCallback(
    (nodeId: string, itemId: string, title: string) => {
      updateNodeData(nodeId, (data) => ({
        ...data,
        items: data.items.map((item) =>
          item.id === itemId ? { ...item, title: title } : item,
        ),
      }))
    },
    [updateNodeData],
  )

  const updateItemNoteTitle = useCallback(
    (nodeId: string, itemId: string, noteId: string, title: string) => {
      updateNodeData(nodeId, (data) => ({
        ...data,
        items: data.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                notes: item.notes.map((note) =>
                  note.id === noteId ? { ...note, title } : note,
                ),
              }
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
    const id = generateId()
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
        label: t('graph.label.newNode'),
        items: [],
        position3d: {
          x: (centerPosition.x - 200) * 0.6,
          y: (centerPosition.y - 200) * 0.6,
          z: (spawnIndex.current % 5) * 40 - 80,
        },
        progress: 0,
        scriptName: '',
      },
    }

    setNodes((current) => current.concat(newNode))
    setSelectedNodeId(id)
  }, [setNodes, t])

  const addGroup = useCallback(() => {
    const id = generateId()
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
        label: t('graph.label.newGroup'),
        items: [],
        position3d: {
          x: (centerPosition.x - 200) * 0.6,
          y: (centerPosition.y - 200) * 0.6,
          z: (spawnIndex.current % 5) * 40 - 80,
        },
      },
      style: {
        width: DEFAULT_GROUP_SIZE.width,
        height: DEFAULT_GROUP_SIZE.height,
      },
    }

    setNodes((current) => current.concat(newGroup))
    setSelectedNodeId(id)
  }, [setNodes, t])

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

    const groupId = selectedGroup?.id ?? generateId()
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
            label: t('graph.label.group'),
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
  }, [nodes, setNodes, t])

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

  const toggleEdgeDirection = useCallback(
    (edgeId: string) => {
      setEdges((current) =>
        current.map((edge) =>
          edge.id === edgeId ? withEdgeDirection(edge, !isEdgeDirected(edge)) : edge,
        ),
      )
    },
    [setEdges],
  )

  const updateGraphNameInList = useCallback(
    (graphId: string, name: string) => {
      setGraphList((current) => {
        const next = current.map((graph) => (graph.id === graphId ? { ...graph, name } : graph))
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(listStorageKey, JSON.stringify(next))
        }
        return next
      })
    },
    [listStorageKey],
  )

  const handleStartRenameGraph = useCallback((graphId: string, currentName: string) => {
    setIsRenamingGraph(true)
    setRenameTargetGraphId(graphId)
    setRenameValue(currentName)
  }, [])

  const handleCancelRename = useCallback(() => {
    setIsRenamingGraph(false)
    setRenameTargetGraphId(null)
    setRenameValue('')
  }, [])

  const handleSubmitRename = useCallback(async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !renameTargetGraphId) {
      setIsRenamingGraph(false)
      setRenameTargetGraphId(null)
      return
    }

    if (renameTargetGraphId === activeGraphId) {
      setGraphName(trimmed)
      updateGraphNameInList(renameTargetGraphId, trimmed)
    } else if (renameTargetGraphId.startsWith('local-')) {
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(graphStorageKey(renameTargetGraphId))
          if (raw) {
            const payload = JSON.parse(raw) as GraphPayload
            window.localStorage.setItem(
              graphStorageKey(renameTargetGraphId),
              JSON.stringify({ ...payload, name: trimmed }),
            )
          }
        } catch (error) {
          setImportError(error instanceof Error ? error.message : t('graphs.error.parseJson'))
          return
        }
      }
      updateGraphNameInList(renameTargetGraphId, trimmed)
    } else {
      try {
        const payload = await fetchGraph(renameTargetGraphId)
        await saveGraph(renameTargetGraphId, { ...payload, name: trimmed })
        updateGraphNameInList(renameTargetGraphId, trimmed)
      } catch (error) {
        setImportError(error instanceof Error ? error.message : t('graphs.error.delete'))
        return
      }
    }

    setIsRenamingGraph(false)
    setRenameTargetGraphId(null)
  }, [
    activeGraphId,
    graphStorageKey,
    renameTargetGraphId,
    renameValue,
    t,
    updateGraphNameInList,
  ])

  const handleCreateGraph = useCallback(() => {
    setCreateGraphName('')
    setCreateGraphOpen(true)
  }, [])

  const handleRequestDeleteGraph = useCallback(
    (graphId: string) => {
      if (!graphId) {
        return
      }
      const match = graphList.find((graph) => graph.id === graphId)
      setDeleteGraphTarget({ id: graphId, name: match?.name ?? t('ssh.thisGraph') })
    },
    [graphList, t],
  )

  const handleSubmitCreateGraph = useCallback(async () => {
    const name = createGraphName.trim()
    const payload = createEmptyGraphPayload(
      name || `${t('graphs.newGraphPrefix')} ${graphList.length + 1}`,
      graphKind,
    )
    try {
      const summary = await createGraph(payload)
      pendingGraphRef.current = { id: summary.id, payload, kind: graphKind }
      setGraphList((current) => [summary, ...current])
      setActiveGraphId(summary.id)
      setCreateGraphOpen(false)
      setCreateGraphName('')
    } catch {
      const localId = `local-${generateId()}`
      const summary: GraphSummary = {
        id: localId,
        name: payload.name,
        updatedAt: new Date().toISOString(),
      }
      pendingGraphRef.current = { id: localId, payload, kind: graphKind }
      setGraphList((current) => [summary, ...current])
      setActiveGraphId(localId)
      localStorage.setItem(graphStorageKey(localId), JSON.stringify(payload))
      setCreateGraphOpen(false)
      setCreateGraphName('')
    }
  }, [createGraphName, graphKind, graphList.length, graphStorageKey, t])

  const handleDeleteGraph = useCallback(
    async (graphId: string) => {
      if (!graphId) {
        return
      }

      const currentList = graphList
      const updatedList = currentList.filter((graph) => graph.id !== graphId)

      if (graphId.startsWith('local-')) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(graphStorageKey(graphId))
        }
      } else {
        try {
          await deleteGraph(graphId)
        } catch (error) {
          setImportError(error instanceof Error ? error.message : t('graphs.error.delete'))
          return
        }
      }

      setGraphList(updatedList)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(listStorageKey, JSON.stringify(updatedList))
      }

      if (activeGraphId === graphId) {
        if (updatedList.length > 0) {
          setActiveGraphId(updatedList[0].id)
        } else {
          const payload =
            graphKind === 'note'
              ? { ...defaultGraph, name: t('graphs.starterName') }
              : createEmptyGraphPayload(t('graphs.starterName'), graphKind)
          try {
            const summary = await createGraph(payload)
            pendingGraphRef.current = { id: summary.id, payload, kind: graphKind }
            setGraphList([summary])
            setActiveGraphId(summary.id)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(listStorageKey, JSON.stringify([summary]))
            }
          } catch {
            const localId = `local-${generateId()}`
            const summary: GraphSummary = {
              id: localId,
              name: payload.name,
              updatedAt: new Date().toISOString(),
            }
            pendingGraphRef.current = { id: localId, payload, kind: graphKind }
            setGraphList([summary])
            setActiveGraphId(localId)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(listStorageKey, JSON.stringify([summary]))
              window.localStorage.setItem(
                graphStorageKey(localId),
                JSON.stringify(payload),
              )
            }
          }
        }
      }
    },
    [activeGraphId, graphKind, graphList, graphStorageKey, listStorageKey, t],
  )

  const selectedNodeCount = nodes.filter((node) => node.selected).length
  const selectionCount = selectedNodeCount + edges.filter((edge) => edge.selected).length
  const handleSelectGraph = useCallback(
    (graphId: string) => {
      const selected = graphList.find((graph) => graph.id === graphId)
      if (selected) {
        setGraphName(selected.name)
      }
      setHydrated(false)
      setActiveGraphId(graphId)
    },
    [graphList],
  )
  const handleOpenGraphFromHome = useCallback(
    (graphId: string) => {
      handleSelectGraph(graphId)
      setViewMode('graph')
      if (graphKind !== 'note') {
        setGraphKind('note')
      }
    },
    [graphKind, handleSelectGraph],
  )

  const sidebarWidthValue = sidebarCollapsed ? 0 : sidebarWidth
  const toolbarDefaultPosition = useMemo(
    () => ({
      x: sidebarWidthValue + 24,
      y: sidebarCollapsed ? 72 : 16,
    }),
    [sidebarCollapsed, sidebarWidthValue],
  )
  const workspaceStyle = useMemo(
    () => ({ ['--sidebar-width' as string]: `${sidebarWidthValue}px` } as CSSProperties),
    [sidebarWidthValue],
  )
  const toolbarStyle = useMemo(
    () => {
      const position = toolbarPos ?? toolbarDefaultPosition
      return { left: `${position.x}px`, top: `${position.y}px` } as CSSProperties
    },
    [toolbarDefaultPosition, toolbarPos],
  )
  const effectiveDrawerWidth = useDockedNodeDrawer
    ? Math.max(drawerWidth, NODE_DOCK_WIDTH)
    : isReadOnlyCanvas
      ? Math.max(drawerWidth, 460)
      : Math.max(drawerWidth, 420)
  const drawerWidthValue = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, effectiveDrawerWidth))
  const drawerStyle = useMemo(
    () =>
      ({
        ['--drawer-width' as string]: `${drawerWidthValue}px`,
        ['--drawer-height' as string]: `${drawerHeight}px`,
      } as CSSProperties),
    [drawerHeight, drawerWidthValue],
  )
  const showChatMini = is2DView && !isReadOnlyCanvas && chatOpen && chatMinimized
  const showMiniTray = is2DView && (minimizedNodes.length > 0 || showChatMini)
  const drawerMiniTrayStyle = useMemo(() => {
    // Keep minimized cards clear of right-side docked panels.
    const drawerVisible = is2DView && Boolean(activeNode)
    const rightOffset = drawerVisible ? drawerWidthValue + 36 : 24
    return { right: `${rightOffset}px` } as CSSProperties
  }, [activeNode, drawerWidthValue, is2DView])
  const appMenuStyle = useMemo(() => {
    // Keep the top-right app menu clear of right-side docked panels.
    const chatOffset = is2DView && !isReadOnlyCanvas && chatOpen && !chatMinimized ? CHAT_DOCK_WIDTH : 0
    const nodeDrawerOffset = useDockedNodeDrawer && activeNode ? drawerWidthValue : 0
    const rightOffset = 16 + chatOffset + nodeDrawerOffset
    return { right: `${rightOffset}px` } as CSSProperties
  }, [
    activeNode,
    chatMinimized,
    chatOpen,
    drawerWidthValue,
    is2DView,
    isReadOnlyCanvas,
    useDockedNodeDrawer,
  ])

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

  const handleDrawerHeightResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    drawerHeightResizingRef.current = true
  }

  const handleToolbarDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!toolbarRef.current || !flowShellRef.current) {
      return
    }
    const rect = toolbarRef.current.getBoundingClientRect()
    toolbarOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    toolbarDragRef.current = true
    toolbarMovedRef.current = true
  }

  useEffect(() => {
    if (!toolbarMovedRef.current) {
      setToolbarPos(toolbarDefaultPosition)
    }
  }, [toolbarDefaultPosition])

  const handleAuthSubmit = async (event: ReactFormEvent) => {
    event.preventDefault()
    const trimmedEmail = authEmail.trim()
    const trimmedPassword = authPassword.trim()
    setAuthError('')
    setAuthNotice('')
    if (!trimmedEmail || !trimmedPassword) {
      setAuthError(t('auth.error.enterCredentials'))
      return
    }

    try {
      // Supabase email/password auth for all users (including admin accounts).
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
          setSupabaseLoggedIn(true)
          setAuthOpen(false)
          setAuthName('')
          setAuthEmail('')
          setAuthPassword('')
        } else {
          setAuthNotice(t('auth.notice.confirmEmail'))
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
          setSupabaseLoggedIn(true)
          setAuthOpen(false)
          setAuthName('')
          setAuthEmail('')
          setAuthPassword('')
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t('auth.error.unable'))
    }
  }

  const handleLogout = async () => {
    if (supabaseLoggedIn) {
      try {
        await supabase.auth.signOut()
      } catch {
        // Ignore sign-out errors for now; local state still clears.
      }
    }
    setSupabaseLoggedIn(false)
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
    async (event?: ReactFormEvent) => {
      if (event) {
        event.preventDefault()
      }
      if (chatLoading) {
        return
      }
      const trimmed = chatInput.trim()
      if (!trimmed) {
        return
      }
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
      }
      setChatMessages((current) => current.concat(userMessage))
      setChatInput('')
      setChatError('')
      setChatLoading(true)

      try {
        const payload = await generateGraph(trimmed)
        const normalized = normalizeGraph(payload, graphKind)
        setGraphName(normalized.name)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        hydratedKindRef.current = graphKind
        setHydrated(true)
        setChatMessages((current) =>
          current.concat({
            id: generateId(),
            role: 'assistant',
            content: t('chat.result.generated'),
          }),
        )
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('chat.error.generateFailed')
        setChatError(message)
        setChatMessages((current) =>
          current.concat({
            id: generateId(),
            role: 'assistant',
            content: t('chat.result.failed'),
          }),
        )
      } finally {
        setChatLoading(false)
      }
    },
    [chatInput, chatLoading, graphKind, setEdges, setGraphName, setHydrated, setNodes, t],
  )

  const handleExport = useCallback(() => {
    const payload: GraphPayload = { name: graphName, nodes, edges, kind: graphKind }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = (graphName || 'graph').replace(/[^a-z0-9_-]+/gi, '_')
    link.href = url
    link.download = `${safeName}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [edges, graphKind, graphName, nodes])

  const handleImportFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const raw = JSON.parse(String(reader.result || '{}')) as GraphPayload
          const normalized = normalizeGraph(raw, graphKind)
          setGraphName(normalized.name)
          setNodes(normalized.nodes)
          setEdges(normalized.edges)
          hydratedKindRef.current = graphKind
          setImportError('')
          setHydrated(true)
        } catch (error) {
          setImportError(error instanceof Error ? error.message : t('graphs.error.parseJson'))
        }
      }
      reader.readAsText(file)
    },
    [graphKind, setEdges, setNodes, t],
  )

  // Seed the 3D view with a starter scene when it's empty.
  const seedSolarSystemIfNeeded = useCallback(() => {
    if (!activeGraphId || graphKind !== 'graph3d' || !hydrated) {
      return
    }
    if (seeded3dGraphsRef.current.has(activeGraphId)) {
      return
    }
    if (nodes.length > 0 || edges.length > 0) {
      return
    }
    const normalized = normalizeGraph(SOLAR_SYSTEM_GRAPH, 'graph3d')
    setGraphName(normalized.name)
    setNodes(normalized.nodes)
    setEdges(normalized.edges)
    setSelectedNodeId(null)
    seeded3dGraphsRef.current.add(activeGraphId)
  }, [activeGraphId, edges.length, graphKind, hydrated, nodes.length, setEdges, setNodes, setGraphName])

  useEffect(() => {
    seedSolarSystemIfNeeded()
  }, [seedSolarSystemIfNeeded])

  const changeView = (mode: ViewMode) => {
    if (!betaFeaturesEnabled && (mode === 'application' || mode === 'graph3d')) {
      setViewMode('graph')
      if (graphKind !== 'note') {
        setGraphKind('note')
      }
      setSelectedNodeId(null)
      setChatOpen(false)
      setChatMinimized(false)
      return
    }
    const nextKind =
      mode === 'home'
        ? 'note'
        : mode === 'graph'
          ? 'note'
          : mode === 'application'
            ? 'application'
            : mode === 'graph3d'
              ? 'graph3d'
              : null
    if (nextKind && nextKind !== graphKind) {
      setGraphKind(nextKind)
    }
    setViewMode(mode)
    setSelectedNodeId(null)
    setChatOpen(false)
    setChatMinimized(false)
  }

  useEffect(() => {
    if (!betaFeaturesEnabled && (viewMode === 'application' || viewMode === 'graph3d')) {
      setViewMode('graph')
      if (graphKind !== 'note') {
        setGraphKind('note')
      }
    }
  }, [betaFeaturesEnabled, graphKind, viewMode])

  useEffect(() => {
    if (!is2DView && displayMode) {
      setDisplayMode(false)
    }
  }, [displayMode, is2DView])

  useEffect(() => {
    if (!appMenuOpen) {
      return
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (!appMenuRef.current?.contains(target)) {
        setAppMenuOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAppMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [appMenuOpen])

  const handleToggleChat = useCallback(() => {
    setChatOpen((open) => {
      const next = !open
      if (next) {
        setChatMinimized(false)
        setSelectedNodeId(null)
        setContextMenu(null)
      } else {
        setChatMinimized(false)
      }
      return next
    })
  }, [])

  const openSshConfig = (graphId: string) => {
    const existing = sshConfigs[graphId] ?? {
      host: '',
      port: '22',
      user: '',
      keyPath: '',
    }
    setSshDraft(existing)
    setSshModal({ graphId })
  }

  const saveSshConfig = () => {
    if (!sshModal) {
      return
    }
    setSshConfigs((current) => ({
      ...current,
      [sshModal.graphId]: sshDraft,
    }))
    setSshModal(null)
  }

  const handleToggleConsole = useCallback(() => {
    setSshConsoleOpen((open) => {
      const next = !open
      if (next) {
        setSshConsoleMinimized(false)
      }
      return next
    })
  }, [])

  const handleMinimizeNodeDrawer = useCallback(() => {
    if (!activeNode) {
      return
    }
    setMinimizedNodeIds((current) => {
      const next = [...current.filter((id) => id !== activeNode.id), activeNode.id]
      return next.length > 5 ? next.slice(next.length - 5) : next
    })
    setSelectedNodeId(null)
  }, [activeNode])

  const handleRestoreNodeDrawer = useCallback((nodeId: string) => {
    setMinimizedNodeIds((current) => current.filter((id) => id !== nodeId))
    setSelectedNodeId(nodeId)
  }, [])

  const handleDismissNodeDrawer = useCallback((nodeId: string) => {
    setMinimizedNodeIds((current) => current.filter((id) => id !== nodeId))
    setSelectedNodeId((current) => (current === nodeId ? null : current))
  }, [])

  const handleMinimizeChat = useCallback(() => {
    setChatMinimized(true)
  }, [])

  const handleRestoreChat = useCallback(() => {
    setChatMinimized(false)
  }, [])

  const handleDismissChat = useCallback(() => {
    setChatOpen(false)
    setChatMinimized(false)
  }, [])

  const handleToggleBetaFeatures = useCallback((enabled: boolean) => {
    setBetaFeaturesEnabled(enabled)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BETA_KEY, String(enabled))
    }
  }, [])

  const handleSetNodeDetailsLayout = useCallback((layout: NodeDetailsLayout) => {
    setNodeDetailsLayout(layout)
  }, [])

  const handleOpenItemModal = useCallback((nodeId: string, itemId: string) => {
    setItemModal({ nodeId, itemId })
    setItemNoteTitle('')
  }, [])

  const contextNode = useMemo(
    () => (contextMenu?.kind === 'node' ? nodes.find((node) => node.id === contextMenu.id) ?? null : null),
    [contextMenu, nodes],
  )
  const contextEdge = useMemo(
    () => (contextMenu?.kind === 'edge' ? edges.find((edge) => edge.id === contextMenu.id) ?? null : null),
    [contextMenu, edges],
  )
  const contextEdgeDirected = useMemo(() => isEdgeDirected(contextEdge), [contextEdge])
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

  const showAuthGate = !isLoggedIn
  const showSideDrawer = !(is2DView && displayMode)
  const authGate = (
    <div className="auth-gate">
      <div className="auth-gate__panel">
        <div className="brand auth-gate__brand">
          <div className="brand__mark" />
          <div>
            <div className="brand__title">{t('brand.title')}</div>
            <div className="brand__subtitle">{t('brand.subtitle')}</div>
          </div>
        </div>
        <h1>{t('authGate.welcome')}</h1>
        <p className="auth-gate__subtitle">{t('authGate.subtitle')}</p>
        <div className="auth-gate__actions">
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => {
              setAuthMode('register')
              setAuthOpen(true)
            }}
          >
            {t('auth.register')}
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              setAuthMode('login')
              setAuthOpen(true)
            }}
          >
            {t('topbar.login')}
          </button>
        </div>
        <div className="auth-gate__note">{t('authGate.note')}</div>
      </div>
    </div>
  )

  return (
    <div className={`app ${showAuthGate ? 'app--auth' : ''} ${isReadOnlyCanvas ? 'app--display' : ''}`}>
      {showAuthGate ? (
        authGate
      ) : (
        <>
          <main
            className={`workspace ${viewMode === 'facts' ? 'workspace--facts' : ''} ${
              chatOpen && !chatMinimized && is2DView && !isReadOnlyCanvas ? 'workspace--chat-open' : ''
            } ${useDockedNodeDrawer && activeNode ? 'workspace--node-dock-open' : ''}`}
            style={workspaceStyle}
          >
            <div className={`app-menu ${appMenuOpen ? 'app-menu--open' : ''}`} ref={appMenuRef} style={appMenuStyle}>
              <div className="app-menu__bar">
                <div className={`status status--${saveState} app-menu__status`}>
                  <span className="status__dot" />
                  <span>{t(`status.${saveState}`)}</span>
                </div>
                <button
                  className="app-menu__trigger icon-btn"
                  type="button"
                  aria-expanded={appMenuOpen}
                  aria-label={t('topbar.settings')}
                  onClick={() => setAppMenuOpen((open) => !open)}
                >
                  ⋯
                </button>
              </div>
              {appMenuOpen ? (
                <div className="app-menu__panel" role="menu">
                  <div className="app-menu__section app-menu__section--status">
                    {userName ? <div className="user-chip">{t('topbar.hi', { name: userName })}</div> : null}
                  </div>
                  {betaFeaturesEnabled ? (
                    <div className="app-menu__section app-menu__section--nav">
                      <>
                        <button
                          type="button"
                          className={`app-menu__item ${viewMode === 'application' ? 'is-active' : ''}`}
                          onClick={() => {
                            changeView('application')
                            setAppMenuOpen(false)
                          }}
                        >
                          {t('nav.application')}
                        </button>
                        <button
                          type="button"
                          className={`app-menu__item ${viewMode === 'graph3d' ? 'is-active' : ''}`}
                          onClick={() => {
                            changeView('graph3d')
                            setAppMenuOpen(false)
                          }}
                        >
                          {t('nav.graph3d')}
                        </button>
                      </>
                    </div>
                  ) : null}
                  <div className="app-menu__section">
                    <button
                      className="app-menu__item"
                      type="button"
                      onClick={() => {
                        setLanguage(language === 'en' ? 'zh' : 'en')
                        setAppMenuOpen(false)
                      }}
                    >
                      {language === 'en' ? t('language.zh') : t('language.en')}
                    </button>
                    {canShowDisplayMode ? (
                      <button
                        className="app-menu__item"
                        type="button"
                        onClick={() => {
                          setDisplayMode((current) => !current)
                          setAppMenuOpen(false)
                        }}
                      >
                        {displayMode ? t('topbar.editMode') : t('topbar.displayMode')}
                      </button>
                    ) : null}
                    <button
                      className="app-menu__item"
                      type="button"
                      onClick={() => {
                        setSettingsOpen(true)
                        setAppMenuOpen(false)
                      }}
                    >
                      {t('topbar.settings')}
                    </button>
                    <button
                      className="app-menu__item app-menu__item--ai"
                      type="button"
                      onClick={() => {
                        handleToggleChat()
                        setAppMenuOpen(false)
                      }}
                    >
                      {t('topbar.ai')}
                    </button>
                    <button
                      className="app-menu__item app-menu__item--danger"
                      type="button"
                      onClick={() => {
                        handleLogout()
                        setAppMenuOpen(false)
                      }}
                    >
                      {t('topbar.logout')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {useDockedNodeDrawer && activeNode && isGraphNoteView ? (
              <NoteDrawer
                activeNode={activeNode}
                drawerStyle={drawerStyle}
                drawerRef={drawerRef}
                docked
                showResizer
                showHeightResizer={false}
                onResizeStart={handleDrawerResizeStart}
                onResizeHeightStart={handleDrawerHeightResizeStart}
                readOnly={isReadOnlyCanvas}
                onClose={handleMinimizeNodeDrawer}
                onRemoveNode={removeNode}
                onDetachFromGroup={detachFromGroup}
                onUpdateLabel={(nodeId, value) =>
                  updateNodeData(nodeId, (data) => ({
                    ...data,
                    label: value,
                  }))
                }
                itemTitle={itemTitle}
                onItemTitleChange={setItemTitle}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onOpenItemModal={handleOpenItemModal}
              />
            ) : null}
            {useDockedNodeDrawer && activeNode && isApplicationView && !isReadOnlyCanvas ? (
              <TaskDrawer
                activeNode={activeNode}
                drawerStyle={drawerStyle}
                drawerRef={drawerRef}
                docked
                showResizer
                showHeightResizer={false}
                onResizeStart={handleDrawerResizeStart}
                onResizeHeightStart={handleDrawerHeightResizeStart}
                onClose={handleMinimizeNodeDrawer}
                onRemoveNode={removeNode}
                updateNodeData={updateNodeData}
              />
            ) : null}

            {showSideDrawer ? (
              <GraphListWidget
                ref={sidebarRef}
                userName={userName}
                collapsed={sidebarCollapsed}
                viewMode={viewMode}
                showBetaTabs={betaFeaturesEnabled}
                graphList={graphList}
                activeGraphId={activeGraphId}
                graphName={graphName}
                renameTargetGraphId={renameTargetGraphId}
                renameValue={renameValue}
                isRenaming={isRenamingGraph}
                importError={importError}
                onRenameChange={setRenameValue}
                onStartRenameGraph={handleStartRenameGraph}
                onCancelRename={handleCancelRename}
                onSubmitRename={handleSubmitRename}
                onChangeView={changeView}
                onSelectGraph={handleSelectGraph}
                onCreateGraph={handleCreateGraph}
                onDeleteGraph={handleRequestDeleteGraph}
                onExport={handleExport}
                onImportFile={handleImportFile}
                onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
                onResizeStart={handleResizeStart}
              />
            ) : null}

            <section className="flow-shell" ref={flowShellRef}>
              {isHomeView ? (
                <HomeView
                  graphList={graphList}
                  activeGraphId={activeGraphId}
                  onOpenGraph={handleOpenGraphFromHome}
                />
              ) : is2DView ? (
                <>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodesDelete={isReadOnlyCanvas ? undefined : onNodesDelete}
                    onConnect={isReadOnlyCanvas ? undefined : onConnect}
                    nodesDraggable={!isReadOnlyCanvas}
                    nodesConnectable={!isReadOnlyCanvas}
                    elementsSelectable={!isReadOnlyCanvas}
                    onInit={(instance) => {
                      reactFlowInstance.current = instance
                      instance.fitView({ padding: 0.2 })
                      const viewport = instance.getViewport ? instance.getViewport() : { x: 0, y: 0, zoom: 1 }
                      instance.setViewport({ x: viewport.x, y: viewport.y, zoom: 0.9 }, { duration: 0 })
                    }}
                    onNodeClick={(_, node) => {
                      setChatOpen(false)
                      setContextMenu(null)
                      setSelectedNodeId(node.id)
                    }}
                    onNodeContextMenu={(event, node) => {
                      if (isReadOnlyCanvas) {
                        return
                      }
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
                      if (isReadOnlyCanvas) {
                        return
                      }
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
                    defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
                    deleteKeyCode={isReadOnlyCanvas ? null : ['Backspace', 'Delete']}
                    defaultEdgeOptions={{
                      type: 'smoothstep',
                    }}
                    selectionOnDrag={!isReadOnlyCanvas}
                    selectionMode={SelectionMode.Partial}
                    panOnDrag={isReadOnlyCanvas ? true : [2]}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background color="var(--grid)" gap={26} size={1} />
                    {showMiniMap ? (
                      <MiniMap
                        pannable
                        zoomable
                        nodeColor={(node) => (node.selected ? 'var(--accent)' : 'var(--minimap-node)')}
                        maskColor="var(--minimap-mask)"
                        position="bottom-left"
                      />
                    ) : null}
                  </ReactFlow>
                  {!isReadOnlyCanvas ? (
                    <GraphContextMenu
                      contextMenu={contextMenu}
                      menuPosition={menuPosition}
                      contextNode={contextNode}
                      contextEdge={contextEdge}
                      contextEdgeDirected={contextEdgeDirected}
                      onDeleteNode={removeNode}
                      onRemoveFromGroup={detachFromGroup}
                      onUngroupChildren={ungroupChildren}
                      onToggleEdgeDirection={toggleEdgeDirection}
                      onDeleteEdge={removeEdgeById}
                      onClose={() => setContextMenu(null)}
                    />
                  ) : null}
                </>
              ) : isGraph3dView ? (
                <Suspense fallback={<div className="graph-3d__loading">{t('graph3d.loading')}</div>}>
                  <Graph3DView
                    nodes={nodes}
                    edges={edges}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    toolbarStyle={toolbarStyle}
                    toolbarRef={toolbarRef}
                    onToolbarDragStart={handleToolbarDragStart}
                    accentSeed={accentChoice}
                  />
                </Suspense>
              ) : (
                <QuickFactsView activeFactKey={activeFactKey} onSelectFact={setActiveFactKey} />
              )}

              {is2DView && !isReadOnlyCanvas ? (
                <ActionsWidget
                  style={toolbarStyle}
                  toolbarRef={toolbarRef}
                  onDragStart={handleToolbarDragStart}
                  onAddNode={addNode}
                  onAddGroup={addGroup}
                  onGroupSelected={groupSelected}
                  onDeleteSelected={deleteSelected}
                  canGroup={selectedNodeCount > 0}
                  canDelete={selectionCount > 0}
                  isGraphNoteView={isGraphNoteView}
                  isApplicationView={isApplicationView}
                  onOpenSsh={() => activeGraphId && openSshConfig(activeGraphId)}
                  canOpenSsh={Boolean(activeGraphId)}
                  onToggleConsole={handleToggleConsole}
                  edgeMode={edgeMode}
                  onToggleEdgeMode={() =>
                    setEdgeMode((current) =>
                      current === 'undirected' ? 'directed' : 'undirected',
                    )
                  }
                />
              ) : null}

              {isGraphNoteView && !useDockedNodeDrawer ? (
                <NoteDrawer
                  activeNode={activeNode}
                  drawerStyle={drawerStyle}
                  drawerRef={drawerRef}
                  showResizer
                  showHeightResizer
                  onResizeStart={handleDrawerResizeStart}
                  onResizeHeightStart={handleDrawerHeightResizeStart}
                  readOnly={isReadOnlyCanvas}
                  onClose={handleMinimizeNodeDrawer}
                  onRemoveNode={removeNode}
                  onDetachFromGroup={detachFromGroup}
                  onUpdateLabel={(nodeId, value) =>
                    updateNodeData(nodeId, (data) => ({
                      ...data,
                      label: value,
                    }))
                  }
                  itemTitle={itemTitle}
                  onItemTitleChange={setItemTitle}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  onOpenItemModal={handleOpenItemModal}
                />
              ) : null}
              {isApplicationView && !isReadOnlyCanvas && !useDockedNodeDrawer ? (
                <TaskDrawer
                  activeNode={activeNode}
                  drawerStyle={drawerStyle}
                  drawerRef={drawerRef}
                  showResizer
                  showHeightResizer
                  onResizeStart={handleDrawerResizeStart}
                  onResizeHeightStart={handleDrawerHeightResizeStart}
                  onClose={handleMinimizeNodeDrawer}
                  onRemoveNode={removeNode}
                  updateNodeData={updateNodeData}
                />
              ) : null}

              {showMiniTray ? (
                <div
                  className="drawer-mini-tray"
                  style={drawerMiniTrayStyle}
                  role="region"
                  aria-label={t('drawer.minimizedLabel')}
                >
                  {minimizedNodes.map((node) => (
                    <div key={node.id} className="drawer-mini">
                      <div className="drawer-mini__title">{node.data.label}</div>
                      <div className="drawer-mini__actions">
                        <button
                          className="icon-btn"
                          type="button"
                          title={t('drawer.open')}
                          aria-label={t('drawer.open')}
                          onClick={() => handleRestoreNodeDrawer(node.id)}
                        >
                          ⌃
                        </button>
                        <button
                          className="icon-btn drawer-mini__dismiss"
                          type="button"
                          title={t('drawer.dismiss')}
                          aria-label={t('drawer.dismiss')}
                          onClick={() => handleDismissNodeDrawer(node.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {showChatMini ? (
                    <div className="drawer-mini drawer-mini--ai">
                      <div className="drawer-mini__title">AI chat</div>
                      <div className="drawer-mini__actions">
                        <button className="icon-btn" type="button" onClick={handleRestoreChat} title={t('chat.restore')}>
                          ⌃
                        </button>
                        <button
                          className="icon-btn drawer-mini__dismiss"
                          type="button"
                          onClick={handleDismissChat}
                          title={t('chat.dismiss')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <SshConsole
                open={isApplicationView && sshConsoleOpen}
                minimized={sshConsoleMinimized}
                style={sshConsoleStyle}
                title={graphName}
                message={
                  sshConfigs[activeGraphId ?? '']?.host
                    ? t('ssh.connecting', { host: sshConfigs[activeGraphId ?? '']?.host ?? '' })
                    : t('ssh.configureMessage')
                }
                onToggleMinimize={() => setSshConsoleMinimized((current) => !current)}
                onClose={() => setSshConsoleOpen(false)}
              />
            </section>
            {is2DView && !isReadOnlyCanvas && chatOpen && !chatMinimized ? (
              <ChatPanel
                open={chatOpen}
                chatMessages={chatMessages}
                chatError={chatError}
                chatInput={chatInput}
                chatLoading={chatLoading}
                onMinimize={handleMinimizeChat}
                onClose={handleDismissChat}
                onInputChange={setChatInput}
                onSubmit={handleChatSend}
                endRef={chatEndRef}
                examples={chatExamples}
              />
            ) : null}
            
          </main>
        </>
      )}

      <AuthModal
        open={authOpen}
        mode={authMode}
        authName={authName}
        authEmail={authEmail}
        authPassword={authPassword}
        authError={authError}
        authNotice={authNotice}
        onChangeMode={setAuthMode}
        onClose={() => setAuthOpen(false)}
        onSubmit={handleAuthSubmit}
        onOAuthLogin={handleOAuthLogin}
        onChangeName={setAuthName}
        onChangeEmail={setAuthEmail}
        onChangePassword={setAuthPassword}
      />

      <ItemModal
        open={Boolean(itemModal)}
        node={itemModalNode}
        item={itemModalItem}
        readOnly={isReadOnlyCanvas}
        noteTitle={itemNoteTitle}
        onChangeNoteTitle={setItemNoteTitle}
        onUpdateItemTitle={updateItemTitle}
        onUpdateNoteTitle={updateItemNoteTitle}
        onAddNote={addItemNote}
        onRemoveNote={removeItemNote}
        onClose={() => setItemModal(null)}
      />

      <SshModal
        open={Boolean(sshModal)}
        graphName={
          sshModal ? graphList.find((graph) => graph.id === sshModal.graphId)?.name ?? t('ssh.thisGraph') : ''
        }
        draft={sshDraft}
        onChangeDraft={setSshDraft}
        onClose={() => setSshModal(null)}
        onSave={saveSshConfig}
      />

      {createGraphOpen ? (
        <div className="modal-overlay" onClick={() => setCreateGraphOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>{t('modal.newGraph')}</h2>
            <p className="modal__subtitle">{t('modal.newGraphSubtitle')}</p>
            <div className="modal__form">
              <input
                className="modal__input"
                type="text"
                value={createGraphName}
                onChange={(event) => setCreateGraphName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSubmitCreateGraph()
                  }
                  if (event.key === 'Escape') {
                    setCreateGraphOpen(false)
                  }
                }}
                placeholder={t('graphs.graphNamePlaceholder')}
                autoFocus
              />
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setCreateGraphOpen(false)}>
                {t('modal.cancel')}
              </button>
              <button className="btn btn--primary" type="button" onClick={handleSubmitCreateGraph}>
                {t('modal.create')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteGraphTarget ? (
        <div className="modal-overlay" onClick={() => setDeleteGraphTarget(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>{t('modal.deleteGraph')}</h2>
            <p className="modal__subtitle">{t('modal.deleteGraphSubtitle', { name: deleteGraphTarget.name })}</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={() => setDeleteGraphTarget(null)}>
                {t('modal.cancel')}
              </button>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => {
                  handleDeleteGraph(deleteGraphTarget.id)
                  setDeleteGraphTarget(null)
                }}
              >
                {t('modal.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SettingsModal
        open={settingsOpen}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        accentChoice={accentChoice}
        nodeDetailsLayout={nodeDetailsLayout}
        sidebarCollapsed={sidebarCollapsed}
        betaFeaturesEnabled={betaFeaturesEnabled}
        showMiniMap={showMiniMap}
        onClose={() => setSettingsOpen(false)}
        onSetTheme={setThemePreference}
        onSetAccent={setAccentChoice}
        onSetNodeDetailsLayout={handleSetNodeDetailsLayout}
        onToggleSidebarExpanded={(expanded) => setSidebarCollapsed(!expanded)}
        onToggleBetaFeatures={handleToggleBetaFeatures}
        onToggleMiniMap={setShowMiniMap}
      />

      {showAuthGate ? <div className="app-footer">{t('footer.copyright')}</div> : null}
    </div>
  )
}
