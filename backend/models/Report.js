import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    name: String,
    status: {
      type: String,
      enum: ["passed", "failed", "skipped", "unknown"],
      default: "unknown",
    },
    suite: String,
    durationMs: Number,
    startedAt: Date,
    finishedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
    testRun: { type: mongoose.Schema.Types.ObjectId, ref: "TestRun" },
  },
  { timestamps: true }
);

export default mongoose.model("Report", ReportSchema);
