import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { Role } from '../models/Role.js'

function base64urlEncode(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj)
  return Buffer.from(s, 'utf8').toString('base64url')
}
function base64urlDecode(s) {
  const raw = Buffer.from(String(s || ''), 'base64url').toString('utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function createTokenService(secret) {
  const sec = String(secret || 'dev-secret')
  const sign = (payload) => {
    const data = base64urlEncode(payload)
    const sig = crypto
      .createHmac('sha256', sec)
      .update(data)
      .digest('base64url')
    return `v1.${data}.${sig}`
  }
  const verify = (token) => {
    try {
      const parts = String(token || '').split('.')
      if (parts.length !== 3 || parts[0] !== 'v1') return null
      const data = parts[1]
      const sig = parts[2]
      const expected = crypto
        .createHmac('sha256', sec)
        .update(data)
        .digest('base64url')
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
      const payload = base64urlDecode(data)
      if (!payload) return null
      if (payload.exp && Date.now() > Number(payload.exp)) return null
      return payload
    } catch {
      return null
    }
  }
  return { sign, verify }
}

export function createAuthMiddleware(secret) {
  const tokens = createTokenService(secret)
  const getAuthUser = (req) => {
    const header = String(req.headers?.authorization || '').trim()
    const m = header.match(/^Bearer (.+)$/i)
    const token = m ? m[1] : null
    if (!token) return null
    const payload = tokens.verify(token)
    if (!payload || !payload.username || !payload.role) return null
    return {
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions || [],
    }
  }
  const requireAuth = (allowedRoles) => {
    return (req, res, next) => {
      const u = getAuthUser(req)
      if (!u) return res.status(401).json({ message: 'unauthorized' })
      req.user = u
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(u.role))
          return res.status(403).json({ message: 'forbidden' })
      }
      next()
    }
  }
  const login = async (username, password) => {
    const name = String(username || '').trim()
    const pass = String(password || '')

    const user = await User.findOne({ username: name })
    if (!user) return null

    const match = await bcrypt.compare(pass, user.passwordHash)
    if (!match) return null

    // Fetch permissions from Role
    let permissions = []
    let menus = []
    if (user.role) {
      const roleDoc = await Role.findOne({ code: user.role })
      if (roleDoc) {
        if (roleDoc.permissions) permissions = roleDoc.permissions
        if (roleDoc.menus) menus = roleDoc.menus
      }
    }

    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
    const payload = {
      username: user.username,
      role: user.role,
      permissions,
      exp,
    }
    const token = tokens.sign(payload)
    return {
      token,
      role: user.role,
      username: user.username,
      permissions,
      menus,
    }
  }
  return { requireAuth, login, getAuthUser }
}

export const roles = {
  admin: 'ADMIN',
  ba: 'BA',
  be: 'BE',
  user: 'OTHER',
}
