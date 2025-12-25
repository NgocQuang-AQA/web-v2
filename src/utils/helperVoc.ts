import type { Env } from '../models/helperVoc'
import { modeNameMap, unitModeNameMap, highlightModeIds, softwareNameMap, difficultyNameMap } from '../data/helperVoc'

export async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function extractRows(json: unknown): { rows: Record<string, unknown>[]; total?: number; totalPages?: number } {
  if (!json || typeof json !== 'object') return { rows: [] }
  const j = json as Record<string, unknown>
  const dataUnknown = j.data as unknown
  let rowsUnknown: unknown = undefined
  if (Array.isArray(dataUnknown)) rowsUnknown = dataUnknown
  else if (dataUnknown && typeof dataUnknown === 'object') {
    const obj = dataUnknown as Record<string, unknown>
    if (Array.isArray(obj.items)) rowsUnknown = obj.items
  }
  if (!Array.isArray(rowsUnknown)) {
    if (Array.isArray(j.items)) rowsUnknown = j.items
    else if (Array.isArray(j.list)) rowsUnknown = j.list
  }
  const rows = Array.isArray(rowsUnknown) ? (rowsUnknown as Record<string, unknown>[]) : []
  const dataObj = dataUnknown && typeof dataUnknown === 'object' ? (dataUnknown as Record<string, unknown>) : undefined
  const totalItems = typeof dataObj?.totalItems === 'number' ? (dataObj!.totalItems as number) : undefined
  const total =
    typeof j.total === 'number'
      ? (j.total as number)
      : typeof dataObj?.total === 'number'
      ? (dataObj!.total as number)
      : typeof totalItems === 'number'
      ? totalItems
      : undefined
  const size = typeof dataObj?.size === 'number' ? (dataObj!.size as number) : undefined
  const totalPages =
    typeof j.totalPages === 'number'
      ? (j.totalPages as number)
      : typeof dataObj?.totalPages === 'number'
      ? (dataObj!.totalPages as number)
      : typeof totalItems === 'number' && typeof size === 'number' && size > 0
      ? Math.max(1, Math.ceil(totalItems / size))
      : undefined
  return { rows, total, totalPages }
}

export function toLabel(key: string): string {
  const m: Record<string, string> = {
    systemName: 'System Name',
    title: 'Title',
    dt: 'Week',
    '2': 'Holes (R)',
    '4': 'Holes (V)',
    '5': 'Holes (TV)',
    '6': 'Holes (TVNX)',
    month: 'Month',
    year: 'Year',
    numberOfUsers: 'Number of Users',
    tlCode: 'TL Code',
    code: 'Code',
    modeId: 'Mode id',
    modeName: 'Mode Name',
    timeStart: 'Time start',
    timeEnd: 'Time end',
    tm_tlcode: 'TL Code',
    tm_code: 'Code',
    mode_id: 'Mode id',
    tm_time_start: 'Time start',
    tm_time_end: 'Time end',
    pg_micode: 'Lockey',
    lockey: 'Lockey',
    pg_software: 'Software',
    store_no: 'Store No',
    store_name: 'Store Name',
    game_no: 'Game No',
    pg_cicode: 'CI Code',
    cc_name: 'CC Name',
    pg_tscode: 'TS Code',
    pg_timestart: 'Time Start',
    pg_timeend: 'Time End',
    pg_date: 'Date',
    pr_playercnt: 'Player Cnt',
    total_hit: 'Total Hit',
    pr_totplayhole: 'Total Play Hole',
    pr_difficulty: 'Difficulty',
    pr_istournament: 'Is Tournament',
    pg_saletype: 'Sale Type',
    pg_mode: 'Mode',
    pg_unit_cd: 'Unit CD',
    pg_isextreme: 'Is Extreme',
    pr_isend: 'Is End',
    pg_concede: 'Concede',
    pg_mulligan: 'Mulligan',
    pg_tdcode: 'TD Code',
    round_code: 'Round Code',
    video_id: 'Video ID',
    nasmo_id: 'Nasmo ID',
    file_store_code: 'File Store Code',
    machine_id: 'Lockey',
    shop_id: 'Shop ID',
    file_name: 'File Name',
    view_type: 'View Type',
    register_dt: 'Register',
    service_code: 'Service Code',
    file_extension: 'File Ext',
    status_code: 'Status Code',
    img_nm: 'Img Nm',
    file_nm: 'File Nm',
    regdate: 'Reg Date',
    cc_no: 'CC No',
    work_no: 'Lockey',
    club_no: 'Club No',
    mov_no: 'MOV No',
    evt_no: 'Event No',
    hole_no: 'Hole No',
    shot_no: 'Shot No',
    work_time: 'Work Time',
    ball: 'Ball Path',
    distance: 'Distance',
    gallery_yn: 'Gallery Yn',
    store_yn: 'Store Yn',
    is_enc: 'Is Enc'
  }
  return m[key] || key
}

