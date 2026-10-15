import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, explorerProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  itineraries,
  itineraryPlaces,
  myPlaces,
  visitPhotos,
  visits,
} from "~/server/db/schema";
import { fail, notFound } from "~/server/lib/errors";
import { removeUpload } from "~/server/lib/files";
import { newUid } from "~/server/lib/ids";
import { type Tx } from "~/server/lib/master";
import { assertVisitPhotoCapacity, insertVisitPhoto } from "~/server/lib/photos";
import { longTextSchema, uidSchema } from "~/server/lib/validation";

const ratingSchema = z.number().int().min(1).max(5).nullish();

/** DV-01 / TX-04 — sinkronisasi visit_status dalam transaksi yang sama. */
export async function syncVisitStatus(tx: Tx, placeId: number) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)` })
    .from(visits)
    .where(eq(visits.myPlaceId, placeId));
  await tx
    .update(myPlaces)
    .set({ visitStatus: Number(row?.n ?? 0) > 0 ? "VISITED" : "PLAN" })
    .where(eq(myPlaces.id, placeId));
}

/** Memuat VISIT milik user (via my_places). */
export async function ownedVisit(userId: number, uid: string, tx?: Tx) {
  const q = (tx ?? db)
    .select({ v: visits, p: myPlaces })
    .from(visits)
    .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
    .where(and(eq(visits.uid, uid), eq(myPlaces.userId, userId)));
  const [r] = await q;
  if (!r) notFound();
  return r;
}

export const visitRouter = createTRPCRouter({
  /**
   * P-06 — standalone, planned place visit, atau unexpected visit.
   * Konsistensi konteks (K-41): itinerary_place ↔ my_place ↔ itinerary.
   */
  create: explorerProcedure
    .input(
      z.object({
        placeUid: uidSchema,
        visitedAt: z.coerce.date(),
        rating: ratingSchema,
        note: longTextSchema.nullish(),
        itineraryUid: uidSchema.nullish(),
        itineraryPlaceUid: uidSchema.nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.visitedAt.getTime() > Date.now() + 60_000) fail("VISIT_IN_FUTURE");
      const uid = newUid();
      await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(
            and(eq(myPlaces.uid, input.placeUid), eq(myPlaces.userId, ctx.user.id)),
          )
          .for("update");
        if (!p) notFound();
        if (!p.isActive) fail("PLACE_INACTIVE");

        let itineraryId: number | null = null;
        let itineraryPlaceId: number | null = null;
        if (input.itineraryPlaceUid) {
          const [ip] = await tx
            .select({ ip: itineraryPlaces, it: itineraries })
            .from(itineraryPlaces)
            .innerJoin(itineraries, eq(itineraries.id, itineraryPlaces.itineraryId))
            .where(
              and(
                eq(itineraryPlaces.uid, input.itineraryPlaceUid),
                eq(itineraries.userId, ctx.user.id),
              ),
            );
          if (!ip) notFound();
          if (ip.ip.myPlaceId !== p.id) fail("VISIT_CONTEXT_MISMATCH");
          if (input.itineraryUid && ip.it.uid !== input.itineraryUid)
            fail("VISIT_CONTEXT_MISMATCH");
          itineraryId = ip.it.id;
          itineraryPlaceId = ip.ip.id;
        } else if (input.itineraryUid) {
          const [it] = await tx
            .select()
            .from(itineraries)
            .where(
              and(
                eq(itineraries.uid, input.itineraryUid),
                eq(itineraries.userId, ctx.user.id),
              ),
            );
          if (!it) notFound();
          itineraryId = it.id;
        }

        await tx.insert(visits).values({
          uid,
          myPlaceId: p.id,
          itineraryId,
          itineraryPlaceId,
          visitedAt: input.visitedAt,
          rating: input.rating ?? null,
          note: input.note ?? null,
        });
        await syncVisitStatus(tx, p.id);
      });
      return { uid };
    }),

  update: explorerProcedure
    .input(
      z.object({
        uid: uidSchema,
        visitedAt: z.coerce.date(),
        rating: ratingSchema,
        note: longTextSchema.nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.visitedAt.getTime() > Date.now() + 60_000) fail("VISIT_IN_FUTURE");
      const { v } = await ownedVisit(ctx.user.id, input.uid);
      await ctx.db
        .update(visits)
        .set({
          visitedAt: input.visitedAt,
          rating: input.rating ?? null,
          note: input.note ?? null,
        })
        .where(eq(visits.id, v.id));
      return { ok: true };
    }),

  delete: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const files: string[] = [];
      await ctx.db.transaction(async (tx) => {
        const { v, p } = await ownedVisit(ctx.user.id, input.uid, tx);
        await tx
          .select({ id: myPlaces.id })
          .from(myPlaces)
          .where(eq(myPlaces.id, p.id))
          .for("update");
        const photos = await tx
          .select()
          .from(visitPhotos)
          .where(eq(visitPhotos.visitId, v.id));
        for (const ph of photos)
          if (ph.storageType === "UPLOAD" && ph.filePath) files.push(ph.filePath);
        await tx.delete(visits).where(eq(visits.id, v.id));
        await syncVisitStatus(tx, p.id);
      });
      await Promise.all(files.map((f) => removeUpload(f)));
      return { ok: true };
    }),

  /* --------------------------- VISIT PHOTO --------------------------- */

  addExternalPhoto: explorerProcedure
    .input(
      z.object({
        visitUid: uidSchema,
        url: z.string().url().max(2000),
        caption: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { v } = await ownedVisit(ctx.user.id, input.visitUid);
      await assertVisitPhotoCapacity(v.id);
      await insertVisitPhoto({
        visitId: v.id,
        storageType: "EXTERNAL",
        externalUrl: input.url,
        caption: input.caption ?? null,
      });
      return { ok: true };
    }),

  setPrimaryPhoto: explorerProcedure
    .input(z.object({ photoUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [r] = await tx
          .select({ ph: visitPhotos })
          .from(visitPhotos)
          .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
          .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
          .where(
            and(eq(visitPhotos.uid, input.photoUid), eq(myPlaces.userId, ctx.user.id)),
          );
        if (!r) notFound();
        await tx
          .select({ id: visits.id })
          .from(visits)
          .where(eq(visits.id, r.ph.visitId))
          .for("update");
        await tx
          .update(visitPhotos)
          .set({ isPrimary: false })
          .where(
            and(
              eq(visitPhotos.visitId, r.ph.visitId),
              eq(visitPhotos.isPrimary, true),
            ),
          );
        await tx
          .update(visitPhotos)
          .set({ isPrimary: true })
          .where(eq(visitPhotos.id, r.ph.id));
      });
      return { ok: true };
    }),

  updatePhotoCaption: explorerProcedure
    .input(z.object({ photoUid: uidSchema, caption: z.string().trim().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .select({ id: visitPhotos.id })
        .from(visitPhotos)
        .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
        .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
        .where(
          and(eq(visitPhotos.uid, input.photoUid), eq(myPlaces.userId, ctx.user.id)),
        );
      if (!r) notFound();
      await ctx.db
        .update(visitPhotos)
        .set({ caption: input.caption || null })
        .where(eq(visitPhotos.id, r.id));
      return { ok: true };
    }),

  deletePhoto: explorerProcedure
    .input(z.object({ photoUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .select({ ph: visitPhotos })
        .from(visitPhotos)
        .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
        .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
        .where(
          and(eq(visitPhotos.uid, input.photoUid), eq(myPlaces.userId, ctx.user.id)),
        );
      if (!r) notFound();
      await ctx.db.delete(visitPhotos).where(eq(visitPhotos.id, r.ph.id));
      if (r.ph.storageType === "UPLOAD") await removeUpload(r.ph.filePath);
      return { ok: true };
    }),
});
