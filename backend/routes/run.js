import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { Notice } from "../models/Notice.js";

function findScriptCandidates(env) {
  const root = process.cwd();
  const scriptsDir1 = path.resolve(root, "..", "scripts");
  const scriptsDir2 = path.resolve(root, "scripts");
  const isDarwin = process.platform === "darwin";
  const map = {
    qa: isDarwin ? "run-qa-macos.sh" : "run-qa.sh",
    live: isDarwin ? "run-live-macos.sh" : "run-live.sh",
    cnqa: isDarwin ? "run-cn-qa-macos.sh" : "run-cn-qa.sh",
    cnlive: isDarwin ? "run-cn-live-macos.sh" : "run-cn-live.sh",
  };
  const name = map[String(env).toLowerCase()] || null;
  if (!name) return [];
  return [
    path.resolve(scriptsDir1, name),
    path.resolve(scriptsDir2, name),
  ];
}

function pickExistingPath(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function parseNamepathFromLogs(logs) {
  let candidate = null;
  const lines = String(logs || "").split(/\r?\n/);
  for (const ln of lines) {
    const m1 = ln.match(/Created dir:\s*([^\r\n]+)/i);
    if (m1) candidate = m1[1].trim();
    const m2 = ln.match(/Copying\s+\d+\s+files\s+to\s*([^\r\n]+)/i);
    if (m2) candidate = m2[1].trim();
  }
  return candidate || null;
}

function composeNoticeContent(env, namepath) {
  const v = String(env || "").toLowerCase();
  const isQA = ["qa", "cn", "cnqa"].includes(v);
  const environment = isQA ? "QA" : "LIVE";
  const folder = namepath ? path.basename(namepath) : "unknown-project";
  return `Successfully ran automation tests for the ${folder} project in the ${environment} environment.`;
}

async function runScript(scriptPath) {
  return new Promise((resolve) => {
    const runner = "bash";
    const args = [scriptPath];
    const child = spawn(runner, args, { cwd: path.dirname(scriptPath) });
    let logs = "";
    child.stdout.on("data", (d) => { logs += d.toString(); });
    child.stderr.on("data", (d) => { logs += d.toString(); });
    child.on("close", (code) => resolve({ code, logs }));
    child.on("error", (err) => resolve({ code: -1, logs: String(err) }));
  });
}

export function createRunRouter() {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const env = String(req.query.env || "").trim();
      if (!env) return res.status(400).json({ message: "missing_env" });

      const candidates = findScriptCandidates(env);
      const scriptPath = pickExistingPath(candidates);
      if (!scriptPath) return res.status(404).json({ message: "script_not_found", candidates, env });

      const { code, logs } = await runScript(scriptPath);
      const namepath = parseNamepathFromLogs(logs);
      const time = new Date();
      const content = composeNoticeContent(env, namepath);
      const doc = new Notice({ content, time, namepath });
      await doc.save();
      res.json({ status: code === 0 ? "ok" : "error", exitCode: code, notice: doc });
    } catch (e) {
      res.status(500).json({ message: "internal_error" });
    }
  });

  return router;
}
