"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, usePoll } from "@/lib/client";
import { hostOf, safeUrl } from "@/lib/url";

const when = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never");

function Connect({ onDone, reconnect }: { onDone: () => void; reconnect?: boolean }) {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/github/connect", { method: "POST", body: { username, token } });
      setToken("");
      onDone();
    } catch (x: any) { setErr(x.message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="glass" style={{ padding: 22, display: "grid", gap: 12, maxWidth: 580 }}>
      <div>
        <b style={{ fontSize: 19 }}>{reconnect ? "Reconnect GitHub" : "Connect your GitHub"}</b>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>Enter your username and a read-only token. Beacon loads your repositories, and you choose which ones appear on your public page.</p>
      </div>
      <input className="in" placeholder="GitHub username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
      <div style={{ position: "relative" }}>
        <input className="in" type={show ? "text" : "password"} placeholder="GitHub token" value={token} onChange={(e) => setToken(e.target.value)} style={{ paddingRight: 64 }} autoComplete="off" spellCheck={false} required />
        <button type="button" className="lk2" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
      </div>
      <details className="muted" style={{ fontSize: 14 }}>
        <summary style={{ cursor: "pointer" }}>How do I get a token?</summary>
        <ol className="steps">
          <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub token settings</a> and name it "Beacon".</li>
          <li>Under <b>Repository access</b> choose <b>All repositories</b>.</li>
          <li>Under <b>Permissions → Repositories</b>, <b>Metadata</b> must be <b>Read-only</b>. That is the only permission Beacon needs.</li>
          <li>Click <b>Generate token</b> and paste it above.</li>
        </ol>
        <p style={{ margin: "8px 0 0" }}>A classic token works too: tick no scopes for public repos only, or <code>repo</code> to include private ones.</p>
      </details>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Your token is encrypted before it is saved and is never shown again. Disconnect any time to delete it.</p>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Connecting..." : "Connect and load repos"}</button>
    </form>
  );
}

