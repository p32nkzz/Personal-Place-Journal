import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, explorerProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  itineraries,
  itineraryPlaces,
  myPlaces,
  visits,
} from "~/server/db/schema";
import { fail, notFound } from "~/server/lib/errors";
import { newUid } from "~/server/lib/ids";
import { type Tx } from "~/server/lib/master";
import { longTextSchema, nameSchema, uidSchema } from "~/server/lib/validation";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullish()
  .transform((v) => v || null);
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/)
  .nullish()
  .transform((v) => (v ? (v.length === 5 ? `${v}:00` : v) : null));

const itinerarySchema = z
  .object({
    name: nameSchema,
    description: longTextSchema.nullish(),
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "DATE_ORDER",
  });

async function ownedItinerary(userId: number, uid: string, tx?: Tx) {
  const q = (tx ?? db)
    .select()
    .from(itineraries)
    .where(and(eq(itineraries.uid, uid), eq(itineraries.userId, userId)));
  const [it] = await (tx ? q.for("update") : q);
  if (!it) notFound();
  return it;
}

/** TX-17 — re-sequence: nilai sementara agar tidak bentrok dengan unique (itinerary_id, sequence). */
async function resequence(tx: Tx, itineraryId: number, orderedIds: number[]) {
  await tx
    .update(itineraryPlaces)
    .set({ sequence: sql`${itineraryPlaces.sequence} + 100000` })
    .where(eq(itineraryPlaces.itineraryId, itineraryId));
  for (const [i, id] of orderedIds.entries()) {
    await tx
      .update(itineraryPlaces)
      .set({ sequence: i + 1 })
      .where(eq(itineraryPlaces.id, id));
  }
}

