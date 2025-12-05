import { Router } from "express";
import path from "node:path";

export function createFilesRouter({ filesRepo, summarizeDir }) {
  const router = Router();

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
        const dir = latest.path || latest.dir || latest.location || '';
        if (dir) summary = summarizeDir ? await summarizeDir(dir) : null;
      }
      result[key] = { latest, summary };
    }
    res.json(result);
  });

  router.get('/:collection', async (req, res) => {
    const { page = 1, pageSize = 20, from, to, sortBy = 'time_insert', order = 'desc' } = req.query;
    const collection = req.params.collection;
    const options = { page, pageSize, from, to, sortBy, order };
    const total = await filesRepo.count(collection, { from, to });
    const items = await filesRepo.find(collection, options);
    res.json({ total, items });
  });

  router.get('/:collection/latest-summary', async (req, res) => {
    const { collection } = req.params;
    const items = await filesRepo.find(collection, { page: 1, pageSize: 1 });
    const latest = items[0] || null;
    if (!latest) return res.json({ latest: null, summary: null });
    const dir = latest.path || latest.dir || latest.location || '';
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
    const dir = doc.path || doc.dir || doc.location || '';
    if (!dir) return res.status(404).json({ message: 'dir_not_found' });
    const subPath = req.params[0] || 'index.html';
    const fullPath = path.resolve(dir, subPath);
    const rel = path.relative(dir, fullPath);
    if (rel.startsWith('..')) return res.status(403).json({ message: 'forbidden' });
    res.sendFile(fullPath, (err) => {
      if (err) return res.status(err.statusCode || 500).json({ message: 'file_error' });
    });
  });

  return router;
}
