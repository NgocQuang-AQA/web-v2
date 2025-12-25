import { Router } from "express";
import path from "node:path";
import fs from "node:fs";

export function createFilesRouter({ filesRepo, summarizeDir }) {
  const router = Router();

  const isDebug = String(process.env.FILES_DEBUG || "").toLowerCase() === "1" || String(process.env.FILES_DEBUG || "").toLowerCase() === "true";
  const dlog = (...args) => { if (isDebug) console.log("[files]", ...args); };

  function toPosix(p) {
    if (!p) return "";
    return String(p).replace(/\\/g, "/");
  }

  function fromWindowsToWsl(p) {
    const s = toPosix(p);
    const m = s.match(/^([A-Za-z]):\/(.*)$/);
    if (!m) return s;
    const drive = m[1].toLowerCase();
    return `/mnt/${drive}/${m[2]}`;
  }

  function replacePrefix(s, fromPrefix, toPrefix) {
    const src = toPosix(s);
    const from = toPosix(fromPrefix);
    const to = toPosix(toPrefix);
    if (src.startsWith(from)) {
      const rest = src.slice(from.length);
      return to + rest;
    }
    return src;
  }

  function resolveDirForCollection(collection, rawDir) {
    let dir = toPosix(rawDir || "");
    if (!dir) return "";
    dir = fromWindowsToWsl(dir);
    const qaRootEnv = toPosix(process.env.SERENITY_HISTORY_DIR || "");
    const cnRootEnv = toPosix(process.env.SERENITY_HISTORY_DIR_CN || (qaRootEnv ? qaRootEnv.replace("global-qa", "global-cn") : ""));
    const col = String(collection || "").toLowerCase();
    if (col.includes("cn") || col === "cn") {
      const cnFallback = "/mnt/d/Project/global-cn/report_history";
      const cnRoot = cnRootEnv || cnFallback;
      dir = replacePrefix(dir, "/data/global-cn/report_history", cnRoot);
      dir = replacePrefix(dir, "/data/global-cn-live/report_history", cnRoot);
    } else if (col.includes("qa") || col.includes("global") || col === "qa") {
      const qaFallback = "/mnt/d/Project/global-qa/report_history";
      const qaRoot = qaRootEnv || qaFallback;
      dir = replacePrefix(dir, "/data/global-qa/report_history", qaRoot);
      dir = replacePrefix(dir, "/data/global-live/report_history", qaRoot);
    }
    return dir;
  }

  function normalizeCollectionName(name) {
    const s = String(name || "").toLowerCase();
    if (s === "global-cn") return "cn-qa";
    if (s === "global-cn-live") return "cn-live";
    return name;
  }

  async function pickExistingDir(collection, rawDir) {
    const candidates = [];
    const posix = toPosix(rawDir);
    if (posix) candidates.push(posix);
    const wsl = fromWindowsToWsl(posix);
    if (wsl && wsl !== posix) candidates.push(wsl);
    const mapped = resolveDirForCollection(collection, posix);
    if (mapped && !candidates.includes(mapped)) candidates.push(mapped);
    dlog("pickExistingDir", { collection, rawDir: posix, candidates });
    for (const d of candidates) {
      try {
        const ok = fs.existsSync(d);
        dlog("exists", d, ok);
        if (ok) return d;
      } catch {}
    }
    return posix;
  }

  router.get('/latest-summary', async (req, res) => {
    const collections = [
      { key: 'qa', col: 'global-qa' },
      { key: 'cn', col: 'cn-qa' },
      { key: 'live', col: 'global-live' },
      { key: 'cn-live', col: 'cn-live' },
    ];
    const result = {};
    for (const { key, col } of collections) {
      const items = await filesRepo.find(col, { page: 1, pageSize: 1 });
      const latest = items[0] || null;
      let summary = null;
      if (latest) {
        const rawDir = latest.path || latest.dir || latest.location || '';
        dlog("latest-summary", { collection: col, latest: latest?.id, rawDir });
        const dir = await pickExistingDir(col, rawDir);
        if (dir) summary = summarizeDir ? await summarizeDir(dir) : null;
      }
      result[key] = { latest, summary };
    }
    res.json(result);
  });

  router.get('/:collection', async (req, res) => {
    const { page = 1, pageSize = 20, sortBy = 'time_insert', order = 'desc', name = '' } = req.query;
    const parseDMY = (s) => {
      if (!s || typeof s !== 'string') return null;
      const parts = s.split('-');
      if (parts.length !== 3) return null;
      const [dd, mm, yyyy] = parts.map((x) => Number(x));
      if (!dd || !mm || !yyyy) return null;
      const start = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
      if (Number.isNaN(start.getTime())) return null;
      return start;
    };
    const startD = parseDMY(req.query.timeStart);
    const endD = parseDMY(req.query.timeEnd);
    const endOfDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    const fromDMY = startD ? startD.toISOString() : '';
    const toDMY = endD ? endOfDay(endD).toISOString() : '';
    const from = req.query.from || req.query.startTime || fromDMY || '';
    const to = req.query.to || req.query.endTime || toDMY || '';
    const collectionRaw = req.params.collection;
    const collection = normalizeCollectionName(collectionRaw);
    const options = { page, pageSize, from, to, sortBy, order, name };
    const total = await filesRepo.count(collection, { from, to, name });
    const items = await filesRepo.find(collection, options);
    res.json({ total, items });
  });

  router.get('/:collection/latest-summary', async (req, res) => {
    const { collection: collectionRaw } = req.params;
    const collection = normalizeCollectionName(collectionRaw);
    const items = await filesRepo.find(collection, { page: 1, pageSize: 1 });
    const latest = items[0] || null;
    if (!latest) return res.json({ latest: null, summary: null });
    const rawDir = latest.path || latest.dir || latest.location || '';
    dlog("collection-latest-summary", { collection, latest: latest?.id, rawDir });
    const dir = await pickExistingDir(collection, rawDir);
    if (!dir) return res.json({ latest, summary: null });
    const summary = summarizeDir ? await summarizeDir(dir) : null;
    res.json({ latest, summary });
  });

  router.get('/:collection/:id', async (req, res) => {
    const { collection: collectionRaw, id } = req.params;
    const collection = normalizeCollectionName(collectionRaw);
    const doc = await filesRepo.findById(collection, id);
    if (!doc) return res.status(404).json({ message: 'not_found' });
    res.json(doc);
  });

  router.get('/:collection/:id/latest-summary', async (req, res) => {
    const { collection: collectionRaw, id } = req.params;
    const collection = normalizeCollectionName(collectionRaw);
    const doc = await filesRepo.findById(collection, id);
    if (!doc) return res.status(404).json({ message: 'not_found' });
    const rawDir = doc.path || doc.dir || doc.location || '';
    dlog("id-latest-summary", { collection, id, rawDir });
    const dir = await pickExistingDir(collection, rawDir);
    if (!dir) return res.json({ latest: doc, summary: null });
    const summary = summarizeDir ? await summarizeDir(dir) : null;
    res.json({ latest, summary });
  });

  router.get('/:collection/:id/static/*', async (req, res) => {
    const { collection: collectionRaw, id } = req.params;
    const collection = normalizeCollectionName(collectionRaw);
    const doc = await filesRepo.findById(collection, id);
    if (!doc) return res.status(404).json({ message: 'not_found' });
    const rawDir = doc.path || doc.dir || doc.location || '';
    dlog("static", { collection, id, rawDir });
    const dir = await pickExistingDir(collection, rawDir);
    if (!dir) return res.status(404).json({ message: 'dir_not_found' });
    const subPath = req.params[0] || 'index.html';
    const tryDirs = [dir];
    const altDir1 = resolveDirForCollection(collection, rawDir);
    if (altDir1 && !tryDirs.includes(altDir1)) tryDirs.push(altDir1);
    const altDir2 = fromWindowsToWsl(rawDir);
    if (altDir2 && !tryDirs.includes(altDir2)) tryDirs.push(altDir2);
    dlog("static-try", { subPath, tryDirs });
    for (const base of tryDirs) {
      try {
        const fullPath = path.resolve(base, subPath);
        const rel = path.relative(base, fullPath);
        if (rel.startsWith('..')) {
          dlog("skip-rel", { base, fullPath, rel });
          continue;
        }
        const ok = fs.existsSync(fullPath);
        dlog("probe-file", { base, fullPath, ok });
        if (ok) {
          return res.sendFile(fullPath, (err) => {
            if (err) {
              dlog("sendFile-error", { fullPath, err: String(err) });
              return res.status(err.statusCode || 500).json({ message: 'file_error' });
            }
          });
        }
      } catch {}
    }
    dlog("not-found", { id, subPath, tried: tryDirs });
    return res.status(404).json({ message: 'file_error' });
  });

  return router;
}

