import {
  and,
  asc,
  desc,
  eq,
  inArray,
  like,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";

import { createTRPCRouter, explorerProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  itineraries,
  itineraryPlaces,
  masterPlacePhotos,
  masterPlaces,
  myPlaceMasterHistories,
  myPlaceTags,
  myPlaces,
  tags,
  visitPhotos,
  visits,
} from "~/server/db/schema";
import { fail, notFound } from "~/server/lib/errors";
import { removeUpload } from "~/server/lib/files";
import { newUid } from "~/server/lib/ids";
import { distanceMeters } from "~/server/lib/geo";
import {
  addHistory,
  buildSnapshot,
  setPlaceCategories,
  type Tx,
} from "~/server/lib/master";
import {
  activeMasterCond,
  categoriesForPlaces,
  effectiveCategories,
  masterPhotoUrl,
  placeRatings,
  tagsForPlaces,
  visitPhotoUrl,
} from "~/server/lib/queries";
import {
  latSchema,
  lngSchema,
  longTextSchema,
  nameSchema,
  uidSchema,
} from "~/server/lib/validation";

const placeFields = {
  googlePlaceId: z.string().max(255).nullish(),
  name: nameSchema,
  address: z.string().trim().max(2000).nullish(),
  description: longTextSchema.nullish(),
  latitude: latSchema,
  longitude: lngSchema,
  categoryUids: z.array(uidSchema).default([]),
  tagUids: z.array(uidSchema).default([]),
};

/** Mengambil MY PLACE milik user (ownership divalidasi server-side). */
export async function ownedPlace(userId: number, uid: string, tx?: Tx) {
  const q = (tx ?? db)
    .select()
    .from(myPlaces)
    .where(and(eq(myPlaces.uid, uid), eq(myPlaces.userId, userId)));
  const [p] = await (tx ? q.for("update") : q);
  if (!p) notFound();
  return p;
}

async function validatedTagIds(tx: Tx | typeof db, userId: number, uids: string[]) {
  if (!uids.length) return [];
  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.uid, uids)));
  if (rows.length !== new Set(uids).size) fail("TAG_NOT_FOUND");
  return rows.map((r) => r.id);
}

async function setPlaceTags(tx: Tx, userId: number, placeId: number, uids: string[]) {
  const ids = await validatedTagIds(tx, userId, uids);
  await tx.delete(myPlaceTags).where(eq(myPlaceTags.myPlaceId, placeId));
  if (ids.length)
    await tx
      .insert(myPlaceTags)
      .values(ids.map((tagId) => ({ myPlaceId: placeId, tagId })));
}

const placeFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryUid: uidSchema.optional(),
  tagUid: uidSchema.optional(),
  favorite: z.boolean().optional(),
  visitStatus: z.enum(["PLAN", "VISITED"]).optional(),
  relationStatus: z.enum(["UNREFERRED", "REVIEW", "REJECTED", "REFERRED"]).optional(),
  showInactive: z.boolean().default(false),
});
type PlaceFilter = z.infer<typeof placeFilterSchema>;

