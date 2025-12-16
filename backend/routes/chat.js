import { Router } from "express";

export function createChatRouter({ filesRepo, reportsRepo }) {
  const router = Router();

  async function summarizeStats() {
    const collections = [
      { name: "QA", col: "qa-summary" },
      { name: "CN", col: "cn-summary" },
    ];
    const parts = [];
    for (const { name, col } of collections) {
      const items = await filesRepo.find(col, { page: 1, pageSize: 1000 });
      let passed = 0;
      let failed = 0;
      let broken_flaky = 0;
      for (const item of items) {
        passed += Number(item.passing) || 0;
        failed += Number(item.failed) || 0;
        broken_flaky += Number(item.broken_flaky) || 0;
      }
      const total = passed + failed + broken_flaky;
      const successRate = total ? Math.round((passed / total) * 100) : 0;
      parts.push(`${name}: successRate=${successRate}%, failed=${failed}, flaky=${broken_flaky}, total=${total}`);
    }
    return parts.join("\n");
  }

  async function summarizeErrorsFails() {
    const getLatest = async (col) => {
      try {
        const items = await filesRepo.find(col, { page: 1, pageSize: 1 });
        return items[0] || null;
      } catch {
        return null;
      }
    };
    const qaErrorDoc = await getLatest("qa-error");
    const cnErrorDoc = await getLatest("cn-error");
    const qaFailDoc = await getLatest("qa-fail");
    const cnFailDoc = await getLatest("cn-fail");
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const totalError = toNum(qaErrorDoc?.totalError) + toNum(cnErrorDoc?.totalError);
    const totalFail = toNum(qaFailDoc?.totalFail) + toNum(cnFailDoc?.totalFail);
    return `Errors/Fails: totalError=${totalError}, totalFail=${totalFail}`;
  }

  async function summarizeSuites() {
    try {
      const suites = await reportsRepo.suites({ page: 1, pageSize: 20 });
      const rows = suites.map((s) => `${s.name} status=${s.status} passed=${s.passed} failed=${s.failed} flaky=${s.flaky} percent=${s.percent}`);
      return `Suites:\n${rows.join("\n")}`;
    } catch {
      return "Suites: N/A";
    }
  }

  async function summarizeFlaky() {
    try {
      const flaky = await reportsRepo.flaky({ page: 1, pageSize: 20 });
      const rows = flaky.map((f) => `${f.title} failures=${f.failures} lastSeen=${f.lastSeen || ""}`);
      return `Flaky:\n${rows.join("\n")}`;
    } catch {
      return "Flaky: N/A";
    }
  }

  async function buildContext() {
    const stats = await summarizeStats();
    const ef = await summarizeErrorsFails();
    const suites = await summarizeSuites();
    const flaky = await summarizeFlaky();
    return [
      "You are a Test Automation Agent.",
      "Use the provided dataset metrics to answer the user's question.",
      "Base your answers strictly on the following context from test reports and files.",
      "Be concise and factual; include numbers where helpful.",
      "",
      "Context:",
      stats,
      ef,
      suites,
      flaky,
    ].join("\n");
  }

  router.get("/history", async (req, res) => {
    const { page = 1, pageSize = 50 } = req.query;
    const items = await filesRepo.find("his-chat", { page, pageSize, sortBy: "time_insert", order: "desc" });
    res.json({ items });
  });

  router.post("/gemini", async (req, res) => {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "invalid_text" });
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) return res.status(500).json({ message: "missing_api_key" });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const contextText = await buildContext();
    let data = null;
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: contextText },
                { text: `Question: ${text}` },
              ],
            },
          ],
        }),
      });
      const json = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json(json);
      data = json;
    } catch (e) {
      return res.status(502).json({ message: "upstream_error" });
    }
    const responseId = String(data?.responseId || "");
    const modelVersion = String(data?.modelVersion || "");
    const outText = String(
      (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("\n")
    );
    const now = new Date().toISOString();
    await filesRepo.insertMany("his-chat", [
      { time: now, time_insert: now, from: "user", content: text, session: responseId, modelVersion },
      {
        time: new Date().toISOString(),
        time_insert: new Date().toISOString(),
        from: "gemini",
        content: outText,
        session: responseId,
        modelVersion,
      },
    ]);
    res.json({ responseId, modelVersion, text: outText });
  });

  return router;
}
