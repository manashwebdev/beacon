import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import auth from "./routes/auth";
import account from "./routes/account";
import projects from "./routes/projects";
import publicRoutes from "./routes/public";
import posts from "./routes/posts";
import github from "./routes/github";
import profile from "./routes/profile";

const app = express();

app.use(helmet());
// Only needed if a browser calls the API directly from another origin.
const origins = (process.env.CLIENT_URL || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : false, credentials: true }));
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", auth);
app.use("/api/account", account);
app.use("/api/projects", projects);
app.use("/api/p", publicRoutes);
app.use("/api/posts", posts);
app.use("/api/github", github);
app.use("/api/u", profile);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler: bad JSON gets a 400, everything else a generic 500 (details stay in the server log).
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must be valid JSON" });
  if (err?.gh) return res.status(err.status || 502).json({ error: err.message }); // a GitHub problem we can explain
  console.error(err);
  res.status(500).json({ error: "Server error. Try again." });
});

export default app;
