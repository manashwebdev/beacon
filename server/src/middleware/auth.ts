import { wrap, fail } from "../lib/http";
import { userFromReq } from "../lib/auth";

// Rejects the request unless a valid session is present, and exposes the user as req.user.
export const requireAuth = wrap(async (req, res, next) => {
  const user = await userFromReq(req);
  if (!user) return fail(res, 401, "Sign in required");
  req.user = user;
  next();
});

// Attaches req.user when signed in, but lets anonymous visitors through.
export const optionalAuth = wrap(async (req, _res, next) => {
  req.user = await userFromReq(req);
  next();
});