export const itineraryRouter = createTRPCRouter({
  list: explorerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        uid: itineraries.uid,
        name: itineraries.name,
        description: itineraries.description,
        startDate: itineraries.startDate,
        endDate: itineraries.endDate,
        places: sql<number>`(select count(*) from ${itineraryPlaces} where ${itineraryPlaces.itineraryId} = ${itineraries.id})`,
        visits: sql<number>`(select count(*) from ${visits} where ${visits.itineraryId} = ${itineraries.id})`,
      })
      .from(itineraries)
      .where(eq(itineraries.userId, ctx.user.id))
      .orderBy(desc(itineraries.createdAt));
    return rows.map((r) => ({
      ...r,
      places: Number(r.places),
      visits: Number(r.visits),
    }));
  }),

  /** Planned route (urut sequence, DV-06) dan actual visit (urut visited_at, DV-05). */
  get: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const it = await ownedItinerary(ctx.user.id, input.uid);
      const stops = await ctx.db
        .select({ ip: itineraryPlaces, p: myPlaces })
        .from(itineraryPlaces)
        .innerJoin(myPlaces, eq(myPlaces.id, itineraryPlaces.myPlaceId))
        .where(eq(itineraryPlaces.itineraryId, it.id))
        .orderBy(asc(itineraryPlaces.sequence), asc(itineraryPlaces.id));
      const actual = await ctx.db
        .select({ v: visits, p: myPlaces })
        .from(visits)
        .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
        .where(eq(visits.itineraryId, it.id))
        .orderBy(asc(visits.visitedAt), asc(visits.id));
      const visitCountByStop = new Map<number, number>();
      for (const a of actual) {
        if (a.v.itineraryPlaceId)
          visitCountByStop.set(
            a.v.itineraryPlaceId,
            (visitCountByStop.get(a.v.itineraryPlaceId) ?? 0) + 1,
          );
      }
      return {
        uid: it.uid,
        name: it.name,
        description: it.description,
        startDate: it.startDate,
        endDate: it.endDate,
        stops: stops.map(({ ip, p }) => ({
          uid: ip.uid,
          sequence: ip.sequence,
          plannedDate: ip.plannedDate,
          plannedTime: ip.plannedTime,
          note: ip.note,
          visitCount: visitCountByStop.get(ip.id) ?? 0,
          place: {
            uid: p.uid,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            isActive: p.isActive,
          },
        })),
        actual: actual.map(({ v, p }) => ({
          uid: v.uid,
          visitedAt: v.visitedAt,
          rating: v.rating,
          note: v.note,
          kind: v.itineraryPlaceId ? ("PLANNED" as const) : ("UNEXPECTED" as const),
          itineraryPlaceUid:
            stops.find((s) => s.ip.id === v.itineraryPlaceId)?.ip.uid ?? null,
          place: {
            uid: p.uid,
            name: p.name,
            latitude: p.latitude,
            longitude: p.longitude,
          },
        })),
      };
    }),

  create: explorerProcedure
    .input(itinerarySchema)
    .mutation(async ({ ctx, input }) => {
      const uid = newUid();
      await ctx.db.insert(itineraries).values({
        uid,
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      return { uid };
    }),

  update: explorerProcedure
    .input(itinerarySchema.and(z.object({ uid: uidSchema })))
    .mutation(async ({ ctx, input }) => {
      const it = await ownedItinerary(ctx.user.id, input.uid);
      await ctx.db
        .update(itineraries)
        .set({
          name: input.name,
          description: input.description ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
        })
        .where(eq(itineraries.id, it.id));
      return { ok: true };
    }),

  /** ITINERARY PLACE ikut terhapus (CASCADE); VISIT tetap ada dengan konteks dilepas (SET NULL). */
  delete: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const it = await ownedItinerary(ctx.user.id, input.uid);
      await ctx.db.delete(itineraries).where(eq(itineraries.id, it.id));
      return { ok: true };
    }),

  addPlace: explorerProcedure
    .input(
      z.object({
        itineraryUid: uidSchema,
        placeUid: uidSchema,
        plannedDate: dateSchema,
        plannedTime: timeSchema,
        note: longTextSchema.nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const uid = newUid();
      await ctx.db.transaction(async (tx) => {
        const it = await ownedItinerary(ctx.user.id, input.itineraryUid, tx);
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(
            and(eq(myPlaces.uid, input.placeUid), eq(myPlaces.userId, ctx.user.id)),
          );
        if (!p) notFound();
        if (!p.isActive) fail("PLACE_INACTIVE");
        const [mx] = await tx
          .select({ m: sql<number>`coalesce(max(${itineraryPlaces.sequence}), 0)` })
          .from(itineraryPlaces)
          .where(eq(itineraryPlaces.itineraryId, it.id));
        await tx.insert(itineraryPlaces).values({
          uid,
          itineraryId: it.id,
          myPlaceId: p.id,
          plannedDate: input.plannedDate,
          plannedTime: input.plannedTime,
          note: input.note ?? null,
          sequence: Number(mx?.m ?? 0) + 1,
        });
      });
      return { uid };
    }),

  updatePlace: explorerProcedure
    .input(
      z.object({
        uid: uidSchema,
        plannedDate: dateSchema,
        plannedTime: timeSchema,
        note: longTextSchema.nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .select({ id: itineraryPlaces.id })
        .from(itineraryPlaces)
        .innerJoin(itineraries, eq(itineraries.id, itineraryPlaces.itineraryId))
        .where(
          and(
            eq(itineraryPlaces.uid, input.uid),
            eq(itineraries.userId, ctx.user.id),
          ),
        );
      if (!r) notFound();
      await ctx.db
        .update(itineraryPlaces)
        .set({
          plannedDate: input.plannedDate,
          plannedTime: input.plannedTime,
          note: input.note ?? null,
        })
        .where(eq(itineraryPlaces.id, r.id));
      return { ok: true };
    }),

  removePlace: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [r] = await tx
          .select({ ip: itineraryPlaces })
          .from(itineraryPlaces)
          .innerJoin(itineraries, eq(itineraries.id, itineraryPlaces.itineraryId))
          .where(
            and(
              eq(itineraryPlaces.uid, input.uid),
              eq(itineraries.userId, ctx.user.id),
            ),
          );
        if (!r) notFound();
        await tx
          .select({ id: itineraries.id })
          .from(itineraries)
          .where(eq(itineraries.id, r.ip.itineraryId))
          .for("update");
        await tx.delete(itineraryPlaces).where(eq(itineraryPlaces.id, r.ip.id));
        const rest = await tx
          .select({ id: itineraryPlaces.id })
          .from(itineraryPlaces)
          .where(eq(itineraryPlaces.itineraryId, r.ip.itineraryId))
          .orderBy(asc(itineraryPlaces.sequence), asc(itineraryPlaces.id));
        await resequence(
          tx,
          r.ip.itineraryId,
          rest.map((x) => x.id),
        );
      });
      return { ok: true };
    }),

  /** Mengatur ulang urutan stop. `order` berisi seluruh uid stop sesuai urutan baru. */
  reorder: explorerProcedure
    .input(z.object({ itineraryUid: uidSchema, order: z.array(uidSchema) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const it = await ownedItinerary(ctx.user.id, input.itineraryUid, tx);
        const rows = await tx
          .select({ id: itineraryPlaces.id, uid: itineraryPlaces.uid })
          .from(itineraryPlaces)
          .where(eq(itineraryPlaces.itineraryId, it.id));
        if (
          rows.length !== input.order.length ||
          !rows.every((r) => input.order.includes(r.uid))
        )
          fail("REORDER_INVALID");
        const idByUid = new Map(rows.map((r) => [r.uid, r.id]));
        await resequence(
          tx,
          it.id,
          input.order.map((u) => idByUid.get(u)!),
        );
      });
      return { ok: true };
    }),
});
