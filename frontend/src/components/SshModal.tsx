import type { ChangeEvent, FormEvent } from 'react'
import type { SshConfig } from '../types/ui'

type SshModalProps = {
  open: boolean
  graphName: string
  draft: SshConfig
  onChangeDraft: (next: SshConfig) => void
  onClose: () => void
  onSave: () => void
}

export default function SshModal({ open, graphName, draft, onChangeDraft, onClose, onSave }: SshModalProps) {
  if (!open) {
    return null
  }

  const updateField = (field: keyof SshConfig) => (event: ChangeEvent<HTMLInputElement>) => {
    onChangeDraft({ ...draft, [field]: event.target.value })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>SSH Tunnel</h2>
        <p className="modal__subtitle">
          Configure connection details for {graphName || 'this graph'}.
        </p>
        <form className="modal__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Host</span>
            <input type="text" value={draft.host} onChange={updateField('host')} placeholder="server.example.com" />
          </label>
          <label className="field">
            <span>Port</span>
            <input type="text" value={draft.port} onChange={updateField('port')} placeholder="22" />
          </label>
          <label className="field">
            <span>User</span>
            <input type="text" value={draft.user} onChange={updateField('user')} placeholder="ubuntu" />
          </label>
          <label className="field">
            <span>Private key path</span>
            <input
              type="text"
              value={draft.keyPath}
              onChange={updateField('keyPath')}
              placeholder="C:\\Users\\you\\.ssh\\id_rsa"
            />
          </label>
          <div className="modal__actions">
            <button className="btn btn--ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn--primary" type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
