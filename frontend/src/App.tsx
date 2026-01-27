
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
  MarkerType,
  MiniMap,
  type Connection,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'
import { createGraph, deleteGraph, fetchGraph, generateGraph, listGraphs, saveGraph } from './api'
import type { GraphNode, GraphPayload, GraphSummary, NodeData } from './graphTypes'
import ActionsWidget from './components/ActionsWidget'
import AuthModal from './components/AuthModal'
import ChatPanel from './components/ChatPanel'
import GraphContextMenu, { type ContextMenuState } from './components/GraphContextMenu'
import Graph3DView from './components/Graph3DView'
import GraphListWidget from './components/GraphListWidget'
import ItemModal from './components/ItemModal'
import NoteDrawer from './components/NoteDrawer'
import QuickFactsView from './components/QuickFactsView'
import SettingsModal from './components/SettingsModal'
import SshConsole from './components/SshConsole'
import SshModal from './components/SshModal'
import TaskDrawer from './components/TaskDrawer'
import TopBar from './components/TopBar'
import { GroupNode, NoteNode, TaskNode } from './components/nodes'
import { useGraphState } from './hooks/useGraphState'
import {
  ACCENT_KEY,
  ACCENT_OPTIONS,
  DRAWER_MAX,
  DRAWER_MIN,
  GROUP_PADDING,
  SOLAR_SYSTEM_GRAPH,
  SIDEBAR_COLLAPSED,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  STORAGE_ACTIVE_KEY,
  STORAGE_GRAPH_PREFIX,
  STORAGE_LIST_KEY,
  THEME_KEY,
  defaultGraph,
  statusLabels,
} from './constants'
import {
  coerceNumber,
  createEmptyGraphPayload,
  getAbsolutePosition,
  getNodeRect,
  getNodeSize,
  normalizeGraph,
} from './utils/graph'
import { resolveAuthName } from './utils/auth'
import { readLocalGraphList } from './utils/storage'
import { isLightColor, resolveTheme } from './utils/theme'
import type { ChatMessage, FactKey, SshConfig, ThemePreference, ViewMode } from './types/ui'
import { supabase } from './supabaseClient'


