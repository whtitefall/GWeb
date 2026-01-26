import type { Edge, Node } from 'reactflow'

export type Note = {
  id: string
  title: string
}

export type NodeData = {
  label: string
  notes: Note[]
}

export type GraphNode = Node<NodeData>

export type GraphPayload = {
  nodes: GraphNode[]
  edges: Edge[]
}
