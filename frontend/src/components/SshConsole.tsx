// Placeholder SSH console panel for the graph-application beta.
import type { CSSProperties } from 'react'
import { useI18n } from '../i18n'

type SshConsoleProps = {
  open: boolean
  minimized: boolean
  style?: CSSProperties
  title: string
  message: string
  onToggleMinimize: () => void
  onClose: () => void
}

export default function SshConsole({
  open,
  minimized,
  style,
  title,
  message,
  onToggleMinimize,
  onClose,
}: SshConsoleProps) {
  const { t } = useI18n()
  if (!open) {
    return null
  }

  return (
    <div className={`ssh-console ${minimized ? 'ssh-console--min' : ''}`} style={style}>
      <div className="ssh-console__header">
        <div>
          <div className="ssh-console__eyebrow">{t('ssh.console')}</div>
          <div className="ssh-console__title">{title}</div>
        </div>
        <div className="ssh-console__actions">
          <button className="btn btn--ghost" type="button" onClick={onToggleMinimize}>
            {minimized ? t('ssh.maximize') : t('ssh.minimize')}
          </button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            {t('ssh.close')}
          </button>
        </div>
      </div>
      {!minimized ? (
        <div className="ssh-console__body">
          <div className="ssh-console__log">{message}</div>
        </div>
      ) : null}
    </div>
  )
}
