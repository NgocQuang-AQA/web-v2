import mongoose from 'mongoose'

const logMonitorSchema = new mongoose.Schema(
  {
    url: { type: String },
    method: { type: String },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    headers: { type: mongoose.Schema.Types.Mixed },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    status: { type: Number },
    taskId: { type: String },
    errorMessage: { type: String },
  },
  { collection: 'log-monitor', timestamps: true }
)

export const LogMonitor = mongoose.model('LogMonitor', logMonitorSchema)

