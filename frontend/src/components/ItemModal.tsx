// Modal for editing an item's title and tips list.
import type { FormEvent } from 'react'
import type { GraphNode, Item } from '../graphTypes'
import { useI18n } from '../i18n'

type ItemModalProps = {
  open: boolean
  node: GraphNode | null
  item: Item | null
  readOnly?: boolean
  tipTitle: string
  onChangeTipTitle: (value: string) => void
  onUpdateItemTitle: (nodeId: string, itemId: string, title: string) => void
  onUpdateTipTitle: (nodeId: string, itemId: string, noteId: string, title: string) => void
  onAddTip: (nodeId: string, itemId: string, title: string) => void
  onRemoveTip: (nodeId: string, itemId: string, noteId: string) => void
  onClose: () => void
}

export default function ItemModal({
  open,
  node,
  item,
  readOnly = false,
  tipTitle,
  onChangeTipTitle,
  onUpdateItemTitle,
  onUpdateTipTitle,
  onAddTip,
  onRemoveTip,
  onClose,
}: ItemModalProps) {
  const { t } = useI18n()
  if (!open || !node || !item) {
    return null
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (readOnly) {
      return
    }
    onAddTip(node.id, item.id, tipTitle)
    onChangeTipTitle('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal item-modal" onClick={(event) => event.stopPropagation()}>
        <div className="item-modal__header">
          <div>
            <div className="item-modal__eyebrow">{t('itemModal.eyebrow')}</div>
            <input
              className="item-modal__title-input"
              type="text"
              value={item.title}
              onChange={(event) => onUpdateItemTitle(node.id, item.id, event.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </div>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            {t('itemModal.close')}
          </button>
        </div>
        <div className="item-modal__count">{t('itemModal.notesCount', { count: item.notes.length })}</div>
        {item.notes.length === 0 ? (
          <div className="item-modal__empty">{t('itemModal.empty')}</div>
        ) : (
          <ul className="item-modal__list">
            {item.notes.map((tip) => (
              <li key={tip.id} className="item-modal__item">
                <input
                  className="item-modal__note-input"
                  type="text"
                  value={tip.title}
                  onChange={(event) =>
                    onUpdateTipTitle(node.id, item.id, tip.id, event.target.value)
                  }
                  readOnly={readOnly}
                  disabled={readOnly}
                />
                {!readOnly ? (
                  <button
                    className="item-modal__remove"
                    type="button"
                    onClick={() => onRemoveTip(node.id, item.id, tip.id)}
                  >
                    {t('itemModal.remove')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {!readOnly ? (
          <form className="item-modal__form" onSubmit={handleSubmit}>
            <textarea
              className="item-modal__textarea"
              placeholder={t('itemModal.addPlaceholder')}
              value={tipTitle}
              onChange={(event) => onChangeTipTitle(event.target.value)}
            />
            <button className="btn btn--primary" type="submit">
              {t('itemModal.addNote')}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
