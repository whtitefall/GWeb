// Context menu shown on right-click for nodes/edges.
import type { GraphEdge, GraphNode } from '../graphTypes'
import { useI18n } from '../i18n'

export type ContextMenuState =
  | { kind: 'node'; id: string; x: number; y: number }
  | { kind: 'edge'; id: string; x: number; y: number }
  | null

type GraphContextMenuProps = {
  contextMenu: ContextMenuState
  menuPosition: { x: number; y: number } | null
  contextNode: GraphNode | null
  contextEdge: GraphEdge | null
  contextEdgeDirected: boolean
  onDeleteNode: (id: string) => void
  onRemoveFromGroup: (id: string) => void
  onUngroupChildren: (id: string) => void
  onVisualizeNodeGraph: (id: string) => void
  onToggleEdgeDirection: (id: string) => void
  onDeleteEdge: (id: string) => void
  onClose: () => void
}

export default function GraphContextMenu({
  contextMenu,
  menuPosition,
  contextNode,
  contextEdge,
  contextEdgeDirected,
  onDeleteNode,
  onRemoveFromGroup,
  onUngroupChildren,
  onVisualizeNodeGraph,
  onToggleEdgeDirection,
  onDeleteEdge,
  onClose,
}: GraphContextMenuProps) {
  const { t } = useI18n()
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
            {t('context.deleteNode')}
          </button>
          {contextNode.parentNode ? (
            <button
              type="button"
              onClick={() => {
                onRemoveFromGroup(contextNode.id)
                onClose()
              }}
              >
                {t('context.removeFromGroup')}
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
                {t('context.ungroupChildren')}
              </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onVisualizeNodeGraph(contextNode.id)
              onClose()
            }}
          >
            {t('context.visualizeNodeGraph')}
          </button>
        </>
      ) : null}
      {contextMenu.kind === 'edge' && contextEdge ? (
        <>
          <button
            type="button"
            onClick={() => {
              onToggleEdgeDirection(contextEdge.id)
              onClose()
            }}
          >
            {contextEdgeDirected ? t('context.makeUndirected') : t('context.makeDirected')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDeleteEdge(contextEdge.id)
              onClose()
            }}
          >
            {t('context.deleteEdge')}
          </button>
        </>
      ) : null}
    </div>
  )
}
