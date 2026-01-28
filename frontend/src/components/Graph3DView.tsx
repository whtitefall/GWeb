// 3D graph view (beta / future feature). Not wired into the main UI by default.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { AxesHelper } from 'three'
import type { Edge } from 'reactflow'
import type { GraphNode } from '../graphTypes'
import { resolvePosition3d } from '../utils/graph'
import { isValidColor } from '../utils/theme'
import { generateId } from '../utils/id'

type Graph3DViewProps = {
  nodes: GraphNode[]
  edges: Edge[]
  setNodes: Dispatch<SetStateAction<GraphNode[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  toolbarStyle: CSSProperties
  toolbarRef: RefObject<HTMLDivElement | null>
  onToolbarDragStart: (event: MouseEvent<HTMLDivElement>) => void
  accentSeed: string
}

// Minimal pointer shape used for shift-click multi-select.
type PointerEventLike = {
  shiftKey?: boolean
}

export default function Graph3DView({
  nodes,
  edges,
  setNodes,
  setEdges,
  toolbarStyle,
  toolbarRef,
  onToolbarDragStart,
  accentSeed,
}: Graph3DViewProps) {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setNodes((current) => {
      let changed = false
      const updated = current.map((node, index) => {
        const existing = node.data.position3d
        if (
          existing &&
          Number.isFinite(existing.x) &&
          Number.isFinite(existing.y) &&
          Number.isFinite(existing.z)
        ) {
          return node
        }
        changed = true
        return {
          ...node,
          data: {
            ...node.data,
            position3d: resolvePosition3d(node.data.position3d, node.position ?? { x: 0, y: 0 }, index),
          },
        }
      })
      return changed ? updated : current
    })
  }, [setNodes, nodes.length])

  useEffect(() => {
    const instance = graphRef.current
    if (!instance?.scene) {
      return
    }
    const scene = instance.scene()
    const axes = new AxesHelper(120)
    axes.name = 'axes-helper'
    scene.add(axes)
    return () => {
      scene.remove(axes)
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setViewport({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      })
    }

    updateSize()
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map((node, index) => {
        const pos = resolvePosition3d(node.data.position3d, node.position ?? { x: 0, y: 0 }, index)
        return {
          id: node.id,
          name: node.data.label,
          type: node.type,
          x: pos.x,
          y: pos.y,
          z: pos.z,
        }
      }),
      links: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    }
  }, [nodes, edges])

  const colors = useMemo(() => {
    const fallback = {
      node: '#2d3f9b',
      accent: '#5b7cfa',
      edge: '#cfd6e4',
    }
    if (typeof window === 'undefined') {
      return fallback
    }
    const styles = getComputedStyle(document.documentElement)
    const nodeColor = styles.getPropertyValue('--node-fill').trim()
    const accentColor = styles.getPropertyValue('--accent').trim()
    const edgeColor = styles.getPropertyValue('--edge').trim()
    return {
      node: isValidColor(nodeColor) ? nodeColor : fallback.node,
      accent: isValidColor(accentColor) ? accentColor : fallback.accent,
      edge: isValidColor(edgeColor) ? edgeColor : fallback.edge,
    }
  }, [accentSeed])

  const handleNodeClick = (node: { id?: string | number }, event?: PointerEventLike) => {
    if (!node?.id) {
      return
    }
    const id = String(node.id)
    setSelectedIds((current) => {
      if (event?.shiftKey) {
        return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
      }
      return [id]
    })
  }

  const handleAddNode = () => {
    const id = generateId()
    const position3d = {
      x: (Math.random() - 0.5) * 240,
      y: (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 200,
    }
    const newNode: GraphNode = {
      id,
      type: 'default',
      position: { x: 200 + nodes.length * 20, y: 200 + nodes.length * 20 },
      data: {
        label: `Node ${nodes.length + 1}`,
        items: [],
        position3d,
        progress: 0,
        scriptName: '',
      },
    }
    setNodes((current) => current.concat(newNode))
    setSelectedIds([id])
  }

  const handleDeleteNode = () => {
    if (selectedIds.length == 0) {
      return
    }
    const selectedSet = new Set(selectedIds)
    setNodes((current) => current.filter((node) => !selectedSet.has(node.id)))
    setEdges((current) =>
      current.filter((edge) => !selectedSet.has(edge.source) && !selectedSet.has(edge.target)),
    )
    setSelectedIds([])
  }

  const handleConnectNodes = () => {
    if (selectedIds.length < 2) {
      return
    }
    const [source, target] = selectedIds
    const exists = edges.some(
      (edge) =>
        (edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source),
    )
    if (exists) {
      return
    }
    setEdges((current) =>
      current.concat({
        id: generateId(),
        source,
        target,
        type: 'smoothstep',
      }),
    )
  }

  return (
    <div className="graph-3d" ref={containerRef}>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        width={viewport.width || undefined}
        height={viewport.height || undefined}
        nodeLabel="name"
        nodeColor={(node) => (selectedIds.includes(String(node.id)) ? colors.accent : colors.node)}
        linkColor={() => colors.edge}
        linkOpacity={0.7}
        linkWidth={1.5}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setSelectedIds([])}
      />
      <div className="toolbar toolbar--3d" style={toolbarStyle} ref={toolbarRef}>
        <div className="toolbar__label" onMouseDown={onToolbarDragStart}>
          3D Actions
        </div>
        <button className="btn btn--primary" type="button" onClick={handleAddNode}>
          Add Node
        </button>
        <button
          className="btn btn--danger"
          type="button"
          onClick={handleDeleteNode}
          disabled={selectedIds.length === 0}
        >
          Delete Node
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={handleConnectNodes}
          disabled={selectedIds.length < 2}
        >
          Connect Nodes
        </button>
        <div className="toolbar__hint">{selectedIds.length} selected (shift-click to multi)</div>
      </div>
    </div>
  )
}