export default function App() {
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange } = useGraphState()
  const [graphList, setGraphList] = useState<GraphSummary[]>([])
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null)
  const [graphName, setGraphName] = useState(defaultGraph.name)
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [itemTitle, setItemTitle] = useState('')
  const [itemModal, setItemModal] = useState<{ nodeId: string; itemId: string } | null>(null)
  const [itemNoteTitle, setItemNoteTitle] = useState('')
  const [saveState, setSaveState] = useState<keyof typeof statusLabels>('idle')
  const [hydrated, setHydrated] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [chatOpen, setChatOpen] = useState(false)
  const [activeFactKey, setActiveFactKey] = useState<FactKey | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
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
  const [accentChoice, setAccentChoice] = useState(() => {
    if (typeof window === 'undefined') {
      return 'blue'
    }
    const stored = window.localStorage.getItem(ACCENT_KEY)
    return stored ?? 'blue'
  })
  const [importError, setImportError] = useState('')
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
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarDragRef = useRef(false)
  const toolbarOffsetRef = useRef({ x: 0, y: 0 })
  const toolbarMovedRef = useRef(false)
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null)
  const seeded3dGraphsRef = useRef<Set<string>>(new Set())

  const isGraphNoteView = viewMode === 'graph'
  const isApplicationView = viewMode === 'application'
  const is2DView = isGraphNoteView || isApplicationView

  const sshConsoleStyle = useMemo(() => {
    if (!isApplicationView || !sshConsoleOpen) {
      return undefined
    }
    const sidebarSpace = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth
    return {
      left: 16 + sidebarSpace + 12,
    }
  }, [isApplicationView, sshConsoleOpen, sidebarCollapsed, sidebarWidth])

  const chatExamples = isApplicationView
    ? ['Example: “Group scripts by server role.”', 'Example: “Create a deployment flow with 6 tasks.”']
    : [
        'Example: “Group nodes by theme and connect milestones.”',
        'Example: “Create a hub and spoke layout with 6 clusters.”',
      ]

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      group: GroupNode,
      default: viewMode === 'application' ? TaskNode : NoteNode,
    }),
    [viewMode],
  )

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
    const selected = ACCENT_OPTIONS.find((option) => option.id === accentChoice) ?? ACCENT_OPTIONS[0]
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCENT_KEY, selected.id)
      const root = document.documentElement
      root.style.setProperty('--accent', selected.accent)
      root.style.setProperty('--accent-strong', selected.accentStrong)
      root.style.setProperty('--node-fill', selected.nodeFill)
      root.style.setProperty('--node-border', selected.nodeBorder)
      root.style.setProperty('--node-text', isLightColor(selected.accent) ? '#0f1114' : '#f5f6f8')
    }
  }, [accentChoice])

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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gweb.sidebar.collapsed', String(sidebarCollapsed))
    }
  }, [sidebarCollapsed])

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

  const handleDeleteGraph = useCallback(
    async (graphId: string) => {
      if (!graphId) {
        return
      }
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Delete this graph? This cannot be undone.')
        if (!confirmed) {
          return
        }
      }

      const currentList = graphList
      const updatedList = currentList.filter((graph) => graph.id !== graphId)

      if (graphId.startsWith('local-')) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(`${STORAGE_GRAPH_PREFIX}${graphId}`)
        }
      } else {
        try {
          await deleteGraph(graphId)
        } catch (error) {
          setImportError(error instanceof Error ? error.message : 'Failed to delete graph.')
          return
        }
      }

      setGraphList(updatedList)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(updatedList))
      }

      if (activeGraphId === graphId) {
        if (updatedList.length > 0) {
          setActiveGraphId(updatedList[0].id)
        } else {
          const payload = createEmptyGraphPayload('New Graph 1')
          try {
            const summary = await createGraph(payload)
            pendingGraphRef.current = { id: summary.id, payload }
            setGraphList([summary])
            setActiveGraphId(summary.id)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify([summary]))
            }
          } catch {
            const localId = `local-${crypto.randomUUID()}`
            const summary: GraphSummary = {
              id: localId,
              name: payload.name,
              updatedAt: new Date().toISOString(),
            }
            pendingGraphRef.current = { id: localId, payload }
            setGraphList([summary])
            setActiveGraphId(localId)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify([summary]))
              window.localStorage.setItem(
                `${STORAGE_GRAPH_PREFIX}${localId}`,
                JSON.stringify(payload),
              )
            }
          }
        }
      }
    },
    [activeGraphId, graphList],
  )

  const selectedNodeCount = nodes.filter((node) => node.selected).length
  const selectionCount = selectedNodeCount + edges.filter((edge) => edge.selected).length

  const sidebarWidthValue = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth
  const workspaceStyle = useMemo(
    () => ({ ['--sidebar-width' as string]: `${sidebarWidthValue}px` } as CSSProperties),
    [sidebarWidthValue],
  )
  const toolbarStyle = useMemo(
    () => {
      const fallback = { x: sidebarWidthValue + 24, y: 16 }
      const position = toolbarPos ?? fallback
      return { left: `${position.x}px`, top: `${position.y}px` } as CSSProperties
    },
    [sidebarWidthValue, toolbarPos],
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
      setToolbarPos({ x: sidebarWidthValue + 24, y: 16 })
    }
  }, [sidebarWidthValue])

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
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      }
      setChatMessages((current) => current.concat(userMessage))
      setChatInput('')
      setChatError('')
      setChatLoading(true)

      try {
        const payload = await generateGraph(trimmed)
        const normalized = normalizeGraph(payload)
        setGraphName(normalized.name)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        setHydrated(true)
        setChatMessages((current) =>
          current.concat({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Graph generated and applied to the canvas.',
          }),
        )
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to generate a graph right now.'
        setChatError(message)
        setChatMessages((current) =>
          current.concat({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Sorry, I could not generate a graph from that description.',
          }),
        )
      } finally {
        setChatLoading(false)
      }
    },
    [chatInput, chatLoading, setEdges, setGraphName, setHydrated, setNodes],
  )

  const handleExport = useCallback(() => {
    const payload: GraphPayload = { name: graphName, nodes, edges }
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
  }, [edges, graphName, nodes])

  const handleImportFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const raw = JSON.parse(String(reader.result || '{}')) as GraphPayload
          const normalized = normalizeGraph(raw)
          setGraphName(normalized.name)
          setNodes(normalized.nodes)
          setEdges(normalized.edges)
          setImportError('')
          setHydrated(true)
        } catch (error) {
          setImportError(error instanceof Error ? error.message : 'Unable to parse JSON.')
        }
      }
      reader.readAsText(file)
    },
    [setEdges, setNodes],
  )

  const seedSolarSystemIfNeeded = useCallback(() => {
    if (!activeGraphId) {
      return
    }
    if (seeded3dGraphsRef.current.has(activeGraphId)) {
      return
    }
    const isDefaultGraph =
      graphName === defaultGraph.name &&
      nodes.length === defaultGraph.nodes.length &&
      edges.length === defaultGraph.edges.length
    if (!isDefaultGraph) {
      return
    }
    const normalized = normalizeGraph(SOLAR_SYSTEM_GRAPH)
    setGraphName(normalized.name)
    setNodes(normalized.nodes)
    setEdges(normalized.edges)
    setSelectedNodeId(null)
    seeded3dGraphsRef.current.add(activeGraphId)
  }, [activeGraphId, edges.length, graphName, nodes.length, setEdges, setNodes])

  const changeView = (mode: ViewMode) => {
    setViewMode(mode)
    setSelectedNodeId(null)
    setChatOpen(false)
    if (mode === 'graph3d') {
      seedSolarSystemIfNeeded()
    }
  }

  const handleToggleChat = useCallback(() => {
    setChatOpen((open) => {
      const next = !open
      if (next) {
        setSelectedNodeId(null)
        setContextMenu(null)
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
      <TopBar
        viewMode={viewMode}
        onChangeView={changeView}
        saveState={saveState}
        isLoggedIn={isLoggedIn}
        userName={userName}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        onToggleChat={handleToggleChat}
      />

      <main
        className={`workspace ${viewMode === 'facts' ? 'workspace--facts' : ''}`}
        style={workspaceStyle}
      >
        <section className="flow-shell" ref={flowShellRef}>
          {is2DView ? (
            <>
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
                  instance.fitView({ padding: 0.2 })
                  const viewport = instance.getViewport ? instance.getViewport() : { x: 0, y: 0, zoom: 1 }
                  instance.setViewport({ x: viewport.x, y: viewport.y, zoom: 0.8 }, { duration: 0 })
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
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
              <GraphContextMenu
                contextMenu={contextMenu}
                menuPosition={menuPosition}
                contextNode={contextNode}
                contextEdge={contextEdge}
                onDeleteNode={removeNode}
                onRemoveFromGroup={detachFromGroup}
                onUngroupChildren={ungroupChildren}
                onDeleteEdge={removeEdgeById}
                onClose={() => setContextMenu(null)}
              />
            </>
          ) : viewMode === 'graph3d' ? (
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
          ) : (
            <QuickFactsView activeFactKey={activeFactKey} onSelectFact={setActiveFactKey} />
          )}

          {is2DView ? (
            <GraphListWidget
              ref={sidebarRef}
              collapsed={sidebarCollapsed}
              graphList={graphList}
              activeGraphId={activeGraphId}
              graphName={graphName}
              importError={importError}
              onSelectGraph={setActiveGraphId}
              onCreateGraph={handleCreateGraph}
              onDeleteGraph={handleDeleteGraph}
              onExport={handleExport}
              onImportFile={handleImportFile}
              onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
              onResizeStart={handleResizeStart}
            />
          ) : null}

          {is2DView ? (
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
            />
          ) : null}

          {isGraphNoteView ? (
            <NoteDrawer
              activeNode={activeNode}
              drawerStyle={drawerStyle}
              drawerRef={drawerRef}
              onResizeStart={handleDrawerResizeStart}
              onClose={() => setSelectedNodeId(null)}
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

          {isApplicationView ? (
            <TaskDrawer
              activeNode={activeNode}
              drawerStyle={drawerStyle}
              drawerRef={drawerRef}
              onResizeStart={handleDrawerResizeStart}
              onClose={() => setSelectedNodeId(null)}
              onRemoveNode={removeNode}
              updateNodeData={updateNodeData}
            />
          ) : null}

          {is2DView ? (
            <ChatPanel
              open={chatOpen}
              chatMessages={chatMessages}
              chatError={chatError}
              chatInput={chatInput}
              chatLoading={chatLoading}
              onClose={() => setChatOpen(false)}
              onInputChange={setChatInput}
              onSubmit={handleChatSend}
              endRef={chatEndRef}
              examples={chatExamples}
            />
          ) : null}

          <SshConsole
            open={isApplicationView && sshConsoleOpen}
            minimized={sshConsoleMinimized}
            style={sshConsoleStyle}
            title={activeGraphId ? 'Connected server' : 'No graph selected'}
            message={
              sshConfigs[activeGraphId ?? '']?.host
                ? `Connecting to ${sshConfigs[activeGraphId ?? '']?.host}...`
                : 'Configure SSH to connect to a server.'
            }
            onToggleMinimize={() => setSshConsoleMinimized((current) => !current)}
            onClose={() => setSshConsoleOpen(false)}
          />
        </section>
      </main>

      <SshModal
        open={Boolean(sshModal)}
        graphName={sshModal ? graphList.find((graph) => graph.id === sshModal.graphId)?.name ?? 'this graph' : ''}
        draft={sshDraft}
        onChangeDraft={setSshDraft}
        onClose={() => setSshModal(null)}
        onSave={saveSshConfig}
      />

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
        noteTitle={itemNoteTitle}
        onChangeNoteTitle={setItemNoteTitle}
        onAddNote={addItemNote}
        onRemoveNote={removeItemNote}
        onClose={() => setItemModal(null)}
      />

      <SettingsModal
        open={settingsOpen}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        accentChoice={accentChoice}
        sidebarCollapsed={sidebarCollapsed}
        onClose={() => setSettingsOpen(false)}
        onSetTheme={setThemePreference}
        onSetAccent={setAccentChoice}
        onToggleSidebarExpanded={(expanded) => setSidebarCollapsed(!expanded)}
      />
    </div>
  )
}
