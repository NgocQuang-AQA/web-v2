import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { Notice } from '../models/Notice.js'
import TestRun from '../models/TestRun.js'
import { sendSlackNotice } from '../services/slack.js'
import { summarizeDir } from '../services/scanner.js'

function findScriptCandidates(env) {
  const root = process.cwd()
  const scriptsDir1 = path.resolve(root, '..', 'scripts')
  const scriptsDir2 = path.resolve(root, 'scripts')
  const isDarwin = process.platform === 'darwin'
  const isWin = process.platform === 'win32'
  const map = {
    qa: isDarwin ? 'run-qa-macos.sh' : isWin ? 'run-qa.bat' : 'run-qa.sh',
    live: isDarwin
      ? 'run-live-macos.sh'
      : isWin
        ? 'run-live.bat'
        : 'run-live.sh',
    synclive: isDarwin
      ? 'sync-live-macos.sh'
      : isWin
        ? 'sync-live.bat'
        : 'sync-live.sh',
    synccnlive: isDarwin
      ? 'sync-cn-live-macos.sh'
      : isWin
        ? 'sync-cn-live.bat'
        : 'sync-cn-live.sh',
    cnqa: isDarwin
      ? 'run-cn-qa-macos.sh'
      : isWin
        ? 'run-cn-qa.bat'
        : 'run-cn-qa.sh',
    cnlive: isDarwin
      ? 'run-cn-live-macos.sh'
      : isWin
        ? 'run-cn-live.bat'
        : 'run-cn-live.sh',
  }
  const name = map[String(env).toLowerCase()] || null
  if (!name) return []
  return [path.resolve(scriptsDir1, name), path.resolve(scriptsDir2, name)]
}

function pickExistingPath(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {}
  }
  return null
}

function parseNamepathFromLogs(logs) {
  let candidate = null
  const lines = String(logs || '').split(/\r?\n/)
  for (const ln of lines) {
    const m1 = ln.match(/Created dir:\s*([^\r\n]+)/i)
    if (m1) candidate = m1[1].trim()
    const m2 = ln.match(/Copying\s+\d+\s+files\s+to\s*([^\r\n]+)/i)
    if (m2) candidate = m2[1].trim()
  }
  return candidate || null
}

function parseSyncSummaryFromLogs(logs) {
  const s = String(logs || '')
  const mSuccess = s.match(/Success:\s*(\d+)/i)
  const mFailed = s.match(/Failed:\s*(\d+)/i)
  const mSkipped = s.match(/Skipped:\s*(\d+)/i)
  const hasBlock = /Update Summary/i.test(s)
  const success = mSuccess ? Number(mSuccess[1]) : null
  const failed = mFailed ? Number(mFailed[1]) : null
  const skipped = mSkipped ? Number(mSkipped[1]) : null
  if (!hasBlock && success == null && failed == null && skipped == null)
    return null
  return {
    success: success ?? 0,
    failed: failed ?? 0,
    skipped: skipped ?? 0,
  }
}

function friendlyNameFromKey(key) {
  const v = String(key || '').toLowerCase()
  if (v === 'global-live') return 'Global Live'
  if (v === 'global-qa') return 'Global QA'
  if (v === 'cn-live') return 'GlobalCN Live'
  if (v === 'cn-qa') return 'GlobalCN QA'
  return key || 'unknown-project'
}

