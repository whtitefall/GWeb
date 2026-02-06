// Task drawer for the graph-application beta (script upload + progress).
import type { CSSProperties, MouseEvent, RefObject } from 'react'
import type { GraphNode, NodeData } from '../graphTypes'
import { coerceNumber } from '../utils/graph'
import { useI18n } from '../i18n'

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
  const { t } = useI18n()
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
                <div className="drawer__eyebrow">{t('task.settings')}</div>
                <h2>{activeNode.data.label}</h2>
              </div>
              <div className="drawer__actions">
                <button className="btn btn--ghost" type="button" onClick={onClose}>
                  {t('task.close')}
                </button>
                <button className="btn btn--danger" type="button" onClick={() => onRemoveNode(activeNode.id)}>
                  {t('task.remove')}
                </button>
              </div>
            </div>

            <label className="field">
              <span>{t('task.name')}</span>
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
              <span>{t('task.uploadScript')}</span>
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
              <div className="script-meta">{t('task.selected', { name: activeNode.data.scriptName })}</div>
            ) : null}

            <label className="field">
              <span>{t('task.progress')}</span>
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
              {t('task.uploadButton')}
            </button>
            <p className="drawer__hint">
              {t('task.hint')}
            </p>
          </div>
        </>
      ) : null}
    </aside>
  )
}
