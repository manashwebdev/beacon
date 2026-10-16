import { Router } from "express";
import { z } from "zod";
import { UserM } from "../models";
import { hash, check, setSession, clearSession } from "../lib/auth";
import { optionalAuth } from "../middleware/auth";
import { wrap, fail, parse } from "../lib/http";
import { rateLimit, count, record } from "../lib/rate";
import { passwordRule } from "../lib/validators";

const r = Router();

const Signup = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.string().trim().email("Enter a valid email"),
  password: passwordRule,
});
const Login = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
const LOCK = 15 * 60_000;

r.post("/signup", rateLimit("signup", 10, 60_000, "Too many attempts. Try again in a minute."), wrap(async (req, res) => {
  const b = parse(Signup, req.body);
  if (b.error) return fail(res, 400, b.error);
  const email = b.data.email.toLowerCase();
  if (await UserM.findOne({ email })) return fail(res, 409, "That email is already registered. Log in instead.");
  const u = await UserM.create({ name: b.data.name, email, passwordHash: await hash(b.data.password) });
  setSession(res, String(u._id), 0);
  res.status(201).json({ id: String(u._id), name: u.name });
}));

r.post("/login", rateLimit("login", 20, 60_000, "Too many attempts. Try again in a minute."), wrap(async (req, res) => {
  const b = parse(Login, req.body);
  if (b.error) return fail(res, 400, b.error);
  const email = b.data.email.toLowerCase();
  // Lock an account for 15 minutes after 8 wrong passwords, no matter which IP they come from.
  if (count("fail:" + email, LOCK) >= 8) return fail(res, 429, "Too many wrong passwords for this account. Try again in 15 minutes.");
  const u = await UserM.findOne({ email });
  if (!u || !(await check(b.data.password, u.passwordHash))) {
    record("fail:" + email);
    return fail(res, 401, "Email or password is wrong.");
  }
  setSession(res, String(u._id), u.tokenVersion || 0);
  res.json({ id: String(u._id), name: u.name });
}));

r.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

r.get("/me", optionalAuth, (req: any, res) => {
  const u = req.user;
  res.json({ user: u ? { id: String(u._id), name: u.name, email: u.email } : null });
});

export default r;
