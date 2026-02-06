// Auth modal for Supabase OAuth + reserved email/password flow.
import type { FormEvent } from 'react'
import { useI18n } from '../i18n'

type AuthModalProps = {
  open: boolean
  mode: 'login' | 'register'
  authName: string
  authEmail: string
  authPassword: string
  authError: string
  authNotice: string
  onChangeMode: (mode: 'login' | 'register') => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onOAuthLogin: (provider: 'google' | 'github') => void
  onChangeName: (value: string) => void
  onChangeEmail: (value: string) => void
  onChangePassword: (value: string) => void
}

export default function AuthModal({
  open,
  mode,
  authName,
  authEmail,
  authPassword,
  authError,
  authNotice,
  onChangeMode,
  onClose,
  onSubmit,
  onOAuthLogin,
  onChangeName,
  onChangeEmail,
  onChangePassword,
}: AuthModalProps) {
  const { t } = useI18n()

  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__tabs">
          <button
            type="button"
            className={`modal__tab ${mode === 'register' ? 'is-active' : ''}`}
            onClick={() => onChangeMode('register')}
          >
            {t('auth.register')}
          </button>
          <button
            type="button"
            className={`modal__tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => onChangeMode('login')}
          >
            {t('auth.login')}
          </button>
        </div>
        <h2>{mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}</h2>
        <p className="modal__subtitle">{t('auth.subtitle')}</p>
        <div className="oauth">
          <button className="btn btn--oauth" type="button" onClick={() => onOAuthLogin('google')}>
            {t('auth.google')}
          </button>
          <button className="btn btn--oauth" type="button" onClick={() => onOAuthLogin('github')}>
            {t('auth.github')}
          </button>
        </div>
        <div className="oauth__divider">{t('auth.or')}</div>
        <form className="modal__form" onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="field">
              <span>{t('auth.name')}</span>
              <input
                type="text"
                value={authName}
                onChange={(event) => onChangeName(event.target.value)}
                placeholder={t('auth.namePlaceholder')}
              />
            </label>
          ) : null}
          <label className="field">
            <span>{mode === 'login' ? t('auth.emailOrUsername') : t('auth.email')}</span>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              value={authEmail}
              onChange={(event) => onChangeEmail(event.target.value)}
              placeholder={mode === 'login' ? t('auth.loginPlaceholder') : t('auth.emailPlaceholder')}
            />
          </label>
          <label className="field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              value={authPassword}
              onChange={(event) => onChangePassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {authError ? <div className="auth-error">{authError}</div> : null}
          {authNotice ? <div className="auth-notice">{authNotice}</div> : null}
          <div className="modal__actions">
            <button className="btn btn--ghost" type="button" onClick={onClose}>
              {t('auth.cancel')}
            </button>
            <button className="btn btn--primary" type="submit">
              {mode === 'register' ? t('auth.register') : t('auth.login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
