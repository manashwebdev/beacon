import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { UserM, RepoM, ProjectM } from "../models";
import { requireAuth } from "../middleware/auth";
import { wrap, fail, parse } from "../lib/http";
import { limited, rateLimit } from "../lib/rate";
import { seal, unseal } from "../lib/crypto";
import { ghUser, ghRepos } from "../lib/github";
import { cleanUrl, uniqueSlug } from "../lib/util";

const r = Router();
r.use(requireAuth);

const card = (x: any) => ({
  id: String(x._id), name: x.name, fullName: x.fullName, description: x.description || "", language: x.language || "",
  stars: x.stars || 0, forks: x.forks || 0, url: x.url, homepage: cleanUrl(x.homepage), isPrivate: !!x.isPrivate,
  isFork: !!x.isFork, archived: !!x.archived, topics: x.topics || [], pushedAt: x.pushedAt || null,
  isPublic: !!x.isPublic, boardSlug: x.boardSlug || "",
});

// Pulls the repo list from GitHub into our database. Keeps each repo's public/hidden choice, drops repos that no longer exist.
async function syncRepos(userId: any, token: string) {
  const list = await ghRepos(token);
  if (list.length) {
    await RepoM.bulkWrite(
      list.map((x) => ({
        updateOne: {
          filter: { owner: userId, ghId: x.ghId },
          update: { $set: x, $setOnInsert: { isPublic: false } },
          upsert: true,
        },
      }))
    );
  }
  await RepoM.deleteMany({ owner: userId, ghId: { $nin: list.map((x) => x.ghId) } });
  return list.length;
}

const savedToken = (u: any): string | null => (u.github?.tokenEnc ? unseal(u.github.tokenEnc) : null);

// The connection and the repo list. The token itself is never returned.
r.get("/", wrap(async (req, res) => {
  const g = req.user.github;
  if (!g?.login) return res.json({ connected: false });
  const repos: any[] = await RepoM.find({ owner: req.user._id }).sort({ pushedAt: -1 }).lean();
  res.json({
    connected: true, login: g.login, handle: g.handle || g.login, name: g.name || "", avatar: g.avatar || "", bio: g.bio || "",
    syncedAt: g.syncedAt || null, tokenOk: !!savedToken(req.user), repos: repos.map(card),
  });
}));

const Connect = z.object({
  username: z.string().trim().min(1, "Enter your GitHub username").max(39).regex(/^[A-Za-z0-9-]+$/, "That is not a valid GitHub username"),
  token: z.string().trim().min(10, "Paste your GitHub token").max(255),
});

// Connect (or reconnect) a GitHub account. The token must belong to the username you typed.
r.post("/connect", rateLimit("ghconnect", 10, 15 * 60_000, "Too many attempts. Try again in a few minutes."), wrap(async (req, res) => {
  const b = parse(Connect, req.body);
  if (b.error) return fail(res, 400, b.error);
  const me = await ghUser(b.data.token);
  if (me.login.toLowerCase() !== b.data.username.toLowerCase()) {
    return fail(res, 400, `That token belongs to the GitHub account "${me.login}", not "${b.data.username}".`);
  }
  const login = me.login.toLowerCase();
  if (await UserM.exists({ "github.login": login, _id: { $ne: req.user._id } })) {
    return fail(res, 409, "That GitHub account is already connected to another Beacon user.");
  }
  await UserM.updateOne({ _id: req.user._id }, {
    $set: { github: { login, handle: me.login, name: me.name, avatar: me.avatar, bio: me.bio, tokenEnc: seal(b.data.token), syncedAt: new Date() } },
  });
  const count = await syncRepos(req.user._id, b.data.token);
  res.json({ ok: true, count });
}));

r.post("/sync", wrap(async (req, res) => {
  if (!req.user.github?.login) return fail(res, 400, "Connect GitHub first.");
  if (limited("ghsync" + req.user._id, 6, 60_000)) return fail(res, 429, "Slow down a little. Try again in a minute.");
  const token = savedToken(req.user);
  if (!token) return fail(res, 400, "Your saved token can no longer be read. Please reconnect GitHub.");
  const [me, count] = await Promise.all([ghUser(token), syncRepos(req.user._id, token)]);
  await UserM.updateOne({ _id: req.user._id }, { $set: { "github.name": me.name, "github.avatar": me.avatar, "github.bio": me.bio, "github.handle": me.login, "github.syncedAt": new Date() } });
  res.json({ ok: true, count });
}));

// Remove the token and the repo list. Feedback boards you created from repos are kept.
r.delete("/", wrap(async (req, res) => {
  await RepoM.deleteMany({ owner: req.user._id });
  await UserM.updateOne({ _id: req.user._id }, { $unset: { github: 1 } });
  res.json({ ok: true });
}));

// Show or hide every public GitHub repo at once. Private repos are never touched here: publish those one at a time.
r.post("/repos/bulk", wrap(async (req, res) => {
  const b = parse(z.object({ isPublic: z.boolean() }), req.body);
  if (b.error) return fail(res, 400, b.error);
  await RepoM.updateMany(b.data.isPublic ? { owner: req.user._id, isPrivate: false } : { owner: req.user._id }, { $set: { isPublic: b.data.isPublic } });
  res.json({ ok: true });
}));

r.patch("/repos/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Repository not found");
  const b = parse(z.object({ isPublic: z.boolean() }), req.body);
  if (b.error) return fail(res, 400, b.error);
  const repo: any = await RepoM.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $set: { isPublic: b.data.isPublic } }, { new: true }).lean();
  if (!repo) return fail(res, 404, "Repository not found");
  res.json(card(repo));
}));

// Start a feedback board for a repo. Its "Visit" link points at the repo's homepage, or the GitHub page for public repos.
r.post("/repos/:id/board", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Repository not found");
  const repo: any = await RepoM.findOne({ _id: req.params.id, owner: req.user._id });
  if (!repo) return fail(res, 404, "Repository not found");
  if (repo.boardSlug && (await ProjectM.exists({ slug: repo.boardSlug, owner: req.user._id }))) {
    return fail(res, 409, "This repository already has a feedback board.");
  }
  if ((await ProjectM.countDocuments({ owner: req.user._id })) >= 20) return fail(res, 403, "Project limit reached (20).");
  const slug = await uniqueSlug(repo.name);
  const p = await ProjectM.create({
    owner: req.user._id, name: String(repo.name).slice(0, 50), slug,
    description: String(repo.description || "").slice(0, 200),
    website: cleanUrl(repo.homepage) || (repo.isPrivate ? "" : repo.url),
  });
  repo.boardSlug = slug;
  await repo.save();
  res.status(201).json({ id: String(p._id), slug });
}));

export default r;
