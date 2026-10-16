import { Router } from "express";
import { UserM, RepoM, ProjectM } from "../models";
import { wrap, fail } from "../lib/http";
import { cleanUrl } from "../lib/util";

// Public developer page: GET /api/u/:login. Shows only the repos the owner chose to make public.
const r = Router();

r.get("/:login", wrap(async (req, res) => {
  const login = String(req.params.login).toLowerCase();
  if (!/^[a-z0-9-]{1,39}$/.test(login)) return fail(res, 404, "This profile does not exist.");
  const u: any = await UserM.findOne({ "github.login": login }).select("github.login github.handle github.name github.avatar github.bio").lean();
  if (!u) return fail(res, 404, "This profile does not exist.");

  const repos: any[] = await RepoM.find({ owner: u._id, isPublic: true }).sort({ stars: -1, pushedAt: -1 }).lean();
  const slugs = repos.map((x) => x.boardSlug).filter(Boolean);
  const live = new Set((slugs.length ? ((await ProjectM.find({ slug: { $in: slugs } }).select("slug").lean()) as any[]) : []).map((p) => p.slug));

  res.json({
    profile: { login: u.github.login, handle: u.github.handle || u.github.login, name: u.github.name || "", avatar: u.github.avatar || "", bio: u.github.bio || "" },
    repos: repos.map((x) => ({
      id: String(x._id), name: x.name, description: x.description || "", language: x.language || "", stars: x.stars || 0, forks: x.forks || 0,
      topics: x.topics || [], pushedAt: x.pushedAt || null, isPrivate: !!x.isPrivate, isFork: !!x.isFork,
      url: x.isPrivate ? "" : x.url, // a private repo has no page visitors could open
      homepage: cleanUrl(x.homepage),
      board: x.boardSlug && live.has(x.boardSlug) ? x.boardSlug : "",
    })),
  });
}));

export default r;
