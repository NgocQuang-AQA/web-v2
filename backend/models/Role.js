import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g., 'BA', 'ADMIN'
    name: { type: String },
    description: { type: String },
    permissions: [{ type: String }], // Array of Permission codes
    menus: [{ type: String }], // Array of Menu codes
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Role = mongoose.model("Role", roleSchema);
