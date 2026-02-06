// Right-side drawer for editing a node's title, items, and notes.
import type { CSSProperties, MouseEvent, RefObject } from 'react'
import type { GraphNode } from '../graphTypes'
import { useI18n } from '../i18n'

type NoteDrawerProps = {
  activeNode: GraphNode | null
  drawerStyle: CSSProperties
  drawerRef: RefObject<HTMLElement | null>
  readOnly?: boolean
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void
  onClose: () => void
  onRemoveNode: (nodeId: string) => void
  onDetachFromGroup: (nodeId: string) => void
  onUpdateLabel: (nodeId: string, value: string) => void
  itemTitle: string
  onItemTitleChange: (value: string) => void
  onAddItem: (nodeId: string, title: string) => void
  onRemoveItem: (nodeId: string, itemId: string) => void
  onOpenItemModal: (nodeId: string, itemId: string) => void
}

export default function NoteDrawer({
  activeNode,
  drawerStyle,
  drawerRef,
  readOnly = false,
  onResizeStart,
  onClose,
  onRemoveNode,
  onDetachFromGroup,
  onUpdateLabel,
  itemTitle,
  onItemTitleChange,
  onAddItem,
  onRemoveItem,
  onOpenItemModal,
}: NoteDrawerProps) {
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
                <div className="drawer__eyebrow">
                  {readOnly ? t('drawer.nodeDetails') : t('drawer.nodeSettings')}
                </div>
                <h2>{activeNode.data.label}</h2>
              </div>
              <div className="drawer__actions">
                <button className="btn btn--ghost" type="button" onClick={onClose}>
                  {t('drawer.close')}
                </button>
                {!readOnly && activeNode.parentNode ? (
                  <button className="btn btn--ghost" type="button" onClick={() => onDetachFromGroup(activeNode.id)}>
                    {t('drawer.removeFromGroup')}
                  </button>
                ) : null}
                {!readOnly ? (
                  <button className="btn btn--danger" type="button" onClick={() => onRemoveNode(activeNode.id)}>
                    {t('drawer.remove')}
                  </button>
                ) : null}
              </div>
            </div>

            <label className="field">
              <span>{t('drawer.title')}</span>
              <input
                type="text"
                value={activeNode.data.label}
                onChange={(event) => onUpdateLabel(activeNode.id, event.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>

            <div className="items">
              <div className="items__header">
                <h3>{t('drawer.items')}</h3>
                <span>{t('drawer.itemsCount', { count: activeNode.data.items.length })}</span>
              </div>
              <ul className="items__list">
                {activeNode.data.items.map((item) => (
                  <li key={item.id} className="items__item">
                    <button
                      className="items__button"
                      type="button"
                      onClick={() => onOpenItemModal(activeNode.id, item.id)}
                    >
                      <span>{item.title}</span>
                      <span className="items__meta">{t('drawer.notesCount', { count: item.notes.length })}</span>
                    </button>
                    {!readOnly ? (
                      <button className="items__remove" type="button" onClick={() => onRemoveItem(activeNode.id, item.id)}>
                        {t('drawer.remove')}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!readOnly ? (
                <form
                  className="items__form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    onAddItem(activeNode.id, itemTitle)
                    onItemTitleChange('')
                  }}
                >
                  <input
                    type="text"
                    placeholder={t('drawer.addItemPlaceholder')}
                    value={itemTitle}
                    onChange={(event) => onItemTitleChange(event.target.value)}
                  />
                  <button className="btn btn--primary" type="submit">
                    {t('drawer.addItem')}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </aside>
  )
}
