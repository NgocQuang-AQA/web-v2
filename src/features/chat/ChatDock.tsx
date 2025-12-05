export default function ChatDock() {
  return (
    <div className="rounded-2xl bg-white shadow-soft p-3 flex items-center gap-3">
      <input className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type message or use quick actions..." />
      <button className="rounded-xl bg-indigo-600 text-white text-sm px-3 py-2">Send</button>
    </div>
  )
}
