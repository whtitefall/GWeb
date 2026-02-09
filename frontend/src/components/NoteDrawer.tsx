// Right-side drawer for editing a node's title, items, and tips.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'
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
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void
  onResizeHeightStart?: (event: ReactMouseEvent<HTMLDivElement>) => void
  onClose: () => void
  onDetachFromGroup: (nodeId: string) => void
  onUpdateLabel: (nodeId: string, value: string) => void
  onAddItem: (nodeId: string, title: string, parentItemId: string | null) => void
  onRemoveItem: (nodeId: string, itemId: string) => void
  onMoveItemIntoItem: (nodeId: string, itemId: string, targetItemId: string) => void
  onVisualizeItemGraph: (nodeId: string, itemId: string) => void
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
  onAddItem,
  onRemoveItem,
  onMoveItemIntoItem,
  onVisualizeItemGraph,
  onOpenItemModal,
}: NoteDrawerProps) {
  const { t } = useI18n()
  const ITEM_CONTEXT_MENU_WIDTH = 220
  const ITEM_CONTEXT_MENU_HEIGHT = 64
  const ITEM_CONTEXT_MENU_PADDING = 8
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set())
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false)
  const [createItemTitle, setCreateItemTitle] = useState('')
  const [createItemParentId, setCreateItemParentId] = useState('')
  const [itemActionMenu, setItemActionMenu] = useState<{ nodeId: string; itemId: string } | null>(null)
  const [itemContextMenu, setItemContextMenu] = useState<{
    nodeId: string
    itemId: string
    x: number
    y: number
  } | null>(null)
  const itemActionMenuRef = useRef<HTMLDivElement | null>(null)
  const itemContextMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setExpandedItemIds(new Set())
    setDraggingItemId(null)
    setSelectedItemId(null)
    setCreateItemModalOpen(false)
    setCreateItemTitle('')
    setCreateItemParentId('')
    setItemActionMenu(null)
    setItemContextMenu(null)
  }, [activeNode?.id])

  const itemDirectoryOptions = useMemo(() => {
    if (!activeNode) {
      return [] as Array<{ id: string; label: string }>
    }
    const walk = (items: Item[], depth: number): Array<{ id: string; label: string }> =>
      items.flatMap((item) => [
        { id: item.id, label: `${'-- '.repeat(depth)}${item.title}` },
        ...walk(item.children ?? [], depth + 1),
      ])
    return walk(activeNode.data.items, 0)
  }, [activeNode])

  useEffect(() => {
    if (!itemContextMenu && !itemActionMenu) {
      return
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (itemActionMenu && !itemActionMenuRef.current?.contains(target)) {
        setItemActionMenu(null)
      }
      if (itemContextMenu && !itemContextMenuRef.current?.contains(target)) {
        setItemContextMenu(null)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setItemActionMenu(null)
        setItemContextMenu(null)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [itemActionMenu, itemContextMenu])

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

  const openItemContextMenu = (nodeId: string, itemId: string, clientX: number, clientY: number) => {
    const hasWindow = typeof window !== 'undefined'
    const maxX = hasWindow
      ? Math.max(ITEM_CONTEXT_MENU_PADDING, window.innerWidth - ITEM_CONTEXT_MENU_WIDTH - ITEM_CONTEXT_MENU_PADDING)
      : clientX
    const maxY = hasWindow
      ? Math.max(ITEM_CONTEXT_MENU_PADDING, window.innerHeight - ITEM_CONTEXT_MENU_HEIGHT - ITEM_CONTEXT_MENU_PADDING)
      : clientY
    const x = Math.min(Math.max(clientX, ITEM_CONTEXT_MENU_PADDING), maxX)
    const y = Math.min(Math.max(clientY, ITEM_CONTEXT_MENU_PADDING), maxY)
    setSelectedItemId(itemId)
    setItemActionMenu(null)
    setItemContextMenu({
      nodeId,
      itemId,
      x,
      y,
    })
  }

  const openCreateItemModal = () => {
    setCreateItemTitle('')
    setCreateItemParentId(selectedItemId ?? '')
    setItemActionMenu(null)
    setItemContextMenu(null)
    setCreateItemModalOpen(true)
  }

  const closeCreateItemModal = () => {
    setCreateItemModalOpen(false)
  }

  const handleCreateItemSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!activeNode || readOnly) {
      return
    }
    const trimmed = createItemTitle.trim()
    if (!trimmed) {
      return
    }
    onAddItem(activeNode.id, trimmed, createItemParentId || null)
    setCreateItemModalOpen(false)
    setCreateItemTitle('')
    setCreateItemParentId('')
  }

  const renderItemTree = (nodeId: string, item: Item, depth: number) => {
    const hasChildren = (item.children ?? []).length > 0
    const isExpanded = expandedItemIds.has(item.id)
    const isItemActionMenuOpen =
      itemActionMenu?.itemId === item.id && itemActionMenu?.nodeId === nodeId
    return (
      <li key={item.id} className={`items__tree-node items__tree-node--depth-${Math.min(depth, 6)}`}>
        <div
          className={`items__item ${draggingItemId === item.id ? 'is-dragging' : ''} ${
            selectedItemId === item.id ? 'is-selected' : ''
          }`}
          style={{ marginLeft: `${depth * 14}px` }}
          draggable={!readOnly}
          onMouseDownCapture={(event) => {
            if (readOnly) {
              return
            }
            if (event.button === 0) {
              setSelectedItemId(item.id)
            }
            if (event.button === 2) {
              event.preventDefault()
              event.stopPropagation()
              openItemContextMenu(nodeId, item.id, event.clientX, event.clientY)
            }
          }}
          onContextMenuCapture={(event) => {
            if (readOnly) {
              return
            }
            event.preventDefault()
            event.stopPropagation()
            openItemContextMenu(nodeId, item.id, event.clientX, event.clientY)
          }}
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
            onClick={() => {
              setSelectedItemId(item.id)
              setItemActionMenu(null)
              toggleItemExpanded(item.id)
            }}
            title={hasChildren ? t('drawer.toggleChildren') : t('drawer.noSubitems')}
          >
            {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
          </button>
          <button
            className="items__button"
            type="button"
            onClick={() => {
              setSelectedItemId(item.id)
              setItemActionMenu(null)
              toggleItemExpanded(item.id)
            }}
          >
            <span>{item.title}</span>
            <span className="items__meta">{t('drawer.notesCount', { count: item.notes.length })}</span>
          </button>
          <div
            className={`items__menu-wrap ${isItemActionMenuOpen ? 'is-open' : ''}`}
            ref={isItemActionMenuOpen ? itemActionMenuRef : null}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="items__menu-btn icon-btn"
              type="button"
              aria-label={t('topbar.settings')}
              onClick={() => {
                setSelectedItemId(item.id)
                setItemActionMenu((current) =>
                  current?.itemId === item.id && current?.nodeId === nodeId
                    ? null
                    : { nodeId, itemId: item.id },
                )
              }}
            >
              ⋯
            </button>
            {isItemActionMenuOpen ? (
              <div className="items__menu">
                <button
                  type="button"
                  onClick={() => {
                    onOpenItemModal(nodeId, item.id)
                    setItemActionMenu(null)
                  }}
                >
                  {t('drawer.openItem')}
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenItemModal(nodeId, item.id)
                      setItemActionMenu(null)
                    }}
                  >
                    {t('drawer.addNote')}
                  </button>
                ) : null}
                {!readOnly ? (
                  <button
                    type="button"
                    className="items__menu-danger"
                    onClick={() => {
                      onRemoveItem(nodeId, item.id)
                      setItemActionMenu(null)
                    }}
                  >
                    {t('drawer.remove')}
                  </button>
                ) : null}
              </div>
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
                {!readOnly ? (
                  <button className="btn btn--ghost drawer__add-item" type="button" onClick={openCreateItemModal}>
                    <span aria-hidden>+</span>
                    <span>{t('drawer.addItem')}</span>
                  </button>
                ) : null}
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
            </div>
          </div>
        </>
      ) : null}
      {createItemModalOpen && activeNode && !readOnly ? (
        <div className="modal-overlay" onClick={closeCreateItemModal}>
          <div className="modal modal--compact" onClick={(event) => event.stopPropagation()}>
            <h2>{t('drawer.addItem')}</h2>
            <p className="modal__subtitle">{t('drawer.addItemModalSubtitle')}</p>
            <form className="modal__form" onSubmit={handleCreateItemSubmit}>
              <label className="field">
                <span>{t('drawer.title')}</span>
                <input
                  className="modal__input"
                  type="text"
                  placeholder={t('drawer.addItemPlaceholder')}
                  value={createItemTitle}
                  onChange={(event) => setCreateItemTitle(event.target.value)}
                  autoFocus
                />
              </label>
              <label className="field">
                <span>{t('drawer.itemParentLabel')}</span>
                <select
                  className="modal__input"
                  value={createItemParentId}
                  onChange={(event) => setCreateItemParentId(event.target.value)}
                >
                  <option value="">{t('drawer.itemParentRoot')}</option>
                  {itemDirectoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal__actions">
                <button className="btn btn--ghost" type="button" onClick={closeCreateItemModal}>
                  {t('modal.cancel')}
                </button>
                <button className="btn btn--primary" type="submit" disabled={!createItemTitle.trim()}>
                  {t('drawer.addItem')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {itemContextMenu && !readOnly ? (
        <div
          className="context-menu item-context-menu"
          style={{ left: `${itemContextMenu.x}px`, top: `${itemContextMenu.y}px` }}
          ref={itemContextMenuRef}
        >
          <button
            type="button"
            onClick={() => {
              onVisualizeItemGraph(itemContextMenu.nodeId, itemContextMenu.itemId)
              setItemContextMenu(null)
            }}
          >
            {t('drawer.visualizeItem')}
          </button>
        </div>
      ) : null}
    </aside>
  )
}
