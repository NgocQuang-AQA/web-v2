import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "node:path";
import { createRepos } from "./repositories/repoFactory.js";
import { createReportsRouter } from "./routes/reports.js";
import { createScanner } from "./services/scanner.js";
import { createFilesRouter, createFilesStaticRouter } from "./routes/files.js";
import { createChatRouter } from "./routes/chat.js";
import { createAuthRouter } from "./routes/auth.js";
import { createAdminRouter } from "./routes/admin.js";
import { createAuthMiddleware, roles } from "./middleware/auth.js";
import { createRunRouter } from "./routes/run.js";
import { createNoticesRouter } from "./routes/notices.js";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  process.platform === "win32" ? path.resolve(process.cwd(), ".env.windows") : undefined,
  process.platform === "darwin" ? path.resolve(process.cwd(), ".env.macos") : undefined,
  path.resolve(process.cwd(), "../.env"),
].filter(Boolean);
for (const p of envCandidates) dotenv.config({ path: p });

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/";
const dbName = process.env.MONGO_DB_NAME || "mydb";
const dataProvider = process.env.DATA_PROVIDER || "auto";
const { reportsRepo, testRunsRepo, filesRepo, provider } = await createRepos({ provider: dataProvider, mongoUri, dbName });
const { scanReports, scanSerenityLatest, summarizeDir } = createScanner(reportsRepo);
const tokenSecret = process.env.TOKEN_SECRET || process.env.JWT_SECRET || "dev-secret";
const { requireAuth } = createAuthMiddleware(tokenSecret);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", createAuthRouter({ secret: tokenSecret }));
app.use("/api/admin", requireAuth([roles.admin]), createAdminRouter());

app.use("/api/reports", requireAuth([roles.admin, roles.ba, roles.be]), createReportsRouter({ reportsRepo, testRunsRepo, filesRepo, scanReports, scanSerenityLatest }));
app.use("/api/files", createFilesStaticRouter({ filesRepo }));
app.use("/api/files", requireAuth([roles.admin, roles.ba, roles.be, roles.user]), createFilesRouter({ filesRepo, summarizeDir }));
app.use("/api/chat", requireAuth([roles.admin, roles.ba, roles.be]), createChatRouter({ filesRepo, reportsRepo }));
app.use("/api/run", requireAuth([roles.admin, roles.be]), createRunRouter());
app.use("/api/notices", requireAuth([roles.admin, roles.ba, roles.be]), createNoticesRouter());

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`backend listening on ${port} (provider=${provider})`);
});
