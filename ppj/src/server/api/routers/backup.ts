import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { backupLogs, users } from "~/server/db/schema";
import { runManualBackup } from "~/server/lib/backup";

export const backupRouter = createTRPCRouter({
  /** 24.19 — riwayat backup; filter status, urutan, dan paging di server. */
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["ALL", "RUNNING", "SUCCESS", "FAILED"]).default("ALL"),
        sort: z.enum(["startedAt", "finishedAt", "fileSizeBytes"]).default("startedAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.status === "ALL" ? undefined : and(eq(backupLogs.status, input.status));
      const col = backupLogs[input.sort];
      const [totalRow] = await ctx.db.select({ total: sql<number>`count(*)` }).from(backupLogs).where(where);
      const rows = await ctx.db
        .select({
          uid: backupLogs.uid,
          status: backupLogs.status,
          triggerType: backupLogs.triggerType,
          startedAt: backupLogs.startedAt,
          finishedAt: backupLogs.finishedAt,
          fileSizeBytes: backupLogs.fileSizeBytes,
          errorMessage: backupLogs.errorMessage,
          triggeredByName: users.name,
        })
        .from(backupLogs)
        .leftJoin(users, eq(users.id, backupLogs.triggeredBy))
        .where(where)
        .orderBy(input.order === "asc" ? asc(col) : desc(col), desc(backupLogs.id))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
      return { total: Number(totalRow?.total ?? 0), rows };
    }),

  /** Apakah ada backup yang sedang berjalan (untuk polling & menonaktifkan tombol). */
  running: adminProcedure.query(async ({ ctx }) => {
    const [r] = await ctx.db
      .select({ n: sql<number>`count(*)` })
      .from(backupLogs)
      .where(eq(backupLogs.status, "RUNNING"));
    return Number(r?.n ?? 0) > 0;
  }),

  run: adminProcedure.mutation(({ ctx }) => runManualBackup(ctx.user.id)),
});
