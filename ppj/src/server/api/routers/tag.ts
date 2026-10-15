import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, explorerProcedure } from "~/server/api/trpc";
import { myPlaceTags, tags } from "~/server/db/schema";
import { fail, isDuplicateError, notFound } from "~/server/lib/errors";
import { newUid } from "~/server/lib/ids";
import { slugify } from "~/server/lib/slug";
import { hexColorSchema, nameSchema, uidSchema } from "~/server/lib/validation";

export const tagRouter = createTRPCRouter({
  list: explorerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        uid: tags.uid,
        name: tags.name,
        color: tags.color,
        usage: sql<number>`(select count(*) from ${myPlaceTags} where ${myPlaceTags.tagId} = ${tags.id})`,
      })
      .from(tags)
      .where(eq(tags.userId, ctx.user.id))
      .orderBy(asc(tags.name));
    return rows.map((r) => ({ ...r, usage: Number(r.usage) }));
  }),

  create: explorerProcedure
    .input(z.object({ name: nameSchema, color: hexColorSchema.default("#64748B") }))
    .mutation(async ({ ctx, input }) => {
      const base = slugify(input.name);
      let slug = base;
      for (let i = 2; ; i++) {
        const [e] = await ctx.db
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.userId, ctx.user.id), eq(tags.slug, slug)));
        if (!e) break;
        slug = `${base}-${i}`;
      }
      try {
        await ctx.db.insert(tags).values({
          uid: newUid(),
          userId: ctx.user.id,
          name: input.name,
          slug,
          color: input.color.toUpperCase(),
        });
      } catch (e) {
        if (isDuplicateError(e)) fail("TAG_NAME_TAKEN");
        throw e;
      }
      return { ok: true };
    }),

  update: explorerProcedure
    .input(z.object({ uid: uidSchema, name: nameSchema, color: hexColorSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [r] = await ctx.db
          .update(tags)
          .set({ name: input.name, color: input.color.toUpperCase() })
          .where(and(eq(tags.uid, input.uid), eq(tags.userId, ctx.user.id)));
        if (!r.affectedRows) notFound();
      } catch (e) {
        if (isDuplicateError(e)) fail("TAG_NAME_TAKEN");
        throw e;
      }
      return { ok: true };
    }),

  /** Hanya association my_place_tags yang ikut terhapus (CASCADE). */
  delete: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .delete(tags)
        .where(and(eq(tags.uid, input.uid), eq(tags.userId, ctx.user.id)));
      if (!r.affectedRows) notFound();
      return { ok: true };
    }),
});
