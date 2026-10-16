"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/client";
import { hostOf, safeUrl } from "@/lib/url";

const month = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");

// Accepts "octocat", "@octocat" or a pasted github.com link.
const clean = (s: string) => s.trim().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "").split(/[/?#\s]/)[0];

export default function Lookup({ username }: { username?: string }) {
  const router = useRouter();
  const [name, setName] = useState(username || "");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(!!username);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("stars");
  const [noForks, setNoForks] = useState(false);

  useEffect(() => {
    if (!username) return;
    let live = true;
    setLoading(true);
    setErr("");
    setData(null);
    api("/api/lookup/" + encodeURIComponent(username))
      .then((j) => live && setData(j))
      .catch((e) => live && setErr(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [username]);

  const repos: any[] = data?.repos || [];
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = repos.filter((x) => (!noForks || !x.isFork) && (!s || `${x.name} ${x.description} ${x.language} ${x.topics.join(" ")}`.toLowerCase().includes(s)));
    if (sort === "stars") list.sort((a, b) => b.stars - a.stars);
    else if (sort === "updated") list.sort((a, b) => +new Date(b.pushedAt || 0) - +new Date(a.pushedAt || 0));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [repos, q, sort, noForks]);

  function go(e: any) {
    e.preventDefault();
    const u = clean(name);
    if (u) router.push("/github/" + encodeURIComponent(u));
  }

  const p = data?.profile;
  const avatar = safeUrl(p?.avatar);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {!username && (
        <div>
          <h1 className="h1 glowtext" style={{ fontSize: "clamp(30px,5vw,52px)" }}>Explore any GitHub profile</h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: 560 }}>Type a GitHub username to see their public projects, with stars, languages and links to the code and live sites. No account needed.</p>
        </div>
      )}

      <form onSubmit={go} className="flex gap-2 flex-wrap" style={{ maxWidth: 560 }}>
        <input className="in" style={{ flex: 1, minWidth: 200 }} placeholder="GitHub username, e.g. octocat" value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="GitHub username" required />
        <button className="btn" disabled={loading}>{loading ? "Searching..." : "Show repos"}</button>
      </form>

      {loading && <div style={{ display: "grid", gap: 12 }}><div className="skeleton" /><div className="skeleton" /></div>}
      {err && <p className="glass err" role="alert" style={{ padding: 20 }}>{err}</p>}

      {p && (
        <>
          <header className="glass" style={{ padding: 22, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            {avatar && <img className="avatar lg" src={avatar} alt="" />}
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2 className="h1 glowtext" style={{ fontSize: "clamp(26px,4vw,38px)" }}>{p.name || p.login}</h2>
              <a className="muted" href={safeUrl(p.url) || `https://github.com/${p.login}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15 }}>@{p.login} on GitHub ↗</a>
              {p.bio && <p style={{ margin: "10px 0 0" }}>{p.bio}</p>}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <span className="chip">{p.publicRepos} public repos</span>
              <span className="chip">{p.followers} followers</span>
              {p.hasPage && <Link className="btn ghost sm" href={`/u/${p.login.toLowerCase()}`}>Beacon page →</Link>}
            </div>
          </header>

          <div className="flex gap-2 flex-wrap items-center">
            <input className="in" style={{ flex: 1, minWidth: 180 }} placeholder={`Search ${repos.length} repositories`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search repositories" />
            <select className="in" style={{ width: 170 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort repositories">
              <option value="stars">Most stars</option>
              <option value="updated">Recently updated</option>
              <option value="name">Name</option>
            </select>
            <label className="flex items-center gap-2" style={{ fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={noForks} onChange={(e) => setNoForks(e.target.checked)} /> Hide forks
            </label>
          </div>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {shown.map((x, i) => {
              const code = safeUrl(x.url);
              const site = safeUrl(x.homepage);
              return (
                <motion.article key={x.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="glass lift" style={{ padding: 20, display: "grid", gap: 10, alignContent: "start" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{x.name}</h3>
                    {x.isFork && <span className="chip">Fork</span>}
                    {x.archived && <span className="chip">Archived</span>}
                  </div>
                  {x.description && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{x.description}</p>}
                  {x.topics.length > 0 && <div className="flex gap-2 flex-wrap">{x.topics.slice(0, 5).map((t: string) => <span key={t} className="chip">{t}</span>)}</div>}
                  <div className="muted" style={{ fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {x.language && <span>{x.language}</span>}
                    <span>★ {x.stars}</span>
                    {x.pushedAt && <span>Updated {month(x.pushedAt)}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap" style={{ marginTop: 4 }}>
                    {site && <a className="btn sm" href={site} target="_blank" rel="noopener noreferrer nofollow">Visit {hostOf(site)} ↗</a>}
                    {code && <a className="btn ghost sm" href={code} target="_blank" rel="noopener noreferrer">View code</a>}
                  </div>
                </motion.article>
              );
            })}
          </div>
          {shown.length === 0 && <p className="muted glass" style={{ padding: 24, textAlign: "center" }}>{repos.length === 0 ? "This user has no public repositories." : "No repositories match."}</p>}
        </>
      )}
    </div>
  );
}
