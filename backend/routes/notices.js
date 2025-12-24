import { Router } from "express";
import { Notice } from "../models/Notice.js";

export function createNoticesRouter() {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));
      const skip = (page - 1) * pageSize;
      const total = await Notice.countDocuments({});
      const items = await Notice.find({})
        .sort({ time: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean();
      res.json({ total, items, page, pageSize });
    } catch (e) {
      res.status(500).json({ message: "internal_error" });
    }
  });

  router.get("/:id([0-9a-fA-F]{24})", async (req, res) => {
    try {
      const doc = await Notice.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ message: "not_found" });
      res.json(doc);
    } catch {
      res.status(500).json({ message: "internal_error" });
    }
  });

  router.get("/latest", async (_req, res) => {
    try {
      const doc = await Notice.findOne({}).sort({ time: -1, createdAt: -1 }).lean();
      res.json(doc || null);
    } catch {
      res.status(500).json({ message: "internal_error" });
    }
  });

  return router;
}
