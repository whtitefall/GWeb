// Right-side drawer for editing a node's title, items, and notes.
import { useEffect, useState, type CSSProperties, type MouseEvent, type RefObject } from 'react'
import type { GraphNode, Item } from '../graphTypes'
import { useI18n } from '../i18n'

type NoteDrawerProps = {
  activeNode: GraphNode | null
  drawerStyle: CSSProperties
  drawerRef: RefObject<HTMLElement | null>
  readOnly?: boolean
  docked?: boolean
  showResizer?: boolean
  showHeightResizer?: boolean
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void
  onResizeHeightStart?: (event: MouseEvent<HTMLDivElement>) => void
  onClose: () => void
  onDetachFromGroup: (nodeId: string) => void
  onUpdateLabel: (nodeId: string, value: string) => void
  itemTitle: string
  onItemTitleChange: (value: string) => void
  onAddItem: (nodeId: string, title: string) => void
  onRemoveItem: (nodeId: string, itemId: string) => void
  onMoveItemIntoItem: (nodeId: string, itemId: string, targetItemId: string) => void
  onOpenItemModal: (nodeId: string, itemId: string) => void
}

export default function NoteDrawer({
  activeNode,
  drawerStyle,
  drawerRef,
  readOnly = false,
  docked = false,
  showResizer = true,
  showHeightResizer = false,
  onResizeStart,
  onResizeHeightStart,
  onClose,
  onDetachFromGroup,
  onUpdateLabel,
  itemTitle,
  onItemTitleChange,
  onAddItem,
  onRemoveItem,
  onMoveItemIntoItem,
  onOpenItemModal,
}: NoteDrawerProps) {
  const { t } = useI18n()
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set())
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)

  useEffect(() => {
    setExpandedItemIds(new Set())
    setDraggingItemId(null)
  }, [activeNode?.id])

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItemIds((current) => {
      const next = new Set(current)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleDropItem = (nodeId: string, targetItemId: string) => {
    if (!draggingItemId || draggingItemId === targetItemId) {
      setDraggingItemId(null)
      return
    }
    onMoveItemIntoItem(nodeId, draggingItemId, targetItemId)
    setExpandedItemIds((current) => new Set(current).add(targetItemId))
    setDraggingItemId(null)
  }

  const renderItemTree = (nodeId: string, item: Item, depth: number) => {
    const hasChildren = (item.children ?? []).length > 0
    const isExpanded = expandedItemIds.has(item.id)
    return (
      <li key={item.id} className={`items__tree-node items__tree-node--depth-${Math.min(depth, 6)}`}>
        <div
          className={`items__item ${draggingItemId === item.id ? 'is-dragging' : ''}`}
          style={{ marginLeft: `${depth * 14}px` }}
          draggable={!readOnly}
          onDragStart={() => setDraggingItemId(item.id)}
          onDragEnd={() => setDraggingItemId(null)}
          onDragOver={(event) => {
            if (readOnly) {
              return
            }
            event.preventDefault()
          }}
          onDrop={(event) => {
            event.preventDefault()
            if (readOnly) {
              return
            }
            handleDropItem(nodeId, item.id)
          }}
        >
          <button
            className={`items__expand ${hasChildren ? '' : 'is-leaf'}`}
            type="button"
            onClick={() => toggleItemExpanded(item.id)}
            title={hasChildren ? t('drawer.toggleChildren') : t('drawer.noSubitems')}
          >
            {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
          </button>
          <button className="items__button" type="button" onClick={() => toggleItemExpanded(item.id)}>
            <span>{item.title}</span>
            <span className="items__meta">{t('drawer.notesCount', { count: item.notes.length })}</span>
          </button>
          <div className="items__actions">
            <button className="items__open" type="button" onClick={() => onOpenItemModal(nodeId, item.id)}>
              {t('drawer.openItem')}
            </button>
            {!readOnly ? (
              <button className="items__remove" type="button" onClick={() => onRemoveItem(nodeId, item.id)}>
                {t('drawer.remove')}
              </button>
            ) : null}
          </div>
        </div>
        {hasChildren && isExpanded ? (
          <ul className="items__tree">
            {item.children.map((child) => renderItemTree(nodeId, child, depth + 1))}
          </ul>
        ) : null}
      </li>
    )
  }

  return (
    <aside
      className={`drawer ${activeNode ? 'drawer--open' : ''} ${
        docked ? 'drawer--dock drawer--dock-right' : 'drawer--panel'
      }`}
      aria-hidden={!activeNode}
      ref={drawerRef}
      style={drawerStyle}
    >
      {activeNode ? (
        <>
          {showResizer ? <div className="drawer__resizer" onMouseDown={onResizeStart} /> : null}
          {showHeightResizer && onResizeHeightStart ? (
            <div className="drawer__resizer-y" onMouseDown={onResizeHeightStart} />
          ) : null}
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
                  {t('drawer.minimize')}
                </button>
                {!readOnly && activeNode.parentNode ? (
                  <button className="btn btn--ghost" type="button" onClick={() => onDetachFromGroup(activeNode.id)}>
                    {t('drawer.removeFromGroup')}
                  </button>
                ) : null}
                <button className="btn btn--ghost" type="button" onClick={onClose}>
                  {t('drawer.close')}
                </button>
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
              <ul className="items__list items__tree">
                {activeNode.data.items.map((item) => renderItemTree(activeNode.id, item, 0))}
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
