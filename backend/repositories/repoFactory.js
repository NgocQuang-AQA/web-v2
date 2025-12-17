import mongoose from "mongoose";
import Report from "../models/Report.js";
import TestRun from "../models/TestRun.js";
import { FilesRepoMongo } from "./filesRepo.js";
import crypto from "node:crypto";

class ReportsRepoMongo {
  async count(filter) {
    return Report.countDocuments(filter);
  }
  async find(filter, { page = 1, pageSize = 20 } = {}) {
    const items = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .lean();
    return items.map((i) => ({ ...i, id: i._id }));
  }
  async findById(id) {
    try {
      const doc = await Report.findById(id).lean();
      return doc ? { ...doc, id: doc._id } : null;
    } catch (e) {
      return null;
    }
  }
  async create(body) {
    const created = await Report.create(body);
    const obj = created.toObject();
    return { ...obj, id: obj._id };
  }
  async stats({ from, to } = {}) {
    const match = {};
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
    const byStatus = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          durationMs: { $sum: { $ifNull: ["$durationMs", 0] } },
        },
      },
    ]);
    const map = Object.fromEntries(byStatus.map((x) => [x._id, x.count]));
    const totalDuration = byStatus.reduce((a, b) => a + (b.durationMs || 0), 0);
    const failedCount = map.failed || 0;
    const passedCount = map.passed || 0;
    const denom = passedCount + failedCount;
    const successRate = denom ? Math.round((passedCount / denom) * 100) : 0;
    const flakyAgg = await Report.aggregate([
      { $match: match },
      { $group: { _id: "$name", statuses: { $addToSet: "$status" } } },
      { $match: { statuses: { $all: ["passed", "failed"] } } },
      { $count: "count" },
    ]);
    const flakyCount = flakyAgg[0]?.count || 0;
    return {
      successRate,
      failedCount,
      flakyCount,
      totalRuntimeMinutes: Math.round(totalDuration / 60000),
    };
  }
  async suites({ from, to, page = 1, pageSize = 20 } = {}) {
    const match = {};
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
    const start = (Number(page) - 1) * Number(pageSize);
    const agg = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$suite",
          passed: { $sum: { $cond: [{ $eq: ["$status", "passed"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
          durationMs: { $sum: { $ifNull: ["$durationMs", 0] } },
          startedAt: { $min: "$startedAt" },
          finishedAt: { $max: "$finishedAt" },
          totalTests: { $sum: 1 },
        },
      },
      { $sort: { finishedAt: -1 } },
      { $skip: start },
      { $limit: Number(pageSize) },
    ]);
    return agg.map((x) => {
      const total = x.passed + x.failed + x.skipped;
      const percent = total ? Math.round((x.passed / total) * 100) : 0;
      const status = x.failed === 0 ? "passed" : x.passed === 0 ? "failed" : "partial";
      return {
        id: String(x._id || ""),
        name: String(x._id || ""),
        status,
        startedAt: x.startedAt || null,
        durationMs: x.durationMs || 0,
        passed: x.passed || 0,
        failed: x.failed || 0,
        flaky: 0,
        percent,
        totalTests: x.totalTests || 0,
      };
    });
  }
  async flaky({ from, to, page = 1, pageSize = 20 } = {}) {
    const match = {};
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
    const start = (Number(page) - 1) * Number(pageSize);
    const agg = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$name",
          suites: { $addToSet: "$suite" },
          statuses: { $addToSet: "$status" },
          failures: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          lastSeen: { $max: { $ifNull: ["$finishedAt", "$updatedAt"] } },
          firstSeen: { $min: { $ifNull: ["$startedAt", "$createdAt"] } },
        },
      },
      { $match: { statuses: { $all: ["passed", "failed"] } } },
      { $sort: { lastSeen: -1 } },
      { $skip: start },
      { $limit: Number(pageSize) },
    ]);
    return agg.map((x) => ({
      id: String(x._id || ""),
      title: String(x._id || ""),
      suite: String((x.suites && x.suites[0]) || ""),
      failures: x.failures || 0,
      lastSeen: x.lastSeen || null,
      trendMs: x.lastSeen && x.firstSeen ? new Date(x.lastSeen).getTime() - new Date(x.firstSeen).getTime() : 0,
    }));
  }

  async historySessions({ from, to, page = 1, pageSize = 20 } = {}) {
    const match = { testRun: { $ne: null } };
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);

    const start = (Number(page) - 1) * Number(pageSize);
    const agg = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$testRun",
          passed: { $sum: { $cond: [{ $eq: ["$status", "passed"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
          durationMs: { $sum: { $ifNull: ["$durationMs", 0] } },
          startedAt: { $min: { $ifNull: ["$startedAt", "$createdAt"] } },
          finishedAt: { $max: { $ifNull: ["$finishedAt", "$updatedAt"] } },
          suiteSet: { $addToSet: "$suite" },
          createdAt: { $min: "$createdAt" },
          updatedAt: { $max: "$updatedAt" },
        },
      },
      { $sort: { finishedAt: -1 } },
      { $skip: start },
      { $limit: Number(pageSize) },
    ]);

    return agg.map((x) => {
      const passed = x.passed || 0;
      const failed = x.failed || 0;
      const skipped = x.skipped || 0;
      const totalTests = passed + failed + skipped;
      const percent = totalTests ? Math.round((passed / totalTests) * 100) : 0;
      const status = failed > 0 ? "failed" : totalTests > 0 && skipped === 0 ? "passed" : totalTests > 0 ? "partial" : "unknown";
      return {
        session: String(x._id || ""),
        status,
        passed,
        failed,
        skipped,
        totalTests,
        percent,
        durationMs: x.durationMs || 0,
        suiteCount: Array.isArray(x.suiteSet) ? x.suiteSet.filter(Boolean).length : 0,
        startedAt: x.startedAt || null,
        finishedAt: x.finishedAt || null,
        createdAt: x.createdAt || null,
        updatedAt: x.updatedAt || null,
      };
    });
  }
}