export default function GitHubPanel() {
  const router = useRouter();
  const { data, error, reload } = usePoll(() => api("/api/github"));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<{ t: string; bad?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const repos: any[] = data?.repos || [];
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return repos.filter((x) => {
      if (filter === "public" && !x.isPublic) return false;
      if (filter === "hidden" && x.isPublic) return false;
      if (filter === "private" && !x.isPrivate) return false;
      return !s || `${x.name} ${x.description} ${x.language}`.toLowerCase().includes(s);
    });
  }, [repos, q, filter]);

  if (error) return <p className="glass err" style={{ padding: 24 }}>{error}</p>;
  if (!data) return <div style={{ display: "grid", gap: 12 }}><div className="skeleton" /><div className="skeleton" /></div>;
  if (!data.connected) return <Connect onDone={reload} />;

  const origin = typeof window !== "undefined" ? location.origin : "";
  const profileUrl = `${origin}/u/${data.login}`;
  const publicCount = repos.filter((x) => x.isPublic).length;
  const openRepos = repos.filter((x) => !x.isPrivate).length;

  async function run(key: string, fn: () => Promise<any>, ok?: string) {
    setBusy(key);
    setNote(null);
    try { await fn(); if (ok) setNote({ t: ok }); reload(); } catch (x: any) { setNote({ t: x.message, bad: true }); }
    setBusy("");
  }
  const sync = () => run("sync", () => api("/api/github/sync", { method: "POST" }), "Repositories updated from GitHub.");
  const toggle = (x: any) => {
    if (!x.isPublic && x.isPrivate && !confirm(`"${x.name}" is private on GitHub. Visitors will see its name and description on your page, but they cannot open its code. Show it anyway?`)) return;
    run(x.id, () => api(`/api/github/repos/${x.id}`, { method: "PATCH", body: { isPublic: !x.isPublic } }));
  };
  const bulk = (isPublic: boolean) => {
    const msg = isPublic ? `Show all ${openRepos} public GitHub repositories on your page? Private ones stay hidden.` : "Hide every repository from your page?";
    if (confirm(msg)) run("bulk", () => api("/api/github/repos/bulk", { method: "POST", body: { isPublic } }));
  };
  const makeBoard = async (x: any) => {
    setBusy("board" + x.id);
    setNote(null);
    try { const j = await api(`/api/github/repos/${x.id}/board`, { method: "POST" }); router.push(`/dashboard/${j.id}`); return; } catch (e: any) { setNote({ t: e.message, bad: true }); }
    setBusy("");
  };
  const disconnect = () => {
    if (confirm("Disconnect GitHub? Your token and repository list are deleted from Beacon and your public page goes offline. Feedback boards you created stay.")) run("off", () => api("/api/github", { method: "DELETE" }));
  };
  const copy = () => { navigator.clipboard?.writeText(profileUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <Link href="/dashboard" className="muted" style={{ fontSize: 14 }}>← All projects</Link>
        <h1 className="h1 glowtext" style={{ fontSize: "clamp(28px,5vw,48px)", marginTop: 6 }}>GitHub</h1>
      </div>

      <div className="glass" style={{ padding: 18, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="flex items-center gap-3">
          {safeUrl(data.avatar) && <img className="avatar" src={data.avatar} alt="" />}
          <div>
            <b style={{ fontSize: 18 }}>{data.name || data.handle}</b>
            <div className="muted" style={{ fontSize: 14 }}>@{data.handle} · synced {when(data.syncedAt)}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={sync} disabled={!!busy || !data.tokenOk}>{busy === "sync" ? "Syncing..." : "Sync from GitHub"}</button>
          <button className="btn ghost" onClick={disconnect} disabled={!!busy}>Disconnect</button>
        </div>
      </div>

      {!data.tokenOk && (
        <div style={{ display: "grid", gap: 10 }}>
          <p className="err" role="alert">Your saved token can no longer be read. Reconnect to keep syncing.</p>
          <Connect onDone={reload} reconnect />
        </div>
      )}

      <div className="glass" style={{ padding: 18, display: "grid", gap: 10 }}>
        <div><b>Your public page</b><p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>Anyone with this link sees your GitHub name and the repositories you switch on below. {publicCount} {publicCount === 1 ? "repository is" : "repositories are"} public right now.</p></div>
        <code className="snip">{profileUrl}</code>
        <div className="flex gap-2 flex-wrap">
          <Link className="btn ghost sm" href={`/u/${data.login}`} target="_blank">Open page</Link>
          <button className="btn ghost sm" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <input className="in" style={{ flex: 1, minWidth: 180 }} placeholder={`Search ${repos.length} repositories`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search repositories" />
        <select className="in" style={{ width: 170 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter repositories">
          <option value="all">All repositories</option>
          <option value="public">Public on Beacon</option>
          <option value="hidden">Hidden</option>
          <option value="private">Private on GitHub</option>
        </select>
        <button className="btn ghost sm" onClick={() => bulk(true)} disabled={!!busy || openRepos === 0}>Show all public</button>
        <button className="btn ghost sm" onClick={() => bulk(false)} disabled={!!busy || publicCount === 0}>Hide all</button>
      </div>
      {note && <p className={note.bad ? "err" : "muted"} role={note.bad ? "alert" : "status"} style={{ margin: 0, fontSize: 14 }}>{note.t}</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {shown.map((x, i) => (
          <motion.div key={x.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="glass repo">
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={x.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 17, fontWeight: 600 }}>{x.name}</a>
                {x.isPrivate && <span className="chip warn">Private</span>}
                {x.isFork && <span className="chip">Fork</span>}
                {x.archived && <span className="chip">Archived</span>}
              </div>
              {x.description && <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>{x.description}</p>}
              <div className="muted" style={{ marginTop: 8, fontSize: 13, display: "flex", gap: 14, flexWrap: "wrap" }}>
                {x.language && <span>{x.language}</span>}
                <span>★ {x.stars}</span>
                <span>Updated {when(x.pushedAt)}</span>
                {safeUrl(x.homepage) && <span>{hostOf(x.homepage)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {x.boardSlug
                ? <Link className="btn ghost sm" href={`/p/${x.boardSlug}`} target="_blank">Feedback board ↗</Link>
                : <button className="btn ghost sm" onClick={() => makeBoard(x)} disabled={!!busy}>{busy === "board" + x.id ? "Creating..." : "Create feedback board"}</button>}
              <label className="flex items-center gap-2" style={{ fontSize: 14, cursor: "pointer" }}>
                <span className="muted">{x.isPublic ? "Public" : "Hidden"}</span>
                <button type="button" role="switch" aria-checked={x.isPublic} aria-label={`Show ${x.name} on your public page`} className="switch" onClick={() => toggle(x)} disabled={busy === x.id} />
              </label>
            </div>
          </motion.div>
        ))}
        {shown.length === 0 && <p className="muted glass" style={{ padding: 24, textAlign: "center" }}>{repos.length === 0 ? "No repositories found for this token." : "No repositories match."}</p>}
      </div>
    </div>
  );
}
