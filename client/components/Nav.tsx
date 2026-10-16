"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function Nav() {
  const [user, setUser] = useState<any>(undefined);
  const router = useRouter();
  useEffect(() => {
    api("/api/auth/me").then((j) => setUser(j.user)).catch(() => setUser(null));
  }, []);
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }
  return (
    <header className="nav glass">
      <Link href="/" className="brand">BEACON</Link>
      <nav className="flex items-center gap-2 flex-wrap">
        {user ? (
          <>
            <Link className="btn ghost" href="/dashboard">Dashboard</Link>
            <Link className="btn ghost" href="/github">Explore</Link>
            <Link className="btn ghost" href="/dashboard/github">My GitHub</Link>
            <Link className="btn ghost" href="/account">{user.name.split(" ")[0]}</Link>
            <button className="btn ghost" onClick={logout}>Log out</button>
          </>
        ) : user === null ? (
          <>
            <Link className="btn ghost" href="/github">Explore</Link>
            <Link className="btn ghost" href="/login">Log in</Link>
            <Link className="btn" href="/signup">Start free</Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}
