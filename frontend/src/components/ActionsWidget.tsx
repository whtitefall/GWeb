// Floating action palette for graph editing (draggable via the label).
import type { CSSProperties, MouseEvent, RefObject } from 'react'

type ActionsWidgetProps = {
  style: CSSProperties
  toolbarRef: RefObject<HTMLDivElement | null>
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void
  onAddNode: () => void
  onAddGroup: () => void
  onGroupSelected: () => void
  onDeleteSelected: () => void
  canGroup: boolean
  canDelete: boolean
  isGraphNoteView: boolean
}

export default function ActionsWidget({
  style,
  toolbarRef,
  onDragStart,
  onAddNode,
  onAddGroup,
  onGroupSelected,
  onDeleteSelected,
  canGroup,
  canDelete,
  isGraphNoteView,
}: ActionsWidgetProps) {
  return (
    <div className="toolbar" style={style} ref={toolbarRef}>
      <div className="toolbar__label" onMouseDown={onDragStart}>
        Actions
      </div>
      <button className="btn btn--primary" type="button" onClick={onAddNode}>
        Add Node
      </button>
      <button className="btn btn--ghost" type="button" onClick={onAddGroup}>
        Add Group
      </button>
      <button className="btn btn--ghost" type="button" onClick={onGroupSelected} disabled={!canGroup}>
        Group Selected
      </button>
      {isGraphNoteView ? (
        <button className="btn btn--danger" type="button" onClick={onDeleteSelected} disabled={!canDelete}>
          Delete Selected
        </button>
      ) : null}
    </div>
  )
}