export function createFilesStaticRouter({ filesRepo }) {
  const router = Router();

  const isDebug = String(process.env.FILES_DEBUG || "").toLowerCase() === "1" || String(process.env.FILES_DEBUG || "").toLowerCase() === "true";
  const dlog = (...args) => { if (isDebug) console.log("[files-static]", ...args); };

  function toPosix(p) {
    if (!p) return "";
    return String(p).replace(/\\/g, "/");
  }

  function fromWindowsToWsl(p) {
    const s = toPosix(p);
    const m = s.match(/^([A-Za-z]):\/(.*)$/);
    if (!m) return s;
    const drive = m[1].toLowerCase();
    return `/mnt/${drive}/${m[2]}`;
  }

  function replacePrefix(s, fromPrefix, toPrefix) {
    const src = toPosix(s);
    const from = toPosix(fromPrefix);
    const to = toPosix(toPrefix);
    if (src.startsWith(from)) {
      const rest = src.slice(from.length);
      return to + rest;
    }
    return src;
  }

  function resolveDirForCollection(collection, rawDir) {
    let dir = toPosix(rawDir || "");
    if (!dir) return "";
    dir = fromWindowsToWsl(dir);
    const qaRootEnv = toPosix(process.env.SERENITY_HISTORY_DIR || "");
    const cnRootEnv = toPosix(process.env.SERENITY_HISTORY_DIR_CN || (qaRootEnv ? qaRootEnv.replace("global-qa", "global-cn") : ""));
    const col = String(collection || "").toLowerCase();
    if (col.includes("cn") || col === "cn") {
      const cnFallback = "/mnt/d/Project/global-cn/report_history";
      const cnRoot = cnRootEnv || cnFallback;
      dir = replacePrefix(dir, "/data/global-cn/report_history", cnRoot);
      dir = replacePrefix(dir, "/data/global-cn-live/report_history", cnRoot);
    } else if (col.includes("qa") || col.includes("global") || col === "qa") {
      const qaFallback = "/mnt/d/Project/global-qa/report_history";
      const qaRoot = qaRootEnv || qaFallback;
      dir = replacePrefix(dir, "/data/global-qa/report_history", qaRoot);
      dir = replacePrefix(dir, "/data/global-live/report_history", qaRoot);
    }
    return dir;
  }

  function normalizeCollectionName(name) {
    const s = String(name || "").toLowerCase();
    if (s === "global-cn") return "cn-qa";
    if (s === "global-cn-live") return "cn-live";
    return name;
  }

  async function pickExistingDir(collection, rawDir) {
    const candidates = [];
    const posix = toPosix(rawDir);
    if (posix) candidates.push(posix);
    const wsl = fromWindowsToWsl(posix);
    if (wsl && wsl !== posix) candidates.push(wsl);
    const mapped = resolveDirForCollection(collection, posix);
    if (mapped && !candidates.includes(mapped)) candidates.push(mapped);
    dlog("pickExistingDir", { collection, rawDir: posix, candidates });
    for (const d of candidates) {
      try {
        const ok = fs.existsSync(d);
        dlog("exists", d, ok);
        if (ok) return d;
      } catch {}
    }
    return posix;
  }

  router.get('/:collection/:id/static/*', async (req, res) => {
    const { collection: collectionRaw, id } = req.params;
    const collection = normalizeCollectionName(collectionRaw);
    const doc = await filesRepo.findById(collection, id);
    if (!doc) return res.status(404).json({ message: 'not_found' });
    const rawDir = doc.path || doc.dir || doc.location || '';
    dlog("static", { collection, id, rawDir });
    const dir = await pickExistingDir(collection, rawDir);
    if (!dir) return res.status(404).json({ message: 'dir_not_found' });
    const subPath = req.params[0] || 'index.html';
    const tryDirs = [dir];
    const altDir1 = resolveDirForCollection(collection, rawDir);
    if (altDir1 && !tryDirs.includes(altDir1)) tryDirs.push(altDir1);
    const altDir2 = fromWindowsToWsl(rawDir);
    if (altDir2 && !tryDirs.includes(altDir2)) tryDirs.push(altDir2);
    dlog("static-try", { subPath, tryDirs });
    for (const base of tryDirs) {
      try {
        const fullPath = path.resolve(base, subPath);
        const rel = path.relative(base, fullPath);
        if (rel.startsWith('..')) {
          dlog("skip-rel", { base, fullPath, rel });
          continue;
        }
        const ok = fs.existsSync(fullPath);
        dlog("probe-file", { base, fullPath, ok });
        if (ok) {
          return res.sendFile(fullPath, (err) => {
            if (err) {
              dlog("sendFile-error", { fullPath, err: String(err) });
              return res.status(err.statusCode || 500).json({ message: 'file_error' });
            }
          });
        }
      } catch {}
    }
    dlog("not-found", { id, subPath, tried: tryDirs });
    return res.status(404).json({ message: 'file_error' });
  });

  return router;
}
