// Workspace settings modal (theme, accent, layout toggles).
import { ACCENT_OPTIONS } from '../constants'
import type { ThemePreference } from '../types/ui'

type SettingsModalProps = {
  open: boolean
  themePreference: ThemePreference
  resolvedTheme: 'dark' | 'light'
  accentChoice: string
  sidebarCollapsed: boolean
  showMiniMap: boolean
  onClose: () => void
  onSetTheme: (value: ThemePreference) => void
  onSetAccent: (value: string) => void
  onToggleSidebarExpanded: (expanded: boolean) => void
  onToggleMiniMap: (enabled: boolean) => void
}

export default function SettingsModal({
  open,
  themePreference,
  resolvedTheme,
  accentChoice,
  sidebarCollapsed,
  showMiniMap,
  onClose,
  onSetTheme,
  onSetAccent,
  onToggleSidebarExpanded,
  onToggleMiniMap,
}: SettingsModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--compact" onClick={(event) => event.stopPropagation()}>
        <h2>Settings</h2>
        <p className="modal__subtitle">Tune the workspace to your style.</p>
        <div className="modal__section">
          <div className="modal__label">Theme</div>
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-toggle__btn ${themePreference === 'dark' ? 'is-active' : ''}`}
              onClick={() => onSetTheme('dark')}
            >
              Dark
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${themePreference === 'light' ? 'is-active' : ''}`}
              onClick={() => onSetTheme('light')}
            >
              Light
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${themePreference === 'system' ? 'is-active' : ''}`}
              onClick={() => onSetTheme('system')}
            >
              System
            </button>
          </div>
          <div className="modal__hint">Currently in {resolvedTheme} mode.</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">Accent Color</div>
          <div className="palette">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`palette__swatch ${accentChoice === option.id ? 'is-active' : ''}`}
                style={{ background: option.accent }}
                onClick={() => onSetAccent(option.id)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal__section">
          <div className="modal__label">Your Graphs Panel</div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!sidebarCollapsed}
              onChange={(event) => onToggleSidebarExpanded(event.target.checked)}
            />
            <span>Show expanded by default</span>
          </label>
          <div className="modal__hint">When disabled, the widget starts minimized in new sessions.</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">Mini Map</div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showMiniMap}
              onChange={(event) => onToggleMiniMap(event.target.checked)}
            />
            <span>Show minimap thumbnail</span>
          </label>
          <div className="modal__hint">Toggle the bottom-left minimap for quick navigation.</div>
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
