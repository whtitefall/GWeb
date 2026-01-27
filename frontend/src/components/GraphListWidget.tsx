import { forwardRef, useRef, type ChangeEvent, type MouseEvent } from 'react'
import type { GraphSummary } from '../graphTypes'
import { formatUpdatedAt } from '../utils/time'

type GraphListWidgetProps = {
  collapsed: boolean
  graphList: GraphSummary[]
  activeGraphId: string | null
  graphName: string
  importError: string
  onSelectGraph: (id: string) => void
  onCreateGraph: () => void
  onDeleteGraph: (id: string) => void
  onExport: () => void
  onImportFile: (file: File) => void
  onToggleCollapse: () => void
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void
}

const GraphListWidget = forwardRef<HTMLElement, GraphListWidgetProps>(
  (
    {
      collapsed,
      graphList,
      activeGraphId,
      graphName,
      importError,
      onSelectGraph,
      onCreateGraph,
      onDeleteGraph,
      onExport,
      onImportFile,
      onToggleCollapse,
      onResizeStart,
    },
    ref,
  ) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        onImportFile(file)
      }
      event.target.value = ''
    }

    return (
      <aside className={`graph-list ${collapsed ? 'graph-list--collapsed' : ''}`} ref={ref}>
        <div className="graph-list__widget">
          <div className="graph-list__summary">
            <div className="graph-list__title">Your Graphs</div>
            <div className="graph-list__subtitle">{graphList.length} saved</div>
            <div className="graph-list__active">Active: {graphName || 'Untitled'}</div>
          </div>
          <div className="graph-list__actions">
            {!collapsed ? (
              <button className="icon-btn" type="button" onClick={onCreateGraph}>
                +
              </button>
            ) : null}
            {!collapsed ? (
              <button className="icon-btn" type="button" onClick={onExport} title="Export JSON">
                ⤓
              </button>
            ) : null}
            {!collapsed ? (
              <button
                className="icon-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Import JSON"
              >
                ⤒
              </button>
            ) : null}
            {!collapsed && activeGraphId ? (
              <button
                className="icon-btn graph-list__delete"
                type="button"
                onClick={() => onDeleteGraph(activeGraphId)}
                title="Delete graph"
              >
                ×
              </button>
            ) : null}
            <button
              className="icon-btn"
              type="button"
              aria-label={collapsed ? 'Expand graphs panel' : 'Collapse graphs panel'}
              onClick={onToggleCollapse}
            >
              {collapsed ? '>' : '<'}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          className="graph-list__file"
          type="file"
          accept="application/json"
          onChange={handleImportChange}
        />

        {!collapsed ? (
          <>
            <div className="graph-list__items">
              {graphList.length === 0 ? (
                <div className="graph-list__empty">Create your first graph.</div>
              ) : (
                graphList.map((graph) => (
                  <button
                    key={graph.id}
                    type="button"
                    className={`graph-list__item ${graph.id === activeGraphId ? 'is-active' : ''}`}
                    onClick={() => onSelectGraph(graph.id)}
                  >
                    <div className="graph-list__name">{graph.name}</div>
                    <div className="graph-list__meta">{formatUpdatedAt(graph.updatedAt)}</div>
                  </button>
                ))
              )}
            </div>

            <button className="btn btn--primary graph-list__cta" type="button" onClick={onCreateGraph}>
              New Graph
            </button>
            {importError ? <div className="graph-list__error">{importError}</div> : null}
            <div className="graph-list__resizer" onMouseDown={onResizeStart} />
          </>
        ) : null}
      </aside>
    )
  },
)

GraphListWidget.displayName = 'GraphListWidget'

export default GraphListWidget
