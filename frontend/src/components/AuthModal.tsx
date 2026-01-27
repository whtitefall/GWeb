import type { FormEvent } from 'react'

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
            Register
          </button>
          <button
            type="button"
            className={`modal__tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => onChangeMode('login')}
          >
            Login
          </button>
        </div>
        <h2>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="modal__subtitle">Authentication is a reserved feature for now.</p>
        <div className="oauth">
          <button className="btn btn--oauth" type="button" onClick={() => onOAuthLogin('google')}>
            Continue with Google
          </button>
          <button className="btn btn--oauth" type="button" onClick={() => onOAuthLogin('github')}>
            Continue with GitHub
          </button>
        </div>
        <div className="oauth__divider">or</div>
        <form className="modal__form" onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={authName}
                onChange={(event) => onChangeName(event.target.value)}
                placeholder="Graph explorer"
              />
            </label>
          ) : null}
          <label className="field">
            <span>{mode === 'login' ? 'Email or username' : 'Email'}</span>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              value={authEmail}
              onChange={(event) => onChangeEmail(event.target.value)}
              placeholder={mode === 'login' ? 'email or admin' : 'you@example.com'}
            />
          </label>
          <label className="field">
            <span>Password</span>
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
              Cancel
            </button>
            <button className="btn btn--primary" type="submit">
              {mode === 'register' ? 'Register' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
