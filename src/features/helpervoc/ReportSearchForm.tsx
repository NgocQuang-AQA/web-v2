import type { Env } from '../../models/helperVoc'

type Props = {
  env: Env
  from: string
  onChangeEnv: (env: Env) => void
  onChangeFrom: (v: string) => void
  onSearch: () => void
}

export default function ReportSearchForm({ env, from, onChangeEnv, onChangeFrom, onSearch }: Props) {
  return (
    <form
      className="flex items-center gap-3 mb-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch()
      }}
    >
      <div className="relative inline-block">
        <select value={env} onChange={(e) => onChangeEnv(e.target.value as Env)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="DEV">Dev</option>
          <option value="QA">QA</option>
          <option value="LIVE">Live</option>
        </select>
      </div>
      <input type="datetime-local" step="60" value={from} onChange={(e) => onChangeFrom(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Select date" />
      <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm px-3 py-2 shadow-soft hover:bg-indigo-700 active:scale-[0.98] transition" type="submit">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <span className="font-medium">Search</span>
      </button>
    </form>
  )
}
