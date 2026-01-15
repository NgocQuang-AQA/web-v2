import { useCallback, useEffect, useRef, useState } from 'react'

export default function GlobalAlert() {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [hiding, setHiding] = useState(false)
  const timer1 = useRef<number | null>(null)
  const timer2 = useRef<number | null>(null)
  const suppressRef = useRef<number>(0)

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

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string }
      const text = String(detail?.message || '').trim()
      if (text) show(text)
      suppressRef.current = Date.now() + 4500
    }
    window.addEventListener('global:alert', onEvent as EventListener)
    return () => {
      window.removeEventListener('global:alert', onEvent as EventListener)
    }
  }, [show])

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
