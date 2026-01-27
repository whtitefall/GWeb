import type { QuickFactKey } from '../constants'

export type ThemePreference = 'dark' | 'light' | 'system'
export type ViewMode = 'graph' | 'application' | 'graph3d' | 'facts'
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }
export type FactKey = QuickFactKey
export type SshConfig = {
  host: string
  port: string
  user: string
  keyPath: string
}
