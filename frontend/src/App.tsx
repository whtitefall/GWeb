import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'
import { fetchGraph, saveGraph } from './api'
import type { GraphNode, GraphPayload, NodeData, Note } from './graphTypes'

const STORAGE_KEY = 'gweb.graph.v1'

const defaultGraph: GraphPayload = {
  nodes: [
    {
      id: 'node-1',
      type: 'default',
      position: { x: 120, y: 120 },
      data: {
        label: 'Launch Plan',
        notes: [
          { id: 'note-1', title: 'Finalize visual theme' },
          { id: 'note-2', title: 'Prep demo flow' },
        ],
      },
    },
    {
      id: 'node-2',
      type: 'default',
      position: { x: 520, y: 180 },
      data: {
        label: 'User Research',
        notes: [{ id: 'note-3', title: 'Schedule 3 interviews' }],
      },
    },
    {
      id: 'node-3',
      type: 'default',
      position: { x: 320, y: 380 },
      data: {
        label: 'Prototype Sprint',
        notes: [
          { id: 'note-4', title: 'Map interactions' },
          { id: 'note-5', title: 'Storyboard flow' },
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

const normalizeGraph = (payload: GraphPayload | null): GraphPayload => {
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    return defaultGraph
  }

  const nodes = (payload.nodes as GraphNode[]).map((node, index) => {
    const rawData = (node as GraphNode).data ?? { label: `Node ${index + 1}`, notes: [] }
    const label =
      typeof rawData.label === 'string' && rawData.label.trim().length > 0
        ? rawData.label
        : `Node ${index + 1}`

    return {
      ...node,
      type: node.type ?? 'default',
      position: node.position ?? { x: 0, y: 0 },
      data: {
        label,
        notes: ensureNotes(rawData.notes),
      },
    }
  })

  const edges = (payload.edges as Edge[]).map((edge, index) => ({
    ...edge,
    id: edge.id ?? `edge-${index}`,
    type: edge.type ?? 'smoothstep',
  }))

  return { nodes, edges }
}

const useGraphState = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  return { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange }
}

const statusLabels = {
  idle: 'Idle',
  saving: 'Saving...',
  saved: 'Synced',
  offline: 'Local only',
} as const

export default function App() {
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange } = useGraphState()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [saveState, setSaveState] = useState<keyof typeof statusLabels>('idle')
  const [hydrated, setHydrated] = useState(false)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const spawnIndex = useRef(0)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const payload = await fetchGraph()
        if (!isMounted) return
        const normalized = normalizeGraph(payload)
        setNodes(normalized.nodes)
        setEdges(normalized.edges)
        setSaveState('saved')
      } catch (_error) {
        const local = localStorage.getItem(STORAGE_KEY)
        if (local) {
          try {
            const parsed = JSON.parse(local) as GraphPayload
            const normalized = normalizeGraph(parsed)
            setNodes(normalized.nodes)
            setEdges(normalized.edges)
          } catch (_parseError) {
            setNodes(defaultGraph.nodes)
            setEdges(defaultGraph.edges)
          }
        } else {
          setNodes(defaultGraph.nodes)
          setEdges(defaultGraph.edges)
        }
        setSaveState('offline')
      } finally {
        if (isMounted) {
          setHydrated(true)
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [setNodes, setEdges])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const payload: GraphPayload = { nodes, edges }
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      saveGraph(payload)
        .then(() => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
          setSaveState('saved')
        })
        .catch(() => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
          setSaveState('offline')
        })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [nodes, edges, hydrated])

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

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
      setEdges((current) =>
        current.filter(
          (edge) =>
            !deleted.some((node) => node.id === edge.source || node.id === edge.target),
        ),
      )
    },
    [setEdges],
  )

  const updateNodeData = useCallback(
    (nodeId: string, updater: (data: NodeData) => NodeData) => {
      setNodes((current) =>
        current.map((node) => (node.id === nodeId ? { ...node, data: updater(node.data) } : node)),
      )
    },
    [setNodes],
  )

  const addNote = useCallback(
    (nodeId: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return

      updateNodeData(nodeId, (data) => ({
        ...data,
        notes: [...data.notes, { id: crypto.randomUUID(), title: trimmed }],
      }))
    },
    [updateNodeData],
  )

  const removeNote = useCallback(
    (nodeId: string, noteId: string) => {
      updateNodeData(nodeId, (data) => ({
        ...data,
        notes: data.notes.filter((note) => note.id !== noteId),
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
        notes: [],
      },
    }

    setNodes((current) => current.concat(newNode))
    setSelectedNodeId(id)
  }, [setNodes])

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((current) => current.filter((node) => node.id !== nodeId))
      setEdges((current) =>
        current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      )
      setSelectedNodeId(null)
    },
    [setEdges, setNodes],
  )

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    const selectedEdgeIds = new Set(edges.filter((edge) => edge.selected).map((edge) => edge.id))

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) {
      return
    }

    setNodes((current) => current.filter((node) => !selectedNodeIds.has(node.id)))
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

  const selectionCount =
    nodes.filter((node) => node.selected).length + edges.filter((edge) => edge.selected).length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" />
          <div>
            <div className="brand__title">Graph Workshop</div>
            <div className="brand__subtitle">Shape ideas into connected stories.</div>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--primary" type="button" onClick={addNode}>
            Add Node
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={deleteSelected}
            disabled={selectionCount === 0}
          >
            Delete Selected
          </button>
        </div>
        <div className={`status status--${saveState}`}>
          <span className="status__dot" />
          <span>{statusLabels[saveState]}</span>
          <span className="status__meta">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
      </header>

      <main className="workspace">
        <section className="flow-shell">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onConnect={onConnect}
            onInit={(instance) => {
              reactFlowInstance.current = instance
            }}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'var(--ink)',
              },
            }}
          >
            <Background color="rgba(27, 43, 47, 0.12)" gap={24} size={1} />
            <Controls position="bottom-right" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => (node.selected ? '#ff784e' : '#f6d9c2')}
              maskColor="rgba(246, 241, 233, 0.6)"
              position="bottom-left"
            />
          </ReactFlow>
          <div className="hint-card">
            <h3>Quick Moves</h3>
            <p>Drag nodes, connect with handles, and press Delete to remove selections.</p>
          </div>
        </section>

        <aside className={`drawer ${activeNode ? 'drawer--open' : ''}`}>
          {activeNode ? (
            <div className="drawer__content">
              <div className="drawer__header">
                <div>
                  <div className="drawer__eyebrow">Node Settings</div>
                  <h2>{activeNode.data.label}</h2>
                </div>
                <button className="btn btn--ghost" type="button" onClick={() => removeNode(activeNode.id)}>
                  Remove Node
                </button>
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

              <div className="notes">
                <div className="notes__header">
                  <h3>Notes</h3>
                  <span>{activeNode.data.notes.length} items</span>
                </div>
                <ul className="notes__list">
                  {activeNode.data.notes.map((note) => (
                    <li key={note.id} className="notes__item">
                      <span>{note.title}</span>
                      <button
                        className="notes__remove"
                        type="button"
                        onClick={() => removeNote(activeNode.id, note.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="notes__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!activeNode) return
                    addNote(activeNode.id, noteTitle)
                    setNoteTitle('')
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add a note title..."
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                  />
                  <button className="btn btn--primary" type="submit">
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="drawer__empty">
              <h3>Select a node</h3>
              <p>Tap any node to rename it and add notes on the right.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