export function getIsTournamentLabel(v: unknown): 'Yes' | 'No' {
  if (v == null) return 'No'
  if (typeof v === 'number') return v === 1 ? 'Yes' : 'No'
  if (typeof v === 'string') return v.trim() === '1' ? 'Yes' : 'No'
  return 'No'
}

export function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return v.toISOString()
  return JSON.stringify(v)
}

export function formatDate(v: unknown): string {
  let d: Date | null = null
  if (typeof v === 'number') {
    d = new Date(v)
  } else if (typeof v === 'string') {
    const num = Number(v)
    if (!Number.isNaN(num)) d = new Date(num)
    else {
      const parsed = Date.parse(v)
      if (!Number.isNaN(parsed)) d = new Date(parsed)
    }
  } else if (v instanceof Date) {
    d = v
  }
  if (!d || Number.isNaN(d.getTime())) return String(v ?? '')
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function getModeName(row: Record<string, unknown>): string {
  const unit = (row as Record<string, unknown>).pg_mode
  if (unit != null) {
    let n: number | null = null
    if (typeof unit === 'number') n = unit
    else if (typeof unit === 'string') {
      const num = Number(unit)
      n = Number.isNaN(num) ? null : num
    }
    if (n != null) {
      const uName = unitModeNameMap[n]
      if (uName) return uName
    }
  }
  const v = (row as Record<string, unknown>).pg_mode ?? (row as Record<string, unknown>).mode_id ?? (row as Record<string, unknown>).modeId
  let n: number | null = null
  if (typeof v === 'number') n = v
  else if (typeof v === 'string') {
    const num = Number(v)
    n = Number.isNaN(num) ? null : num
  }
  if (n != null) {
    const m = modeNameMap[n]
    if (m) return m
  }
  const raw = ((row as Record<string, unknown>).modeName ?? (row as Record<string, unknown>).mode_name) as unknown
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return String(raw)
  return ''
}

export function shouldHighlightMode(row: Record<string, unknown>): boolean {
  const v = (row as Record<string, unknown>).pg_mode ?? (row as Record<string, unknown>).mode_id ?? (row as Record<string, unknown>).modeId
  let n: number | null = null
  if (typeof v === 'number') n = v
  else if (typeof v === 'string') {
    const num = Number(v)
    n = Number.isNaN(num) ? null : num
  }
  if (n == null) return true
  return !highlightModeIds.has(n)
}

export function getSystemName(row: Record<string, unknown>): string {
  const v = (row as Record<string, unknown>).mode_id ?? (row as Record<string, unknown>).modeId ?? (row as Record<string, unknown>).pg_mode
  let n: number | null = null
  if (typeof v === 'number') n = v
  else if (typeof v === 'string') {
    const num = Number(v)
    n = Number.isNaN(num) ? null : num
  }
  if (n != null && n >= 130 && n < 140) return 'GDR Max'
  return 'GDR'
}

export function getSoftwareName(v: unknown): string {
  if (v == null) return ''
  let n: number | null = null
  if (typeof v === 'number') n = v
  else if (typeof v === 'string') {
    const num = Number(v)
    n = Number.isNaN(num) ? null : num
  }
  if (n != null) {
    const name = softwareNameMap[n]
    if (name) return name
  }
  return typeof v === 'string' ? v : String(v)
}

export function getDifficultyName(v: unknown): string {
  if (v == null) return ''
  let n: number | null = null
  if (typeof v === 'number') n = v
  else if (typeof v === 'string') {
    const num = Number(v)
    n = Number.isNaN(num) ? null : num
  }
  if (n != null) {
    const name = difficultyNameMap[n]
    if (name) return name
  }
  return typeof v === 'string' ? v : String(v)
}

export function getUnitName(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') {
    const up = v.toUpperCase()
    const map: Record<string, string> = { PRO: 'GDR Pro', MAX: 'GDR Max' }
    return map[up] || v
  }
  if (typeof v === 'number') return String(v)
  return String(v)
}

export function getClubName(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return String(v)
}

export function getBallName(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return String(v)
}

