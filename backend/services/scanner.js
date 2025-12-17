import fs from "node:fs/promises";
import path from "node:path";
let reportsRepoRef;

const reportsDir = path.resolve(process.cwd(), "tests", "reports");
const isDebug = String(process.env.FILES_DEBUG || "").toLowerCase() === "1" || String(process.env.FILES_DEBUG || "").toLowerCase() === "true";
const dlog = (...args) => { if (isDebug) console.log("[scanner]", ...args); };

function ensureArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  return [x];
}

function mapStatus(s) {
  const v = String(s || "").toLowerCase();
  if (["success", "passed", "pass"].includes(v)) return "passed";
  if (["failure", "failed"].includes(v)) return "failed";
  if (["error", "broken", "unstable"].includes(v)) return "broken";
  if (["skipped", "pending", "ignored"].includes(v)) return "skipped";
  return v || "unknown";
}

function toDate(x) {
  if (!x) return undefined;
  try {
    const d = new Date(x);
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

function toDurationMs(x) {
  if (!x && x !== 0) return undefined;
  if (typeof x === "number") return x;
  const s = String(x);
  const m = s.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (m) {
    const h = m[3] ? Number(m[1]) : 0;
    const mm = m[3] ? Number(m[2]) : Number(m[1]);
    const ss = m[3] ? Number(m[3]) : Number(m[2]);
    return h * 3600000 + mm * 60000 + ss * 1000;
  }
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

async function listDirs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
    const stats = await Promise.all(dirs.map(async (d) => ({ d, st: await fs.stat(d) })));
    stats.sort((a, b) => b.st.mtimeMs - a.st.mtimeMs);
    return stats.map((x) => x.d);
  } catch {
    return [];
  }
}

async function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    try {
      const entries = await fs.readdir(cur, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(cur, e.name);
        if (e.isDirectory()) stack.push(p);
        else out.push(p);
      }
    } catch { }
  }
  return out;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch { }
  const m = text.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch { }
  }
  return null;
}

function extractItemsFromJson(data) {
  const items = [];
  const candidates = [];

  // Check if data itself is a single test case object (not an array)
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const hasTestCaseFields = data.name || data.title || data.result || data.status || data.testCase;
    if (hasTestCaseFields) {
      // This is a single test case, only process it, don't process nested arrays
      candidates.push([data]);
    } else {
      // Not a test case itself, look for arrays within it
      for (const k of Object.keys(data)) {
        const v = data[k];
        if (Array.isArray(v)) candidates.push(v);
      }
    }
  }

  // If data is already an array, process it
  if (Array.isArray(data)) {
    candidates.push(data);
  }

  for (const arr of candidates) {
    for (const obj of arr) {
      if (!obj || typeof obj !== "object") continue;
      const name = obj.name || obj.title || obj.testCase || obj.id || obj.displayName;
      const status = mapStatus(obj.status || obj.result || obj.outcome || obj.testResult);
      const suite = obj.suite || obj.userStory || obj.feature || obj.category || obj.testSuite || "Serenity";
      const durationMs = toDurationMs(obj.durationMs || obj.duration || obj.durationInMilliseconds || obj.durationInMillis || obj.testDuration);
      const startedAt = toDate(obj.startedAt || obj.startTime || obj.start || obj.timestamp || obj.testStartTime);
      const finishedAt = toDate(obj.finishedAt || obj.endTime || obj.stop || obj.testEndTime);
      if (!name && !suite && status === "unknown") continue;
      items.push({ name: name || String(status || "unknown"), status, suite, durationMs, startedAt, finishedAt, metadata: obj });
    }
  }
  return items;
}

export function createScanner(reportsRepo) {
  reportsRepoRef = reportsRepo;
  return { scanReports, scanSerenityLatest, summarizeDir };
}

