// Shared graph data types used throughout the frontend (and mirrored in the backend payloads).
import type { Edge, Node } from 'reactflow'

export type Note = {
  id: string
  title: string
}

export type Item = {
  id: string
  title: string
  notes: Note[]
  children: Item[]
}

export type NodeData = {
  label: string
  items: Item[]
  nodeNotes?: string
  position3d?: {
    x: number
    y: number
    z: number
  }
  progress?: number
  scriptName?: string
}

export type GraphNode = Node<NodeData>
export type EdgeData = {
  directed?: boolean
}
export type GraphEdge = Edge<EdgeData>

// Graph "applications" share a common payload shape but are kept separate by kind.
export type GraphKind = 'note' | 'application' | 'graph3d'

export type GraphPayload = {
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  kind?: GraphKind
}

export type GraphSummary = {
  id: string
  name: string
  updatedAt: string
}
