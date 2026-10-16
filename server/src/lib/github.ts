// Small GitHub REST client. It only ever talks to api.github.com, using a user's own token or the site's GITHUB_TOKEN.
const API = "https://api.github.com";

// Thrown for problems we can explain to the user. `status` is what Beacon answers with (never 401,
// because the browser treats a 401 as "your Beacon session expired").
export class GhError extends Error {
  gh = true;
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call(path: string, token?: string): Promise<any> {
  let r: any;
  try {
    r = await (globalThis as any).fetch(API + path, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "beacon-app",
      },
      signal: (AbortSignal as any).timeout(15_000),
    });
  } catch {
    throw new GhError(502, "Could not reach GitHub. Try again in a moment.");
  }
  if (r.status === 404) throw new GhError(404, "GitHub could not find that user.");
  if (r.status === 401) throw new GhError(400, "GitHub rejected that token. Check that it is correct and has not expired.");
  if (r.status === 403 || r.status === 429) {
    if (r.headers.get("x-ratelimit-remaining") === "0") throw new GhError(429, "GitHub rate limit reached. Try again in a few minutes.");
    throw new GhError(400, "That token is not allowed to read your repositories.");
  }
  if (!r.ok) throw new GhError(502, "GitHub could not answer that request. Try again in a moment.");
  return r.json();
}

export async function ghUser(token: string) {
  const u = await call("/user", token);
  return { login: String(u.login), name: u.name ? String(u.name) : "", avatar: String(u.avatar_url || ""), bio: u.bio ? String(u.bio) : "" };
}

// Every repository the token's owner owns (private ones too when the token allows it). Capped at 500.
export async function ghRepos(token: string) {
  const out: any[] = [];
  for (let page = 1; page <= 5; page++) {
    const list = await call(`/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`, token);
    if (!Array.isArray(list)) break;
    out.push(...list);
    if (list.length < 100) break;
  }
  return out.map(mapRepo);
}

function mapRepo(x: any) {
  return {
    ghId: Number(x.id),
    name: String(x.name),
    fullName: String(x.full_name),
    description: x.description ? String(x.description).slice(0, 300) : "",
    language: x.language ? String(x.language) : "",
    stars: Number(x.stargazers_count) || 0,
    forks: Number(x.forks_count) || 0,
    url: String(x.html_url),
    homepage: x.homepage ? String(x.homepage).slice(0, 300) : "",
    isPrivate: !!x.private,
    isFork: !!x.fork,
    archived: !!x.archived,
    topics: Array.isArray(x.topics) ? x.topics.slice(0, 8).map(String) : [],
    pushedAt: x.pushed_at ? new Date(x.pushed_at) : undefined,
  };
}

// ---- Public lookups: anyone's public profile and repos. `token` is the site's own GITHUB_TOKEN, used only to get a higher rate limit. ----
export async function ghPublicUser(login: string, token?: string) {
  const u = await call(`/users/${encodeURIComponent(login)}`, token);
  return {
    login: String(u.login), name: u.name ? String(u.name) : "", avatar: String(u.avatar_url || ""), bio: u.bio ? String(u.bio) : "",
    url: String(u.html_url || ""), followers: Number(u.followers) || 0, publicRepos: Number(u.public_repos) || 0,
  };
}

// Public repositories only (this endpoint never returns private ones). Capped at 300.
export async function ghPublicRepos(login: string, token?: string) {
  const out: any[] = [];
  for (let page = 1; page <= 3; page++) {
    const list = await call(`/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`, token);
    if (!Array.isArray(list)) break;
    out.push(...list);
    if (list.length < 100) break;
  }
  return out.map(mapRepo);
}
