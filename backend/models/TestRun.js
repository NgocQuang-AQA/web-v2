import mongoose from 'mongoose'

const TestRunSchema = new mongoose.Schema(
  {
    runId: String,
    startTime: String,
    counts: {
      passed: Number,
      failed: Number,
      broken: Number,
      skipped: Number,
      unknown: Number,
    },
    percent: Number,
    total: Number,
    commitId: String,
    branch: String,
    triggeredBy: String,
  },
  { timestamps: { createdAt: true, updatedAt: true } }
)

export default mongoose.model('TestRun', TestRunSchema)