export function getTourTitle(v: unknown): string {
  let code: number | null = null
  if (typeof v === 'number') code = v
  else if (typeof v === 'string') {
    const n = Number(v)
    code = Number.isNaN(n) ? null : n
  }
  const map: Record<number, string> = {
    2: 'Holes (R)',
    4: 'Holes (V)',
    5: 'Holes (TV)',
    6: 'Holes (TVNX)'
  }
  if (code != null && map[code]) return map[code]
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}
export function toLabelPractice(key: string): string {
  const m: Record<string, string> = {
    ts_micode: 'Lockey',
    td_tscode: 'TD TS Code',
    ts_code: 'TS Code',
    ts_time_start: 'TS Time Start',
    ts_time_end: 'TS Time End',
    td_regdate: 'TD Regdate',
    ts_swing_video: 'TS Swing Video',
    ts_sicode: 'TS Si Code',
    ts_swing_position: 'TS Swing Position',
    ts_putting: 'TS Putting',
    ts_driving_range: 'TS Driving Range',
    ts_approach: 'TS Approach',
    td_driving_range: 'TD Driving Range',
    td_approach: 'TD Approach',
    td_putting: 'TD Putting'
  }
  return m[key] || key
}

export function getSwingVideoUrls(row: Record<string, unknown>, env: Env): string[] {
  const getBase = (e: Env, override?: unknown): string => {
    let prefix = ''
    if (typeof override === 'string' && override.trim()) {
      prefix = override.trim().replace(/\/+$/, '')
    } else {
      prefix = e === 'LIVE' ? 'https://myswing.global.golfzon.com' : 'https://d1s8tcbaei6x6b.cloudfront.net'
    }
    return `${prefix}/movie_web/new/tm`
  }
  const pad = (x: number) => String(x).padStart(2, '0')
  const toDatePath = (v: unknown): string => {
    let d: Date | null = null
    if (typeof v === 'number') d = new Date(v)
    else if (typeof v === 'string') {
      const num = Number(v)
      if (!Number.isNaN(num)) d = new Date(num)
      else {
        const parsed = Date.parse(v)
        if (!Number.isNaN(parsed)) d = new Date(parsed)
      }
    } else if (v instanceof Date) d = v
    if (!d || Number.isNaN(d.getTime())) return ''
    const yyyy = String(d.getUTCFullYear())
    const mm = pad(d.getUTCMonth() + 1)
    const dd = pad(d.getUTCDate())
    return `${yyyy}/${mm}/${dd}`
  }
  const buildFromObjects = (arr: unknown[]): string[] => {
    const base = getBase(env, (row as Record<string, unknown>).baseOverride)
    const codeRaw = (row as Record<string, unknown>).td_tscode
    const code = codeRaw == null ? '' : String(codeRaw)
    const datePath = toDatePath((row as Record<string, unknown>).ts_time_start)
    if (!code || !datePath) return []
    const urls: string[] = []
    for (const it of arr) {
      if (!it || typeof it !== 'object') continue
      const o = it as Record<string, unknown>
      const g = o.g == null ? null : Number(o.g)
      const m = o.m == null ? null : Number(o.m)
      const sn = o.sn == null ? null : Number(o.sn)
      if (g == null || Number.isNaN(g) || m == null || Number.isNaN(m) || sn == null || Number.isNaN(sn)) continue
      const name = `${code}_${g}${m}_${sn}.mp4`
      urls.push(`${base}/${datePath}/${name}`)
    }
    return urls
  }
  const v = (row as Record<string, unknown>).ts_swing_video
  if (Array.isArray(v)) {
    return buildFromObjects(v as unknown[])
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (s) {
      try {
        const fixed = s.replace(/([{,]\s*)(g|m|sn)\s*:/g, '$1"$2":')
        const parsed = JSON.parse(fixed)
        if (Array.isArray(parsed)) {
          const urls = buildFromObjects(parsed as unknown[])
          if (urls.length) return urls
        }
      } catch { void 0 }
    }
  }
  const fallbackKeys = ['ts_swing_video_urls', 'swing_video_urls', 'sv_urls', 'video_urls', 'video_url']
  for (const key of fallbackKeys) {
    const val = (row as Record<string, unknown>)[key]
    if (Array.isArray(val)) return (val as unknown[]).map((x) => String(x)).filter((x) => !!x)
    if (typeof val === 'string') {
      const s = val.trim()
      if (!s) continue
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) {
          return (parsed as unknown[]).map((x) => String(x)).filter((x) => !!x)
        }
      } catch {
        const parts = s.split(/[,\s]+/).map((x) => x.trim()).filter((x) => !!x)
        if (parts.length) return parts
      }
    }
  }
  return []
}
