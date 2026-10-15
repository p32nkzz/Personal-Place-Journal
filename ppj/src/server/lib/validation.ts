import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{4,20}$/, "USERNAME_FORMAT");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("EMAIL_FORMAT")
  .max(255);

export const nameSchema = z.string().trim().min(1, "REQUIRED").max(255);
export const longTextSchema = z.string().trim().max(2000);
export const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
export const latSchema = z.number().min(-90).max(90);
export const lngSchema = z.number().min(-180).max(180);
export const uidSchema = z.string().uuid();
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "COLOR_FORMAT");
