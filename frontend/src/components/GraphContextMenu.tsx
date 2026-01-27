import type { Edge } from 'reactflow'
import type { GraphNode } from '../graphTypes'

export type ContextMenuState =
  | { kind: 'node'; id: string; x: number; y: number }
  | { kind: 'edge'; id: string; x: number; y: number }
  | null

type GraphContextMenuProps = {
  contextMenu: ContextMenuState
  menuPosition: { x: number; y: number } | null
  contextNode: GraphNode | null
  contextEdge: Edge | null
  onDeleteNode: (id: string) => void
  onRemoveFromGroup: (id: string) => void
  onUngroupChildren: (id: string) => void
  onDeleteEdge: (id: string) => void
  onClose: () => void
}

export default function GraphContextMenu({
  contextMenu,
  menuPosition,
  contextNode,
  contextEdge,
  onDeleteNode,
  onRemoveFromGroup,
  onUngroupChildren,
  onDeleteEdge,
  onClose,
}: GraphContextMenuProps) {
  if (!contextMenu || !menuPosition) {
    return null
  }

  return (
    <div
      className="context-menu"
      style={{ top: menuPosition.y, left: menuPosition.x }}
      onClick={(event) => event.stopPropagation()}
    >
      {contextMenu.kind === 'node' && contextNode ? (
        <>
          <button
            type="button"
            onClick={() => {
              onDeleteNode(contextNode.id)
              onClose()
            }}
          >
            Delete Node
          </button>
          {contextNode.parentNode ? (
            <button
              type="button"
              onClick={() => {
                onRemoveFromGroup(contextNode.id)
                onClose()
              }}
            >
              Remove from Group
            </button>
          ) : null}
          {contextNode.type === 'group' ? (
            <button
              type="button"
              onClick={() => {
                onUngroupChildren(contextNode.id)
                onClose()
              }}
            >
              Ungroup Children
            </button>
          ) : null}
        </>
      ) : null}
      {contextMenu.kind === 'edge' && contextEdge ? (
        <button
          type="button"
          onClick={() => {
            onDeleteEdge(contextEdge.id)
            onClose()
          }}
        >
          Delete Edge
        </button>
      ) : null}
    </div>
  )
}
