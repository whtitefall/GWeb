import type { CSSProperties } from 'react'

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
  if (!open) {
    return null
  }

  return (
    <div className={`ssh-console ${minimized ? 'ssh-console--min' : ''}`} style={style}>
      <div className="ssh-console__header">
        <div>
          <div className="ssh-console__eyebrow">SSH Console</div>
          <div className="ssh-console__title">{title}</div>
        </div>
        <div className="ssh-console__actions">
          <button className="btn btn--ghost" type="button" onClick={onToggleMinimize}>
            {minimized ? 'Maximize' : 'Minimize'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Close
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
