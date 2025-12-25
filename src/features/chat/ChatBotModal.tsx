import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { answerQuestion } from './qa'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  open: boolean
  initialQuestion?: string
  onClose: () => void
}

export default function ChatBotModal({ open, initialQuestion, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const ready = useMemo(() => messages.length > 0, [messages])

  useEffect(() => {
    let canceled = false
    async function run(q: string) {
      setMessages((m) => [...m, { role: 'user', content: q }])
      const ans = await answerQuestion(q)
      if (!canceled) setMessages((m) => [...m, { role: 'assistant', content: ans }])
    }
    if (open && initialQuestion && messages.length === 0) {
      run(initialQuestion)
    }
    return () => { canceled = true }
  }, [open, initialQuestion, messages.length])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    const ans = await answerQuestion(q)
    setMessages((m) => [...m, { role: 'assistant', content: ans }])
  }

  return (
    <Modal open={open} title="Chatbot QA" onClose={onClose} unmountOnClose>
      <div className="space-y-3">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {!ready && (
          <div className="text-sm text-gray-500">Enter a question to start.</div>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ask about test metrics..."
          />
          <button className="rounded-xl bg-indigo-600 text-white text-sm px-3 py-2" onClick={send}>Send</button>
        </div>
      </div>
    </Modal>
  )
}
