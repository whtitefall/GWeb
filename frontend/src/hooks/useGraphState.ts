// Convenience hook to keep React Flow node/edge state co-located.
import { useEdgesState, useNodesState } from 'reactflow'
import type { NodeData } from '../graphTypes'

export const useGraphState = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  return { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange }
}
