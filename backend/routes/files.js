import { Router } from "express";
import path from "node:path";
import fs from "node:fs";

export function createFilesRouter({ filesRepo, summarizeDir }) {
  const router = Router();

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
    if (collection === "global-qa" || collection === "qa" || collection.includes("qa")) {
      if (qaRootEnv) dir = replacePrefix(dir, "/data/global-qa/report_history", qaRootEnv);
      else dir = replacePrefix(dir, "/data/global-qa/report_history", "/mnt/d/Project/global-qa/report_history");
    } else if (collection === "global-cn" || collection === "cn" || collection.includes("cn")) {
      const cnFallback = "/mnt/d/Project/global-cn/report_history";
      dir = replacePrefix(dir, "/data/global-cn/report_history", cnRootEnv || cnFallback);
    }
    return dir;
  }

  async function pickExistingDir(collection, rawDir) {
    const candidates = [];
    const posix = toPosix(rawDir);
    if (posix) candidates.push(posix);
    const wsl = fromWindowsToWsl(posix);
    if (wsl && wsl !== posix) candidates.push(wsl);
    const mapped = resolveDirForCollection(collection, posix);
    if (mapped && !candidates.includes(mapped)) candidates.push(mapped);
    for (const d of candidates) {
      try {
        if (fs.existsSync(d)) return d;
      } catch {}
    }
    return posix;
  }

  router.get('/latest-summary', async (req, res) => {
    const collections = [
      { key: 'qa', col: 'global-qa' },
      { key: 'cn', col: 'global-cn' },
    ];
    const result = {};
    for (const { key, col } of collections) {
      const items = await filesRepo.find(col, { page: 1, pageSize: 1 });
      const latest = items[0] || null;
      let summary = null;
      if (latest) {
        const rawDir = latest.path || latest.dir || latest.location || '';
        const dir = await pickExistingDir(col, rawDir);
        if (dir) summary = summarizeDir ? await summarizeDir(dir) : null;
      }
      result[key] = { latest, summary };
    }
    res.json(result);
  });

  router.get('/:collection', async (req, res) => {
    const { page = 1, pageSize = 20, sortBy = 'time_insert', order = 'desc', name = '' } = req.query;
    // Support multiple param formats:
    // - Legacy: from/to (ISO)
    // - Alias: startTime/endTime (ISO)
    // - New: timeStart/timeEnd (dd-mm-yyyy, local date)
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
    const collection = req.params.collection;
    const options = { page, pageSize, from, to, sortBy, order, name };
    const total = await filesRepo.count(collection, { from, to, name });
    const items = await filesRepo.find(collection, options);
    res.json({ total, items });
  });

  router.get('/:collection/latest-summary', async (req, res) => {
    const { collection } = req.params;
    const items = await filesRepo.find(collection, { page: 1, pageSize: 1 });
    const latest = items[0] || null;
    if (!latest) return res.json({ latest: null, summary: null });
    const rawDir = latest.path || latest.dir || latest.location || '';
    const dir = await pickExistingDir(collection, rawDir);
    if (!dir) return res.json({ latest, summary: null });
    const summary = summarizeDir ? await summarizeDir(dir) : null;
    res.json({ latest, summary });
  });

  router.get('/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    const doc = await filesRepo.findById(collection, id);
    if (!doc) return res.status(404).json({ message: 'not_found' });
    res.json(doc);
  });

  router.get('/:collection/:id/static/*', async (req, res) => {
    const { collection, id } = req.params;
    const doc = await filesRepo.findById(collection, id);
    if (!doc) return res.status(404).json({ message: 'not_found' });
    const rawDir = doc.path || doc.dir || doc.location || '';
    const dir = await pickExistingDir(collection, rawDir);
    if (!dir) return res.status(404).json({ message: 'dir_not_found' });
    const subPath = req.params[0] || 'index.html';
    const tryDirs = [dir];
    const altDir1 = resolveDirForCollection(collection, rawDir);
    if (altDir1 && !tryDirs.includes(altDir1)) tryDirs.push(altDir1);
    const altDir2 = fromWindowsToWsl(rawDir);
    if (altDir2 && !tryDirs.includes(altDir2)) tryDirs.push(altDir2);
    for (const base of tryDirs) {
      try {
        const fullPath = path.resolve(base, subPath);
        const rel = path.relative(base, fullPath);
        if (rel.startsWith('..')) continue;
        if (fs.existsSync(fullPath)) {
          return res.sendFile(fullPath, (err) => {
            if (err) return res.status(err.statusCode || 500).json({ message: 'file_error' });
          });
        }
      } catch {}
    }
    return res.status(404).json({ message: 'file_error' });
  });

  return router;
}
