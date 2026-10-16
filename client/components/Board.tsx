"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { api, usePoll } from "@/lib/client";

export const STATUS: Record<string, string> = { open: "Under review", planned: "Planned", progress: "In progress", shipped: "Shipped" };

function Comments({ id }: { id: string }) {
  const { data, reload } = usePoll(() => api(`/api/posts/${id}/comments`));
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  async function send(e: any) {
    e.preventDefault();
    setErr("");
    try {
      await api(`/api/posts/${id}/comments`, { method: "POST", body: { body: text, author: name } });
      setText("");
      reload();
    } catch (x: any) { setErr(x.message); }
  }
  return (
    <div className="cm">
      {(data?.comments || []).map((c: any) => (
        <p key={c.id}><b style={c.byOwner ? { color: "var(--accent)" } : undefined}>{c.byOwner ? "Team · " : ""}{c.author}</b> <span className="muted">{c.body}</span></p>
      ))}
      <form onSubmit={send} className="flex gap-2 flex-wrap">
        <input className="in" style={{ maxWidth: 150 }} placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="in" style={{ flex: 1, minWidth: 140 }} placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn">Post</button>
      </form>
      {err && <p className="err">{err}</p>}
    </div>
  );
}

export default function Board({ slug, embed }: { slug: string; embed?: boolean }) {
  const { data, error, reload } = usePoll(() => api("/api/p/" + slug), 6000);
  const [t, setT] = useState("");
  const [b, setB] = useState("");
  const [a, setA] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/p/${slug}/posts`, { method: "POST", body: { title: t, body: b, author: a } });
      setT(""); setB("");
      setMsg("Thanks! Your idea is on the board.");
      reload();
    } catch (x: any) { setMsg(x.message); }
    setBusy(false);
  }
  async function vote(id: string) {
    try { await api(`/api/posts/${id}/vote`, { method: "POST" }); reload(); } catch (x: any) { setMsg(x.message); }
  }

  if (error) return <p className="glass" style={{ padding: 24 }}>{error}</p>;
  if (!data) return <div style={{ display: "grid", gap: 12 }}><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  const posts = data.posts.filter((p: any) => filter === "all" || p.status === filter);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 className="h1 glowtext" style={embed ? { fontSize: 26 } : undefined}>{data.project.name}</h1>
        {data.project.description && <p className="muted" style={{ margin: "8px 0 0" }}>{data.project.description}</p>}
        {!embed && <Link href={`/p/${slug}/changelog`} className="btn ghost" style={{ marginTop: 14 }}>See what shipped</Link>}
      </div>

      <form onSubmit={submit} className="glass" style={{ padding: 16, display: "grid", gap: 10 }}>
        <input className="in" placeholder="What should we build or fix?" value={t} onChange={(e) => setT(e.target.value)} required />
        <textarea className="in" placeholder="Add details (optional)" rows={2} value={b} onChange={(e) => setB(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <input className="in" style={{ flex: 1, minWidth: 120 }} placeholder="Your name (optional)" value={a} onChange={(e) => setA(e.target.value)} />
          <button className="btn" disabled={busy}>{busy ? "Sending..." : "Submit idea"}</button>
        </div>
        {msg && <p className="muted" style={{ margin: 0, fontSize: 14 }} role="status">{msg}</p>}
      </form>

      <div className="flex gap-2 flex-wrap">
        {["all", "open", "planned", "progress", "shipped"].map((s) => (
          <button key={s} className="btn ghost" style={filter === s ? { borderColor: "var(--accent)" } : undefined} onClick={() => setFilter(s)}>
            {s === "all" ? "All" : STATUS[s]}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {posts.map((p: any) => (
          <motion.div key={p.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }} className="glass">
            <div className="post">
              <button className={"vote" + (p.voted ? " on" : "")} onClick={() => vote(p.id)} aria-pressed={p.voted} aria-label={`Upvote ${p.title}`}>
                <span aria-hidden>▲</span><b>{p.votes}</b>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex gap-2 items-center flex-wrap">
                  <b style={{ fontSize: 17 }}>{p.title}</b>
                  <span className={"chip " + p.status}>{STATUS[p.status]}</span>
                </div>
                {p.body && <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>{p.body}</p>}
                {p.reply && <div className="reply">{p.reply}</div>}
                <button className="muted" style={{ background: "none", border: 0, padding: 0, marginTop: 8, cursor: "pointer", font: "inherit", fontSize: 13 }} onClick={() => setOpen(open === p.id ? null : p.id)}>
                  {open === p.id ? "Hide comments" : "Comments"} · by {p.author}
                </button>
                {open === p.id && <Comments id={p.id} />}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {posts.length === 0 && <p className="muted glass" style={{ padding: 24, textAlign: "center" }}>No ideas here yet. Be the first to post one.</p>}
    </div>
  );
}
