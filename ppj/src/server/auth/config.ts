import { and, eq } from "drizzle-orm";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import { type JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { passwordFingerprint, verifyPassword } from "~/server/lib/password";

export type ActiveMode = "ADMIN" | "EXPLORER";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      uid: string;
      role: string;
      mode: ActiveMode;
      pv: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    mode?: ActiveMode;
    pv?: string;
  }
}

/** Login dengan email atau username (BRD P-15, ERD 24.22). */
export async function findLoginUser(identifier: string) {
  const id = identifier.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(id.includes("@") ? eq(users.email, id) : eq(users.username, id));
  return user ?? null;
}

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email / Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "");
        const password = String(credentials?.password ?? "");
        if (!identifier || !password) return null;
        const user = await findLoginUser(identifier);
        if (!user) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok || !user.isActive || user.deletedAt) return null;
        return { id: user.uid, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        // Login baru: akun ADMIN selalu masuk mode ADMIN (K-23).
        const [row] = await db
          .select()
          .from(users)
          .where(and(eq(users.uid, user.id)));
        if (row) {
          token.uid = row.uid;
          token.role = row.role;
          token.mode = row.role === "ADMIN" ? "ADMIN" : "EXPLORER";
          token.pv = passwordFingerprint(row.passwordHash);
        }
      }
      if (trigger === "update" && token.uid) {
        const s = session as { mode?: ActiveMode; refresh?: boolean } | null;
        // Switch mode hanya untuk akun ADMIN; divalidasi dari token tertanda (DD-13).
        if (s?.mode && token.role === "ADMIN") token.mode = s.mode;
        if (s?.refresh) {
          const [row] = await db
            .select()
            .from(users)
            .where(eq(users.uid, token.uid));
          if (row) token.pv = passwordFingerprint(row.passwordHash);
        }
      }
      return token as JWT;
    },
    session({ session, token }) {
      session.user.uid = token.uid ?? "";
      session.user.role = token.role ?? "EXPLORER";
      session.user.mode = token.mode ?? "EXPLORER";
      session.user.pv = token.pv ?? "";
      return session;
    },
  },
} satisfies NextAuthConfig;
