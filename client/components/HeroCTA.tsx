"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function HeroCTA({ label = "Create your free board" }: { label?: string }) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { api("/api/auth/me").then((j) => setUser(j.user)).catch(() => {}); }, []);
  return user ? (
    <Link className="btn" href="/dashboard">Open your dashboard</Link>
  ) : (
    <>
      <Link className="btn" href="/signup">{label}</Link>
      <Link className="btn ghost" href="/login">Log in</Link>
    </>
  );
}
