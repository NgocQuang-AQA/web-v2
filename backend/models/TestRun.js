import mongoose from 'mongoose'

const TestRunSchema = new mongoose.Schema(
  {
    commitId: String,
    branch: String,
    triggeredBy: String,
  },
  { timestamps: { createdAt: true, updatedAt: true } }
)

export default mongoose.model('TestRun', TestRunSchema)
