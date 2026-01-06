import { Router } from 'express'

export function createDashboardRouter({ filesRepo, testRunsRepo }) {
  const router = Router()

  router.get('/stats', async (req, res) => {
    try {
      const now = new Date()
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      )
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // 1. Visits (Page Views)
      // Assuming we log { message: 'Page View' }
      const visits = await filesRepo
        .col('log-preview')
        .countDocuments({ message: 'Page View' })

      // 2. Top User
      const topUserAgg = await filesRepo
        .col('log-preview')
        .aggregate([
          { $match: { 'meta.username': { $exists: true, $ne: null } } },
          { $group: { _id: '$meta.username', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ])
        .toArray()
      const topUser = topUserAgg.length > 0 ? topUserAgg[0]._id : 'N/A'

      // 3. VOC Usage
      // Assuming VOC logs have source: 'HelperVoc'
      const vocUsage = {
        day: await filesRepo.col('log-preview').countDocuments({
          source: 'HelperVoc',
          createdAt: { $gte: startOfDay.toISOString() },
        }),
        week: await filesRepo.col('log-preview').countDocuments({
          source: 'HelperVoc',
          createdAt: { $gte: startOfWeek.toISOString() },
        }),
        month: await filesRepo.col('log-preview').countDocuments({
          source: 'HelperVoc',
          createdAt: { $gte: startOfMonth.toISOString() },
        }),
      }

      // 4. Test Runs
      // Using 'test-runs' collection or whatever testRunsRepo uses
      // Check if testRunsRepo has generic count or access to collection
      // If testRunsRepo is a wrapper, we might use filesRepo.col('test-runs') directly if consistent
      const testRunsCol = filesRepo.col('test-runs') // Assuming this is the collection name
      const testRuns = {
        day: await testRunsCol.countDocuments({
          createdAt: { $gte: startOfDay.toISOString() },
        }),
        week: await testRunsCol.countDocuments({
          createdAt: { $gte: startOfWeek.toISOString() },
        }),
        month: await testRunsCol.countDocuments({
          createdAt: { $gte: startOfMonth.toISOString() },
        }),
      }

      // 5. Latest Test Run - from test-runs, order by startTime desc
      const latestAgg = await testRunsCol
        .aggregate([
          {
            $addFields: {
              _stDate: {
                $convert: {
                  input: '$startTime',
                  to: 'date',
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          { $sort: { _stDate: -1 } },
          { $limit: 1 },
        ])
        .toArray()
      const latestRun = latestAgg[0] || null
      const latestRunStats = latestRun?.summary || null

      // 6. Project Stats (Latest Report Summary per Project)
      const sources = [
        { name: 'GLOBAL-QA', key: 'global-qa', env: 'qa' },
        { name: 'GLOBAL-LIVE', key: 'global-live', env: 'live' },
        { name: 'CN-QA', key: 'cn-qa', env: 'cnqa' },
        { name: 'CN-LIVE', key: 'cn-live', env: 'cnlive' },
      ]

      const projectStats = []
      for (const s of sources) {
        // Find latest test-run for this project by startTime desc
        const latestProjectAgg = await testRunsCol
          .aggregate([
            { $match: { project: s.key } },
            {
              $addFields: {
                _stDate: {
                  $convert: {
                    input: '$startTime',
                    to: 'date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
            { $sort: { _stDate: -1 } },
            { $limit: 1 },
          ])
          .toArray()
        const latestProjectRun = latestProjectAgg[0] || null
        projectStats.push({
          ...s,
          lastRun: latestProjectRun,
        })
      }

      res.json({
        visits,
        topUser,
        vocUsage,
        testRuns,
        latestRun,
        latestRunStats,
        projectStats,
      })
    } catch (err) {
      console.error('Dashboard stats error:', err)
      res
        .status(500)
        .json({ message: 'internal_server_error', error: String(err) })
    }
  })

  return router
}
