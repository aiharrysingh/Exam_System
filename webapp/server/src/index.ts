import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";

import authRoutes from "./modules/auth/routes";
import studentRoutes from "./modules/students/routes";
import subjectRoutes from "./modules/subjects/routes";
import testRoutes from "./modules/tests/routes";
import { testQuestionsRouter, questionsRouter, optionsRouter } from "./modules/questions/routes";
import attemptRoutes, { testStartRouter } from "./modules/attempts/routes";
import resultRoutes from "./modules/results/routes";
import studyCenterRoutes from "./modules/studycenter/routes";
import adminUsersRoutes from "./modules/adminUsers/routes";
import gradingRoutes from "./modules/grading/routes";
import { errorHandler } from "./middleware/errorHandler";
import { sweepExpiredAttempts } from "./modules/attempts/service";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/tests", testStartRouter);
app.use("/api/tests", testQuestionsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/options", optionsRouter);
app.use("/api/attempts", attemptRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/studycenter", studyCenterRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/grading", gradingRoutes);

app.use(errorHandler);

// Belt-and-suspenders backstop for attempts abandoned with no further requests.
cron.schedule("*/1 * * * *", () => {
  sweepExpiredAttempts().catch((err) => console.error("Expiry sweep failed:", err));
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