async function scanReports(testRunId) {
  try {
    await fs.mkdir(reportsDir, { recursive: true });
    const files = await fs.readdir(reportsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const created = [];
    for (const file of jsonFiles) {
      const full = path.join(reportsDir, file);
      const content = await fs.readFile(full, "utf8");
      let data;
      try {
        data = JSON.parse(content);
      } catch (e) {
        continue;
      }

      const payload = {
        name: data.name || file,
        status: (data.status || "unknown").toLowerCase(),
        suite: data.suite,
        durationMs: data.durationMs || data.duration || undefined,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        finishedAt: data.finishedAt ? new Date(data.finishedAt) : undefined,
        metadata: data,
        testRun: testRunId,
      };

      const report = await reportsRepoRef.create(payload);
      created.push(report);
    }
    return { created: created.length };
  } catch (err) {
    return { error: String(err) };
  }
}

async function scanSerenityLatest(testRunId, rootDirOverride) {
  const defaultRoot = process.env.SERENITY_REPORT_ROOT || process.env.SERENITY_HISTORY_DIR || path.resolve(process.env.HOME || "", "gz-project", "global-qa", "report_history");
  const root = rootDirOverride || defaultRoot;
  try {
    const dirs = await listDirs(root);
    if (!dirs.length) return { created: 0, root, dir: null };
    const latestDir = dirs[0];
    const files = await walk(latestDir);
    const targets = files.filter((f) => f.endsWith(".json"));
    const created = [];
    for (const f of targets) {
      let text;
      try {
        text = await fs.readFile(f, "utf8");
      } catch {
        continue;
      }
      let data = null;
      if (f.endsWith(".json") || f.endsWith(".js")) {
        data = tryParseJson(text);
      }
      if (!data && f.endsWith("index.html")) {
        const m = text.match(/data-report=\"(\{[\s\S]*?\})\"/);
        if (m) {
          try {
            data = JSON.parse(m[1]);
          } catch { }
        }
      }
      if (!data) continue;
      const items = extractItemsFromJson(data);
      for (const it of items) {
        const payload = {
          name: it.name,
          status: it.status,
          suite: it.suite,
          durationMs: it.durationMs,
          startedAt: it.startedAt,
          finishedAt: it.finishedAt,
          metadata: it.metadata,
          testRun: testRunId,
        };
        const report = await reportsRepoRef.create(payload);
        created.push(report);
      }
    }
    return { created: created.length, root, dir: latestDir };
  } catch (err) {
    return { error: String(err), root };
  }
}

async function summarizeDir(dir) {
  try {
    dlog("summarizeDir", { dir });
    const files = await walk(dir);
    const targets = files.filter((f) => (f.endsWith(".json") || f.endsWith(".js")) && !["bootstrap-icons.json", "nivoslider.jquery.json", "serenity.configuration.json"].includes(path.basename(f)));
    const counts = { passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0 };
    const byKey = new Map();
    let total = 0;
    let usedIndexCounts = false;
    let indexHtmlText = null;
    try {
      const ih = path.join(dir, "index.html");
      indexHtmlText = await fs.readFile(ih, "utf8");
      dlog("indexHtml", { path: ih, loaded: !!indexHtmlText });
    } catch {}
    dlog("targets", { n: targets.length });
    for (const f of targets) {
      let text;
      try {
        text = await fs.readFile(f, "utf8");
      } catch {
        continue;
      }

      let data = null;
      if (f.endsWith(".json") || f.endsWith(".js")) {
        data = tryParseJson(text);
      }
      if (!data) continue;
      const items = extractItemsFromJson(data);
      for (const it of items) {
        const meta = it.metadata || {};
        const rawSrc = meta.status ?? meta.result ?? meta.outcome ?? meta.testResult ?? it.status;
        if (rawSrc == null) continue;
        const status = mapStatus(rawSrc);
        const key = `${it.name || ""}|${it.suite || ""}`;
        const t = it.finishedAt ? new Date(it.finishedAt).getTime() : (it.startedAt ? new Date(it.startedAt).getTime() : 0);
        const prev = byKey.get(key);
        if (!prev || t >= prev.time) byKey.set(key, { status, time: t });
      }
    }

    counts.passed = 0; counts.failed = 0; counts.broken = 0; counts.skipped = 0; counts.unknown = 0;
    for (const v of byKey.values()) {
      if (v.status === "passed") counts.passed++;
      else if (v.status === "failed") counts.failed++;
      else if (v.status === "skipped") counts.skipped++;
      else if (v.status === "unknown") counts.unknown++;
      else counts.broken++;
    }
    total = counts.passed + counts.failed + counts.broken + counts.skipped;
    if (indexHtmlText) {
      const labelRe = /labels\s*:\s*\[\s*"(?:Success|Passing)"\s*,\s*"(?:Failure|Failed)"\s*,\s*"Broken"\s*,\s*"Skipped"\s*\][\s\S]*?data\s*:\s*\[(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/i;
      const m1 = indexHtmlText.match(labelRe);
      if (m1) {
        const p = Number(m1[1] || 0);
        const f = Number(m1[2] || 0);
        const b = Number(m1[3] || 0);
        const s = Number(m1[4] || 0);
        counts.passed = p;
        counts.failed = f;
        counts.broken = b;
        counts.skipped = s;
        total = p + f + b + s;
        usedIndexCounts = true;
      } else {
        const nearSeverityIdx = indexHtmlText.indexOf('id="severityChart"');
        const nearResultIdx = indexHtmlText.indexOf('id="resultChart"');
        const startIdx = nearSeverityIdx >= 0 ? nearSeverityIdx : nearResultIdx;
        if (startIdx >= 0) {
          const windowText = indexHtmlText.slice(startIdx, Math.min(indexHtmlText.length, startIdx + 20000));
          const dataRe = /data\s*:\s*\[(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/i;
          const m2 = windowText.match(dataRe);
          if (m2) {
            const p = Number(m2[1] || 0);
            const f = Number(m2[2] || 0);
            const b = Number(m2[3] || 0);
            const s = Number(m2[4] || 0);
            counts.passed = p;
            counts.failed = f;
            counts.broken = b;
            counts.skipped = s;
            total = p + f + b + s;
            usedIndexCounts = true;
          }
        }
        let pSum = 0, fSum = 0, eSum = 0;
        const tableRe = /<table[^>]*id=\"Feature\"[^>]*>([\s\S]*?)<\/table>/i;
        const tMatch = indexHtmlText.match(tableRe);
        if (tMatch) {
          const featureText = tMatch[1];
          const rowRe = /<tr[\s\S]*?>[\s\S]*?<\/tr>/g;
          let rm;
          while ((rm = rowRe.exec(featureText)) !== null) {
            const row = rm[0];
            const pm = row.match(/<div\s+class=\"progress\">([\s\S]*?)<\/div>/);
            if (!pm) continue;
            const block = pm[1];
            const numericCells = Array.from(row.matchAll(/<td>\s*(\d+)\s*<\/td>/g));
            const scenarios = numericCells.length >= 3 ? Number(numericCells[2][1] || 0) : (numericCells.length ? Number(numericCells[0][1] || 0) : 0);
            const percents = Array.from(block.matchAll(/style=\"width:\s*([0-9.]+)%\;\s*background-color:\s*(#[0-9a-fA-F]{6})\"/g)).map(m => ({ pct: Number(m[1] || 0), color: m[2] }));
            let sPct = 0, fPct = 0, ePct = 0;
            for (const p of percents) {
              if (p.color.toLowerCase() === '#b0cf73') sPct = p.pct;
              else if (p.color.toLowerCase() === '#fd938e') fPct = p.pct;
              else if (p.color.toLowerCase() === '#fe6c2d') ePct = p.pct;
            }
            if (scenarios > 0) {
              const sCount = Math.round((sPct / 100) * scenarios);
              const fCount = Math.round((fPct / 100) * scenarios);
              let eCount = Math.round((ePct / 100) * scenarios);
              let sum = sCount + fCount + eCount;
              if (sum !== scenarios) {
                eCount += (scenarios - sum);
                sum = sCount + fCount + eCount;
              }
              pSum += sCount;
              fSum += fCount;
              eSum += eCount;
            }
          }
        }
        if (pSum + fSum + eSum > 0) {
          counts.passed = pSum;
          counts.failed = fSum;
          counts.broken = eSum;
          counts.skipped = 0;
          total = pSum + fSum + eSum;
          usedIndexCounts = true;
        }
        const testsRe = /(\d+)\s+tests/;
        const tm = indexHtmlText.match(testsRe);
        if (tm) {
          const parsedTotal = Number(tm[1] || 0);
          if (!usedIndexCounts) {
            total = parsedTotal;
          } else if (parsedTotal && parsedTotal !== total) {
            dlog("total-mismatch", { parsedTotal, total, counts });
          }
        }
      }
    }
    const percent = total ? Math.round((counts.passed / total) * 100) : 0;
    dlog("summary", { counts, total, percent });
    return { counts, total, percent };
  } catch (err) {
    dlog("summary-error", String(err));
    return { error: String(err) };
  }
}
