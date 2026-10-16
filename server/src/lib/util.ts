import { Request } from "express";

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
