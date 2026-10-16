import { Router } from "express";
import { z } from "zod";
import { UserM, ProjectM, PostM, CommentM, RepoM } from "../models";
import { check, hash, setSession, clearSession } from "../lib/auth";
import { requireAuth } from "../middleware/auth";
import { wrap, fail, parse } from "../lib/http";
import { limited } from "../lib/rate";
import { passwordRule } from "../lib/validators";

const r = Router();
r.use(requireAuth);

r.patch("/", wrap(async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2, "Enter your name").max(60) }), req.body);
  if (b.error) return fail(res, 400, b.error);
  await UserM.updateOne({ _id: req.user._id }, { name: b.data.name });
  res.json({ name: b.data.name });
}));

// Deletes the account, every project it owns (with ideas and comments), and its team memberships.
r.delete("/", wrap(async (req, res) => {
  const u = req.user;
  if (limited("delacct" + u._id, 5, 15 * 60_000)) return fail(res, 429, "Too many attempts. Try again later.");
  const b = parse(z.object({ password: z.string().min(1, "Enter your password to confirm") }), req.body);
  if (b.error) return fail(res, 400, b.error);
  if (!(await check(b.data.password, u.passwordHash))) return fail(res, 401, "That password is wrong.");
  const projects: any[] = await ProjectM.find({ owner: u._id }).select("_id").lean();
  const pids = projects.map((p) => p._id);
  const posts: any[] = await PostM.find({ project: { $in: pids } }).select("_id").lean();
  await CommentM.deleteMany({ post: { $in: posts.map((p) => p._id) } });
  await PostM.deleteMany({ project: { $in: pids } });
  await ProjectM.deleteMany({ _id: { $in: pids } });
  await ProjectM.updateMany({ "members.user": u._id }, { $pull: { members: { user: u._id } } });
  await RepoM.deleteMany({ owner: u._id });
  await UserM.deleteOne({ _id: u._id });
  clearSession(res);
  res.json({ ok: true });
}));

r.post("/password", wrap(async (req, res) => {
  const me = req.user;
  if (limited("pw" + me._id, 5, 15 * 60_000)) return fail(res, 429, "Too many attempts. Try again later.");
  const b = parse(z.object({ current: z.string().min(1, "Enter your current password"), next: passwordRule }), req.body);
  if (b.error) return fail(res, 400, b.error);
  const u = await UserM.findById(me._id);
  if (!(await check(b.data.current, u.passwordHash))) return fail(res, 401, "Your current password is wrong.");
  u.passwordHash = await hash(b.data.next);
  u.tokenVersion = (u.tokenVersion || 0) + 1; // signs out every other device
  await u.save();
  setSession(res, String(u._id), u.tokenVersion); // keep this browser signed in
  res.json({ ok: true });
}));

// "Sign out of all other devices": bump the version, then re-issue this browser's cookie.
r.post("/sessions", wrap(async (req, res) => {
  const u = await UserM.findById(req.user._id);
  u.tokenVersion = (u.tokenVersion || 0) + 1;
  await u.save();
  setSession(res, String(u._id), u.tokenVersion);
  res.json({ ok: true });
}));

export default r;
