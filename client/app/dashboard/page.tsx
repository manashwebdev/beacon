"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { api, usePoll } from "@/lib/client";

export default function Dashboard() {
  const { data, error, reload } = usePoll(() => api("/api/projects"));
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/projects", { method: "POST", body: { name, description: desc } });
      setName(""); setDesc("");
      reload();
    } catch (x: any) { setErr(x.message); }
    setBusy(false);
  }

  return (
    <>
      <Nav />
      <main className="wrap">
        <h1 className="h1 glowtext" style={{ fontSize: "clamp(30px,5vw,48px)" }}>Your projects</h1>
        <form onSubmit={create} className="glass" style={{ padding: 18, margin: "22px 0", display: "grid", gap: 10 }}>
          <b>New project</b>
          <div className="flex gap-2 flex-wrap">
            <input className="in" style={{ flex: 1, minWidth: 180 }} placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="in" style={{ flex: 2, minWidth: 200 }} placeholder="Short description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <button className="btn" disabled={busy}>{busy ? "Creating..." : "Create project"}</button>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
        </form>
        {error && <p className="err">{error}</p>}
        {!data && !error && <div className="skeleton" />}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {data?.projects.map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/dashboard/${p.id}`} className="glass lift" style={{ display: "block", padding: 20 }}>
                <div className="flex items-center justify-between gap-2"><b style={{ fontSize: 19 }}>{p.name}</b><span className={"chip " + (p.role === "owner" ? "owner" : "")}>{p.role === "owner" ? "Owner" : p.role === "admin" ? "Admin" : p.role === "editor" ? "Editor" : "Viewer"}</span></div>
                <p className="muted" style={{ margin: "6px 0 14px", fontSize: 14 }}>{p.description || "No description"}</p>
                <span className="chip">{p.posts} {p.posts === 1 ? "idea" : "ideas"}</span> <span className="muted" style={{ fontSize: 13 }}>/p/{p.slug}</span>
              </Link>
            </motion.div>
          ))}
        </div>
        {data && data.projects.length === 0 && <p className="muted">No projects yet. Create your first one above.</p>}
      </main>
    </>
  );
}
