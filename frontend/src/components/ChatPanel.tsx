// Sliding chat panel for AI graph generation prompts.
import type { FormEvent, RefObject } from 'react'
import type { ChatMessage } from '../types/ui'

type ChatPanelProps = {
  open: boolean
  chatMessages: ChatMessage[]
  chatError: string
  chatInput: string
  chatLoading: boolean
  onClose: () => void
  onInputChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  endRef: RefObject<HTMLDivElement>
  examples?: string[]
}

export default function ChatPanel({
  open,
  chatMessages,
  chatError,
  chatInput,
  chatLoading,
  onClose,
  onInputChange,
  onSubmit,
  endRef,
  examples,
}: ChatPanelProps) {
  const placeholderExamples = examples ?? [
    'Example: “Group nodes by theme and connect milestones.”',
    'Example: “Create a hub and spoke layout with 6 clusters.”',
  ]

  return (
    <aside className={`chat-panel ${open ? 'chat-panel--open' : ''}`} aria-hidden={!open}>
      <div className="chat-panel__header">
        <div>
          <div className="chat-panel__eyebrow">AI Assistant</div>
          <h2>Describe your graph</h2>
        </div>
        <button className="btn btn--ghost" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="chat-panel__body">
        <p className="chat-panel__note">Describe the structure and the AI will sketch it instantly.</p>
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
          placeholder="Tell us about your graph..."
          value={chatInput}
          onChange={(event) => onInputChange(event.target.value)}
          disabled={chatLoading}
        />
        <button className="btn btn--ghost" type="submit" disabled={chatLoading}>
          {chatLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </aside>
  )
}