async function composeNoticeContent(
  env,
  namepath,
  logs,
  key,
  stats = null,
  host = '10.13.60.71'
) {
  const v = String(env || '').toLowerCase()
  const isQA = ['qa', 'cn', 'cnqa'].includes(v)
  const environment = isQA ? 'QA' : 'LIVE'
  const folder = namepath ? path.basename(namepath) : friendlyNameFromKey(key)
  if (v.startsWith('sync')) {
    const sum = parseSyncSummaryFromLogs(logs)
    if (sum) {
      return [
        `Sync data completed for ${folder} (${environment}).`,
        `Success: ${sum.success} • Failed: ${sum.failed} • Skipped: ${sum.skipped}`,
      ].join('\n')
    }
    return `Sync data completed for ${folder} (${environment}).`
  }
  try {
    let counts, percent
    if (stats) {
      counts = stats.counts
      percent = stats.percent
    } else {
      const summary = namepath ? await summarizeDir(namepath) : null
      counts = summary?.counts || null
      percent = summary?.percent ?? null
    }

    const passRate = percent != null ? `${percent}%` : 'N/A'
    const passed = counts?.passed ?? null
    const failed = counts?.failed ?? null
    const error = counts?.broken ?? null
    const runId = folder || 'unknown'
    const link = `http://${host}:5173/agents/report?runId=${encodeURIComponent(
      runId
    )}`

    const lines = [
      `Successfully ran automation tests for ${folder} (${environment}).`,
    ]
    if (passed != null && failed != null && error != null) {
      lines.push(`Pass rate: ${passRate}`)
    }
    lines.push(link)
    return lines.join('\n')
  } catch {
    return `Successfully ran automation tests for the ${folder} project in the ${environment} environment.`
  }
}

async function runScript(scriptPath) {
  return new Promise((resolve) => {
    const isBat =
      scriptPath.toLowerCase().endsWith('.bat') ||
      scriptPath.toLowerCase().endsWith('.cmd')
    const runner = isBat && process.platform === 'win32' ? 'cmd.exe' : 'bash'
    const args =
      isBat && process.platform === 'win32' ? ['/c', scriptPath] : [scriptPath]
    const child = spawn(runner, args, { cwd: path.dirname(scriptPath) })
    let logs = ''
    child.stdout.on('data', (d) => {
      logs += d.toString()
    })
    child.stderr.on('data', (d) => {
      logs += d.toString()
    })
    child.on('close', (code) => resolve({ code, logs }))
    child.on('error', (err) => resolve({ code: -1, logs: String(err) }))
  })
}

export function createRunRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    try {
      const env = String(req.query.env || '').trim()
      const key = String(req.query.key || '').trim()
      const hostHeader = req.get('host') || '10.13.60.71'
      const hostname = hostHeader.split(':')[0]
      if (!env) return res.status(400).json({ message: 'missing_env' })

      const candidates = findScriptCandidates(env)
      const scriptPath = pickExistingPath(candidates)
      if (!scriptPath)
        return res
          .status(404)
          .json({ message: 'script_not_found', candidates, env })

      const { code, logs } = await runScript(scriptPath)
      const sum = parseSyncSummaryFromLogs(logs)
      const namepath = parseNamepathFromLogs(logs)

      res.json({
        status:
          String(env).toLowerCase().startsWith('sync') && sum
            ? 'ok'
            : code === 0
              ? 'ok'
              : 'error',
        exitCode: code,
      })

      // Run background task to send notice
      ;(async () => {
        try {
          // Wait a bit before checking DB to allow async writes to complete
          await new Promise((resolve) => setTimeout(resolve, 5000))

          let stats = null
          const runId = namepath
            ? path.basename(namepath)
            : friendlyNameFromKey(key)

          // Poll DB for TestRun result (retry up to 12 times, 5s interval = 60s total)
          if (!String(env).toLowerCase().startsWith('sync') && runId) {
            for (let i = 0; i < 12; i++) {
              try {
                const tr = await TestRun.findOne({ runId }).sort({ createdAt: -1 })
                if (tr) {
                  stats = {
                    counts: tr.counts,
                    percent: tr.percent,
                  }
                  break
                }
              } catch (e) {
                console.error('Error polling TestRun:', e)
              }
              await new Promise((resolve) => setTimeout(resolve, 5000))
            }
          }

          const content = await composeNoticeContent(
            env,
            namepath,
            logs,
            key,
            stats,
            hostname
          )
          const time = new Date()
          const doc = new Notice({ content, time, namepath })
          await doc.save()
          await sendSlackNotice(content)
        } catch (err) {
          console.error('Error sending delayed slack notice:', err)
        }
      })()
    } catch (e) {
      res.status(500).json({ message: 'internal_error' })
    }
  })

  return router
}
