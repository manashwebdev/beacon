import { Router } from "express";
import { z } from "zod";
import { ProjectM, PostM } from "../models";
import { wrap, fail, parse } from "../lib/http";
import { rateLimit } from "../lib/rate";
import { pub, voterOf } from "../lib/util";

// Public board endpoints: no account needed.
const r = Router();

r.get("/:slug", wrap(async (req, res) => {
  const p: any = await ProjectM.findOne({ slug: req.params.slug }).lean();
  if (!p) return fail(res, 404, "This feedback board does not exist.");
  const vid = voterOf(req);
  const raw: any[] = await PostM.find({ project: p._id }).lean();
  const posts = raw
    .map((x) => pub(x, vid))
    .sort((a, b) => b.votes - a.votes || +new Date(b.createdAt) - +new Date(a.createdAt));
  res.json({ project: { name: p.name, description: p.description || "", slug: p.slug }, posts });
}));

const NewPost = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters").max(120),
  body: z.string().trim().max(1000).optional(),
  author: z.string().trim().max(40).optional(),
});

r.post("/:slug/posts", rateLimit("post", 5, 60_000, "Slow down a little. Try again in a minute."), wrap(async (req, res) => {
  const b = parse(NewPost, req.body);
  if (b.error) return fail(res, 400, b.error);
  const p: any = await ProjectM.findOne({ slug: req.params.slug }).lean();
  if (!p) return fail(res, 404, "This feedback board does not exist.");
  const vid = voterOf(req);
  const post = await PostM.create({
    project: p._id, title: b.data.title, body: b.data.body || "", author: b.data.author || "",
    voters: vid ? [vid] : [], // the author's own upvote
  });
  res.status(201).json(pub(post, vid));
}));

r.get("/:slug/changelog", wrap(async (req, res) => {
  const p: any = await ProjectM.findOne({ slug: req.params.slug }).lean();
  if (!p) return fail(res, 404, "Project not found");
  const items: any[] = await PostM.find({ project: p._id, status: "shipped" }).sort({ shippedAt: -1 }).lean();
  res.json({ project: { name: p.name, slug: p.slug }, items: items.map((x) => pub(x)) });
}));

export default r;
