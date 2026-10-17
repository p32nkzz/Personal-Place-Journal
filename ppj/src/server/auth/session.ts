import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { passwordFingerprint } from "~/server/lib/password";
import { auth } from "./index";
import { type ActiveMode } from "./config";

export type CurrentUser = {
  id: number;
  uid: string;
  name: string;
  username: string;
  email: string;
  role: string;
  preferredLanguage: "ID" | "EN";
  mustChangePassword: boolean;
  /** URL avatar (dengan versi untuk cache-busting) atau null bila belum ada. */
  avatarUrl: string | null;
  /** Mode aktif efektif: EXPLORER selalu EXPLORER; ADMIN mengikuti token. */
  mode: ActiveMode;
};

/**
 * Memuat user dari DB berdasarkan token sesi. Sesi tidak valid bila user dinonaktifkan,
 * dihapus, atau password berubah/di-reset (K-29f).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const uid = session?.user?.uid;
  if (!uid) return null;
  const [u] = await db.select().from(users).where(eq(users.uid, uid));
  if (!u || !u.isActive || u.deletedAt) return null;
  if (session.user.pv !== passwordFingerprint(u.passwordHash)) return null;
  return {
    id: u.id,
    uid: u.uid,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    preferredLanguage: u.preferredLanguage,
    mustChangePassword: u.mustChangePassword,
    avatarUrl: u.avatarFilePath
      ? `/api/files/avatar/${u.uid}?v=${u.updatedAt.getTime()}`
      : null,
    mode: u.role === "ADMIN" ? session.user.mode : "EXPLORER",
  };
});
