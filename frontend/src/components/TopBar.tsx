import type { ViewMode } from '../types/ui'
import { statusLabels } from '../constants'

type TopBarProps = {
  viewMode: ViewMode
  onChangeView: (mode: ViewMode) => void
  saveState: keyof typeof statusLabels
  isLoggedIn: boolean
  userName: string
  onOpenSettings: () => void
  onLogout: () => void
  onOpenAuth: (mode: 'login' | 'register') => void
  onToggleChat: () => void
}

export default function TopBar({
  viewMode,
  onChangeView,
  saveState,
  isLoggedIn,
  userName,
  onOpenSettings,
  onLogout,
  onOpenAuth,
  onToggleChat,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand__mark" />
        <div>
          <div className="brand__title">Graph Studio</div>
          <div className="brand__subtitle">Organize ideas into connected flows.</div>
        </div>
      </div>

      <nav className="topbar__nav">
        <button
          type="button"
          className={`nav-btn ${viewMode === 'graph' ? 'is-active' : ''}`}
          onClick={() => onChangeView('graph')}
        >
          Graph Note
        </button>
        <button
          type="button"
          className={`nav-btn ${viewMode === 'application' ? 'is-active' : ''}`}
          onClick={() => onChangeView('application')}
        >
          Graph Application
        </button>
        <button
          type="button"
          className={`nav-btn ${viewMode === 'graph3d' ? 'is-active' : ''}`}
          onClick={() => onChangeView('graph3d')}
        >
          3D Graph
        </button>
        <button
          type="button"
          className={`nav-btn ${viewMode === 'facts' ? 'is-active' : ''}`}
          onClick={() => onChangeView('facts')}
        >
          Quick Facts
        </button>
      </nav>

      <div className="topbar__actions">
        <div className={`status status--${saveState}`}>
          <span className="status__dot" />
          <span>{statusLabels[saveState]}</span>
        </div>
        {isLoggedIn ? (
          <>
            <div className="user-chip">Hi, {userName}</div>
            <button className="btn btn--ghost" type="button" onClick={onOpenSettings}>
              Settings
            </button>
            <button className="btn btn--ghost" type="button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button className="btn btn--ghost" type="button" onClick={() => onOpenAuth('register')}>
              Register
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => onOpenAuth('login')}>
              Login
            </button>
          </>
        )}
        <button className="btn btn--ai" type="button" onClick={onToggleChat}>
          AI
        </button>
      </div>
    </header>
  )
}