class TestRunsRepoMongo {
  async create(body) {
    const created = await TestRun.create(body);
    const obj = created.toObject();
    return { ...obj, id: obj._id };
  }
}

class ReportsRepoMemory {
  constructor() {
    this.items = [];
  }
  async count(filter) {
    return this.items.filter((i) =>
      !filter || Object.keys(filter).every((k) => i[k] === filter[k])
    ).length;
  }
  async find(filter, { page = 1, pageSize = 20 } = {}) {
    const all = this.items
      .filter((i) => !filter || Object.keys(filter).every((k) => i[k] === filter[k]))
      .sort((a, b) => b.createdAt - a.createdAt);
    const start = (Number(page) - 1) * Number(pageSize);
    return all.slice(start, start + Number(pageSize));
  }
  async findById(id) {
    return this.items.find((i) => i.id === id) || null;
  }
  async create(body) {
    const now = new Date();
    const item = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...body,
    };
    this.items.push(item);
    return item;
  }
  async stats({ from, to } = {}) {
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    const items = this.items.filter((i) => (!fromD || i.createdAt >= fromD) && (!toD || i.createdAt <= toD));
    const counts = items.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      acc.durationMs = (acc.durationMs || 0) + (i.durationMs || 0);
      return acc;
    }, {});
    const failedCount = counts.failed || 0;
    const passedCount = counts.passed || 0;
    const denom = passedCount + failedCount;
    const successRate = denom ? Math.round((passedCount / denom) * 100) : 0;
    const byName = new Map();
    for (const i of items) {
      const s = byName.get(i.name) || new Set();
      s.add(i.status);
      byName.set(i.name, s);
    }
    const flakyCount = Array.from(byName.values()).filter((s) => s.has("passed") && s.has("failed")).length;
    return { successRate, failedCount, flakyCount, totalRuntimeMinutes: Math.round((counts.durationMs || 0) / 60000) };
  }
  async suites({ from, to, page = 1, pageSize = 20 } = {}) {
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    const items = this.items.filter((i) => (!fromD || i.createdAt >= fromD) && (!toD || i.createdAt <= toD));
    const bySuite = new Map();
    for (const i of items) {
      const x = bySuite.get(i.suite) || { passed: 0, failed: 0, skipped: 0, durationMs: 0, startedAt: i.startedAt, finishedAt: i.finishedAt, totalTests: 0 };
      if (i.status === "passed") x.passed++;
      else if (i.status === "failed") x.failed++;
      else if (i.status === "skipped") x.skipped++;
      x.durationMs += i.durationMs || 0;
      x.startedAt = x.startedAt && i.startedAt ? (x.startedAt < i.startedAt ? x.startedAt : i.startedAt) : (x.startedAt || i.startedAt);
      x.finishedAt = x.finishedAt && i.finishedAt ? (x.finishedAt > i.finishedAt ? x.finishedAt : i.finishedAt) : (x.finishedAt || i.finishedAt);
      x.totalTests++;
      bySuite.set(i.suite, x);
    }
    const arr = Array.from(bySuite.entries()).map(([k, v]) => {
      const total = v.passed + v.failed + v.skipped;
      const percent = total ? Math.round((v.passed / total) * 100) : 0;
      const status = v.failed === 0 ? "passed" : v.passed === 0 ? "failed" : "partial";
      return { id: k, name: k, status, startedAt: v.startedAt || null, durationMs: v.durationMs || 0, passed: v.passed, failed: v.failed, flaky: 0, percent, totalTests: v.totalTests };
    });
    arr.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    const start = (Number(page) - 1) * Number(pageSize);
    return arr.slice(start, start + Number(pageSize));
  }
  async flaky({ from, to, page = 1, pageSize = 20 } = {}) {
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    const items = this.items.filter((i) => (!fromD || i.createdAt >= fromD) && (!toD || i.createdAt <= toD));
    const byName = new Map();
    for (const i of items) {
      const x = byName.get(i.name) || { suites: new Set(), statuses: new Set(), failures: 0, lastSeen: i.finishedAt || i.updatedAt, firstSeen: i.startedAt || i.createdAt };
      x.suites.add(i.suite);
      x.statuses.add(i.status);
      if (i.status === "failed") x.failures++;
      x.lastSeen = x.lastSeen && i.finishedAt ? (x.lastSeen > i.finishedAt ? x.lastSeen : i.finishedAt) : (x.lastSeen || i.finishedAt || i.updatedAt);
      x.firstSeen = x.firstSeen && i.startedAt ? (x.firstSeen < i.startedAt ? x.firstSeen : i.startedAt) : (x.firstSeen || i.startedAt || i.createdAt);
      byName.set(i.name, x);
    }
    const arr = Array.from(byName.entries())
      .filter(([, v]) => v.statuses.has("passed") && v.statuses.has("failed"))
      .map(([k, v]) => ({ id: k, title: k, suite: Array.from(v.suites)[0] || "", failures: v.failures, lastSeen: v.lastSeen || null, trendMs: (v.lastSeen && v.firstSeen ? new Date(v.lastSeen).getTime() - new Date(v.firstSeen).getTime() : 0) }));
    arr.sort((a, b) => (new Date(b.lastSeen).getTime() || 0) - (new Date(a.lastSeen).getTime() || 0));
    const start = (Number(page) - 1) * Number(pageSize);
    return arr.slice(start, start + Number(pageSize));
  }

  async historySessions({ from, to, page = 1, pageSize = 20 } = {}) {
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    const toMs = (v) => {
      if (!v) return null;
      const d = new Date(v);
      const ms = d.getTime();
      return Number.isNaN(ms) ? null : ms;
    };
    const items = this.items.filter((i) => {
      if (!i.testRun) return false;
      if (!fromD && !toD) return true;
      const ms = toMs(i.createdAt);
      if (ms == null) return false;
      if (fromD && ms < fromD.getTime()) return false;
      if (toD && ms > toD.getTime()) return false;
      return true;
    });

    const byRun = new Map();
    for (const i of items) {
      const runId = String(i.testRun || "");
      if (!runId) continue;
      const x = byRun.get(runId) || {
        session: runId,
        passed: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
        startedAt: i.startedAt || i.createdAt || null,
        finishedAt: i.finishedAt || i.updatedAt || null,
        suiteSet: new Set(),
        createdAt: i.createdAt || null,
        updatedAt: i.updatedAt || null,
      };

      if (i.status === "passed") x.passed++;
      else if (i.status === "failed") x.failed++;
      else if (i.status === "skipped") x.skipped++;
      x.durationMs += i.durationMs || 0;

      const saMs = toMs(i.startedAt || i.createdAt);
      const curSaMs = toMs(x.startedAt);
      if (saMs != null && (curSaMs == null || saMs < curSaMs)) x.startedAt = new Date(saMs);

      const faMs = toMs(i.finishedAt || i.updatedAt);
      const curFaMs = toMs(x.finishedAt);
      if (faMs != null && (curFaMs == null || faMs > curFaMs)) x.finishedAt = new Date(faMs);
      if (i.suite) x.suiteSet.add(i.suite);

      const caMs = toMs(i.createdAt);
      const curCaMs = toMs(x.createdAt);
      if (caMs != null && (curCaMs == null || caMs < curCaMs)) x.createdAt = new Date(caMs);

      const uaMs = toMs(i.updatedAt);
      const curUaMs = toMs(x.updatedAt);
      if (uaMs != null && (curUaMs == null || uaMs > curUaMs)) x.updatedAt = new Date(uaMs);

      byRun.set(runId, x);
    }

    const arr = Array.from(byRun.values()).map((x) => {
      const totalTests = x.passed + x.failed + x.skipped;
      const percent = totalTests ? Math.round((x.passed / totalTests) * 100) : 0;
      const status = x.failed > 0 ? "failed" : totalTests > 0 && x.skipped === 0 ? "passed" : totalTests > 0 ? "partial" : "unknown";
      return {
        session: x.session,
        status,
        passed: x.passed,
        failed: x.failed,
        skipped: x.skipped,
        totalTests,
        percent,
        durationMs: x.durationMs,
        suiteCount: x.suiteSet.size,
        startedAt: x.startedAt,
        finishedAt: x.finishedAt,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
      };
    });

    arr.sort((a, b) => (new Date(b.finishedAt || b.updatedAt || 0).getTime() || 0) - (new Date(a.finishedAt || a.updatedAt || 0).getTime() || 0));
    const start = (Number(page) - 1) * Number(pageSize);
    return arr.slice(start, start + Number(pageSize));
  }
}

