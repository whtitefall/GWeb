// Floating action palette for graph editing (draggable via the label).
import type { CSSProperties, MouseEvent, RefObject } from 'react'
import { useI18n } from '../i18n'

type ActionsWidgetProps = {
  style: CSSProperties
  toolbarRef: RefObject<HTMLDivElement | null>
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void
  onMinimize: () => void
  onAddNode: () => void
  onAddGroup: () => void
  onGroupSelected: () => void
  onDeleteSelected: () => void
  canGroup: boolean
  canDelete: boolean
  isGraphNoteView: boolean
  isApplicationView: boolean
  onOpenSsh: () => void
  canOpenSsh: boolean
  onToggleConsole: () => void
  edgeMode: 'undirected' | 'directed'
  onToggleEdgeMode: () => void
}

export default function ActionsWidget({
  style,
  toolbarRef,
  onDragStart,
  onMinimize,
  onAddNode,
  onAddGroup,
  onGroupSelected,
  onDeleteSelected,
  canGroup,
  canDelete,
  isGraphNoteView,
  isApplicationView,
  onOpenSsh,
  canOpenSsh,
  onToggleConsole,
  edgeMode,
  onToggleEdgeMode,
}: ActionsWidgetProps) {
  const { t } = useI18n()
  const edgeModeLabel = edgeMode === 'directed' ? t('actions.modeDirected') : t('actions.modeUndirected')
  return (
    <div className="toolbar" style={style} ref={toolbarRef}>
      <div className="toolbar__header">
        <div className="toolbar__label" onMouseDown={onDragStart}>
          {t('actions.title')}
        </div>
        <button
          className="icon-btn toolbar__minimize"
          type="button"
          onClick={onMinimize}
          title={t('actions.minimize')}
          aria-label={t('actions.minimize')}
        >
          ⌃
        </button>
      </div>
      <button className="btn btn--primary" type="button" onClick={onAddNode}>
        {t('actions.addNode')}
      </button>
      <button className="btn btn--ghost" type="button" onClick={onAddGroup}>
        {t('actions.addGroup')}
      </button>
      <button className="btn btn--ghost" type="button" onClick={onToggleEdgeMode}>
        {t('actions.edgeMode', { mode: edgeModeLabel })}
      </button>
      {isApplicationView ? (
        <button className="btn btn--ghost" type="button" onClick={onOpenSsh} disabled={!canOpenSsh}>
          {t('actions.ssh')}
        </button>
      ) : null}
      <button className="btn btn--ghost" type="button" onClick={onGroupSelected} disabled={!canGroup}>
        {t('actions.groupSelected')}
      </button>
      {isGraphNoteView ? (
        <button className="btn btn--danger" type="button" onClick={onDeleteSelected} disabled={!canDelete}>
          {t('actions.deleteSelected')}
        </button>
      ) : null}
      {isApplicationView ? (
        <button className="btn btn--ghost" type="button" onClick={onToggleConsole}>
          {t('actions.console')}
        </button>
      ) : null}
    </div>
  )
}
