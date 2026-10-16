import { Request } from "express";
import { ProjectM } from "../models";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "project";

// Anonymous voters are identified by a random id the browser keeps in localStorage and sends as x-voter.
export function voterOf(req: Request): string | undefined {
  const v = String(req.headers["x-voter"] || "");
  return v.length >= 8 && v.length <= 64 ? v : undefined;
}

export const pub = (p: any, vid?: string) => ({
  id: String(p._id),
  title: p.title,
  body: p.body || "",
  author: p.author || "Anonymous",
  status: p.status,
  votes: p.voters.length,
  voted: !!vid && p.voters.includes(vid),
  reply: p.reply || "",
  createdAt: p.createdAt,
  shippedAt: p.shippedAt || null,
});

// Accepts "example.com" or "https://example.com/path". Returns a clean http(s) URL, or "" when it is not a usable link.
export function cleanUrl(input: any): string {
  let s = String(input || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) {
    if (/:\/\//.test(s) || /^(javascript|data|vbscript|file|mailto|ftp|blob):/i.test(s)) return "";
    s = "https://" + s;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (!u.hostname.includes(".")) return "";
    return u.toString().slice(0, 300);
  } catch {
    return "";
  }
}

// A project slug that is not taken yet: "my-app", then "my-app-2", "my-app-3"...
export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base, i = 1;
  while (await ProjectM.exists({ slug })) slug = `${base}-${++i}`;
  return slug;
}
