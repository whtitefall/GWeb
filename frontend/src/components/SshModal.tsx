// SSH connection modal for the graph-application beta.
import type { ChangeEvent, FormEvent } from 'react'
import type { SshConfig } from '../types/ui'
import { useI18n } from '../i18n'

type SshModalProps = {
  open: boolean
  graphName: string
  draft: SshConfig
  onChangeDraft: (next: SshConfig) => void
  onClose: () => void
  onSave: () => void
}

export default function SshModal({ open, graphName, draft, onChangeDraft, onClose, onSave }: SshModalProps) {
  const { t } = useI18n()
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
        <h2>{t('ssh.tunnel')}</h2>
        <p className="modal__subtitle">
          {t('ssh.configFor', { graph: graphName || t('ssh.thisGraph') })}
        </p>
        <form className="modal__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t('ssh.host')}</span>
            <input type="text" value={draft.host} onChange={updateField('host')} placeholder="server.example.com" />
          </label>
          <label className="field">
            <span>{t('ssh.port')}</span>
            <input type="text" value={draft.port} onChange={updateField('port')} placeholder="22" />
          </label>
          <label className="field">
            <span>{t('ssh.user')}</span>
            <input type="text" value={draft.user} onChange={updateField('user')} placeholder="ubuntu" />
          </label>
          <label className="field">
            <span>{t('ssh.keyPath')}</span>
            <input
              type="text"
              value={draft.keyPath}
              onChange={updateField('keyPath')}
              placeholder="C:\\Users\\you\\.ssh\\id_rsa"
            />
          </label>
          <div className="modal__actions">
            <button className="btn btn--ghost" type="button" onClick={onClose}>
              {t('ssh.cancel')}
            </button>
            <button className="btn btn--primary" type="submit">
              {t('ssh.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
