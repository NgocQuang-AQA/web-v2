import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { createRepos } from "./repositories/repoFactory.js";
import { createReportsRouter } from "./routes/reports.js";
import { createScanner } from "./services/scanner.js";
import { createFilesRouter } from "./routes/files.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/test";
const dbName = process.env.MONGO_DB_NAME || "mydb";
const dataProvider = process.env.DATA_PROVIDER || "auto";
const { reportsRepo, testRunsRepo, filesRepo, provider } = await createRepos({ provider: dataProvider, mongoUri, dbName });
const { scanReports, scanSerenityLatest, summarizeDir } = createScanner(reportsRepo);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/reports", createReportsRouter({ reportsRepo, testRunsRepo, filesRepo, scanReports, scanSerenityLatest }));
app.use("/api/files", createFilesRouter({ filesRepo, summarizeDir }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`backend listening on ${port} (provider=${provider})`);
});
