// Workspace settings modal (theme, accent, layout toggles).
import { ACCENT_OPTIONS } from '../constants'
import type { AIProvider, NodeDetailsLayout, ThemePreference } from '../types/ui'
import { useI18n } from '../i18n'

type SettingsModalProps = {
  open: boolean
  themePreference: ThemePreference
  aiProvider: AIProvider
  resolvedTheme: 'dark' | 'light'
  accentChoice: string
  nodeDetailsLayout: NodeDetailsLayout
  sidebarCollapsed: boolean
  betaFeaturesEnabled: boolean
  showMiniMap: boolean
  onClose: () => void
  onSetTheme: (value: ThemePreference) => void
  onSetAIProvider: (value: AIProvider) => void
  onSetAccent: (value: string) => void
  onSetNodeDetailsLayout: (value: NodeDetailsLayout) => void
  onToggleSidebarExpanded: (expanded: boolean) => void
  onToggleBetaFeatures: (enabled: boolean) => void
  onToggleMiniMap: (enabled: boolean) => void
}

export default function SettingsModal({
  open,
  themePreference,
  aiProvider,
  resolvedTheme,
  accentChoice,
  nodeDetailsLayout,
  sidebarCollapsed,
  betaFeaturesEnabled,
  showMiniMap,
  onClose,
  onSetTheme,
  onSetAIProvider,
  onSetAccent,
  onSetNodeDetailsLayout,
  onToggleSidebarExpanded,
  onToggleBetaFeatures,
  onToggleMiniMap,
}: SettingsModalProps) {
  const { t } = useI18n()
  if (!open) {
    return null
  }

  const modeLabel = resolvedTheme === 'dark' ? t('settings.dark') : t('settings.light')
  const accentLabel = (id: string, fallback: string) => {
    switch (id) {
      case 'blue':
        return t('settings.accent.blue')
      case 'teal':
        return t('settings.accent.teal')
      case 'purple':
        return t('settings.accent.purple')
      case 'orange':
        return t('settings.accent.orange')
      default:
        return fallback
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--compact" onClick={(event) => event.stopPropagation()}>
        <h2>{t('settings.title')}</h2>
        <p className="modal__subtitle">{t('settings.subtitle')}</p>
        <div className="modal__section">
          <div className="modal__label">{t('settings.theme')}</div>
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-toggle__btn ${themePreference === 'dark' ? 'is-active' : ''}`}
              onClick={() => onSetTheme('dark')}
            >
              {t('settings.dark')}
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${themePreference === 'light' ? 'is-active' : ''}`}
              onClick={() => onSetTheme('light')}
            >
              {t('settings.light')}
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${themePreference === 'system' ? 'is-active' : ''}`}
              onClick={() => onSetTheme('system')}
            >
              {t('settings.system')}
            </button>
          </div>
          <div className="modal__hint">{t('settings.currentMode', { mode: modeLabel })}</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">{t('settings.aiProvider')}</div>
          <div className="mode-toggle mode-toggle--2">
            <button
              type="button"
              className={`mode-toggle__btn ${aiProvider === 'model_server' ? 'is-active' : ''}`}
              onClick={() => onSetAIProvider('model_server')}
            >
              {t('settings.aiProvider.modelServer')}
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${aiProvider === 'openai' ? 'is-active' : ''}`}
              onClick={() => onSetAIProvider('openai')}
            >
              {t('settings.aiProvider.openai')}
            </button>
          </div>
          <div className="modal__hint">{t('settings.aiProviderHint')}</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">{t('settings.accent')}</div>
          <div className="palette">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`palette__swatch ${accentChoice === option.id ? 'is-active' : ''}`}
                style={{ background: option.accent }}
                onClick={() => onSetAccent(option.id)}
              >
                <span>{accentLabel(option.id, option.label)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal__section">
          <div className="modal__label">{t('settings.nodeDetailsLayout')}</div>
          <div className="mode-toggle mode-toggle--2">
            <button
              type="button"
              className={`mode-toggle__btn ${nodeDetailsLayout === 'drawer' ? 'is-active' : ''}`}
              onClick={() => onSetNodeDetailsLayout('drawer')}
            >
              {t('settings.nodeDetailsLayout.drawer')}
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${nodeDetailsLayout === 'panel' ? 'is-active' : ''}`}
              onClick={() => onSetNodeDetailsLayout('panel')}
            >
              {t('settings.nodeDetailsLayout.panel')}
            </button>
          </div>
          <div className="modal__hint">{t('settings.nodeDetailsLayoutHint')}</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">{t('settings.panel')}</div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!sidebarCollapsed}
              onChange={(event) => onToggleSidebarExpanded(event.target.checked)}
            />
            <span>{t('settings.panelExpanded')}</span>
          </label>
          <div className="modal__hint">{t('settings.panelHint')}</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">{t('settings.minimap')}</div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showMiniMap}
              onChange={(event) => onToggleMiniMap(event.target.checked)}
            />
            <span>{t('settings.minimapToggle')}</span>
          </label>
          <div className="modal__hint">{t('settings.minimapHint')}</div>
        </div>
        <div className="modal__section">
          <div className="modal__label">{t('settings.beta')}</div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={betaFeaturesEnabled}
              onChange={(event) => onToggleBetaFeatures(event.target.checked)}
            />
            <span>{t('settings.betaToggle')}</span>
          </label>
          <div className="modal__hint">{t('settings.betaHint')}</div>
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
