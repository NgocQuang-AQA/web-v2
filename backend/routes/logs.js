import { Router } from "express";

export function createLogsRouter({ filesRepo }) {
  const router = Router();

  // POST /api/logs - Create a new log entry
  router.post("/", async (req, res) => {
    try {
      const body = req.body || {};
      const now = new Date();
      const doc = {
        ...body,
        createdAt: body.createdAt || now.toISOString(),
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      };

      // Using filesRepo to insert into 'log-preview' collection
      // We can use insertMany for single item as well for consistency if we want, 
      // or implement insertOne in filesRepo. 
      // filesRepo has insertMany, let's use it or stick to col().insertOne
      
      const result = await filesRepo.col("log-preview").insertOne(doc);
      res.status(201).json({ id: result.insertedId, ...doc });
    } catch (err) {
      console.error("Error creating log:", err);
      res.status(500).json({ message: "internal_server_error", error: String(err) });
    }
  });

  // GET /api/logs - Retrieve logs (for preview/debugging)
  router.get("/", async (req, res) => {
    try {
      const { page = 1, pageSize = 50, level, source } = req.query;
      const match = {};
      if (level) match.level = String(level);
      if (source) match.source = String(source);

      const items = await filesRepo.find("log-preview", {
        page,
        pageSize,
        sortBy: "createdAt",
        order: "desc",
        // We might need to adjust filesRepo.find to support generic match if needed,
        // but currently it supports name/key/date. 
        // If we want detailed filtering, we might need to use col() directly here.
      });
      
      // Let's use direct aggregation for more flexibility if filesRepo.find is too limited
      // or just rely on filesRepo.find if it's enough.
      // For now, let's stick to filesRepo.find but we might need to enhance it later.
      // Actually, filesRepo.find uses _tiDate from time_insert. 
      // Our logs might use createdAt.
      // Let's ensure we save time_insert as well or update filesRepo.
      
      // Let's just use col() directly for this route to be safe and flexible
      const skip = (Number(page) - 1) * Number(pageSize);
      const limit = Number(pageSize);
      
      const docs = await filesRepo.col("log-preview")
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
        
      const total = await filesRepo.col("log-preview").countDocuments(match);

      res.json({
        total,
        page: Number(page),
        pageSize: limit,
        items: docs.map(d => ({ ...d, id: d._id }))
      });
    } catch (err) {
      console.error("Error fetching logs:", err);
      res.status(500).json({ message: "internal_server_error", error: String(err) });
    }
  });

  return router;
}
