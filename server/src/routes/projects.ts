import { Router } from "express";
import { z } from "zod";
import { ProjectM, PostM, CommentM, UserM } from "../models";
import { requireAuth } from "../middleware/auth";
import { projectAccess } from "../lib/guard";
import { atLeast, roleOf } from "../lib/access";
import { wrap, fail, parse } from "../lib/http";
import { slugify, pub } from "../lib/util";

const r = Router();
r.use(requireAuth);

// Lists every project the user owns or has been added to, with their role in each.
r.get("/", wrap(async (req, res) => {
  const u = req.user;
  const list: any[] = await ProjectM.find({ $or: [{ owner: u._id }, { "members.user": u._id }] }).sort({ createdAt: -1 }).lean();
  const projects = await Promise.all(
    list.map(async (p) => ({
      id: String(p._id), name: p.name, slug: p.slug, description: p.description || "",
      role: roleOf(p, u._id), posts: await PostM.countDocuments({ project: p._id }),
    }))
  );
  res.json({ projects });
}));

const Create = z.object({ name: z.string().trim().min(2, "Name needs at least 2 characters").max(50), description: z.string().trim().max(200).optional() });

r.post("/", wrap(async (req, res) => {
  const u = req.user;
  const b = parse(Create, req.body);
  if (b.error) return fail(res, 400, b.error);
  if ((await ProjectM.countDocuments({ owner: u._id })) >= 20) return fail(res, 403, "Project limit reached (20).");
  const base = slugify(b.data.name);
  let slug = base, i = 1;
  while (await ProjectM.exists({ slug })) slug = `${base}-${++i}`;
  const p = await ProjectM.create({ owner: u._id, name: b.data.name, slug, description: b.data.description || "" });
  res.status(201).json({ id: String(p._id), slug });
}));

// Any team member (viewer and up) can read the dashboard data.
r.get("/:id", wrap(async (req, res) => {
  const a = await projectAccess(req.user, req.params.id, "viewer");
  if (!a) return fail(res, 404, "Project not found");
  const p = a.project;
  const raw: any[] = await PostM.find({ project: p._id }).lean();
  const posts = raw.map((x) => pub(x)).sort((x, y) => y.votes - x.votes);

  const byStatus: any = { open: 0, planned: 0, progress: 0, shipped: 0 };
  posts.forEach((x) => byStatus[x.status]++);
  const days: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push({ key: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
  }
  posts.forEach((x) => {
    const d = days.find((y) => y.key === new Date(x.createdAt).toISOString().slice(0, 10));
    if (d) d.count++;
  });
  const stats = { total: posts.length, votes: posts.reduce((n, x) => n + x.votes, 0), byStatus, perDay: days, top: posts.slice(0, 5) };
  res.json({ role: a.role, project: { id: String(p._id), name: p.name, slug: p.slug, description: p.description || "" }, posts, stats });
}));

// Only the owner can delete a project.
r.delete("/:id", wrap(async (req, res) => {
  const a = await projectAccess(req.user, req.params.id, "owner");
  if (!a) return fail(res, 403, "Only the owner can delete this project");
  const ids = (await PostM.find({ project: a.project._id }).select("_id").lean()).map((x: any) => x._id);
  await CommentM.deleteMany({ post: { $in: ids } });
  await PostM.deleteMany({ project: a.project._id });
  await ProjectM.deleteOne({ _id: a.project._id });
  res.json({ ok: true });
}));

// ---- Team members ----
const ROLE = z.enum(["admin", "editor", "viewer"]);

r.get("/:id/members", wrap(async (req, res) => {
  const a = await projectAccess(req.user, req.params.id, "viewer");
  if (!a) return fail(res, 404, "Project not found");
  const showEmail = atLeast(a.role, "admin");
  const ids = [a.project.owner, ...(a.project.members || []).map((m: any) => m.user)];
  const users: any[] = await UserM.find({ _id: { $in: ids } }).select("name email").lean();
  const U = (id: any) => users.find((u) => String(u._id) === String(id));
  const row = (id: any, role: string) => ({ userId: String(id), name: U(id)?.name || "Unknown", email: showEmail ? U(id)?.email : undefined, role });
  res.json({
    me: String(a.user._id), role: a.role,
    members: [row(a.project.owner, "owner"), ...(a.project.members || []).map((m: any) => row(m.user, m.role))],
  });
}));

// Add an existing Beacon user. Admins add editors/viewers; only the owner adds admins.
r.post("/:id/members", wrap(async (req, res) => {
  const a = await projectAccess(req.user, req.params.id, "admin");
  if (!a) return fail(res, 403, "Only admins can add people");
  const b = parse(z.object({ email: z.string().trim().email("Enter a valid email"), role: ROLE }), req.body);
  if (b.error) return fail(res, 400, b.error);
  if (b.data.role === "admin" && a.role !== "owner") return fail(res, 403, "Only the owner can add admins");
  const target: any = await UserM.findOne({ email: b.data.email.toLowerCase() });
  if (!target) return fail(res, 404, "No Beacon account uses that email. Ask them to sign up first.");
  const pr: any = await ProjectM.findById(req.params.id);
  if (roleOf(pr, target._id)) return fail(res, 409, "That person already has access.");
  if (pr.members.length >= 20) return fail(res, 403, "Team limit reached (20 people).");
  pr.members.push({ user: target._id, role: b.data.role });
  await pr.save();
  res.status(201).json({ ok: true });
}));

r.patch("/:id/members", wrap(async (req, res) => {
  const a = await projectAccess(req.user, req.params.id, "admin");
  if (!a) return fail(res, 403, "Only admins can change roles");
  const b = parse(z.object({ userId: z.string(), role: ROLE }), req.body);
  if (b.error) return fail(res, 400, b.error);
  const pr: any = await ProjectM.findById(req.params.id);
  const m = pr.members.find((x: any) => String(x.user) === b.data.userId);
  if (!m) return fail(res, 404, "Member not found");
  if ((m.role === "admin" || b.data.role === "admin") && a.role !== "owner") return fail(res, 403, "Only the owner can change admin access");
  m.role = b.data.role;
  await pr.save();
  res.json({ ok: true });
}));

// Admins can remove people; anyone can remove themselves (leave the project).
r.delete("/:id/members/:userId", wrap(async (req, res) => {
  const a = await projectAccess(req.user, req.params.id, "viewer");
  if (!a) return fail(res, 404, "Project not found");
  const pr: any = await ProjectM.findById(req.params.id);
  const m = pr.members.find((x: any) => String(x.user) === req.params.userId);
  if (!m) return fail(res, 404, "Member not found");
  const self = req.params.userId === String(a.user._id);
  if (!self) {
    if (!atLeast(a.role, "admin")) return fail(res, 403, "Only admins can remove people");
    if (m.role === "admin" && a.role !== "owner") return fail(res, 403, "Only the owner can remove an admin");
  }
  pr.members = pr.members.filter((x: any) => String(x.user) !== req.params.userId);
  await pr.save();
  res.json({ ok: true });
}));

export default r;
