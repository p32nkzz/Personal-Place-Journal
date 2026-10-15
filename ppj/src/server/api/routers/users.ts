import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { requestEmailChange } from "~/server/lib/emailChange";
import { fail, isDuplicateError, notFound } from "~/server/lib/errors";
import { newUid } from "~/server/lib/ids";
import {
  generatePassword,
  hashPassword,
  passwordSchema,
} from "~/server/lib/password";
import {
  emailSchema,
  nameSchema,
  usernameSchema,
} from "~/server/lib/validation";

const explorerBy = (uid: string) =>
  and(eq(users.uid, uid), eq(users.role, "EXPLORER"));

export const usersRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).optional(),
        status: z
          .enum(["ALL", "ACTIVE", "INACTIVE", "DELETED"])
          .default("ALL"),
        sort: z
          .enum(["name", "username", "email", "createdAt"])
          .default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [eq(users.role, "EXPLORER")];
      if (input.q) {
        const q = `%${input.q}%`;
        conds.push(
          or(like(users.name, q), like(users.username, q), like(users.email, q))!,
        );
      }
      if (input.status === "ACTIVE")
        conds.push(eq(users.isActive, true), isNull(users.deletedAt));
      if (input.status === "INACTIVE")
        conds.push(eq(users.isActive, false), isNull(users.deletedAt));
      if (input.status === "DELETED") conds.push(isNotNull(users.deletedAt));
      const where = and(...conds);
      const col = users[input.sort];
      const [totalRow] = await ctx.db
        .select({ total: sql<number>`count(*)` })
        .from(users)
        .where(where);
      const rows = await ctx.db
        .select({
          uid: users.uid,
          name: users.name,
          hasAvatar: sql<number>`(${users.avatarFilePath} is not null)`,
          avatarVersion: users.updatedAt,
          username: users.username,
          email: users.email,
          isActive: users.isActive,
          deletedAt: users.deletedAt,
          mustChangePassword: users.mustChangePassword,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(input.order === "asc" ? asc(col) : desc(col))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
      return {
        rows: rows.map(({ hasAvatar, avatarVersion, ...r }) => ({
          ...r,
          avatarUrl:
            Number(hasAvatar) && !r.deletedAt
              ? `/api/files/avatar/${r.uid}?v=${avatarVersion.getTime()}`
              : null,
        })),
        total: Number(totalRow?.total ?? 0),
      };
    }),

  /** TX-13 — create Explorer; password awal wajib diganti saat login pertama. */
  create: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        username: usernameSchema,
        email: emailSchema,
        generate: z.boolean().default(true),
        password: passwordSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const password = input.generate
        ? generatePassword()
        : (input.password ?? fail("PASSWORD_REQUIRED"));
      try {
        await ctx.db.insert(users).values({
          uid: newUid(),
          name: input.name,
          username: input.username,
          email: input.email,
          passwordHash: await hashPassword(password),
          role: "EXPLORER",
          mustChangePassword: true,
        });
      } catch (e) {
        if (isDuplicateError(e)) {
          const [byEmail] = await ctx.db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, input.email));
          fail(byEmail ? "EMAIL_TAKEN" : "USERNAME_TAKEN");
        }
        throw e;
      }
      return { password: input.generate ? password : null };
    }),

  /** Admin hanya mengubah nama; username hanya oleh pemilik akun (BR-USR-017). */
  update: adminProcedure
    .input(z.object({ uid: z.string().uuid(), name: nameSchema }))
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .update(users)
        .set({ name: input.name })
        .where(explorerBy(input.uid));
      if (!r.affectedRows) notFound();
      return { ok: true };
    }),

  requestEmailChange: adminProcedure
    .input(z.object({ uid: z.string().uuid(), email: emailSchema }))
    .mutation(async ({ ctx, input }) => {
      const [u] = await ctx.db
        .select()
        .from(users)
        .where(explorerBy(input.uid));
      if (!u || u.deletedAt) notFound();
      if (u.email === input.email) fail("EMAIL_SAME");
      await requestEmailChange({
        userId: u.id,
        requestedBy: ctx.user.id,
        newEmail: input.email,
        userName: u.name,
        language: u.preferredLanguage,
      });
      return { ok: true };
    }),

  setActive: adminProcedure
    .input(z.object({ uid: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [u] = await ctx.db
        .select()
        .from(users)
        .where(explorerBy(input.uid));
      if (!u) notFound();
      if (u.deletedAt) fail("USER_DELETED");
      await ctx.db
        .update(users)
        .set({ isActive: input.isActive })
        .where(eq(users.id, u.id));
      return { ok: true };
    }),

  /** TX-02 — soft delete. */
  softDelete: adminProcedure
    .input(z.object({ uid: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [u] = await ctx.db
        .select()
        .from(users)
        .where(explorerBy(input.uid));
      if (!u) notFound();
      await ctx.db
        .update(users)
        .set({ isActive: false, deletedAt: new Date(), deletedBy: ctx.user.id })
        .where(eq(users.id, u.id));
      return { ok: true };
    }),

  /** TX-15 — restore. */
  restore: adminProcedure
    .input(z.object({ uid: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .update(users)
        .set({ isActive: true, deletedAt: null, deletedBy: null })
        .where(and(explorerBy(input.uid), isNotNull(users.deletedAt)));
      if (!r.affectedRows) notFound();
      return { ok: true };
    }),

  /** TX-13 — reset password: generate acak atau manual; sesi lama berakhir (fingerprint berubah). */
  resetPassword: adminProcedure
    .input(
      z.object({
        uid: z.string().uuid(),
        generate: z.boolean(),
        password: passwordSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const password = input.generate
        ? generatePassword()
        : (input.password ?? fail("PASSWORD_REQUIRED"));
      const [r] = await ctx.db
        .update(users)
        .set({
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
        })
        .where(explorerBy(input.uid));
      if (!r.affectedRows) notFound();
      return { password: input.generate ? password : null };
    }),
});
