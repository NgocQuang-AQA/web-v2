import { Router } from 'express'

export function createLogsRouter({ filesRepo }) {
  const router = Router()

  // POST /api/logs - Create a new log entry
  router.post('/', async (req, res) => {
    try {
      const body = req.body || {}
      const now = new Date()
      const doc = {
        ...body,
        createdAt: body.createdAt || now.toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      }

      // Using filesRepo to insert into 'log-preview' collection
      // We can use insertMany for single item as well for consistency if we want,
      // or implement insertOne in filesRepo.
      // filesRepo has insertMany, let's use it or stick to col().insertOne

      const result = await filesRepo.col('log-preview').insertOne(doc)
      res.status(201).json({ id: result.insertedId, ...doc })
    } catch (err) {
      console.error('Error creating log:', err)
      res
        .status(500)
        .json({ message: 'internal_server_error', error: String(err) })
    }
  })

  return router
}
