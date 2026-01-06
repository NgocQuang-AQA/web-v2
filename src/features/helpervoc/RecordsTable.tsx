import type { Env, TabKey } from '../../models/helperVoc'
import Loading from '../../components/Loading'
import NoData from '../../assets/no-data-found_585024-42.avif'
import {
  formatCell,
  formatDate,
  getModeName,
  shouldHighlightMode,
  getSoftwareName,
  getDifficultyName,
  getUnitName,
  getClubName,
  getBallName,
  getIsTournamentLabel,
  toLabel,
  getSwingVideoUrls,
  getTourTitle,
  getSystemName,
} from '../../utils/helperVoc'

type Props = {
  rows: Record<string, unknown>[]
  cols: string[]
  env: Env
  tab: TabKey
  page: number
  size: number
  loading: boolean
  error: string | null
  onOpenSwing: (urls: string[]) => void
}

export default function RecordsTable({
  rows,
  cols,
  env,
  tab,
  page,
  size,
  loading,
  error,
  onOpenSwing,
}: Props) {
  if (loading) return <Loading />
  if (error) return <div className="text-sm text-rose-600">{error}</div>
  if (rows.length === 0)
    return (
      <div className="relative w-full flex items-center justify-center py-6">
        <img
          src={NoData}
          alt="No data"
          className="max-h-64 w-auto object-contain opacity-80 rounded-xl"
        />
      </div>
    )
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-3 py-2">#</th>
            {cols.map((k) => (
              <th key={k} className="px-3 py-2">
                {toLabel(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2">{(page - 1) * size + idx + 1}</td>
              {cols.map((k) => (
                <td
                  key={k}
                  className={`px-3 py-2 ${k === 'modeName' && tab !== 'gs' && shouldHighlightMode(row as Record<string, unknown>) ? 'text-rose-600' : ''}`}
                >
                  {k === 'modeName' ? (
                    tab === 'gs' ? (
                      (() => {
                        const name = getModeName(row as Record<string, unknown>)
                        if (!name)
                          return <span className="text-rose-600">N/A</span>
                        return name
                      })()
                    ) : (
                      getModeName(row as Record<string, unknown>)
                    )
                  ) : k === 'pr_istournament' ? (
                    getIsTournamentLabel((row as Record<string, unknown>)[k])
                  ) : k === 'systemName' ? (
                    getSystemName(row as Record<string, unknown>)
                  ) : k === 'tm_time_start' ||
                    k === 'tm_time_end' ||
                    k === 'timeStart' ||
                    k === 'timeEnd' ||
                    k === 'pg_timestart' ||
                    k === 'pg_timeend' ||
                    k === 'pg_date' ||
                    k === 'date' ||
                    k === 'ts_time_start' ||
                    k === 'ts_time_end' ||
                    k === 'td_regdate' ||
                    k === 'register_dt' ||
                    k === 'regdate' ? (
                    formatDate((row as Record<string, unknown>)[k])
                  ) : k === 'pg_software' ? (
                    getSoftwareName((row as Record<string, unknown>)[k])
                  ) : k === 'pr_difficulty' ? (
                    getDifficultyName((row as Record<string, unknown>)[k])
                  ) : k === 'pg_unit_cd' ? (
                    getUnitName((row as Record<string, unknown>)[k])
                  ) : k === 'club_no' ? (
                    getClubName((row as Record<string, unknown>)[k])
                  ) : k === 'ball' ? (
                    getBallName((row as Record<string, unknown>)[k])
                  ) : k === 'ts_swing_video' ? (
                    (() => {
                      const urls = getSwingVideoUrls(
                        row as Record<string, unknown>,
                        env
                      )
                      if (!urls.length)
                        return <span className="text-rose-600">N/A</span>
                      return (
                        <button
                          className="text-indigo-600 hover:underline px-0"
                          onClick={() => onOpenSwing(urls)}
                        >
                          Click here
                        </button>
                      )
                    })()
                  ) : k === 'title' ? (
                    getTourTitle((row as Record<string, unknown>)[k])
                  ) : k === 'ts_driving_range' ||
                    k === 'ts_approach' ||
                    k === 'td_driving_range' ||
                    k === 'td_approach' ||
                    k === 'td_putting' ? (
                    <div className="max-w-[200px] overflow-x-auto whitespace-nowrap">
                      {formatCell((row as Record<string, unknown>)[k])}
                    </div>
                  ) : (
                    formatCell((row as Record<string, unknown>)[k])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
