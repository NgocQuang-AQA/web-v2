import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true }, // References Role code (e.g., 'BA')
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const User = mongoose.model('User', userSchema)
