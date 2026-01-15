import { useCallback, useEffect, useRef, useState } from 'react'
import { apiJson } from '../lib/api'

type NoticeDoc = { id?: string; _id?: string; content?: string; time?: string }

export default function GlobalAlert() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hiding, setHiding] = useState(false)
  const timer1 = useRef<number | null>(null)
  const timer2 = useRef<number | null>(null)
  const suppressRef = useRef<number>(0)
  const storageKey = 'sdet-run-flags'

  const clearTimers = () => {
    if (timer1.current) {
      window.clearTimeout(timer1.current)
      timer1.current = null
    }
    if (timer2.current) {
      window.clearTimeout(timer2.current)
      timer2.current = null
    }
  }

  const show = useCallback((text: string) => {
    clearTimers()
    setMsg(text)
    setOpen(true)
    setHiding(false)
    timer1.current = window.setTimeout(() => setHiding(true), 3000)
    timer2.current = window.setTimeout(() => {
      setOpen(false)
      setHiding(false)
    }, 3800)
  }, [])

  const getFlags = () => {
    try {
      const s = localStorage.getItem(storageKey)
      const obj = s ? (JSON.parse(s) as Record<string, boolean>) : {}
      return obj && typeof obj === 'object' ? obj : {}
    } catch {
      return {}
    }
  }
  const anyRunning = useCallback(() => {
    const flags = getFlags()
    return Object.values(flags).some(Boolean)
  }, [])
  const clearFlags = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      void 0
    }
  }

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string }
      const text = String(detail?.message || '').trim()
      if (text) show(text)
      suppressRef.current = Date.now() + 4500
      clearFlags()
    }
    window.addEventListener('global:alert', onEvent as EventListener)
    return () => {
      window.removeEventListener('global:alert', onEvent as EventListener)
    }
  }, [show])

  useEffect(() => {
    // Initialize baseline to avoid showing old notice immediately on start
    const LS_KEY = 'last_notice_id'
    const LS_TIME = 'last_notice_time'
    const initBaseline = async () => {
      try {
        const existingId = localStorage.getItem(LS_KEY) || ''
        const existingTime = localStorage.getItem(LS_TIME) || ''
        if (existingId && existingTime) return
        const doc = await apiJson<NoticeDoc | null>('/api/notices/latest')
        if (!doc) return
        const id = String(doc._id || doc.id || '')
        const time = String(doc.time || '')
        if (id) localStorage.setItem(LS_KEY, id)
        if (time) localStorage.setItem(LS_TIME, time)
      } catch {
        void 0
      }
    }
    initBaseline()
  }, [])

  useEffect(() => {
    let canceled = false
    const LS_KEY = 'last_notice_id'
    const LS_TIME = 'last_notice_time'
    const poll = async () => {
      if (Date.now() < suppressRef.current) return
      if (document.hidden) return
      if (!anyRunning()) return
      const doc = await apiJson<NoticeDoc | null>('/api/notices/latest')
      if (canceled || !doc) return
      const id = String(doc._id || doc.id || '')
      const time = String(doc.time || '')
      const lastId = localStorage.getItem(LS_KEY) || ''
      const lastTime = localStorage.getItem(LS_TIME) || ''
      const changed = (id && id !== lastId) || (time && time !== lastTime)
      if (changed) {
        const text =
          String(doc.content || '').trim() ||
          'Successfully ran automation tests.'
        show(text)
        if (id) localStorage.setItem(LS_KEY, id)
        if (time) localStorage.setItem(LS_TIME, time)
        clearFlags()
      }
    }
    const t = window.setInterval(poll, 4000)
    if (anyRunning()) poll()
    return () => {
      canceled = true
      window.clearInterval(t)
    }
  }, [show, anyRunning])

  if (!open || !msg) return null
  return (
    <div
      className={`alert-toast shadow-lg alert alert-success ${hiding ? 'alert-hide' : ''}`}
      role="alert"
    >
      {msg}
    </div>
  )
}
