// Sliding chat panel for AI graph generation prompts.
import type { FormEvent, RefObject } from 'react'
import type { ChatMessage } from '../types/ui'
import { useI18n } from '../i18n'

type ChatPanelProps = {
  open: boolean
  chatMessages: ChatMessage[]
  chatError: string
  chatInput: string
  chatLoading: boolean
  onMinimize: () => void
  onClose: () => void
  onInputChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  endRef: RefObject<HTMLDivElement | null>
  examples?: string[]
}

export default function ChatPanel({
  open,
  chatMessages,
  chatError,
  chatInput,
  chatLoading,
  onMinimize,
  onClose,
  onInputChange,
  onSubmit,
  endRef,
  examples,
}: ChatPanelProps) {
  const { t } = useI18n()
  const placeholderExamples = examples ?? [
    t('chat.example1'),
    t('chat.example2'),
  ]

  return (
    <aside className={`chat-panel ${open ? 'chat-panel--open' : ''}`} aria-hidden={!open}>
      <div className="chat-panel__header">
        <div>
          <div className="chat-panel__eyebrow">{t('chat.eyebrow')}</div>
          <h2>{t('chat.title')}</h2>
        </div>
        <div className="chat-panel__header-actions">
          <button className="btn btn--ghost" type="button" onClick={onMinimize}>
            {t('chat.minimize')}
          </button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            {t('chat.close')}
          </button>
        </div>
      </div>
      <div className="chat-panel__body">
        <p className="chat-panel__note">{t('chat.note')}</p>
        {chatError ? <div className="chat-panel__error">{chatError}</div> : null}
        {chatMessages.length > 0 ? (
          <div className="chat-panel__messages">
            {chatMessages.map((message) => (
              <div key={message.id} className={`chat-message chat-message--${message.role}`}>
                {message.content}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="chat-panel__placeholder">
            {placeholderExamples.map((example) => (
              <div key={example} className="chip">
                {example}
              </div>
            ))}
          </div>
        )}
      </div>
      <form className="chat-panel__input" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder={t('chat.placeholder')}
          value={chatInput}
          onChange={(event) => onInputChange(event.target.value)}
          disabled={chatLoading}
        />
        <button className="btn btn--ghost" type="submit" disabled={chatLoading}>
          {chatLoading ? t('chat.sending') : t('chat.send')}
        </button>
      </form>
    </aside>
  )
}
