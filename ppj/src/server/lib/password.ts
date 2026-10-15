import { createHash, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const PASSWORD_MIN = 8;
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGIT = "23456789";
const SYMBOL = "!@#$%^&*-_+=?";

/** Password: min 8 karakter dan memuat huruf kecil, huruf besar, angka, simbol (BRD K-33, 12.9). */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, "PASSWORD_MIN")
  .max(72, "PASSWORD_MAX")
  .refine(
    (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v),
    "PASSWORD_COMPOSITION",
  );

const pick = (set: string) => set[randomInt(set.length)]!;

/** Password acak 12 karakter yang memuat keempat kelompok karakter. */
export function generatePassword(length = 12) {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMBOL)];
  const all = LOWER + UPPER + DIGIT + SYMBOL;
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

/** Sidik jari hash password — dipakai untuk mengakhiri sesi lama saat password berubah. */
export const passwordFingerprint = (hash: string) =>
  createHash("sha256").update(hash).digest("hex").slice(0, 16);
