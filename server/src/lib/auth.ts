import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Response } from "express";
import { UserM } from "../models";

export const COOKIE = "beacon_session";
const secret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set in production.");
    return "dev-secret-change-me";
  }
  return process.env.JWT_SECRET;
};

export const hash = (p: string) => bcrypt.hash(p, 10);
export const check = (p: string, h: string) => bcrypt.compare(p, h);

// `v` is the user's tokenVersion. Changing it invalidates every session issued before.
const signToken = (id: string, v = 0) => jwt.sign({ id, v }, secret(), { algorithm: "HS256", expiresIn: "7d" });

export const setSession = (res: Response, id: string, v = 0) =>
  res.cookie(COOKIE, signToken(id, v), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
export const clearSession = (res: Response) => res.clearCookie(COOKIE, { path: "/" });

// Returns the signed-in user, or null for a missing, invalid, expired or revoked session.
export async function userFromReq(req: any): Promise<any> {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token, secret(), { algorithms: ["HS256"] });
    const user: any = await UserM.findById(payload.id).lean();
    if (!user || (user.tokenVersion || 0) !== (payload.v || 0)) return null;
    return user;
  } catch {
    return null;
  }
}
