import { z } from "zod";
import { cleanUrl } from "./util";

export const passwordRule = z
  .string()
  .min(8, "Password needs at least 8 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Password needs at least one letter")
  .regex(/\d/, "Password needs at least one number");

// A website link: blank is allowed, "example.com" gets https:// added, anything that is not http(s) is rejected.
export const websiteRule = z
  .string()
  .trim()
  .max(300, "That link is too long")
  .refine((v) => !v || !!cleanUrl(v), "Enter a valid website link, like https://example.com")
  .transform((v) => cleanUrl(v));
