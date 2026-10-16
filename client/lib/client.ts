"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function voter(): string {
  try {
    let v = localStorage.getItem("beacon_voter");
    if (!v) { v = crypto.randomUUID(); localStorage.setItem("beacon_voter", v); }
    return v;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 12);
  }
}

export async function api(path: string, o: { method?: string; body?: any } = {}) {
  const r = await fetch(path, {
    method: o.method || "GET",
    headers: { "Content-Type": "application/json", "x-voter": voter() },
    body: o.body ? JSON.stringify(o.body) : undefined,
    credentials: "same-origin",
  });
  const j = await r.json().catch(() => ({}));
  // A 401 outside the auth routes means the session expired or was revoked: send the user to log in.
  if (r.status === 401 && !path.startsWith("/api/auth") && typeof location !== "undefined") {
    location.href = "/login?next=" + encodeURIComponent(location.pathname);
  }
  if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
  return j;
}

// Loads data once, then refreshes every `ms` while the tab is visible (this is how live updates work).
export function usePoll<T = any>(fn: () => Promise<T>, ms = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const ref = useRef(fn);
  ref.current = fn;
  const reload = useCallback(async () => {
    try { setData(await ref.current()); setError(""); } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => {
    reload();
    if (!ms) return;
    const i = setInterval(() => { if (!document.hidden) reload(); }, ms);
    return () => clearInterval(i);
  }, [reload, ms]);
  return { data, error, reload };
}
