"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/client";

function Msg({ m }: { m: { ok?: boolean; t: string } | null }) {
  return m ? <p className={m.ok ? "muted" : "err"} role={m.ok ? "status" : "alert"} style={{ margin: 0, fontSize: 14 }}>{m.t}</p> : null;
}

export default function Account() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [del, setDel] = useState("");
  const [m1, setM1] = useState<any>(null), [m2, setM2] = useState<any>(null), [m3, setM3] = useState<any>(null), [m4, setM4] = useState<any>(null);

  useEffect(() => { api("/api/auth/me").then((j) => { setMe(j.user); setName(j.user?.name || ""); }); }, []);

  async function saveName(e: any) {
    e.preventDefault();
    try { await api("/api/account", { method: "PATCH", body: { name } }); setM1({ ok: true, t: "Name updated." }); } catch (x: any) { setM1({ t: x.message }); }
  }
  async function savePw(e: any) {
    e.preventDefault();
    try { await api("/api/account/password", { method: "POST", body: pw }); setPw({ current: "", next: "" }); setM2({ ok: true, t: "Password changed. Other devices were signed out." }); } catch (x: any) { setM2({ t: x.message }); }
  }
  async function others() {
    try { await api("/api/account/sessions", { method: "POST" }); setM3({ ok: true, t: "Signed out of all other devices." }); } catch (x: any) { setM3({ t: x.message }); }
  }
  async function remove(e: any) {
    e.preventDefault();
    if (!confirm("Delete your account and every project you own? This cannot be undone.")) return;
    try { await api("/api/account", { method: "DELETE", body: { password: del } }); router.push("/"); router.refresh(); } catch (x: any) { setM4({ t: x.message }); }
  }

  return (
    <>
      <Nav />
      <main className="wrap" style={{ maxWidth: 640 }}>
        <h1 className="h1 glowtext" style={{ fontSize: "clamp(30px,5vw,44px)" }}>Your account</h1>
        {me && <p className="muted">{me.email}</p>}
        <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
          <form onSubmit={saveName} className="glass" style={{ padding: 20, display: "grid", gap: 10 }}>
            <b>Profile</b>
            <input className="in" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" required />
            <Msg m={m1} /><button className="btn" style={{ justifySelf: "start" }}>Save name</button>
          </form>
          <form onSubmit={savePw} className="glass" style={{ padding: 20, display: "grid", gap: 10 }}>
            <b>Change password</b>
            <input className="in" type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required />
            <input className="in" type="password" placeholder="New password (8+ characters, a letter and a number)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required />
            <Msg m={m2} /><button className="btn" style={{ justifySelf: "start" }}>Change password</button>
          </form>
          <div className="glass" style={{ padding: 20, display: "grid", gap: 10 }}>
            <b>Sessions</b>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Lost a device or used a shared computer? Sign out everywhere except here.</p>
            <Msg m={m3} /><button className="btn ghost" style={{ justifySelf: "start" }} onClick={others}>Sign out of other devices</button>
          </div>
          <form onSubmit={remove} className="glass" style={{ padding: 20, display: "grid", gap: 10, borderColor: "rgba(255,107,129,.4)" }}>
            <b>Delete account</b>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>This permanently deletes your account, the projects you own, and all their ideas and comments.</p>
            <input className="in" type="password" placeholder="Enter your password to confirm" value={del} onChange={(e) => setDel(e.target.value)} autoComplete="current-password" required />
            <Msg m={m4} /><button className="btn danger" style={{ justifySelf: "start" }}>Delete my account</button>
          </form>
        </div>
      </main>
    </>
  );
}
