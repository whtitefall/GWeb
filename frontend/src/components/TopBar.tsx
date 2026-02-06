// Top navigation bar (view tabs, auth actions, AI toggle).
import type { ViewMode } from '../types/ui'
import { statusLabels } from '../constants'
import { useI18n } from '../i18n'

type TopBarProps = {
  viewMode: ViewMode
  onChangeView: (mode: ViewMode) => void
  saveState: keyof typeof statusLabels
  showBetaTabs: boolean
  displayMode: boolean
  isLoggedIn: boolean
  userName: string
  onToggleDisplayMode: () => void
  onOpenSettings: () => void
  onLogout: () => void
  onOpenAuth: (mode: 'login' | 'register') => void
  onToggleChat: () => void
}

export default function TopBar({
  viewMode,
  onChangeView,
  saveState,
  showBetaTabs,
  displayMode,
  isLoggedIn,
  userName,
  onToggleDisplayMode,
  onOpenSettings,
  onLogout,
  onOpenAuth,
  onToggleChat,
}: TopBarProps) {
  const { language, setLanguage, t } = useI18n()
  const canShowDisplayMode = viewMode === 'graph' || viewMode === 'application'
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand__mark" />
        <div>
          <div className="brand__title">{t('brand.title')}</div>
          <div className="brand__subtitle">{t('brand.subtitle')}</div>
        </div>
      </div>

      <nav className="topbar__nav">
        <button
          type="button"
          className={`nav-btn ${viewMode === 'graph' ? 'is-active' : ''}`}
          onClick={() => onChangeView('graph')}
        >
          {t('nav.graph')}
        </button>
        {showBetaTabs ? (
          <>
            <button
              type="button"
              className={`nav-btn ${viewMode === 'application' ? 'is-active' : ''}`}
              onClick={() => onChangeView('application')}
            >
              {t('nav.application')}
            </button>
            <button
              type="button"
              className={`nav-btn ${viewMode === 'graph3d' ? 'is-active' : ''}`}
              onClick={() => onChangeView('graph3d')}
            >
              {t('nav.graph3d')}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`nav-btn ${viewMode === 'facts' ? 'is-active' : ''}`}
          onClick={() => onChangeView('facts')}
        >
          {t('nav.facts')}
        </button>
      </nav>

      <div className="topbar__actions">
        <div className={`status status--${saveState}`}>
          <span className="status__dot" />
          <span>{t(`status.${saveState}`)}</span>
        </div>
        <button className="btn btn--ghost" type="button" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}>
          {language === 'en' ? t('language.zh') : t('language.en')}
        </button>
        {isLoggedIn ? (
          <>
            <div className="user-chip">{t('topbar.hi', { name: userName })}</div>
            {canShowDisplayMode ? (
              <button className="btn btn--ghost" type="button" onClick={onToggleDisplayMode}>
                {displayMode ? t('topbar.editMode') : t('topbar.displayMode')}
              </button>
            ) : null}
            <button className="btn btn--ghost" type="button" onClick={onOpenSettings}>
              {t('topbar.settings')}
            </button>
            <button className="btn btn--ghost" type="button" onClick={onLogout}>
              {t('topbar.logout')}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn--ghost" type="button" onClick={() => onOpenAuth('register')}>
              {t('topbar.register')}
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => onOpenAuth('login')}>
              {t('topbar.login')}
            </button>
          </>
        )}
        <button className="btn btn--ai" type="button" onClick={onToggleChat}>
          {t('topbar.ai')}
        </button>
      </div>
    </header>
  )
}
