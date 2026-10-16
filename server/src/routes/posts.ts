import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { PostM, ProjectM, CommentM } from "../models";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { postAccess } from "../lib/guard";
import { atLeast, roleOf } from "../lib/access";
import { wrap, fail, parse } from "../lib/http";
import { rateLimit } from "../lib/rate";
import { pub, voterOf } from "../lib/util";

const r = Router();

// Toggle the caller's vote. Anonymous voters are identified by the x-voter header.
r.post("/:id/vote", rateLimit("vote", 40, 60_000, "Too many votes. Try again shortly."), wrap(async (req, res) => {
  const vid = voterOf(req);
  if (!vid || !mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid request");
  const p: any = await PostM.findById(req.params.id).select("voters").lean();
  if (!p) return fail(res, 404, "Post not found");
  const has = p.voters.includes(vid);
  await PostM.updateOne({ _id: req.params.id }, has ? { $pull: { voters: vid } } : { $addToSet: { voters: vid } });
  res.json({ voted: !has, votes: p.voters.length + (has ? -1 : 1) });
}));

r.get("/:id/comments", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid request");
  const list: any[] = await CommentM.find({ post: req.params.id }).sort({ createdAt: 1 }).lean();
  res.json({ comments: list.map((c) => ({ id: String(c._id), author: c.author || "Anonymous", body: c.body, byOwner: !!c.byOwner, createdAt: c.createdAt })) });
}));

const NewComment = z.object({ body: z.string().trim().min(1, "Write a comment first").max(600), author: z.string().trim().max(40).optional() });

r.post("/:id/comments", rateLimit("comment", 8, 60_000, "Slow down a little. Try again in a minute."), optionalAuth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid request");
  const b = parse(NewComment, req.body);
  if (b.error) return fail(res, 400, b.error);
  const post: any = await PostM.findById(req.params.id).lean();
  if (!post) return fail(res, 404, "Post not found");
  const user = req.user;
  const project: any = user ? await ProjectM.findById(post.project).lean() : null;
  const isTeam = !!user && atLeast(roleOf(project, user._id), "editor"); // editors and above comment as "Team"
  const c = await CommentM.create({ post: post._id, body: b.data.body, author: isTeam ? user.name : b.data.author || "", byOwner: isTeam });
  res.status(201).json({ id: String(c._id) });
}));

const Patch = z.object({
  status: z.enum(["open", "planned", "progress", "shipped"]).optional(),
  reply: z.string().trim().max(1000).optional(),
});

// Editors and above can triage ideas.
r.patch("/:id", requireAuth, wrap(async (req, res) => {
  const a = await postAccess(req.user, req.params.id, "editor");
  if (!a) return fail(res, 403, "You do not have permission to do that");
  const b = parse(Patch, req.body);
  if (b.error) return fail(res, 400, b.error);
  const { post } = a;
  if (b.data.status && b.data.status !== post.status) {
    post.status = b.data.status;
    post.shippedAt = b.data.status === "shipped" ? new Date() : undefined; // shipped posts feed the public changelog
  }
  if (b.data.reply !== undefined) post.reply = b.data.reply;
  await post.save();
  res.json(pub(post));
}));

// Deleting needs an admin or the owner.
r.delete("/:id", requireAuth, wrap(async (req, res) => {
  const a = await postAccess(req.user, req.params.id, "admin");
  if (!a) return fail(res, 403, "Only admins can delete ideas");
  await CommentM.deleteMany({ post: a.post._id });
  await a.post.deleteOne();
  res.json({ ok: true });
}));

export default r;
