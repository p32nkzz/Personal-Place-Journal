import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  activeProcedure,
  authedProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import {
  confirmEmailChange,
  pendingEmailRequest,
  requestEmailChange,
} from "~/server/lib/emailChange";
import { fail, isDuplicateError } from "~/server/lib/errors";
import {
  hashPassword,
  passwordSchema,
  verifyPassword,
} from "~/server/lib/password";
import {
  emailSchema,
  nameSchema,
  usernameSchema,
} from "~/server/lib/validation";

export const accountRouter = createTRPCRouter({
  me: authedProcedure.query(async ({ ctx }) => {
    const pending = await pendingEmailRequest(ctx.user.id);
    const { id: _id, ...user } = ctx.user; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...user, pendingEmail: pending };
  }),

  /** Ganti password sendiri — memerlukan password saat ini (K-51). */
  changePassword: authedProcedure
    .input(z.object({ current: z.string().min(1), next: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const [u] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id));
      if (!u || !(await verifyPassword(input.current, u.passwordHash)))
        fail("CURRENT_PASSWORD_WRONG");
      if (input.current === input.next) fail("PASSWORD_SAME");
      await ctx.db
        .update(users)
        .set({
          passwordHash: await hashPassword(input.next),
          mustChangePassword: false,
        })
        .where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  setLanguage: authedProcedure
    .input(z.object({ preferredLanguage: z.enum(["ID", "EN"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set(input).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  updateProfile: activeProcedure
    .input(
      z.object({
        name: nameSchema,
        preferredLanguage: z.enum(["ID", "EN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set(input).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  /** TX-18 — username diganti langsung oleh pemilik akun. */
  changeUsername: activeProcedure
    .input(z.object({ username: usernameSchema }))
    .mutation(async ({ ctx, input }) => {
      if (input.username === ctx.user.username) return { ok: true };
      try {
        await ctx.db
          .update(users)
          .set({ username: input.username })
          .where(eq(users.id, ctx.user.id));
      } catch (e) {
        if (isDuplicateError(e)) fail("USERNAME_TAKEN");
        throw e;
      }
      return { ok: true };
    }),

  requestEmailChange: activeProcedure
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ ctx, input }) => {
      if (input.email === ctx.user.email) fail("EMAIL_SAME");
      await requestEmailChange({
        userId: ctx.user.id,
        requestedBy: ctx.user.id,
        newEmail: input.email,
        userName: ctx.user.name,
        language: ctx.user.preferredLanguage,
      });
      return { ok: true };
    }),

  confirmEmail: publicProcedure
    .input(z.object({ token: z.string().min(10).max(200) }))
    .mutation(async ({ input }) => {
      await confirmEmailChange(input.token);
      return { ok: true };
    }),
});
