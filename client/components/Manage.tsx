"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, usePoll } from "@/lib/client";
import { STATUS } from "./Board";

const COLS = ["open", "planned", "progress", "shipped"];
const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };

function Team({ id }: { id: string }) {
  const { data, error, reload } = usePoll(() => api(`/api/projects/${id}/members`));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [err, setErr] = useState("");
  if (error) return <p className="err">{error}</p>;
  if (!data) return <div className="skeleton" />;
  const isOwner = data.role === "owner";
  const isAdmin = isOwner || data.role === "admin";

  async function run(fn: () => Promise<any>) { setErr(""); try { await fn(); reload(); } catch (x: any) { setErr(x.message); } }
  const add = (e: any) => { e.preventDefault(); run(async () => { await api(`/api/projects/${id}/members`, { method: "POST", body: { email, role } }); setEmail(""); }); };
  const change = (userId: string, r: string) => run(() => api(`/api/projects/${id}/members`, { method: "PATCH", body: { userId, role: r } }));
  const remove = (userId: string, self: boolean) => { if (confirm(self ? "Leave this project?" : "Remove this person?")) run(() => api(`/api/projects/${id}/members/${userId}`, { method: "DELETE" })); };

  return (
    <div className="glass" style={{ padding: 20, display: "grid", gap: 14 }}>
      <div><b>Team</b><p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>Viewers read. Editors triage and reply. Admins also delete ideas and manage people. The owner also manages admins and deletes the project.</p></div>
      {data.members.map((m: any) => {
        const self = m.userId === data.me;
        const locked = m.role === "owner" || (m.role === "admin" && !isOwner) || !isAdmin;
        return (
          <div key={m.userId} className="flex items-center justify-between gap-3 flex-wrap">
            <div><b>{m.name}</b>{self && <span className="muted"> (you)</span>}{m.email && <div className="muted" style={{ fontSize: 13 }}>{m.email}</div>}</div>
            <div className="flex items-center gap-2">
              {m.role === "owner" || locked ? <span className={"chip " + (m.role === "owner" ? "owner" : "")}>{ROLE_LABEL[m.role]}</span> : (
                <select className="in" style={{ width: 120 }} value={m.role} aria-label={`Role for ${m.name}`} onChange={(e) => change(m.userId, e.target.value)}>
                  {(isOwner ? ["admin", "editor", "viewer"] : ["editor", "viewer"]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              )}
              {m.role !== "owner" && (self || !locked) && <button className="btn ghost" onClick={() => remove(m.userId, self)}>{self ? "Leave" : "Remove"}</button>}
            </div>
          </div>
        );
      })}
      {isAdmin && (
        <form onSubmit={add} className="flex gap-2 flex-wrap" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <input className="in" style={{ flex: 1, minWidth: 200 }} type="email" placeholder="Teammate's Beacon account email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <select className="in" style={{ width: 120 }} value={role} aria-label="Role" onChange={(e) => setRole(e.target.value)}>
            {(isOwner ? ["admin", "editor", "viewer"] : ["editor", "viewer"]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button className="btn">Add person</button>
        </form>
      )}
      {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}

export default function Manage({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, reload } = usePoll(() => api("/api/projects/" + id), 8000);
  const [tab, setTab] = useState("feedback");
  const [copied, setCopied] = useState("");
  const [msg, setMsg] = useState("");

  if (error) return <p className="glass" style={{ padding: 24 }}>{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 260 }} />;
  const { project, posts, stats, role } = data;
  const canEdit = ["owner", "admin", "editor"].includes(role);
  const canDelete = ["owner", "admin"].includes(role);
  const origin = typeof window !== "undefined" ? location.origin : "";
  const publicUrl = `${origin}/p/${project.slug}`;
  const snippet = `<script src="${origin}/widget.js" data-project="${project.slug}" defer></script>`;
  const maxDay = Math.max(1, ...stats.perDay.map((d: any) => d.count));

  async function run(fn: () => Promise<any>) { setMsg(""); try { await fn(); reload(); } catch (x: any) { setMsg(x.message); } }
  const patch = (pid: string, b: any) => run(() => api("/api/posts/" + pid, { method: "PATCH", body: b }));
  const del = (pid: string) => { if (confirm("Delete this idea and its comments?")) run(() => api("/api/posts/" + pid, { method: "DELETE" })); };
  async function removeProject() {
    if (!confirm(`Delete "${project.name}" and everything in it? This cannot be undone.`)) return;
    try { await api("/api/projects/" + id, { method: "DELETE" }); router.push("/dashboard"); } catch (x: any) { setMsg(x.message); }
  }
  function copy(text: string, key: string) { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Link href="/dashboard" className="muted" style={{ fontSize: 14 }}>← All projects</Link>
          <h1 className="h1 glowtext" style={{ fontSize: "clamp(28px,5vw,48px)", marginTop: 6 }}>{project.name} <span className={"chip " + (role === "owner" ? "owner" : "")} style={{ fontSize: 13, verticalAlign: "middle" }}>{ROLE_LABEL[role]}</span></h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link className="btn ghost" href={`/p/${project.slug}`} target="_blank">Public board</Link>
          <Link className="btn ghost" href={`/p/${project.slug}/changelog`} target="_blank">Changelog</Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[["feedback", "Roadmap"], ["analytics", "Analytics"], ["team", "Team"], ["embed", "Share and embed"]].map(([k, l]) => (
          <button key={k} className="btn ghost" style={tab === k ? { borderColor: "var(--accent)", boxShadow: "0 0 18px color-mix(in srgb, var(--accent) 40%, transparent)" } : undefined} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {msg && <p className="err" role="alert" style={{ margin: 0 }}>{msg}</p>}
      {!canEdit && tab === "feedback" && <p className="muted" style={{ margin: 0, fontSize: 14 }}>You have view-only access to this project.</p>}

      {tab === "feedback" && (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {COLS.map((c) => {
            const items = posts.filter((p: any) => p.status === c);
            return (
              <div key={c} className="glass col">
                <div className="flex justify-between"><b>{STATUS[c]}</b><span className="muted">{items.length}</span></div>
                {items.length === 0 && <p className="muted" style={{ fontSize: 13, margin: 0 }}>Nothing here yet.</p>}
                {items.map((p: any) => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass" style={{ padding: 12, display: "grid", gap: 8, borderRadius: 14 }}>
                    <div className="flex justify-between gap-2"><b style={{ fontSize: 14 }}>{p.title}</b><span className="chip">▲ {p.votes}</span></div>
                    {p.body && <span className="muted" style={{ fontSize: 13 }}>{p.body}</span>}
                    {canEdit ? (
                      <>
                        <select className="in" value={p.status} aria-label="Change status" onChange={(e) => patch(p.id, { status: e.target.value })}>
                          {COLS.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                        </select>
                        <textarea key={p.id + p.reply} className="in" rows={2} placeholder="Reply to your users" defaultValue={p.reply} onBlur={(e) => e.target.value !== p.reply && patch(p.id, { reply: e.target.value })} />
                      </>
                    ) : p.reply ? <div className="reply">{p.reply}</div> : null}
                    {canDelete && <button className="btn danger" onClick={() => del(p.id)}>Delete</button>}
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === "analytics" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            {[["Ideas", stats.total], ["Votes", stats.votes], ["Planned", stats.byStatus.planned + stats.byStatus.progress], ["Shipped", stats.byStatus.shipped]].map(([l, v]) => (
              <div key={l as string} className="glass" style={{ padding: 18 }}><div className="muted" style={{ fontSize: 14 }}>{l}</div><div className="glowtext" style={{ fontSize: 40, fontWeight: 300 }}>{v}</div></div>
            ))}
          </div>
          <div className="glass" style={{ padding: 18 }}>
            <b>New ideas, last 14 days</b>
            <div className="flex items-end gap-1" style={{ height: 120, marginTop: 14 }}>
              {stats.perDay.map((d: any) => (
                <div key={d.key} style={{ flex: 1, display: "grid", justifyItems: "center", alignContent: "end", height: "100%", gap: 4 }} title={`${d.label}: ${d.count}`}>
                  <motion.div className="bar" style={{ width: "100%" }} initial={{ height: 0 }} animate={{ height: `${(d.count / maxDay) * 100}%` }} transition={{ duration: 0.6 }} />
                  <span className="muted" style={{ fontSize: 10 }}>{d.label.split("/")[1]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass" style={{ padding: 18, display: "grid", gap: 8 }}>
            <b>Top requests</b>
            {stats.top.length === 0 && <span className="muted">No ideas yet. Share your public board to get started.</span>}
            {stats.top.map((p: any) => <div key={p.id} className="flex justify-between gap-3"><span>{p.title}</span><span className="muted">▲ {p.votes}</span></div>)}
          </div>
        </div>
      )}

      {tab === "team" && <Team id={id} />}

      {tab === "embed" && (
        <div className="glass" style={{ padding: 20, display: "grid", gap: 14 }}>
          <div><b>Public board link</b><code className="snip" style={{ marginTop: 8 }}>{publicUrl}</code><button className="btn ghost" style={{ marginTop: 8 }} onClick={() => copy(publicUrl, "u")}>{copied === "u" ? "Copied" : "Copy link"}</button></div>
          <div><b>Feedback widget</b><p className="muted" style={{ margin: "6px 0 8px", fontSize: 14 }}>Paste this before the closing body tag on your site. It adds a floating Feedback button.</p><code className="snip">{snippet}</code><button className="btn ghost" style={{ marginTop: 8 }} onClick={() => copy(snippet, "s")}>{copied === "s" ? "Copied" : "Copy snippet"}</button></div>
          {role === "owner" && <div><button className="btn danger" onClick={removeProject}>Delete project</button></div>}
        </div>
      )}
    </div>
  );
}
