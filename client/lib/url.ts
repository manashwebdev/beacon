// Plain helpers (no "use client"), so Server Components and client components can both import them.

// Only ever link to http(s) addresses. The server cleans links too; this is a second guard before they reach an href.
export function safeUrl(u: any): string {
  const s = String(u || "");
  return /^https?:\/\//i.test(s) ? s : "";
}

// "https://www.my-app.com/path" -> "my-app.com"
export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}
