// Collapsible graph list widget with per-graph action menu, import/export, and resize handle.
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { GraphSummary } from '../graphTypes'
import { formatUpdatedAt } from '../utils/time'
import { useI18n } from '../i18n'
import type { ViewMode } from '../types/ui'

type GraphListWidgetProps = {
  userName: string
  collapsed: boolean
  viewMode: ViewMode
  showBetaTabs: boolean
  graphList: GraphSummary[]
  activeGraphId: string | null
  graphName: string
  renameTargetGraphId: string | null
  renameValue: string
  isRenaming: boolean
  importError: string
  onRenameChange: (value: string) => void
  onStartRenameGraph: (graphId: string, graphName: string) => void
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
      userName,
      collapsed,
      viewMode,
      showBetaTabs,
      graphList,
      activeGraphId,
      graphName,
      renameTargetGraphId,
      renameValue,
      isRenaming,
      importError,
      onRenameChange,
      onStartRenameGraph,
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
    const menuRef = useRef<HTMLDivElement | null>(null)
    const [openGraphMenuId, setOpenGraphMenuId] = useState<string | null>(null)

    useEffect(() => {
      if (!openGraphMenuId) {
        return
      }
      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target
        if (!(target instanceof Node)) {
          return
        }
        if (!menuRef.current?.contains(target)) {
          setOpenGraphMenuId(null)
        }
      }
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpenGraphMenuId(null)
        }
      }
      window.addEventListener('pointerdown', handlePointerDown)
      window.addEventListener('keydown', handleEsc)
      return () => {
        window.removeEventListener('pointerdown', handlePointerDown)
        window.removeEventListener('keydown', handleEsc)
      }
    }, [openGraphMenuId])

    const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        onImportFile(file)
      }
      event.target.value = ''
    }

    const handleRenameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        onSubmitRename()
      }
      if (event.key === 'Escape') {
        onCancelRename()
      }
    }

    return (
      <aside className={`graph-list ${collapsed ? 'graph-list--collapsed' : ''}`} ref={ref}>
        <div className="graph-list__head">
          <div className="graph-list__identity">
            <div className="graph-list__identity-mark">{(userName || 'G').slice(0, 1).toUpperCase()}</div>
            {!collapsed ? (
              <div className="graph-list__identity-copy">
                <div className="graph-list__identity-title">{userName || 'Graph User'}</div>
              </div>
            ) : null}
          </div>
          <div className="graph-list__head-actions">
            <button className="icon-btn" type="button" title={t('graphs.newGraphPrefix')} onClick={onCreateGraph}>
              +
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label={collapsed ? t('graphs.expandAria') : t('graphs.collapseAria')}
              onClick={onToggleCollapse}
            >
              {collapsed ? '»' : '«'}
            </button>
          </div>
        </div>

        {showBetaTabs ? (
          <div className="graph-list__nav">
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
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          className="graph-list__file"
          type="file"
          accept="application/json"
          onChange={handleImportChange}
        />

        {!collapsed ? (
          <>
            <div className="graph-list__summary">
              <div className="graph-list__title">{t('graphs.title')}</div>
              <div className="graph-list__subtitle">{t('graphs.savedCount', { count: graphList.length })}</div>
            </div>

            <div className="graph-list__items">
              {graphList.length === 0 ? (
                <div className="graph-list__empty">{t('graphs.empty')}</div>
              ) : (
                graphList.map((graph) => (
                  <div key={graph.id} className={`graph-list__item ${graph.id === activeGraphId ? 'is-active' : ''}`}>
                    {isRenaming && renameTargetGraphId === graph.id ? (
                      <div className="graph-list__item-edit">
                        <input
                          className="graph-list__input"
                          type="text"
                          value={renameValue}
                          onChange={(event) => onRenameChange(event.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          placeholder={t('graphs.graphNamePlaceholder')}
                          autoFocus
                        />
                        <div className="graph-list__item-edit-actions">
                          <button className="btn btn--ghost" type="button" onClick={onSubmitRename}>
                            {t('graphs.save')}
                          </button>
                          <button className="btn btn--ghost" type="button" onClick={onCancelRename}>
                            {t('graphs.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="graph-list__item-main"
                          onClick={() => {
                            onSelectGraph(graph.id)
                            setOpenGraphMenuId(null)
                          }}
                        >
                          <div className="graph-list__name">{graph.name}</div>
                          <div className="graph-list__meta">{formatUpdatedAt(graph.updatedAt)}</div>
                        </button>
                        <div className="graph-list__item-menu-wrap" ref={openGraphMenuId === graph.id ? menuRef : null}>
                          <button
                            className="icon-btn graph-list__item-menu-btn"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenGraphMenuId((current) => (current === graph.id ? null : graph.id))
                            }}
                          >
                            ⋯
                          </button>
                          {openGraphMenuId === graph.id ? (
                            <div className="graph-list__item-menu">
                              <button
                                type="button"
                                onClick={() => {
                                  onStartRenameGraph(graph.id, graph.name)
                                  setOpenGraphMenuId(null)
                                }}
                              >
                                {t('graphs.renameTitle')}
                              </button>
                              <button
                                type="button"
                                className="graph-list__item-menu-danger"
                                onClick={() => {
                                  onDeleteGraph(graph.id)
                                  setOpenGraphMenuId(null)
                                }}
                              >
                                {t('graphs.deleteTitle')}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="graph-list__footer">
              <div className="graph-list__subtitle">{t('graphs.active', { name: graphName || t('graphs.untitled') })}</div>
              <div className="graph-list__footer-actions">
                <button className="btn btn--ghost graph-list__footer-btn" type="button" onClick={onExport}>
                  {t('graphs.exportTitle')}
                </button>
                <button
                  className="btn btn--ghost graph-list__footer-btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('graphs.importTitle')}
                </button>
              </div>
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
