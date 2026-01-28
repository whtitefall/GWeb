// UI-focused types for view modes, chat, and settings.
import type { QuickFactKey } from '../constants'

export type ThemePreference = 'dark' | 'light' | 'system'
export type ViewMode = 'graph' | 'facts'
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }
export type FactKey = QuickFactKey
// Reserved for graph-application beta configuration.
export type SshConfig = {
  host: string
  port: string
  user: string
  keyPath: string
}
