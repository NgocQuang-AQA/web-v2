import { apiFetch } from './api'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  level: LogLevel
  message: string
  source?: string
  meta?: Record<string, unknown>
}

export async function sendLog(entry: LogEntry): Promise<void> {
  try {
    await apiFetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
  } catch (err) {
    console.error('Failed to send log:', err)
  }
}

export function installWebLogger(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  // User interaction logging disabled per request
  // Only Route Change, VOC Call, and Run Test actions are logged via explicit sendLog calls
}
