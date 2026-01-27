import type { Edge, Node } from 'reactflow'

export type Note = {
  id: string
  title: string
}

export type Item = {
  id: string
  title: string
  notes: Note[]
}

export type NodeData = {
  label: string
  items: Item[]
  position3d?: {
    x: number
    y: number
    z: number
  }
  progress?: number
  scriptName?: string
}

export type GraphNode = Node<NodeData>

export type GraphKind = 'note' | 'application' | 'graph3d'

export type GraphPayload = {
  name: string
  nodes: GraphNode[]
  edges: Edge[]
  kind?: GraphKind
}

export type GraphSummary = {
  id: string
  name: string
  updatedAt: string
}
