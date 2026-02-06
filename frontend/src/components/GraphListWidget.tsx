// Collapsible graph list widget with rename, import/export, and resize handle.
import { forwardRef, useRef, type ChangeEvent, type MouseEvent, type KeyboardEvent } from 'react'
import type { GraphSummary } from '../graphTypes'
import { formatUpdatedAt } from '../utils/time'
import { useI18n } from '../i18n'
import type { ViewMode } from '../types/ui'

type GraphListWidgetProps = {
  collapsed: boolean
  viewMode: ViewMode
  showBetaTabs: boolean
  graphList: GraphSummary[]
  activeGraphId: string | null
  graphName: string
  renameValue: string
  isRenaming: boolean
  importError: string
  onRenameChange: (value: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onSubmitRename: () => void
  onChangeView: (mode: ViewMode) => void
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
      viewMode,
      showBetaTabs,
      graphList,
      activeGraphId,
      graphName,
      renameValue,
      isRenaming,
      importError,
      onRenameChange,
      onStartRename,
      onCancelRename,
      onSubmitRename,
      onChangeView,
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
    const { t } = useI18n()
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        onImportFile(file)
      }
      event.target.value = ''
    }

    const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        onSubmitRename()
      }
      if (event.key === 'Escape') {
        onCancelRename()
      }
    }

    return (
      <aside className={`graph-list ${collapsed ? 'graph-list--collapsed' : ''}`} ref={ref}>
        <div className="graph-list__nav">
          <button
            type="button"
            className={`graph-list__nav-btn ${viewMode === 'graph' ? 'is-active' : ''}`}
            onClick={() => onChangeView('graph')}
            title={t('nav.graph')}
          >
            <span className="graph-list__nav-label">{t('nav.graph')}</span>
            <span className="graph-list__nav-short">GN</span>
          </button>
          <button
            type="button"
            className={`graph-list__nav-btn ${viewMode === 'facts' ? 'is-active' : ''}`}
            onClick={() => onChangeView('facts')}
            title={t('nav.facts')}
          >
            <span className="graph-list__nav-label">{t('nav.facts')}</span>
            <span className="graph-list__nav-short">QF</span>
          </button>
          {showBetaTabs ? (
            <>
              <button
                type="button"
                className={`graph-list__nav-btn ${viewMode === 'application' ? 'is-active' : ''}`}
                onClick={() => onChangeView('application')}
                title={t('nav.application')}
              >
                <span className="graph-list__nav-label">{t('nav.application')}</span>
                <span className="graph-list__nav-short">GA</span>
              </button>
              <button
                type="button"
                className={`graph-list__nav-btn ${viewMode === 'graph3d' ? 'is-active' : ''}`}
                onClick={() => onChangeView('graph3d')}
                title={t('nav.graph3d')}
              >
                <span className="graph-list__nav-label">{t('nav.graph3d')}</span>
                <span className="graph-list__nav-short">3D</span>
              </button>
            </>
          ) : null}
        </div>

        <div className="graph-list__widget">
          <div className="graph-list__summary">
            <div className="graph-list__title">{t('graphs.title')}</div>
            <div className="graph-list__subtitle">{t('graphs.savedCount', { count: graphList.length })}</div>
            {isRenaming && !collapsed ? (
              <div className="graph-list__rename">
                <input
                  className="graph-list__input"
                  type="text"
                  value={renameValue}
                  onChange={(event) => onRenameChange(event.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  placeholder={t('graphs.graphNamePlaceholder')}
                  autoFocus
                />
                <div className="graph-list__rename-actions">
                  <button className="btn btn--ghost" type="button" onClick={onSubmitRename}>
                    {t('graphs.save')}
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={onCancelRename}>
                    {t('graphs.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="graph-list__active-row">
                <div className="graph-list__active">
                  {t('graphs.active', { name: graphName || t('graphs.untitled') })}
                </div>
                {!collapsed ? (
                  <button className="icon-btn" type="button" onClick={onStartRename} title={t('graphs.renameTitle')}>
                    ✎
                  </button>
                ) : null}
              </div>
            )}
          </div>
          <div className="graph-list__actions">
            {!collapsed ? (
              <button className="icon-btn" type="button" onClick={onCreateGraph}>
                +
              </button>
            ) : null}
            {!collapsed ? (
              <button className="icon-btn" type="button" onClick={onExport} title={t('graphs.exportTitle')}>
                ⤓
              </button>
            ) : null}
            {!collapsed ? (
              <button
                className="icon-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t('graphs.importTitle')}
              >
                ⤒
              </button>
            ) : null}
            {!collapsed && activeGraphId ? (
              <button
                className="icon-btn graph-list__delete"
                type="button"
                onClick={() => onDeleteGraph(activeGraphId)}
                title={t('graphs.deleteTitle')}
              >
                ×
              </button>
            ) : null}
            <button
              className="icon-btn"
              type="button"
              aria-label={collapsed ? t('graphs.expandAria') : t('graphs.collapseAria')}
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
                <div className="graph-list__empty">{t('graphs.empty')}</div>
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
