import { Router } from "express";

function toDate(v) {
  try {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function createTestsRouter({ filesRepo }) {
  const router = Router();

  router.get("/runs", async (req, res) => {
    const { page = 1, pageSize = 20, project, env, runId, from, to, sortBy = "createdAt", order = "desc" } = req.query;
    const dir = String(order).toLowerCase() === "asc" ? 1 : -1;
    const match = {};
    if (project) match.project = String(project);
    if (env) match.env = String(env);
    if (runId) match.runId = String(runId);
    const sort =
      String(sortBy) === "startTime"
        ? { _stDate: dir }
        : { _tiDate: dir };
    const pipelineBase = [
      {
        $addFields: {
          _tiDate: {
            $convert: {
              input: { $ifNull: ["$createdAt", "$time_insert"] },
              to: "date",
              onError: null,
              onNull: null,
            },
          },
          _stDate: { $convert: { input: "$startTime", to: "date", onError: null, onNull: null } },
        },
      },
      { $match: match },
    ];
    if (from || to) {
      const range = {};
      if (from) range.$gte = toDate(from);
      if (to) range.$lte = toDate(to);
      pipelineBase.splice(1, 0, { $match: { _tiDate: range } });
    }
    const totalAgg = await filesRepo.col("test-runs").aggregate([...pipelineBase, { $count: "n" }]).toArray();
    const total = totalAgg[0]?.n || 0;
    const pipeline = [
      ...pipelineBase,
      { $sort: sort },
      { $skip: (Number(page) - 1) * Number(pageSize) },
      { $limit: Number(pageSize) },
    ];
    const items = await filesRepo.col("test-runs").aggregate(pipeline).toArray();
    res.json({ total, items: items.map((i) => ({ ...i, id: i._id })) });
  });

  router.get("/runs/:runId", async (req, res) => {
    const run = await filesRepo.col("test-runs").findOne({ runId: String(req.params.runId) });
    if (!run) return res.status(404).json({ message: "not_found" });
    res.json({ ...run, id: run._id });
  });

  router.post("/runs", async (req, res) => {
    const body = req.body || {};
    const createdAt = body.createdAt || new Date().toISOString();
    const doc = { ...body, createdAt };
    const result = await filesRepo.col("test-runs").insertOne(doc);
    const inserted = await filesRepo.col("test-runs").findOne({ _id: result.insertedId });
    res.status(201).json({ ...inserted, id: inserted._id });
  });

  router.post("/runs/bulk", async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ message: "empty_payload" });
    const docs = items.map((x) => ({ ...x, createdAt: x.createdAt || new Date().toISOString() }));
    const r = await filesRepo.insertMany("test-runs", docs);
    res.status(201).json({ inserted: r.inserted });
  });

  router.get("/cases", async (req, res) => {
    const { page = 1, pageSize = 20, runId, testCaseId, status, tag, q = "", from, to, sortBy = "createdAt", order = "desc" } = req.query;
    const dir = String(order).toLowerCase() === "asc" ? 1 : -1;
    const match = {};
    if (runId) match.runId = String(runId);
    if (testCaseId) match.testCaseId = String(testCaseId);
    if (status) match.status = String(status);
    if (tag) match.tags = String(tag);
    if (q) match.name = { $regex: String(q), $options: "i" };
    const sort =
      String(sortBy) === "duration"
        ? { _dur: dir }
        : { _tiDate: dir };
    const pipelineBase = [
      {
        $addFields: {
          _tiDate: {
            $convert: {
              input: { $ifNull: ["$createdAt", "$time_insert"] },
              to: "date",
              onError: null,
              onNull: null,
            },
          },
          _dur: { $convert: { input: "$duration", to: "int", onError: 0, onNull: 0 } },
        },
      },
      { $match: match },
    ];
    if (from || to) {
      const range = {};
      if (from) range.$gte = toDate(from);
      if (to) range.$lte = toDate(to);
      pipelineBase.splice(1, 0, { $match: { _tiDate: range } });
    }
    const totalAgg = await filesRepo.col("test-cases").aggregate([...pipelineBase, { $count: "n" }]).toArray();
    const total = totalAgg[0]?.n || 0;
    const pipeline = [
      ...pipelineBase,
      { $sort: sort },
      // always return all matched cases (no pagination)
    ];
    const items = await filesRepo.col("test-cases").aggregate(pipeline).toArray();
    const arr = items.map((i) => ({ ...i, id: i._id }));
    const tree = {};
    for (const it of arr) {
      const f = String(it.feature || "").trim();
      const segs = f ? f.split("/").filter(Boolean) : [];
      const top = segs[0] || "unknown";
      const second = segs.length >= 2 ? segs[1] : null;
      if (!second) {
        if (!Array.isArray(tree[top])) tree[top] = [];
        tree[top].push(it);
      } else {
        if (!tree[top] || typeof tree[top] !== "object" || Array.isArray(tree[top])) tree[top] = {};
        if (!Array.isArray(tree[top][second])) tree[top][second] = [];
        tree[top][second].push(it);
      }
    }
    res.json({ total, items: tree });
  });

  router.get("/cases/:testCaseId", async (req, res) => {
    const runId = String(req.query.runId || "");
    const q = { testCaseId: String(req.params.testCaseId) };
    if (runId) q.runId = runId;
    const doc = await filesRepo.col("test-cases").findOne(q);
    if (!doc) return res.status(404).json({ message: "not_found" });
    res.json({ ...doc, id: doc._id });
  });

  router.post("/cases/bulk", async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ message: "empty_payload" });
    const docs = items.map((x) => ({ ...x, createdAt: x.createdAt || new Date().toISOString() }));
    const r = await filesRepo.insertMany("test-cases", docs);
    res.status(201).json({ inserted: r.inserted });
  });

  router.get("/steps", async (req, res) => {
    const { page = 1, pageSize = 50, runId, testCaseId, order = "asc" } = req.query;
    const dir = String(order).toLowerCase() === "desc" ? -1 : 1;
    const match = {};
    if (runId) match.runId = String(runId);
    if (testCaseId) match.testCaseId = String(testCaseId);
    const pipeline = [
      {
        $addFields: {
          _order: { $convert: { input: "$stepOrder", to: "int", onError: 0, onNull: 0 } },
        },
      },
      { $match: match },
      { $sort: { _order: dir, _id: 1 } },
      { $skip: (Number(page) - 1) * Number(pageSize) },
      { $limit: Number(pageSize) },
    ];
    const items = await filesRepo.col("test-steps").aggregate(pipeline).toArray();

    function parseHeaderString(s) {
      const raw = String(s || "");
      const lines = raw.split(/\r?\n/).map((ln) => String(ln || "").trim()).filter(Boolean);
      const pairs = [];
      for (const ln of lines) {
        const cleaned = ln.replace(/\t+/g, "").trim();
        if (!cleaned) continue;
        const idx = cleaned.indexOf("=");
        if (idx <= 0) continue;
        const key = cleaned.slice(0, idx).trim();
        const value = cleaned.slice(idx + 1).trim();
        if (key) pairs.push([key, value]);
      }
      return pairs;
    }
    function safeQuote(s) {
      const raw = String(s == null ? "" : s);
      const esc = raw.replace(/'/g, `'"'"'`);
      return `'${esc}'`;
    }
    function buildCurl(reqObj) {
      if (!reqObj || typeof reqObj !== "object") return null;
      const method = String(reqObj.method || "").toUpperCase() || "GET";
      const url = String(reqObj.url || "").trim();
      const content = String(reqObj.content || "").trim();
      const contentType = String(reqObj.contentType || "").trim();
      const headerStr = String(reqObj.requestHeaders || "");
      const headers = parseHeaderString(headerStr);
      const headerMap = new Map(headers);
      if (contentType && !headerMap.has("Content-Type")) headerMap.set("Content-Type", contentType);
      function coerceTypes(v) {
        if (Array.isArray(v)) return v.map(coerceTypes);
        if (v && typeof v === "object") {
          const out = {};
          for (const [k, val] of Object.entries(v)) out[k] = coerceTypes(val);
          return out;
        }
        if (typeof v === "string") {
          const s = v.trim();
          if (/^-?\d+(\.\d+)?$/.test(s)) {
            const num = Number(s);
            if (!Number.isNaN(num)) return num;
          }
          return v;
        }
        return v;
      }
      let normalizedCompact = content;
      try {
        const parsed = JSON.parse(content);
        const coerced = coerceTypes(parsed);
        normalizedCompact = JSON.stringify(coerced);
      } catch {}
      const parts = [];
      parts.push(`curl --location ${safeQuote(url)}`);
      if (method && method !== "GET") parts.push(`--request ${safeQuote(method)}`);
      for (const [k, v] of headerMap.entries()) {
        parts.push(`--header ${safeQuote(`${k}: ${v}`)}`);
      }
      if (normalizedCompact) {
        parts.push(`--data ${safeQuote(normalizedCompact)}`);
      }
      return parts.join(" ");
    }

    const shaped = items.map((i) => {
      const req = i?.request || null;
      const cUrl = buildCurl(req);
      let nextReq = null;
      if (req) {
        let contentNormalized = null;
        try {
          const parsed = JSON.parse(String(req.content || ""));
          const coerced = (function coerceTypes(v) {
            if (Array.isArray(v)) return v.map(coerceTypes);
            if (v && typeof v === "object") {
              const out = {};
              for (const [k, val] of Object.entries(v)) out[k] = coerceTypes(val);
              return out;
            }
            if (typeof v === "string") {
              const s = v.trim();
              if (/^-?\d+(\.\d+)?$/.test(s)) {
                const num = Number(s);
                if (!Number.isNaN(num)) return num;
              }
              return v;
            }
            return v;
          })(parsed);
          contentNormalized = JSON.stringify(coerced, null, 2);
        } catch {}
        nextReq = { ...req, cUrl, contentNormalized };
      }
      return { ...i, id: i._id, request: nextReq || i.request };
    });

    res.json({ items: shaped });
  });

  router.post("/steps/bulk", async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ message: "empty_payload" });
    const docs = items.map((x) => ({ ...x, createdAt: x.createdAt || new Date().toISOString() }));
    const r = await filesRepo.insertMany("test-steps", docs);
    res.status(201).json({ inserted: r.inserted });
  });

  return router;
}
