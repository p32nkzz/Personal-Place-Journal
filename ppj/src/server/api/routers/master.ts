import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import {
  activeProcedure,
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import {
  categories,
  masterPlaceCategories,
  masterPlacePhotos,
  masterPlaces,
  myPlacePhotos,
  myPlaces,
  visitPhotos,
  visits,
} from "~/server/db/schema";
import { fail, notFound } from "~/server/lib/errors";
import { copyUpload, removeUpload } from "~/server/lib/files";
import {
  addHistory,
  insertMaster,
  referPlace,
  setMasterCategories,
} from "~/server/lib/master";
import {
  activeMasterCond,
  categoriesForMasters,
  masterPhotoUrl,
  masterRatings,
  myPlacePhotoUrl,
  primaryMasterPhotos,
  visitPhotoUrl,
} from "~/server/lib/queries";
import { assertMasterPhotoCapacity, insertMasterPhoto } from "~/server/lib/photos";
import {
  latSchema,
  lngSchema,
  longTextSchema,
  nameSchema,
  uidSchema,
} from "~/server/lib/validation";

const draftSchema = z.object({
  googlePlaceId: z.string().max(255).nullish(),
  name: nameSchema,
  address: z.string().trim().min(1, "REQUIRED"),
  description: longTextSchema.nullish(),
  latitude: latSchema,
  longitude: lngSchema,
  categoryUids: z.array(uidSchema).default([]),
});

type MasterStatus = "ACTIVE" | "INACTIVE" | "DELETED";
const statusOf = (m: { isActive: boolean; deletedAt: Date | null }): MasterStatus =>
  m.deletedAt ? "DELETED" : m.isActive ? "ACTIVE" : "INACTIVE";

export const masterRouter = createTRPCRouter({
  /** Peta / pencarian MASTER ACTIVE — dapat dibaca Guest (FR-GST-001). */
  listMap: publicProcedure
    .input(
      z
        .object({
          q: z.string().trim().max(100).optional(),
          categoryUids: z.array(uidSchema).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conds = [activeMasterCond];
      if (input?.q) {
        const q = `%${input.q}%`;
        conds.push(or(like(masterPlaces.name, q), like(masterPlaces.address, q))!);
      }
      if (input?.categoryUids?.length) {
        // Pilihan ganda: MASTER yang memiliki salah satu kategori terpilih.
        const uids = sql.join(input.categoryUids.map((u) => sql`${u}`), sql`, `);
        conds.push(
          sql`${masterPlaces.id} in (select ${masterPlaceCategories.masterPlaceId} from ${masterPlaceCategories} inner join ${categories} on ${categories.id} = ${masterPlaceCategories.categoryId} where ${categories.uid} in (${uids}))`,
        );
      }
      const rows = await ctx.db
        .select()
        .from(masterPlaces)
        .where(and(...conds))
        .orderBy(asc(masterPlaces.name))
        .limit(500);
      const ids = rows.map((r) => r.id);
      const [ratings, cats, photos] = await Promise.all([
        masterRatings(ids),
        categoriesForMasters(ids),
        primaryMasterPhotos(ids),
      ]);
      return rows.map((r) => ({
        uid: r.uid,
        name: r.name,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        categories: (cats.get(r.id) ?? []).filter((c) => c.isActive),
        rating: ratings.get(r.id) ?? { avg: null, count: 0 },
        photoUrl: photos.get(r.id) ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    }),

  /**
   * Detail MASTER. Guest: hanya ACTIVE. Explorer: ACTIVE atau INACTIVE yang direferensikan
   * MY PLACE miliknya (24.17). Admin (mode Admin): semua.
   */
  get: publicProcedure
    .input(z.object({ uid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(masterPlaces)
        .where(eq(masterPlaces.uid, input.uid));
      if (!m) notFound();
      const isAdmin = ctx.user?.role === "ADMIN" && ctx.user.mode === "ADMIN";
      let visible = isAdmin || (m.isActive && !m.deletedAt);
      if (!visible && ctx.user && !ctx.user.mustChangePassword && !m.deletedAt) {
        const [ref] = await ctx.db
          .select({ id: myPlaces.id })
          .from(myPlaces)
          .where(
            and(
              eq(myPlaces.masterPlaceId, m.id),
              eq(myPlaces.userId, ctx.user.id),
            ),
          )
          .limit(1);
        visible = !!ref;
      }
      if (!visible) notFound();
      const [ratings, cats, photoRows] = await Promise.all([
        masterRatings([m.id]),
        categoriesForMasters([m.id]),
        ctx.db
          .select()
          .from(masterPlacePhotos)
          .where(eq(masterPlacePhotos.masterPlaceId, m.id))
          .orderBy(
            desc(masterPlacePhotos.isPrimary),
            asc(masterPlacePhotos.sortOrder),
            asc(masterPlacePhotos.id),
          ),
      ]);
      return {
        uid: m.uid,
        status: statusOf(m),
        googlePlaceId: m.googlePlaceId,
        name: m.name,
        address: m.address,
        description: m.description,
        latitude: m.latitude,
        longitude: m.longitude,
        categories: (cats.get(m.id) ?? []).filter((c) => isAdmin || c.isActive),
        rating: ratings.get(m.id) ?? { avg: null, count: 0 },
        photos: photoRows.map((p) => ({
          uid: p.uid,
          url: masterPhotoUrl(p),
          caption: p.caption,
          isPrimary: p.isPrimary,
          originType: p.originType,
        })),
      };
    }),

  /* ------------------------------ Admin ------------------------------ */

  adminList: adminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).optional(),
        status: z.enum(["ALL", "ACTIVE", "INACTIVE", "DELETED"]).default("ALL"),
        sort: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [];
      if (input.q) {
        const q = `%${input.q}%`;
        conds.push(or(like(masterPlaces.name, q), like(masterPlaces.address, q)));
      }
      if (input.status === "ACTIVE") conds.push(activeMasterCond);
      if (input.status === "INACTIVE")
        conds.push(eq(masterPlaces.isActive, false), isNull(masterPlaces.deletedAt));
      if (input.status === "DELETED") conds.push(isNotNull(masterPlaces.deletedAt));
      const where = conds.length ? and(...conds) : undefined;
      const col = masterPlaces[input.sort];
      const [totalRow] = await ctx.db
        .select({ total: sql<number>`count(*)` })
        .from(masterPlaces)
        .where(where);
      const rows = await ctx.db
        .select()
        .from(masterPlaces)
        .where(where)
        .orderBy(input.order === "asc" ? asc(col) : desc(col))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
      const ids = rows.map((r) => r.id);
      const [ratings, cats, refCounts] = await Promise.all([
        masterRatings(ids),
        categoriesForMasters(ids),
        ids.length
          ? ctx.db
              .select({
                id: myPlaces.masterPlaceId,
                n: sql<number>`count(*)`,
              })
              .from(myPlaces)
              .where(inArray(myPlaces.masterPlaceId, ids))
              .groupBy(myPlaces.masterPlaceId)
          : Promise.resolve([]),
      ]);
      const refMap = new Map(refCounts.map((r) => [r.id, Number(r.n)]));
      return {
        total: Number(totalRow?.total ?? 0),
        rows: rows.map((r) => ({
          uid: r.uid,
          name: r.name,
          address: r.address,
          status: statusOf(r),
          categories: cats.get(r.id) ?? [],
          rating: ratings.get(r.id) ?? { avg: null, count: 0 },
          referencedBy: refMap.get(r.id) ?? 0,
          createdAt: r.createdAt,
        })),
      };
    }),

  /**
   * Create MASTER (manual) atau dari MY PLACE (TX-09). Bila `sourcePlaceUid` diisi dan
   * `referenceSource` dicentang, MY PLACE sumber direferensikan (REFERRED / RE-REFER).
   */
  create: adminProcedure
    .input(
      draftSchema.extend({
        sourcePlaceUid: uidSchema.optional(),
        referenceSource: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sourcePlaceUid, referenceSource, ...draft } = input;
      const uid = await ctx.db.transaction(async (tx) => {
        let source: typeof myPlaces.$inferSelect | undefined;
        if (sourcePlaceUid) {
          [source] = await tx
            .select()
            .from(myPlaces)
            .where(eq(myPlaces.uid, sourcePlaceUid))
            .for("update");
          if (!source) notFound();
        }
        const masterId = await insertMaster(tx, draft, ctx.user.id);
        if (source && referenceSource) {
          await referPlace(tx, source, masterId, ctx.user.id);
        }
        const [m] = await tx
          .select({ uid: masterPlaces.uid })
          .from(masterPlaces)
          .where(eq(masterPlaces.id, masterId));
        return m!.uid;
      });
      return { uid };
    }),

  update: adminProcedure
    .input(draftSchema.extend({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [m] = await tx
          .select()
          .from(masterPlaces)
          .where(eq(masterPlaces.uid, input.uid))
          .for("update");
        if (!m) notFound();
        if (m.deletedAt) fail("MASTER_DELETED");
        await tx
          .update(masterPlaces)
          .set({
            googlePlaceId: input.googlePlaceId ?? null,
            name: input.name,
            address: input.address,
            description: input.description ?? null,
            latitude: input.latitude,
            longitude: input.longitude,
            updatedBy: ctx.user.id,
          })
          .where(eq(masterPlaces.id, m.id));
        await setMasterCategories(tx, m.id, input.categoryUids);
      });
      return { ok: true };
    }),

  /** Inactivate / Activate — tidak mengubah MY PLACE dan tidak membuat history (18.4). */
  setActive: adminProcedure
    .input(z.object({ uid: uidSchema, isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(masterPlaces)
        .where(eq(masterPlaces.uid, input.uid));
      if (!m) notFound();
      if (m.deletedAt) fail("MASTER_DELETED");
      await ctx.db
        .update(masterPlaces)
        .set({ isActive: input.isActive, updatedBy: ctx.user.id })
        .where(eq(masterPlaces.id, m.id));
      return { ok: true };
    }),

  /** TX-01 — soft delete MASTER + auto UNREFER seluruh MY PLACE (termasuk yang inactive) + history. */
  softDelete: adminProcedure
    .input(z.object({ uid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [m] = await tx
          .select()
          .from(masterPlaces)
          .where(eq(masterPlaces.uid, input.uid))
          .for("update");
        if (!m) notFound();
        if (m.deletedAt) fail("MASTER_DELETED");
        await tx
          .update(masterPlaces)
          .set({
            isActive: false,
            deletedAt: new Date(),
            deletedBy: ctx.user.id,
          })
          .where(eq(masterPlaces.id, m.id));
        const refs = await tx
          .select()
          .from(myPlaces)
          .where(eq(myPlaces.masterPlaceId, m.id))
          .for("update");
        for (const p of refs) {
          await tx
            .update(myPlaces)
            .set({ masterPlaceId: null, masterRelationStatus: "UNREFERRED" })
            .where(eq(myPlaces.id, p.id));
          await addHistory(tx, {
            myPlaceId: p.id,
            action: "UNREFERRED",
            from: m.id,
            to: null,
            reason: "MASTER PLACE dihapus",
            performedBy: ctx.user.id,
          });
        }
        return { unreferred: refs.length };
      });
    }),

  /* ------------------------------ Foto ------------------------------- */

  addExternalPhoto: adminProcedure
    .input(
      z.object({
        masterUid: uidSchema,
        url: z.string().url().max(2000),
        caption: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(masterPlaces)
        .where(eq(masterPlaces.uid, input.masterUid));
      if (!m || m.deletedAt) notFound();
      await assertMasterPhotoCapacity(m.id);
      await insertMasterPhoto({
        masterId: m.id,
        adminId: ctx.user.id,
        storageType: "EXTERNAL",
        externalUrl: input.url,
        caption: input.caption ?? null,
        originType: "ADMIN",
      });
      return { ok: true };
    }),

  /** Foto kandidat: VISIT PHOTO dari MY PLACE yang saat ini mereferensikan MASTER (CR-MPH-03). */
  visitPhotoCandidates: adminProcedure
    .input(z.object({ masterUid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          uid: visitPhotos.uid,
          storageType: visitPhotos.storageType,
          externalUrl: visitPhotos.externalUrl,
          caption: visitPhotos.caption,
          placeName: myPlaces.name,
          visitedAt: visits.visitedAt,
        })
        .from(visitPhotos)
        .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
        .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
        .innerJoin(masterPlaces, eq(masterPlaces.id, myPlaces.masterPlaceId))
        .where(
          and(
            eq(masterPlaces.uid, input.masterUid),
            sql`${myPlaces.userId} in (select id from users where deleted_at is null)`,
          ),
        )
        .orderBy(desc(visits.visitedAt))
        .limit(200);
      return rows.map((r) => ({
        uid: r.uid,
        url: visitPhotoUrl(r),
        caption: r.caption,
        placeName: r.placeName,
        visitedAt: r.visitedAt,
      }));
    }),

  /** P-08 — MASTER PHOTO sebagai salinan independen dari VISIT PHOTO (tanpa persetujuan Explorer, K-16). */
  addFromVisitPhoto: adminProcedure
    .input(z.object({ masterUid: uidSchema, visitPhotoUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(masterPlaces)
        .where(eq(masterPlaces.uid, input.masterUid));
      if (!m || m.deletedAt) notFound();
      const [vp] = await ctx.db
        .select({ photo: visitPhotos })
        .from(visitPhotos)
        .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
        .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
        .where(
          and(
            eq(visitPhotos.uid, input.visitPhotoUid),
            eq(myPlaces.masterPlaceId, m.id),
          ),
        );
      if (!vp) fail("PHOTO_SOURCE_INVALID");
      await assertMasterPhotoCapacity(m.id);
      const src = vp.photo;
      const filePath =
        src.storageType === "UPLOAD" && src.filePath
          ? await copyUpload("master", src.filePath)
          : null;
      await insertMasterPhoto({
        masterId: m.id,
        adminId: ctx.user.id,
        storageType: src.storageType,
        filePath,
        externalUrl: src.externalUrl,
        fileName: src.fileName,
        caption: src.caption,
        originType: "VISIT",
        sourceVisitPhotoId: src.id,
      });
      return { ok: true };
    }),

  /** Foto pantauan MY PLACE yang mereferensikan MASTER ini (kandidat MASTER PHOTO, P-17/P-18). */
  myPlacePhotoCandidates: adminProcedure
    .input(z.object({ masterUid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          uid: myPlacePhotos.uid,
          storageType: myPlacePhotos.storageType,
          externalUrl: myPlacePhotos.externalUrl,
          caption: myPlacePhotos.caption,
          placeName: myPlaces.name,
          createdAt: myPlacePhotos.createdAt,
        })
        .from(myPlacePhotos)
        .innerJoin(myPlaces, eq(myPlaces.id, myPlacePhotos.myPlaceId))
        .innerJoin(masterPlaces, eq(masterPlaces.id, myPlaces.masterPlaceId))
        .where(
          and(
            eq(masterPlaces.uid, input.masterUid),
            sql`${myPlaces.userId} in (select id from users where deleted_at is null)`,
          ),
        )
        .orderBy(desc(myPlacePhotos.createdAt))
        .limit(200);
      return rows.map((r) => ({
        uid: r.uid,
        url: myPlacePhotoUrl(r),
        caption: r.caption,
        placeName: r.placeName,
        visitedAt: r.createdAt,
      }));
    }),

  /** MASTER PHOTO sebagai salinan independen dari MY PLACE PHOTO (origin MY_PLACE, tanpa persetujuan Explorer). */
  addFromMyPlacePhoto: adminProcedure
    .input(z.object({ masterUid: uidSchema, myPlacePhotoUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(masterPlaces)
        .where(eq(masterPlaces.uid, input.masterUid));
      if (!m || m.deletedAt) notFound();
      const [vp] = await ctx.db
        .select({ photo: myPlacePhotos })
        .from(myPlacePhotos)
        .innerJoin(myPlaces, eq(myPlaces.id, myPlacePhotos.myPlaceId))
        .where(
          and(
            eq(myPlacePhotos.uid, input.myPlacePhotoUid),
            eq(myPlaces.masterPlaceId, m.id),
          ),
        );
      if (!vp) fail("PHOTO_SOURCE_INVALID");
      await assertMasterPhotoCapacity(m.id);
      const src = vp.photo;
      const filePath =
        src.storageType === "UPLOAD" && src.filePath
          ? await copyUpload("master", src.filePath)
          : null;
      await insertMasterPhoto({
        masterId: m.id,
        adminId: ctx.user.id,
        storageType: src.storageType,
        filePath,
        externalUrl: src.externalUrl,
        fileName: src.fileName,
        caption: src.caption,
        originType: "MY_PLACE",
        sourceMyPlacePhotoId: src.id,
      });
      return { ok: true };
    }),

  /** TX-10 — set primary: lock parent, reset lalu set. */
  setPrimaryPhoto: adminProcedure
    .input(z.object({ photoUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(masterPlacePhotos)
          .where(eq(masterPlacePhotos.uid, input.photoUid));
        if (!p) notFound();
        await tx
          .select({ id: masterPlaces.id })
          .from(masterPlaces)
          .where(eq(masterPlaces.id, p.masterPlaceId))
          .for("update");
        await tx
          .update(masterPlacePhotos)
          .set({ isPrimary: false })
          .where(
            and(
              eq(masterPlacePhotos.masterPlaceId, p.masterPlaceId),
              eq(masterPlacePhotos.isPrimary, true),
            ),
          );
        await tx
          .update(masterPlacePhotos)
          .set({ isPrimary: true })
          .where(eq(masterPlacePhotos.id, p.id));
      });
      return { ok: true };
    }),

  updatePhotoCaption: adminProcedure
    .input(z.object({ photoUid: uidSchema, caption: z.string().trim().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(masterPlacePhotos)
        .set({ caption: input.caption || null })
        .where(eq(masterPlacePhotos.uid, input.photoUid));
      return { ok: true };
    }),

  /** Penghapusan primary tidak memilih pengganti otomatis (ERD 12.5). */
  deletePhoto: adminProcedure
    .input(z.object({ photoUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [p] = await ctx.db
        .select()
        .from(masterPlacePhotos)
        .where(eq(masterPlacePhotos.uid, input.photoUid));
      if (!p) notFound();
      await ctx.db
        .delete(masterPlacePhotos)
        .where(eq(masterPlacePhotos.id, p.id));
      if (p.storageType === "UPLOAD") await removeUpload(p.filePath);
      return { ok: true };
    }),

  /** Pencarian ringan MASTER ACTIVE untuk memilih referensi (Admin & Explorer). */
  searchActive: activeProcedure
    .input(z.object({ q: z.string().trim().max(100).default("") }))
    .query(async ({ ctx, input }) => {
      const q = `%${input.q}%`;
      const rows = await ctx.db
        .select({
          uid: masterPlaces.uid,
          name: masterPlaces.name,
          address: masterPlaces.address,
          latitude: masterPlaces.latitude,
          longitude: masterPlaces.longitude,
        })
        .from(masterPlaces)
        .where(
          and(
            activeMasterCond,
            or(like(masterPlaces.name, q), like(masterPlaces.address, q)),
          ),
        )
        .orderBy(asc(masterPlaces.name))
        .limit(20);
      return rows;
    }),
});
