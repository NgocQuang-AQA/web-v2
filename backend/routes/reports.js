import { log } from 'console'
import { Router } from 'express'

export function createReportsRouter({
  reportsRepo,
  testRunsRepo,
  filesRepo,
  scanReports,
  scanSerenityLatest,
}) {
  const router = Router()

  router.get('/history', async (req, res) => {
    const { from, to, page = 1, pageSize = 20 } = req.query

    const sessionPage = Math.max(1, Number(page) || 1)
    const sessionPageSize = Math.max(1, Math.min(100, Number(pageSize) || 20))
    const needSessions = sessionPage * sessionPageSize

    const toMs = (v) => {
      if (v == null || v === '') return null
      const d = new Date(v)
      const ms = d.getTime()
      return Number.isNaN(ms) ? null : ms
    }
    const toIso = (ms) =>
      typeof ms === 'number' && Number.isFinite(ms)
        ? new Date(ms).toISOString()
        : null

    const groups = new Map()
    const order = []

    const maxMessages = 5000
    const batchSize = 500
    let scanned = 0
    let msgPage = 1

    while (scanned < maxMessages) {
      const rows = await filesRepo.find('his-chat', {
        page: msgPage,
        pageSize: batchSize,
        from,
        to,
        sortBy: 'time_insert',
        order: 'desc',
      })
      if (!rows.length) break
      scanned += rows.length

      for (const r of rows) {
        const session = String(r.session || '')
        if (!session) continue
        let g = groups.get(session)
        if (!g) {
          g = { session, messages: [], startedMs: null, finishedMs: null }
          groups.set(session, g)
          order.push(session)
        }

        const ms = toMs(r.time_insert || r.time || r.createdAt)
        if (ms != null) {
          g.startedMs = g.startedMs == null ? ms : Math.min(g.startedMs, ms)
          g.finishedMs = g.finishedMs == null ? ms : Math.max(g.finishedMs, ms)
        }

        g.messages.push({
          id: r.id || r._id,
          time: r.time || r.time_insert || null,
          from: r.from || '',
          content: r.content || '',
          modelVersion: r.modelVersion || '',
        })
      }

      if (order.length >= needSessions && scanned >= needSessions * 2) break
      msgPage += 1
    }

    const start = (sessionPage - 1) * sessionPageSize
    const pageSessions = order.slice(start, start + sessionPageSize)

    const items = pageSessions.map((sid) => {
      const g = groups.get(sid)
      const fromRank = (f) => {
        const v = String(f || '').toLowerCase()
        if (v === 'user') return 0
        if (v === 'gemini') return 1
        return 2
      }
      const msgs = Array.isArray(g?.messages)
        ? g.messages.slice().sort((a, b) => {
            const ams = toMs(a.time)
            const bms = toMs(b.time)
            if (ams != null && bms != null && ams !== bms) return ams - bms
            if (ams != null && bms == null) return -1
            if (ams == null && bms != null) return 1
            const ar = fromRank(a.from)
            const br = fromRank(b.from)
            if (ar !== br) return ar - br
            const aid = String(a.id || '')
            const bid = String(b.id || '')
            return aid.localeCompare(bid)
          })
        : []
      return {
        session: sid,
        startedAt: toIso(g?.startedMs),
        finishedAt: toIso(g?.finishedMs),
        messages: msgs,
      }
    })

    res.json({ items })
  })

  router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
    const report = await reportsRepo.findById(req.params.id)
    if (!report) return res.status(404).json({ message: 'not_found' })
    res.json(report)
  })

  router.get('/stats', async (req, res) => {
    const sources = [
      { name: 'CN-LIVE', key: 'cn-live' },
      { name: 'CN-QA', key: 'cn-qa' },
      { name: 'GLOBAL-QA', key: 'global-qa' },
      { name: 'GLOBAL-LIVE', key: 'global-live' },
    ]

    const results = []

    for (const { name, key } of sources) {
      const items = await filesRepo.find('report-summary', {
        page: 1,
        pageSize: 1000,
        key,
      })

      let passed = 0
      let failed = 0
      let broken_flaky = 0
      let minTime = null
      let maxTime = null
      let firstTime = null
      let latestTime = null

      for (const item of items) {
        const p = Number(item.passing) || 0
        const f = Number(item.failed) || 0
        const b = Number(item.broken_flaky) || 0
        passed += p
        failed += f
        broken_flaky += b

        // const t = item.time_insert ? new Date(item.time_insert).getTime() : 0;
        // if (t > 0) {
        //   if (minTime === null || t < minTime) minTime = t;
        //   if (maxTime === null || t > maxTime) maxTime = t;
        // }

        const parseDateField = (v) => {
          if (!v) return null
          if (typeof v === 'string') return new Date(v)
          if (typeof v === 'number') return new Date(v)
          if (v.$date) return new Date(v.$date)
          return null
        }

        const parseDateField_2 = (v) => {
          if (!v) return null

          if (typeof v === 'string') {
            // clean hidden chars
            v = v.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

            // remove milliseconds (e.g. .192Z → Z)
            v = v.replace(/\.\d{1,3}Z$/, 'Z')
          }

          if (v.$date) v = v.$date

          const d = new Date(v)
          if (isNaN(d.getTime())) {
            console.warn('Invalid date:', v)
            return null
          }

          const pad = (n) => String(n).padStart(2, '0')

          return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        }

        firstTime = parseDateField_2(item.first_time)
        latestTime = parseDateField_2(item.latest_time)
      }

      const totalTest = passed + failed + broken_flaky
      const successRate = totalTest ? Math.round((passed / totalTest) * 100) : 0

      const pad = (n) => String(n).padStart(2, '0')
      const fmtLocal = (ms) => {
        const d = new Date(ms)
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      let timeRange = []
      if (firstTime && latestTime) {
        timeRange = [fmtLocal(firstTime), fmtLocal(latestTime)]
      } else if (minTime && maxTime) {
        timeRange = [fmtLocal(minTime), fmtLocal(maxTime)]
      }

      results.push({
        name,
        successRate,
        failedCount: failed,
        flakyCount: broken_flaky,
        timeRange,
      })
    }

    res.json(results)
  })

  router.get('/errors-fails', async (req, res) => {
    const { from, to } = req.query

    const toNum = (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
    const ensureArray = (v) => {
      if (!v) return []
      return Array.isArray(v) ? v : [v]
    }
    const unique = (arr) => Array.from(new Set(arr.filter((x) => x != null)))
    const mergeEx = (a, b) => {
      if (Array.isArray(a) || Array.isArray(b))
        return [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]
      if (a && b && typeof a === 'object' && typeof b === 'object')
        return { ...a, ...b }
      return a ?? b ?? null
    }

    const getLatest = async (col, key) => {
      try {
        const items = await filesRepo.find(col, { page: 1, pageSize: 1, key })
        return items[0] || null
      } catch {
        return null
      }
    }

    const qaErrorDoc = await getLatest('report-error', 'global-qa')
    const cnErrorDoc = await getLatest('report-error', 'cn-qa')
    const qaFailDoc = await getLatest('report-fail', 'global-qa')
    const cnFailDoc = await getLatest('report-fail', 'cn-qa')

    const totalError =
      toNum(qaErrorDoc?.totalError) + toNum(cnErrorDoc?.totalError)
    const totalFail = toNum(qaFailDoc?.totalFail) + toNum(cnFailDoc?.totalFail)

    const rootCauseQa = unique([
      ...ensureArray(qaErrorDoc?.rootCause),
      ...ensureArray(qaFailDoc?.rootCause),
    ])
    const rootCauseCn = unique([
      ...ensureArray(cnErrorDoc?.rootCause),
      ...ensureArray(cnFailDoc?.rootCause),
    ])
    const exQa = mergeEx(qaErrorDoc?.ex, qaFailDoc?.ex)
    const exCn = mergeEx(cnErrorDoc?.ex, cnFailDoc?.ex)

    const breakdown = {
      qaError: toNum(qaErrorDoc?.totalError),
      cnError: toNum(cnErrorDoc?.totalError),
      qaFail: toNum(qaFailDoc?.totalFail),
      cnFail: toNum(cnFailDoc?.totalFail),
    }

    res.json({
      totalError,
      totalFail,
      rootCause: { qa: rootCauseQa, cn: rootCauseCn },
      ex: { qa: exQa, cn: exCn },
      breakdown,
    })
  })

  router.get('/suites', async (req, res) => {
    const { from, to, page = 1, pageSize = 20 } = req.query
    const suites = await reportsRepo.suites({ from, to, page, pageSize })
    const items = suites.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      startTime: s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : '',
      duration: `${Math.floor((s.durationMs || 0) / 60000)}m ${Math.floor(((s.durationMs || 0) % 60000) / 1000)}s`,
      passed: s.passed,
      failed: s.failed,
      flaky: s.flaky,
      percent: s.percent,
      totalTests: s.totalTests,
    }))
    res.json({ items })
  })

  router.get('/flaky', async (req, res) => {
    const { from, to, page = 1, pageSize = 20 } = req.query
    const items = await reportsRepo.flaky({ from, to, page, pageSize })
    res.json({ items })
  })

  return router
}