class TestRunsRepoMemory {
  constructor() {
    this.items = [];
  }
  async create(body) {
    const now = new Date();
    const item = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...body };
    this.items.push(item);
    return item;
  }
}

class FilesRepoMemory {
  constructor() {
    this.store = new Map();
  }
  list(collection) {
    if (!this.store.has(collection)) this.store.set(collection, []);
    return this.store.get(collection);
  }
  async count(collection, filter = {}) {
    const { from, to, name } = filter || {};
    if (!from && !to && !name) return this.list(collection).length;
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    const nameLower = typeof name === "string" && name ? String(name).toLowerCase() : "";
    const getMs = (v) => {
      if (v == null) return null;
      if (typeof v === "number") return v;
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
      const d = Date.parse(String(v));
      return Number.isNaN(d) ? null : d;
    };
    return this.list(collection).filter((i) => {
      const ms = getMs(i.time_insert);
      if (ms == null && (fromD || toD)) return false;
      if (fromD && ms < fromD.getTime()) return false;
      if (toD && ms > toD.getTime()) return false;
      if (nameLower) {
        const n = String(i.name || "").toLowerCase();
        if (!n.includes(nameLower)) return false;
      }
      return true;
    }).length;
  }
  async find(collection, { page = 1, pageSize = 20, from, to, sortBy = "time_insert", order = "desc", name } = {}) {
    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    const dir = String(order).toLowerCase() === "asc" ? 1 : -1;
    const nameLower = typeof name === "string" && name ? String(name).toLowerCase() : "";
    const getMs = (v) => {
      if (v == null) return null;
      if (typeof v === "number") return v;
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
      const d = Date.parse(String(v));
      return Number.isNaN(d) ? null : d;
    };
    const getSize = (v) => {
      if (v == null || v === "") return 0;
      if (typeof v === "number") return v;
      const n = Number(v);
      return Number.isNaN(n) ? 0 : n;
    };
    const list = this.list(collection).slice().filter((i) => {
      const ms = getMs(i.time_insert);
      if (!fromD && !toD && !nameLower) return true;
      if (ms == null && (fromD || toD)) return false;
      if (fromD && ms < fromD.getTime()) return false;
      if (toD && ms > toD.getTime()) return false;
      if (nameLower) {
        const n = String(i.name || "").toLowerCase();
        if (!n.includes(nameLower)) return false;
      }
      return true;
    });
    const all = list.sort((a, b) => {
      if (String(sortBy) === "name") {
        const an = String(a.name || "");
        const bn = String(b.name || "");
        return dir * (an.localeCompare(bn));
      }
      if (String(sortBy) === "size") {
        const as = getSize(a.size);
        const bs = getSize(b.size);
        return dir * (as - bs);
      }
      const at = getMs(a.time_insert) || 0;
      const bt = getMs(b.time_insert) || 0;
      return dir * (at - bt);
    });
    const start = (Number(page) - 1) * Number(pageSize);
    return all.slice(start, start + Number(pageSize));
  }
  async findById(collection, id) {
    return this.list(collection).find((i) => i.id === id || i._id === id) || null;
  }
  async insertMany(collection, items) {
    const list = this.list(collection);
    for (const it of items) list.push({ id: crypto.randomUUID(), ...it });
    return { inserted: items.length };
  }
}

export async function createRepos({ provider = "auto", mongoUri, dbName }) {
  console.log("provider", provider);
  
  if (provider === "mongo" || provider === "auto") {
    try {
      if (mongoUri) {
        await mongoose.connect(mongoUri);
        return {
          reportsRepo: new ReportsRepoMongo(),
          testRunsRepo: new TestRunsRepoMongo(),
          filesRepo: new FilesRepoMongo(dbName || mongoose.connection.name),
          provider: "mongo",
        };
      }
    } catch (e) {
      console.error("Mongo connection failed:", e);
    }
  }
  return {
    reportsRepo: new ReportsRepoMemory(),
    testRunsRepo: new TestRunsRepoMemory(),
    filesRepo: new FilesRepoMemory(),
    provider: "memory",
  };
}
