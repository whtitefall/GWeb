// Custom React Flow node renderers.
import { Handle, Position, type NodeProps } from 'reactflow'
import type { NodeData } from '../graphTypes'
import { coerceNumber } from '../utils/graph'

export function GroupNode({ data, selected }: NodeProps<NodeData>) {
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

// Reserved for graph-application tasks (not wired into Graph Notes by default).
export function TaskNode({ data, selected }: NodeProps<NodeData>) {
  const progress = Math.min(100, Math.max(0, coerceNumber(data.progress, 0)))
  return (
    <div className={`task-node ${selected ? 'task-node--selected' : ''}`}>
      <div className="task-node__title">{data.label}</div>
      <div className="task-node__progress">
        <div className="task-node__progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="task-node__meta">{Math.round(progress)}%</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export function NoteNode({ data }: NodeProps<NodeData>) {
  return (
    <>
      <div>{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  )
}
