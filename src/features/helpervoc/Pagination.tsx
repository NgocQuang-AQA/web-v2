type Props = {
  page: number
  size: number
  pageCount: number
  prevDisabled: boolean
  nextDisabled: boolean
  onChangePage: (p: number) => void
  onChangeSize: (s: number) => void
}

export default function Pagination({
  page,
  size,
  pageCount,
  prevDisabled,
  nextDisabled,
  onChangePage,
  onChangeSize,
}: Props) {
  const startIdx = pageCount === 0 ? 0 : (page - 1) * size + 1
  const endIdx =
    pageCount === 0
      ? 0
      : (page - 1) * size + Math.min(size, pageCount * size - (page - 1) * size)
  return (
    <div className="mt-3 flex items-center justify-between">
      <div className="text-xs text-gray-500">
        Showing {startIdx}-{endIdx} of {pageCount * size}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-600">Rows</div>
        <select
          value={size}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChangeSize(n)
          }}
          className="select px-2 py-1"
        >
          {[5, 10, 20, 50].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="text-sm text-gray-600">
          Page {page} / {pageCount}
        </div>
        <button
          className={`btn btn-secondary ${prevDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={prevDisabled}
          onClick={() => {
            if (page > 1) onChangePage(page - 1)
          }}
        >
          Previous
        </button>
        <button
          className={`btn btn-primary ${nextDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={nextDisabled}
          onClick={() => {
            if (page < pageCount) onChangePage(page + 1)
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
