import { cookies } from "next/headers";

// Helpers for Server Components: call the Express API from the Next.js server, forwarding the visitor's cookies.
export const API_URL = process.env.API_URL || "http://localhost:4000";

export function serverFetch(path: string) {
  return fetch(API_URL + path, { headers: { cookie: cookies().toString() }, cache: "no-store" });
}

// The signed-in user, or null for a missing, expired or revoked session (or if the API is unreachable).
export async function serverUser() {
  try {
    const r = await serverFetch("/api/auth/me");
    if (!r.ok) return null;
    return (await r.json()).user || null;
  } catch {
    return null;
  }
}
