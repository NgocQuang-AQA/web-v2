import mongoose from 'mongoose'

const noticeSchema = new mongoose.Schema(
  {
    content: { type: String },
    time: { type: Date },
    namepath: { type: String },
  },
  { collection: 'notice', timestamps: true }
)

export const Notice = mongoose.model('Notice', noticeSchema)