async function queryPlaces(
  userId: number,
  f: PlaceFilter,
  paging?: {
    page: number;
    limit: number;
    sort: "name" | "updatedAt" | "createdAt";
    order: "asc" | "desc";
  },
) {
  const conds = [eq(myPlaces.userId, userId)];
  if (!f.showInactive) conds.push(eq(myPlaces.isActive, true));
  if (f.q) {
    const q = `%${f.q}%`;
    conds.push(or(like(myPlaces.name, q), like(myPlaces.address, q))!);
  }
  if (f.favorite != null) conds.push(eq(myPlaces.isFavorite, f.favorite));
  if (f.visitStatus) conds.push(eq(myPlaces.visitStatus, f.visitStatus));
  if (f.relationStatus) conds.push(eq(myPlaces.masterRelationStatus, f.relationStatus));
  if (f.tagUid) {
    conds.push(
      sql`${myPlaces.id} in (select mpt.my_place_id from my_place_tags mpt inner join tags t on t.id = mpt.tag_id where t.uid = ${f.tagUid} and t.user_id = ${userId})`,
    );
  }
  if (f.categoryUid) {
    // Effective category (DV-04): MASTER bila direferensikan, selain itu stored MY PLACE.
    conds.push(sql`(
      (${myPlaces.masterPlaceId} is not null and ${myPlaces.masterPlaceId} in (
        select mpc.master_place_id from master_place_categories mpc inner join categories c on c.id = mpc.category_id where c.uid = ${f.categoryUid}))
      or
      (${myPlaces.masterPlaceId} is null and ${myPlaces.id} in (
        select pc.my_place_id from my_place_categories pc inner join categories c on c.id = pc.category_id where c.uid = ${f.categoryUid}))
    )`);
  }
  const where = and(...conds);
  const [totalRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(myPlaces)
    .where(where);
  const sortCol = paging ? myPlaces[paging.sort] : myPlaces.updatedAt;
  const orderBy = paging?.order === "asc" ? asc(sortCol) : desc(sortCol);
  const q = db.select().from(myPlaces).where(where).orderBy(orderBy);
  const rows = paging
    ? await q.limit(paging.limit).offset((paging.page - 1) * paging.limit)
    : await q.limit(1000);
  const ids = rows.map((r) => r.id);
  const [cats, tg, ratings] = await Promise.all([
    effectiveCategories(rows),
    tagsForPlaces(ids),
    placeRatings(ids),
  ]);
  return {
    total: Number(totalRow?.total ?? 0),
    rows: rows.map((r) => ({
      uid: r.uid,
      name: r.name,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      masterRelationStatus: r.masterRelationStatus,
      visitStatus: r.visitStatus,
      isFavorite: r.isFavorite,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      categories: cats.get(r.id) ?? [],
      tags: tg.get(r.id) ?? [],
      rating: ratings.get(r.id) ?? { avg: null, count: 0 },
    })),
  };
}

export const placeRouter = createTRPCRouter({
  /** FR-FLT-001/002 — daftar & peta MY PLACE milik user (default hanya ACTIVE, 24.4). */
  /** Peta / opsi: seluruh MY PLACE milik user sesuai filter (maks 1000). */
  list: explorerProcedure
    .input(placeFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const { rows } = await queryPlaces(ctx.user.id, input ?? { showInactive: false });
      return rows;
    }),

  /** Tabel/daftar: filter, urutan, dan paging dijalankan di server. */
  page: explorerProcedure
    .input(
      placeFilterSchema.extend({
        sort: z.enum(["name", "updatedAt", "createdAt"]).default("updatedAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(({ ctx, input }) => {
      const { page, limit, sort, order, ...f } = input;
      return queryPlaces(ctx.user.id, f, { page, limit, sort, order });
    }),

  /** Opsi ringkas MY PLACE aktif (untuk ITINERARY / VISIT). */
  options: explorerProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        uid: myPlaces.uid,
        name: myPlaces.name,
        address: myPlaces.address,
        latitude: myPlaces.latitude,
        longitude: myPlaces.longitude,
      })
      .from(myPlaces)
      .where(and(eq(myPlaces.userId, ctx.user.id), eq(myPlaces.isActive, true)))
      .orderBy(asc(myPlaces.name)),
  ),

  get: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const p = await ownedPlace(ctx.user.id, input.uid);
      const [own, eff, tg, ratings] = await Promise.all([
        categoriesForPlaces([p.id]),
        effectiveCategories([p]),
        tagsForPlaces([p.id]),
        placeRatings([p.id]),
      ]);

      let master: {
        uid: string;
        name: string;
        status: "ACTIVE" | "INACTIVE";
        photoUrl: string | null;
      } | null = null;
      if (p.masterPlaceId) {
        const [m] = await ctx.db
          .select()
          .from(masterPlaces)
          .where(eq(masterPlaces.id, p.masterPlaceId));
        if (m) {
          const [ph] = await ctx.db
            .select()
            .from(masterPlacePhotos)
            .where(eq(masterPlacePhotos.masterPlaceId, m.id))
            .orderBy(desc(masterPlacePhotos.isPrimary), asc(masterPlacePhotos.sortOrder))
            .limit(1);
          master = {
            uid: m.uid,
            name: m.name,
            status: m.isActive ? "ACTIVE" : "INACTIVE",
            photoUrl: ph ? masterPhotoUrl(ph) : null,
          };
        }
      }

      const fromM = alias(masterPlaces, "from_m");
      const toM = alias(masterPlaces, "to_m");
      const history = await ctx.db
        .select({
          uid: myPlaceMasterHistories.uid,
          action: myPlaceMasterHistories.action,
          reason: myPlaceMasterHistories.reason,
          note: myPlaceMasterHistories.note,
          performedAt: myPlaceMasterHistories.performedAt,
          fromName: fromM.name,
          toName: toM.name,
          hasSnapshot: sql<number>`(${myPlaceMasterHistories.snapshotData} is not null)`,
        })
        .from(myPlaceMasterHistories)
        .leftJoin(fromM, eq(fromM.id, myPlaceMasterHistories.fromMasterPlaceId))
        .leftJoin(toM, eq(toM.id, myPlaceMasterHistories.toMasterPlaceId))
        .where(eq(myPlaceMasterHistories.myPlaceId, p.id))
        .orderBy(
          desc(myPlaceMasterHistories.performedAt),
          desc(myPlaceMasterHistories.id),
        );

      const visitRows = await ctx.db
        .select({
          v: visits,
          itineraryName: itineraries.name,
        })
        .from(visits)
        .leftJoin(itineraries, eq(itineraries.id, visits.itineraryId))
        .where(eq(visits.myPlaceId, p.id))
        .orderBy(desc(visits.visitedAt), desc(visits.id));
      const vIds = visitRows.map((r) => r.v.id);
      const photoRows = vIds.length
        ? await ctx.db
            .select()
            .from(visitPhotos)
            .where(inArray(visitPhotos.visitId, vIds))
            .orderBy(desc(visitPhotos.isPrimary), asc(visitPhotos.sortOrder), asc(visitPhotos.id))
        : [];

      const itinRows = await ctx.db
        .select({ uid: itineraries.uid, name: itineraries.name })
        .from(itineraryPlaces)
        .innerJoin(itineraries, eq(itineraries.id, itineraryPlaces.itineraryId))
        .where(eq(itineraryPlaces.myPlaceId, p.id));

      return {
        uid: p.uid,
        googlePlaceId: p.googlePlaceId,
        name: p.name,
        address: p.address,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        masterRelationStatus: p.masterRelationStatus,
        visitStatus: p.visitStatus,
        isFavorite: p.isFavorite,
        isActive: p.isActive,
        master,
        storedCategories: own.get(p.id) ?? [],
        categories: eff.get(p.id) ?? [],
        tags: tg.get(p.id) ?? [],
        rating: ratings.get(p.id) ?? { avg: null, count: 0 },
        history: history.map((h) => ({ ...h, hasSnapshot: !!Number(h.hasSnapshot) })),
        itineraries: itinRows,
        visits: visitRows.map(({ v, itineraryName }) => ({
          uid: v.uid,
          visitedAt: v.visitedAt,
          rating: v.rating,
          note: v.note,
          itineraryName,
          context: v.itineraryPlaceId
            ? ("PLANNED" as const)
            : v.itineraryId
              ? ("UNEXPECTED" as const)
              : ("STANDALONE" as const),
          photos: photoRows
            .filter((ph) => ph.visitId === v.id)
            .map((ph) => ({
              uid: ph.uid,
              url: visitPhotoUrl(ph),
              caption: ph.caption,
              isPrimary: ph.isPrimary,
            })),
        })),
        canSubmit:
          p.isActive &&
          (p.masterRelationStatus === "UNREFERRED" ||
            p.masterRelationStatus === "REJECTED"),
      };
    }),

  /** BRD 12.1 step 3 — warning duplikasi (tidak memblokir). */
  checkDuplicates: explorerProcedure
    .input(
      z.object({
        googlePlaceId: z.string().max(255).nullish(),
        masterUid: uidSchema.nullish(),
        latitude: latSchema,
        longitude: lngSchema,
        excludeUid: uidSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const delta = 0.002; // ± ~220 m sebagai pra-filter, lalu haversine ≤ 50 m
      const near = and(
        sql`${myPlaces.latitude} between ${input.latitude - delta} and ${input.latitude + delta}`,
        sql`${myPlaces.longitude} between ${input.longitude - delta} and ${input.longitude + delta}`,
      );
      const conds = [near];
      if (input.googlePlaceId)
        conds.push(eq(myPlaces.googlePlaceId, input.googlePlaceId));
      if (input.masterUid)
        conds.push(
          sql`${myPlaces.masterPlaceId} = (select id from master_places where uid = ${input.masterUid})`,
        );
      const rows = await ctx.db
        .select()
        .from(myPlaces)
        .where(
          and(
            eq(myPlaces.userId, ctx.user.id),
            input.excludeUid ? ne(myPlaces.uid, input.excludeUid) : undefined,
            or(...conds),
          ),
        );
      const out: { uid: string; name: string; reason: string }[] = [];
      for (const r of rows) {
        let reason: string | null = null;
        if (input.googlePlaceId && r.googlePlaceId === input.googlePlaceId)
          reason = "GOOGLE_PLACE";
        else if (
          distanceMeters(r, {
            latitude: input.latitude,
            longitude: input.longitude,
          }) <= 50
        )
          reason = "NEARBY";
        else if (input.masterUid && r.masterPlaceId) reason = "MASTER";
        if (reason) out.push({ uid: r.uid, name: r.name, reason });
      }
      return out;
    }),

  /** TX-08 / P-01 — membuat MY PLACE (manual, dari Google, atau dari MASTER). */
  create: explorerProcedure
    .input(
      z.object({
        ...placeFields,
        masterUid: uidSchema.nullish(),
        isFavorite: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const uid = newUid();
      await ctx.db.transaction(async (tx) => {
        let masterId: number | null = null;
        if (input.masterUid) {
          const [m] = await tx
            .select()
            .from(masterPlaces)
            .where(and(eq(masterPlaces.uid, input.masterUid), activeMasterCond));
          if (!m) fail("MASTER_NOT_ACTIVE");
          masterId = m.id;
        }
        const [r] = await tx.insert(myPlaces).values({
          uid,
          userId: ctx.user.id,
          masterPlaceId: masterId,
          googlePlaceId: input.googlePlaceId ?? null,
          name: input.name,
          address: input.address || null,
          description: input.description ?? null,
          latitude: input.latitude,
          longitude: input.longitude,
          masterRelationStatus: masterId ? "REFERRED" : "UNREFERRED",
          isFavorite: input.isFavorite,
        });
        await setPlaceCategories(tx, r.insertId, input.categoryUids);
        await setPlaceTags(tx, ctx.user.id, r.insertId, input.tagUids);
        if (masterId) {
          await addHistory(tx, {
            myPlaceId: r.insertId,
            action: "REFERRED",
            to: masterId,
            performedBy: ctx.user.id,
          });
        }
      });
      return { uid };
    }),

  /** Edit data personal; selama REVIEW diperbolehkan dan tidak mengubah snapshot (K-08). */
  update: explorerProcedure
    .input(z.object({ uid: uidSchema, ...placeFields, isFavorite: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const p = await ownedPlace(ctx.user.id, input.uid, tx);
        await tx
          .update(myPlaces)
          .set({
            googlePlaceId: input.googlePlaceId ?? null,
            name: input.name,
            address: input.address || null,
            description: input.description ?? null,
            latitude: input.latitude,
            longitude: input.longitude,
            ...(input.isFavorite != null ? { isFavorite: input.isFavorite } : {}),
          })
          .where(eq(myPlaces.id, p.id));
        await setPlaceCategories(tx, p.id, input.categoryUids);
        await setPlaceTags(tx, ctx.user.id, p.id, input.tagUids);
      });
      return { ok: true };
    }),

  setFavorite: explorerProcedure
    .input(z.object({ uid: uidSchema, isFavorite: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const p = await ownedPlace(ctx.user.id, input.uid);
      await ctx.db
        .update(myPlaces)
        .set({ isFavorite: input.isFavorite })
        .where(eq(myPlaces.id, p.id));
      return { ok: true };
    }),

  /** Inactivate / Activate — referensi MASTER dan history tidak berubah (18.3). */
  setActive: explorerProcedure
    .input(z.object({ uid: uidSchema, isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const p = await ownedPlace(ctx.user.id, input.uid);
      await ctx.db
        .update(myPlaces)
        .set({ isActive: input.isActive })
        .where(eq(myPlaces.id, p.id));
      return { ok: true };
    }),

  /** P-10 langkah 1 — data terkait yang ikut terhapus + apakah perlu DELETE CONSENT. */
  deletePreview: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const p = await ownedPlace(ctx.user.id, input.uid);
      const [v] = await ctx.db
        .select({ n: sql<number>`count(*)` })
        .from(visits)
        .where(eq(visits.myPlaceId, p.id));
      const [ph] = await ctx.db
        .select({ n: sql<number>`count(*)` })
        .from(visitPhotos)
        .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
        .where(eq(visits.myPlaceId, p.id));
      const [h] = await ctx.db
        .select({ n: sql<number>`count(*)` })
        .from(myPlaceMasterHistories)
        .where(eq(myPlaceMasterHistories.myPlaceId, p.id));
      const itin = await ctx.db
        .select({ name: itineraries.name })
        .from(itineraryPlaces)
        .innerJoin(itineraries, eq(itineraries.id, itineraryPlaces.itineraryId))
        .where(eq(itineraryPlaces.myPlaceId, p.id));
      const history = Number(h?.n ?? 0);
      return {
        visits: Number(v?.n ?? 0),
        visitPhotos: Number(ph?.n ?? 0),
        histories: history,
        itineraryPlaces: itin.map((i) => i.name),
        needsConsent: history > 0 || itin.length > 0,
      };
    }),

  /** TX-03 — physical delete dengan DELETE CONSENT (DV-07). */
  delete: explorerProcedure
    .input(z.object({ uid: uidSchema, consent: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const files: string[] = [];
      await ctx.db.transaction(async (tx) => {
        const p = await ownedPlace(ctx.user.id, input.uid, tx);
        const [h] = await tx
          .select({ n: sql<number>`count(*)` })
          .from(myPlaceMasterHistories)
          .where(eq(myPlaceMasterHistories.myPlaceId, p.id));
        const [ip] = await tx
          .select({ n: sql<number>`count(*)` })
          .from(itineraryPlaces)
          .where(eq(itineraryPlaces.myPlaceId, p.id));
        const needs = Number(h?.n ?? 0) > 0 || Number(ip?.n ?? 0) > 0;
        if (needs && !input.consent) fail("DELETE_CONSENT_REQUIRED");
        const photos = await tx
          .select({ filePath: visitPhotos.filePath, storageType: visitPhotos.storageType })
          .from(visitPhotos)
          .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
          .where(eq(visits.myPlaceId, p.id));
        for (const ph of photos)
          if (ph.storageType === "UPLOAD" && ph.filePath) files.push(ph.filePath);
        await tx.delete(myPlaces).where(eq(myPlaces.id, p.id));
      });
      await Promise.all(files.map((f) => removeUpload(f)));
      return { ok: true };
    }),

  /** TX-05 — SUBMIT / RESUBMIT. */
  submit: explorerProcedure
    .input(z.object({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const p = await ownedPlace(ctx.user.id, input.uid, tx);
        if (!p.isActive) fail("PLACE_INACTIVE");
        if (
          p.masterRelationStatus !== "UNREFERRED" &&
          p.masterRelationStatus !== "REJECTED"
        )
          fail("SUBMIT_NOT_ALLOWED");
        const snapshot = await buildSnapshot(tx, p);
        await tx
          .update(myPlaces)
          .set({ masterRelationStatus: "REVIEW" })
          .where(eq(myPlaces.id, p.id));
        await addHistory(tx, {
          myPlaceId: p.id,
          action: "SUBMITTED",
          snapshot,
          performedBy: ctx.user.id,
        });
      });
      return { ok: true };
    }),
});
