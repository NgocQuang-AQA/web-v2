import type { Env } from '../../models/helperVoc'

type Props = {
  env: Env
  vocId: string
  searchBy: 'vocId' | 'userNo'
  onChangeEnv: (env: Env) => void
  onChangeVocId: (v: string) => void
  onChangeSearchBy: (v: 'vocId' | 'userNo') => void
  onSearch: () => void
}

export default function SearchForm({
  env,
  vocId,
  searchBy,
  onChangeEnv,
  onChangeVocId,
  onChangeSearchBy,
  onSearch,
}: Props) {
  return (
    <form
      className="flex items-center gap-3 mb-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch()
      }}
    >
      <div className="relative inline-block">
        <select
          value={env}
          onChange={(e) => onChangeEnv(e.target.value as Env)}
          className="select"
        >
          <option value="DEV">Dev</option>
          <option value="QA">QA</option>
          <option value="LIVE">Live</option>
        </select>
      </div>
      <div className="relative inline-block">
        <select
          value={searchBy}
          onChange={(e) =>
            onChangeSearchBy(e.target.value as 'vocId' | 'userNo')
          }
          className="select"
        >
          <option value="vocId">VOC Id</option>
          <option value="userNo">User No</option>
        </select>
      </div>
      <input
        value={vocId}
        onChange={(e) => onChangeVocId(e.target.value)}
        className="flex-1 input"
        placeholder={searchBy === 'userNo' ? 'Enter User No' : 'Enter VOC ID'}
      />
      <button className="btn btn-primary" type="submit">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <span className="font-medium">Search</span>
      </button>
    </form>
  )
}
