import { z } from "zod";

export const passwordRule = z
  .string()
  .min(8, "Password needs at least 8 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Password needs at least one letter")
  .regex(/\d/, "Password needs at least one number");
