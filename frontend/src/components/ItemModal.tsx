// Modal for editing an item's title and notes list.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { GraphNode, Item } from '../graphTypes'
import EditorJsField from './EditorJsField'
import { editorContentToPlainText } from '../utils/richText'
import { useI18n } from '../i18n'

type ItemModalProps = {
  open: boolean
  node: GraphNode | null
  item: Item | null
  readOnly?: boolean
  noteTitle: string
  noteContent: string
  onChangeNoteTitle: (value: string) => void
  onChangeNoteContent: (value: string) => void
  onUpdateItemTitle: (nodeId: string, itemId: string, title: string) => void
  onUpdateNoteTitle: (nodeId: string, itemId: string, noteId: string, title: string) => void
  onUpdateNoteContent: (nodeId: string, itemId: string, noteId: string, content: string) => void
  onAddNote: (nodeId: string, itemId: string, title: string, content: string) => void
  onRemoveNote: (nodeId: string, itemId: string, noteId: string) => void
  onClose: () => void
}

export default function ItemModal({
  open,
  node,
  item,
  readOnly = false,
  noteTitle,
  noteContent,
  onChangeNoteTitle,
  onChangeNoteContent,
  onUpdateItemTitle,
  onUpdateNoteTitle,
  onUpdateNoteContent,
  onAddNote,
  onRemoveNote,
  onClose,
}: ItemModalProps) {
  const { t } = useI18n()
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !item) {
      setActiveNoteId(null)
      return
    }
    setActiveNoteId((current) => {
      if (current && item.notes.some((note) => note.id === current)) {
        return current
      }
      return item.notes[0]?.id ?? null
    })
  }, [item, open])

  if (!open || !node || !item) {
    return null
  }

  const activeNote = useMemo(
    () => item.notes.find((note) => note.id === activeNoteId) ?? null,
    [activeNoteId, item.notes],
  )

  const activeNoteEditorValue = activeNote
    ? activeNote.content?.trim().length
      ? activeNote.content
      : activeNote.title
    : ''

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (readOnly) {
      return
    }
    onAddNote(node.id, item.id, noteTitle, noteContent)
    onChangeNoteTitle('')
    onChangeNoteContent('')
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
              <li
                key={note.id}
                className={`item-modal__item ${activeNoteId === note.id ? 'is-active' : ''}`}
              >
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
                <button
                  className="btn btn--ghost item-modal__open"
                  type="button"
                  onClick={() => setActiveNoteId(note.id)}
                >
                  {t('itemModal.open')}
                </button>
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
        {activeNote ? (
          <div className="item-modal__section">
            <div className="item-modal__section-label">{t('itemModal.editContent')}</div>
            <EditorJsField
              value={activeNoteEditorValue}
              readOnly={readOnly}
              placeholder={t('itemModal.addPlaceholder')}
              onChange={(value) => onUpdateNoteContent(node.id, item.id, activeNote.id, value)}
            />
          </div>
        ) : null}
        {!readOnly ? (
          <form className="item-modal__form" onSubmit={handleSubmit}>
            <input
              className="modal__input"
              placeholder={t('itemModal.newTitlePlaceholder')}
              value={noteTitle}
              onChange={(event) => onChangeNoteTitle(event.target.value)}
            />
            <EditorJsField
              value={noteContent}
              placeholder={t('itemModal.addPlaceholder')}
              onChange={onChangeNoteContent}
            />
            <div className="item-modal__form-preview">
              {t('itemModal.preview')}: {editorContentToPlainText(noteContent) || t('itemModal.previewEmpty')}
            </div>
            <button className="btn btn--primary" type="submit">
              {t('itemModal.addNote')}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
