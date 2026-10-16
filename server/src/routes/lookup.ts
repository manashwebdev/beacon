import { Router } from "express";
import { UserM } from "../models";
import { wrap, fail } from "../lib/http";
import { rateLimit } from "../lib/rate";
import { ghPublicUser, ghPublicRepos, GhError } from "../lib/github";
import { cleanUrl } from "../lib/util";

// Public lookup: GET /api/lookup/:username returns that person's public GitHub profile and repos.
// No account is needed. The site's own GITHUB_TOKEN (set on the server, never sent to a browser) gives it
// a much higher GitHub rate limit, and results are cached for 10 minutes so repeat searches cost nothing.
const r = Router();
const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; data: any }>();

async function load(login: string, token?: string) {
  const [user, repos] = await Promise.all([ghPublicUser(login, token), ghPublicRepos(login, token)]);
  return { user, repos };
}

async function fetchAll(login: string) {
  const token = process.env.GITHUB_TOKEN || undefined;
  try {
    return await load(login, token);
  } catch (e: any) {
    // A bad or expired site token should not break lookups: say so in the log and try without it.
    if (token && e instanceof GhError && e.status === 400) {
      console.error("GITHUB_TOKEN was refused by GitHub. Falling back to requests without a token (60 per hour).");
      return load(login, undefined);
    }
    throw e;
  }
}

r.get("/:username", rateLimit("lookup", 30, 60_000, "Too many searches. Try again in a minute."), wrap(async (req, res) => {
  const name = String(req.params.username).trim();
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(name)) return fail(res, 400, "That is not a valid GitHub username.");
  const key = name.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return res.json(hit.data);

  let found;
  try {
    found = await fetchAll(name);
  } catch (e: any) {
    if (hit && !(e instanceof GhError && e.status === 404)) return res.json(hit.data); // GitHub is struggling: show the last good result
    if (e instanceof GhError && e.status === 404) return fail(res, 404, `No GitHub user named "${name}".`);
    throw e;
  }

  const hasPage = !!(await UserM.exists({ "github.login": found.user.login.toLowerCase() })); // they also have a Beacon page
  const data = {
    profile: { ...found.user, hasPage },
    repos: found.repos.map((x) => ({
      id: x.ghId, name: x.name, description: x.description, language: x.language, stars: x.stars, forks: x.forks,
      topics: x.topics, pushedAt: x.pushedAt || null, isFork: x.isFork, archived: x.archived, url: x.url, homepage: cleanUrl(x.homepage),
    })),
  };
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string); // keep memory bounded
  res.json(data);
}));

export default r;
