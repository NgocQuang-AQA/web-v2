import { Notice } from '../models/Notice.js'
import { LogMonitor } from '../models/LogMonitor.js'
import mongoose from 'mongoose'
import { sendSlackNotice } from './slack.js'

const getEnv = (key, def = '') => process.env[key] || def

const tasks = [
  // 1. Golfzon Health Check
  {
    id: 'golfzon-health',
    name: '[Golfzon] Health API',
    enabled: () => getEnv('GOLFZON_MONITOR_ENABLED', '1') !== '0',
    url: () => getEnv('GOLFZON_HEALTH_URL', 'https://api.global.golfzon.com/health'),
    method: 'GET',
    headers: () => {
      const cookie = getEnv('GOLFZON_SCOUTER_COOKIE', '')
      return cookie ? { Cookie: cookie } : {}
    },
    body: null,
    validate: (status, body) => {
      return (
        status === 200 &&
        String(body?.status) === '200' &&
        String(body?.database) === '200'
      )
    },
    errorMessage: (status, body) => {
      const bodyStr =
        body && typeof body === 'object' ? JSON.stringify(body) : String(body)
      return `Health check failed: httpStatus=${status} body=${bodyStr}`
    },
  },

  // 2. Golfzon Login Check
  {
    id: 'golfzon-login',
    name: '[Golfzon] Login API',
    enabled: () => {
      // Cần user/pass mới chạy được
      return (
        getEnv('GOLFZON_MONITOR_ENABLED', '1') !== '0' &&
        getEnv('GOLFZON_USER') &&
        getEnv('GOLFZON_PASSWORD')
      )
    },
    url: () =>
      getEnv('GOLFZON_LOGIN_URL', 'https://api.global.golfzon.com/login/auth'),
    method: 'POST',
    headers: () => ({
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    }),
    body: () =>
      JSON.stringify({
        usrId: getEnv('GOLFZON_USER', ''),
        password: getEnv('GOLFZON_PASSWORD', ''),
        loginPlatform: getEnv('GOLFZON_LOGIN_PLATFORM', 'web'),
        pushToken: '',
      }),
    validate: (status, body) => {
      const data = body?.data
      return (
        status === 200 &&
        String(data?.status) === '200' &&
        String(data?.code) === '1'
      )
    },
    errorMessage: (status, body) => {
      const data = body?.data
      const s = data?.status ? String(data.status) : 'unknown'
      const c = data?.code ? String(data.code) : 'unknown'
      return `Login check failed: httpStatus=${status} status=${s} code=${c}`
    },
  },
]

/**
 * Hàm thực thi một task cụ thể
 */
async function runTask(task) {
  try {
    if (typeof task.enabled === 'function' && !task.enabled()) return

    const url = typeof task.url === 'function' ? task.url() : task.url
    if (!url) return

    const method = task.method || 'GET'
    const headers =
      typeof task.headers === 'function' ? task.headers() : task.headers || {}
    const body =
      typeof task.body === 'function' ? task.body() : task.body || undefined

    const res = await fetch(url, { method, headers, body })
    const status = res.status
    let resBody = null
    try {
      resBody = await res.json()
    } catch {
      resBody = null
    }

    const isValid = task.validate(status, resBody)
    if (!isValid) {
      const msg = task.errorMessage(status, resBody)
      const content = `${task.name} Error: ${msg}`
      console.error(content)
      await new Notice({
        content,
        time: new Date(),
        namepath: task.id,
      }).save()
      await LogMonitor.create({
        url,
        method,
        headers,
        requestBody:
          typeof body === 'string'
            ? (() => {
                try {
                  return JSON.parse(body)
                } catch {
                  return body
                }
              })()
            : body,
        responseBody: resBody,
        status,
        taskId: task.id,
        errorMessage: msg,
      })
      await sendSlackNotice(content)
    } else {
      // Log success to console so user knows it is working
      // console.log(`[Monitor] ${task.name} - OK`)
    }
  } catch (e) {
    const content = `${task.name} Exception: ${e.message}`
    console.error(content)
    await new Notice({
      content,
      time: new Date(),
      namepath: task.id,
    }).save()
    await LogMonitor.create({
      url: typeof task.url === 'function' ? task.url() : task.url || null,
      method: task.method || 'GET',
      headers:
        typeof task.headers === 'function'
          ? task.headers()
          : task.headers || {},
      requestBody:
        typeof task.body === 'function' ? task.body() : task.body || null,
      responseBody: null,
      status: null,
      taskId: task.id,
      errorMessage: e.message,
    })
    await sendSlackNotice(content)
  }
}

/**
 * Hàm khởi chạy monitor
 * @param {string} provider - 'mongo' hoặc 'memory' ...
 */
export function startMonitor(provider) {
  const enabled = getEnv('GOLFZON_MONITOR_ENABLED', '1') !== '0'
  const intervalMs = Number(getEnv('GOLFZON_MONITOR_INTERVAL_MS', 300000)) || 300000

  // Chỉ chạy nếu enabled và có kết nối DB (vì cần lưu Notice)
  if (!enabled) {
    console.log('[Monitor] Disabled via env')
    return
  }
  
  // Nếu provider không phải mongo, Notice model có thể không hoạt động đúng nếu chưa connect
  // Tuy nhiên ở server.js ta đã connect mongoose nếu provider=mongo.
  // Ta check thêm mongoose.connection.readyState cho chắc chắn.
  
  const runAll = async () => {
    // 1 = connected
    if (provider !== 'mongo' && mongoose.connection.readyState !== 1) {
      return
    }
    
    console.log('[Monitor] Scanning targets...')
    for (const t of tasks) {
      await runTask(t)
    }
  }

  // Chạy lần đầu sau 5s khởi động
  setTimeout(() => {
    runAll().catch(err => console.error('[Monitor] Run error:', err))
  }, 5000)

  // Định kỳ
  setInterval(() => {
    runAll().catch(err => console.error('[Monitor] Run error:', err))
  }, intervalMs)

  console.log(`[Monitor] Started. Interval=${intervalMs}ms`)
}
