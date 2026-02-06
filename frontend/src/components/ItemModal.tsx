// Modal for editing an item's title and notes list.
import type { FormEvent } from 'react'
import type { GraphNode, Item } from '../graphTypes'
import { useI18n } from '../i18n'

type ItemModalProps = {
  open: boolean
  node: GraphNode | null
  item: Item | null
  readOnly?: boolean
  noteTitle: string
  onChangeNoteTitle: (value: string) => void
  onUpdateItemTitle: (nodeId: string, itemId: string, title: string) => void
  onUpdateNoteTitle: (nodeId: string, itemId: string, noteId: string, title: string) => void
  onAddNote: (nodeId: string, itemId: string, title: string) => void
  onRemoveNote: (nodeId: string, itemId: string, noteId: string) => void
  onClose: () => void
}

export default function ItemModal({
  open,
  node,
  item,
  readOnly = false,
  noteTitle,
  onChangeNoteTitle,
  onUpdateItemTitle,
  onUpdateNoteTitle,
  onAddNote,
  onRemoveNote,
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
    onAddNote(node.id, item.id, noteTitle)
    onChangeNoteTitle('')
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
            {item.notes.map((note) => (
              <li key={note.id} className="item-modal__item">
                <input
                  className="item-modal__note-input"
                  type="text"
                  value={note.title}
                  onChange={(event) =>
                    onUpdateNoteTitle(node.id, item.id, note.id, event.target.value)
                  }
                  readOnly={readOnly}
                  disabled={readOnly}
                />
                {!readOnly ? (
                  <button
                    className="item-modal__remove"
                    type="button"
                    onClick={() => onRemoveNote(node.id, item.id, note.id)}
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
              value={noteTitle}
              onChange={(event) => onChangeNoteTitle(event.target.value)}
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
