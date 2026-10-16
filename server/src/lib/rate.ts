import { Request, Response, NextFunction } from "express";

// Simple in-memory sliding-window limiter. Fine for one server instance.
const hits = new Map<string, number[]>();

export function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}
// For counting only failures (login lockout): peek with count(), add with record().
export function count(key: string, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  hits.set(key, list);
  return list.length;
}
export function record(key: string) {
  const list = hits.get(key) || [];
  list.push(Date.now());
  hits.set(key, list);
}
export const ip = (req: Request) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "local";

export const rateLimit =
  (name: string, max: number, windowMs: number, message = "Too many requests. Try again shortly.") =>
  (req: Request, res: Response, next: NextFunction) => {
    if (limited(name + ip(req), max, windowMs)) return res.status(429).json({ error: message });
    next();
  };

// Drop stale entries so the map cannot grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, list] of hits) {
    const fresh = list.filter((t) => now - t < 30 * 60_000);
    fresh.length ? hits.set(k, fresh) : hits.delete(k);
  }
}, 10 * 60_000).unref();
