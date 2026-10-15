/**
 * Inisialisasi tRPC + prosedur berbasis role/mode (BRD 10.5, ERD 23).
 * Mode aktif akun ADMIN divalidasi di server (DD-13).
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { getCurrentUser } from "~/server/auth/session";
import { db } from "~/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const user = await getCurrentUser();
  return { db, user, ...opts };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/** Tanpa login (Guest boleh). */
export const publicProcedure = t.procedure;

/** Login, termasuk user yang wajib ganti password. */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Login dan tidak sedang wajib ganti password (FR-USR: akses dibatasi hingga password diganti). */
export const activeProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.mustChangePassword)
    throw new TRPCError({ code: "FORBIDDEN", message: "MUST_CHANGE_PASSWORD" });
  return next();
});

/** Fungsi Explorer: role EXPLORER, atau ADMIN dalam mode EXPLORER. */
export const explorerProcedure = activeProcedure.use(({ ctx, next }) => {
  if (ctx.user.mode !== "EXPLORER")
    throw new TRPCError({ code: "FORBIDDEN", message: "SWITCH_TO_EXPLORER" });
  return next();
});

/** Fungsi Admin: hanya akun ADMIN dalam mode ADMIN. */
export const adminProcedure = activeProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN" || ctx.user.mode !== "ADMIN")
    throw new TRPCError({ code: "FORBIDDEN", message: "SWITCH_TO_ADMIN" });
  return next();
});
