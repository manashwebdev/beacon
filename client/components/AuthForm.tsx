"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/client";

function strength(p: string) {
  const s = (p.length >= 8 ? 1 : 0) + (p.length >= 12 ? 1 : 0) + (/[A-Za-z]/.test(p) && /\d/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
  return { s, label: ["Too weak", "Weak", "Okay", "Good", "Strong"][s] };
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const signup = mode === "signup";
  const st = strength(f.password);

  async function go(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/api/auth/" + mode, { method: "POST", body: f });
      const next = new URLSearchParams(location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  }
  return (
    <motion.form onSubmit={go} className="glass auth" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
      <h1 className="glowtext" style={{ margin: 0, fontWeight: 300, fontSize: 30 }}>{signup ? "Create your account" : "Welcome back"}</h1>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>{signup ? "Free forever. No card needed." : "Log in to manage your boards."}</p>
      {signup && <input className="in" placeholder="Your name" value={f.name} onChange={set("name")} autoComplete="name" required />}
      <input className="in" type="email" placeholder="Email" value={f.email} onChange={set("email")} autoComplete="email" required />
      <div style={{ position: "relative" }}>
        <input className="in" type={show ? "text" : "password"} placeholder={signup ? "Password" : "Password"} value={f.password} onChange={set("password")} autoComplete={signup ? "new-password" : "current-password"} required style={{ paddingRight: 64 }} />
        <button type="button" className="lk2" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
      </div>
      {signup && (
        <div aria-live="polite">
          <div className="meter">{[1, 2, 3, 4].map((i) => <span key={i} className={st.s >= i ? "on s" + st.s : ""} />)}</div>
          <span className="muted" style={{ fontSize: 13 }}>{f.password ? st.label + ". " : ""}Use 8+ characters with a letter and a number.</span>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "One moment..." : signup ? "Create account" : "Log in"}</button>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        {signup ? "Already have an account? " : "New to Beacon? "}
        <Link href={signup ? "/login" : "/signup"} style={{ color: "var(--accent)" }}>{signup ? "Log in" : "Sign up"}</Link>
      </p>
    </motion.form>
  );
}
