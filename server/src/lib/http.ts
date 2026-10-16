import { Request, Response, NextFunction } from "express";

// Express 4 does not catch errors thrown in async handlers, so wrap them.
export const wrap =
  (fn: (req: any, res: any, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

export const fail = (res: Response, status: number, message: string) => res.status(status).json({ error: message });

// Validates a value with a Zod schema. Returns { data } or { error }.
export function parse(schema: any, value: any): any {
  const r = schema.safeParse(value);
  return r.success ? { data: r.data } : { error: r.error.issues[0]?.message || "Invalid input" };
}
