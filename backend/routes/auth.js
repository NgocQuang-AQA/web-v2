import { Router } from 'express'
import { createAuthMiddleware, roles } from '../middleware/auth.js'

export function createAuthRouter({ secret }) {
  const router = Router()
  const { login, getAuthUser } = createAuthMiddleware(secret)

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body || {}
      const result = await login(username, password)
      if (!result)
        return res.status(401).json({ message: 'invalid_credentials' })
      res.json(result)
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ message: 'internal_error' })
    }
  })

  return router
}
