import type { CSSProperties, MouseEvent, RefObject } from 'react'
import type { GraphNode, NodeData } from '../graphTypes'
import { coerceNumber } from '../utils/graph'

type TaskDrawerProps = {
  activeNode: GraphNode | null
  drawerStyle: CSSProperties
  drawerRef: RefObject<HTMLElement | null>
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void
  onClose: () => void
  onRemoveNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, updater: (data: NodeData) => NodeData) => void
}

export default function TaskDrawer({
  activeNode,
  drawerStyle,
  drawerRef,
  onResizeStart,
  onClose,
  onRemoveNode,
  updateNodeData,
}: TaskDrawerProps) {
  return (
    <aside
      className={`drawer ${activeNode ? 'drawer--open' : ''}`}
      aria-hidden={!activeNode}
      ref={drawerRef}
      style={drawerStyle}
    >
      {activeNode ? (
        <>
          <div className="drawer__resizer" onMouseDown={onResizeStart} />
          <div className="drawer__content">
            <div className="drawer__header">
              <div>
                <div className="drawer__eyebrow">Task Settings</div>
                <h2>{activeNode.data.label}</h2>
              </div>
              <div className="drawer__actions">
                <button className="btn btn--ghost" type="button" onClick={onClose}>
                  Close
                </button>
                <button className="btn btn--danger" type="button" onClick={() => onRemoveNode(activeNode.id)}>
                  Remove
                </button>
              </div>
            </div>

            <label className="field">
              <span>Task Name</span>
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

            <label className="field">
              <span>Upload Script</span>
              <input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  updateNodeData(activeNode.id, (data) => ({
                    ...data,
                    scriptName: file.name,
                    progress: 0,
                  }))
                }}
              />
            </label>
            {activeNode.data.scriptName ? (
              <div className="script-meta">Selected: {activeNode.data.scriptName}</div>
            ) : null}

            <label className="field">
              <span>Progress</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.min(100, Math.max(0, coerceNumber(activeNode.data.progress, 0)))}
                onChange={(event) =>
                  updateNodeData(activeNode.id, (data) => ({
                    ...data,
                    progress: Number(event.target.value),
                  }))
                }
              />
            </label>

            <button
              className="btn btn--primary"
              type="button"
              onClick={() =>
                updateNodeData(activeNode.id, (data) => ({
                  ...data,
                  progress: 100,
                }))
              }
            >
              Upload Script
            </button>
            <p className="drawer__hint">
              Script upload will be wired to the SSH tunnel in a future backend step.
            </p>
          </div>
        </>
      ) : null}
    </aside>
  )
}
