import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g., 'HELPER_VOC_VIEW'
    description: { type: String },
  },
  { timestamps: true }
);

export const Permission = mongoose.model("Permission", permissionSchema);
