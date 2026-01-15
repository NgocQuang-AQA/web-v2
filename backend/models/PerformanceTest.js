import mongoose from 'mongoose';

const performanceTestSchema = new mongoose.Schema({
  apiName: { type: String, required: true },
  method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  targetUrl: { type: String }, // Constructed URL
  requestConfig: {
    headers: { type: Map, of: String },
    body: { type: mongoose.Schema.Types.Mixed }, // Can be object or null
    token: String
  },
  jmeterConfig: {
    threads: { type: Number, required: true },
    rampUp: { type: Number, required: true },
    loop: { type: Number, required: true },
    protocol: { type: String, default: 'https' },
    host: { type: String, required: true },
    port: { type: Number, default: 443 },
    path: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  summary: {
    samples: { type: Number, default: 0 },
    avg: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    throughput: { type: Number, default: 0 },
    errorSample: {
      responseCode: { type: String, default: '' },
      responseMessage: { type: String, default: '' },
      failureMessage: { type: String, default: '' },
      url: { type: String, default: '' },
      label: { type: String, default: '' }
    }
  },
  resultFilePath: String,
  errorMessage: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'performance-tests' });

export default mongoose.model('PerformanceTest', performanceTestSchema);
