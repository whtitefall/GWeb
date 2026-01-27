import type { FormEvent } from 'react'
import type { GraphNode, Item } from '../graphTypes'

type ItemModalProps = {
  open: boolean
  node: GraphNode | null
  item: Item | null
  noteTitle: string
  onChangeNoteTitle: (value: string) => void
  onAddNote: (nodeId: string, itemId: string, title: string) => void
  onRemoveNote: (nodeId: string, itemId: string, noteId: string) => void
  onClose: () => void
}

export default function ItemModal({
  open,
  node,
  item,
  noteTitle,
  onChangeNoteTitle,
  onAddNote,
  onRemoveNote,
  onClose,
}: ItemModalProps) {
  if (!open || !node || !item) {
    return null
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onAddNote(node.id, item.id, noteTitle)
    onChangeNoteTitle('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal item-modal" onClick={(event) => event.stopPropagation()}>
        <div className="item-modal__header">
          <div>
            <div className="item-modal__eyebrow">Item Notes</div>
            <h2>{item.title}</h2>
          </div>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="item-modal__count">{item.notes.length} notes</div>
        {item.notes.length === 0 ? (
          <div className="item-modal__empty">No notes yet. Add the first one below.</div>
        ) : (
          <ul className="item-modal__list">
            {item.notes.map((note) => (
              <li key={note.id} className="item-modal__item">
                <span>{note.title}</span>
                <button
                  className="item-modal__remove"
                  type="button"
                  onClick={() => onRemoveNote(node.id, item.id, note.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="item-modal__form" onSubmit={handleSubmit}>
          <textarea
            className="item-modal__textarea"
            placeholder="Add a note description..."
            value={noteTitle}
            onChange={(event) => onChangeNoteTitle(event.target.value)}
          />
          <button className="btn btn--primary" type="submit">
            Add Note
          </button>
        </form>
      </div>
    </div>
  )
}
