import { and, asc, desc, eq, gte, inArray, isNull, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  backupLogs,
  categories,
  itineraryPlaces,
  masterPlaceCategories,
  masterPlaces,
  myPlaceMasterHistories,
  myPlaces,
  users,
  visitPhotos,
  visits,
  type SnapshotData,
} from "~/server/db/schema";
import { fail, notFound } from "~/server/lib/errors";
import { getTimezone } from "~/server/lib/settings";
import {
  addHistory,
  buildSnapshot,
  insertMaster,
  referPlace,
} from "~/server/lib/master";
import {
  activeMasterCond,
  categoriesForPlaces,
  effectiveCategories,
  myPlacePhotosFor,
  placeRatings,
  visitPhotoUrl,
} from "~/server/lib/queries";
import {
  latSchema,
  lngSchema,
  longTextSchema,
  nameSchema,
  uidSchema,
} from "~/server/lib/validation";

const ownerOk = isNull(users.deletedAt);

async function placeByUid(uid: string) {
  const [p] = await db.select().from(myPlaces).where(eq(myPlaces.uid, uid));
  if (!p) notFound();
  return p;
}

/** DV-08 — snapshot pengajuan aktif = history SUBMITTED terakhir. */
async function latestSnapshot(placeId: number): Promise<SnapshotData | null> {
  const [h] = await db
    .select()
    .from(myPlaceMasterHistories)
    .where(
      and(
        eq(myPlaceMasterHistories.myPlaceId, placeId),
        eq(myPlaceMasterHistories.action, "SUBMITTED"),
      ),
    )
    .orderBy(desc(myPlaceMasterHistories.performedAt), desc(myPlaceMasterHistories.id))
    .limit(1);
  return h?.snapshotData ?? null;
}

export const reviewRouter = createTRPCRouter({
  /** Ringkasan untuk dashboard Admin. */
  stats: adminProcedure.query(async ({ ctx }) => {
    const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
    const [masterActive, masterInactive, queue, explorers, places, visitCount] =
      await Promise.all([
        n(ctx.db.select({ n: sql<number>`count(*)` }).from(masterPlaces).where(activeMasterCond)),
        n(ctx.db.select({ n: sql<number>`count(*)` }).from(masterPlaces).where(and(eq(masterPlaces.isActive, false), isNull(masterPlaces.deletedAt)))),
        n(ctx.db.select({ n: sql<number>`count(*)` }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(and(eq(myPlaces.masterRelationStatus, "REVIEW"), ownerOk))),
        n(ctx.db.select({ n: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "EXPLORER"), isNull(users.deletedAt)))),
        n(ctx.db.select({ n: sql<number>`count(*)` }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(ownerOk)),
        n(ctx.db.select({ n: sql<number>`count(*)` }).from(visits)),
      ]);
    return { masterActive, masterInactive, queue, explorers, places, visitCount };
  }),

  /**
   * Rekap dashboard Admin untuk rentang N hari terakhir: total, tren vs periode sebelumnya,
   * deret aktivitas harian (dikelompokkan per tanggal di zona waktu aplikasi), komposisi status,
   * kategori teratas, cuplikan antrean review, dan Explorer paling aktif.
   */
  dashboard: adminProcedure
    .input(z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30) }))
    .query(async ({ ctx, input }) => {
      const tz = await getTimezone();
      const DAY = 86_400_000;
      const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
      const now = Date.now();
      // Deret hari (tanggal lokal) dari terlama ke hari ini.
      const keys = Array.from({ length: input.days }, (_, i) => ymd.format(new Date(now - (input.days - 1 - i) * DAY)));
      const first = keys[0]!;
      // Ambil data sejak dua periode lalu (+1 hari cadangan selisih zona waktu) untuk tren.
      const since = new Date(now - (input.days * 2 + 1) * DAY);
      const prevFirst = ymd.format(new Date(now - (input.days * 2 - 1) * DAY));

      const count = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
      const [
        masterActive, masterInactive, queue, explorers, explorersInactive, places, visitCount, categoryCount,
        masterTs, placeTs, visitTs, userTs, relRows, visRows, catRows, queueRows, topRows, lastBackup,
      ] = await Promise.all([
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(masterPlaces).where(activeMasterCond)),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(masterPlaces).where(and(eq(masterPlaces.isActive, false), isNull(masterPlaces.deletedAt)))),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(and(eq(myPlaces.masterRelationStatus, "REVIEW"), ownerOk))),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "EXPLORER"), isNull(users.deletedAt), eq(users.isActive, true)))),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "EXPLORER"), isNull(users.deletedAt), eq(users.isActive, false)))),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(ownerOk)),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(visits).innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId)).innerJoin(users, eq(users.id, myPlaces.userId)).where(ownerOk)),
        count(ctx.db.select({ n: sql<number>`count(*)` }).from(categories).where(eq(categories.isActive, true))),
        ctx.db.select({ at: masterPlaces.createdAt }).from(masterPlaces).where(and(isNull(masterPlaces.deletedAt), gte(masterPlaces.createdAt, since))),
        ctx.db.select({ at: myPlaces.createdAt }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(and(ownerOk, gte(myPlaces.createdAt, since))),
        ctx.db.select({ at: visits.visitedAt }).from(visits).innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId)).innerJoin(users, eq(users.id, myPlaces.userId)).where(and(ownerOk, gte(visits.visitedAt, since))),
        ctx.db.select({ at: users.createdAt }).from(users).where(and(eq(users.role, "EXPLORER"), isNull(users.deletedAt), gte(users.createdAt, since))),
        ctx.db.select({ k: myPlaces.masterRelationStatus, n: sql<number>`count(*)` }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(ownerOk).groupBy(myPlaces.masterRelationStatus),
        ctx.db.select({ k: myPlaces.visitStatus, n: sql<number>`count(*)` }).from(myPlaces).innerJoin(users, eq(users.id, myPlaces.userId)).where(ownerOk).groupBy(myPlaces.visitStatus),
        ctx.db
          .select({ uid: categories.uid, name: categories.name, n: sql<number>`count(*)` })
          .from(masterPlaceCategories)
          .innerJoin(categories, eq(categories.id, masterPlaceCategories.categoryId))
          .innerJoin(masterPlaces, eq(masterPlaces.id, masterPlaceCategories.masterPlaceId))
          .where(activeMasterCond)
          .groupBy(categories.id, categories.uid, categories.name)
          .orderBy(desc(sql`count(*)`), asc(categories.name))
          .limit(5),
        ctx.db
          .select({ uid: myPlaces.uid, name: myPlaces.name, ownerName: users.name, at: myPlaces.updatedAt })
          .from(myPlaces)
          .innerJoin(users, eq(users.id, myPlaces.userId))
          .where(and(eq(myPlaces.masterRelationStatus, "REVIEW"), ownerOk))
          .orderBy(asc(myPlaces.updatedAt))
          .limit(4),
        ctx.db
          .select({ uid: users.uid, name: users.name, username: users.username, avatar: users.avatarFilePath, updatedAt: users.updatedAt, n: sql<number>`count(*)` })
          .from(myPlaces)
          .innerJoin(users, eq(users.id, myPlaces.userId))
          .where(ownerOk)
          .groupBy(users.id, users.uid, users.name, users.username, users.avatarFilePath, users.updatedAt)
          .orderBy(desc(sql`count(*)`), asc(users.name))
          .limit(5),
        ctx.db.select({ at: backupLogs.startedAt, status: backupLogs.status }).from(backupLogs).orderBy(desc(backupLogs.startedAt)).limit(1),
      ]);

      // Kelompokkan cap waktu ke tanggal lokal; hitung juga total periode ini vs periode sebelumnya.
      const bucket = (rows: { at: Date | null }[]) => {
        const per = new Map<string, number>();
        let cur = 0;
        let prev = 0;
        for (const r of rows) {
          if (!r.at) continue;
          const k = ymd.format(r.at);
          if (k >= first) {
            cur++;
            per.set(k, (per.get(k) ?? 0) + 1);
          } else if (k >= prevFirst) prev++;
        }
        return { per, cur, prev };
      };
      const bm = bucket(masterTs);
      const bp = bucket(placeTs);
      const bv = bucket(visitTs);
      const bu = bucket(userTs);

      const visitTop = topRows.length
        ? await ctx.db
            .select({ uid: users.uid, n: sql<number>`count(*)` })
            .from(visits)
            .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
            .innerJoin(users, eq(users.id, myPlaces.userId))
            .where(inArray(users.uid, topRows.map((r) => r.uid)))
            .groupBy(users.uid)
        : [];
      const visitsBy = new Map(visitTop.map((r) => [r.uid, Number(r.n)]));

      return {
        timezone: tz,
        totals: { masterActive, masterInactive, queue, explorers, explorersInactive, places, visitCount, categoryCount },
        period: {
          masters: { cur: bm.cur, prev: bm.prev },
          places: { cur: bp.cur, prev: bp.prev },
          visits: { cur: bv.cur, prev: bv.prev },
          explorers: { cur: bu.cur, prev: bu.prev },
        },
        series: keys.map((d) => ({ d, visits: bv.per.get(d) ?? 0, places: bp.per.get(d) ?? 0, masters: bm.per.get(d) ?? 0 })),
        relation: Object.fromEntries(relRows.map((r) => [r.k, Number(r.n)])) as Record<string, number>,
        visitStatus: Object.fromEntries(visRows.map((r) => [r.k, Number(r.n)])) as Record<string, number>,
        topCategories: catRows.map((r) => ({ uid: r.uid, name: r.name, n: Number(r.n) })),
        queuePreview: queueRows,
        topExplorers: topRows.map((r) => ({
          uid: r.uid,
          name: r.name,
          username: r.username,
          avatarUrl: r.avatar ? `/api/files/avatar/${r.uid}?v=${r.updatedAt.getTime()}` : null,
          n: Number(r.n),
          visits: visitsBy.get(r.uid) ?? 0,
        })),
        lastBackup: lastBackup[0] ?? null,
      };
    }),

  /** 24.6 — antrean review beserta snapshot pengajuan. */
  queue: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ p: myPlaces, ownerName: users.name, ownerUsername: users.username })
      .from(myPlaces)
      .innerJoin(users, eq(users.id, myPlaces.userId))
      .where(and(eq(myPlaces.masterRelationStatus, "REVIEW"), ownerOk))
      .orderBy(asc(myPlaces.updatedAt));
    const out = [];
    for (const { p, ownerName, ownerUsername } of rows) {
      const [h] = await ctx.db
        .select()
        .from(myPlaceMasterHistories)
        .where(
          and(
            eq(myPlaceMasterHistories.myPlaceId, p.id),
            eq(myPlaceMasterHistories.action, "SUBMITTED"),
          ),
        )
        .orderBy(desc(myPlaceMasterHistories.performedAt), desc(myPlaceMasterHistories.id))
        .limit(1);
      out.push({
        uid: p.uid,
        ownerName,
        ownerUsername,
        isActive: p.isActive,
        submittedAt: h?.performedAt ?? p.updatedAt,
        snapshot: h?.snapshotData ?? null,
      });
    }
    return out;
  }),

  /** 24.5 — daftar kurasi: seluruh MY PLACE (read-only) milik user yang belum DELETED. */
  curation: adminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).optional(),
        relationStatus: z
          .enum(["UNREFERRED", "REVIEW", "REJECTED", "REFERRED"])
          .optional(),
        showInactive: z.boolean().default(false),
        sort: z.enum(["name", "ownerName", "updatedAt"]).default("updatedAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [ownerOk];
      if (!input.showInactive) conds.push(eq(myPlaces.isActive, true));
      if (input.relationStatus)
        conds.push(eq(myPlaces.masterRelationStatus, input.relationStatus));
      if (input.q) {
        const q = `%${input.q}%`;
        conds.push(or(like(myPlaces.name, q), like(myPlaces.address, q), like(users.name, q))!);
      }
      const where = and(...conds);
      const [totalRow] = await ctx.db
        .select({ total: sql<number>`count(*)` })
        .from(myPlaces)
        .innerJoin(users, eq(users.id, myPlaces.userId))
        .where(where);
      const rows = await ctx.db
        .select({ p: myPlaces, ownerName: users.name, masterName: masterPlaces.name })
        .from(myPlaces)
        .innerJoin(users, eq(users.id, myPlaces.userId))
        .leftJoin(masterPlaces, eq(masterPlaces.id, myPlaces.masterPlaceId))
        .where(where)
        .orderBy(
          input.order === "asc"
            ? asc(input.sort === "name" ? myPlaces.name : input.sort === "ownerName" ? users.name : myPlaces.updatedAt)
            : desc(input.sort === "name" ? myPlaces.name : input.sort === "ownerName" ? users.name : myPlaces.updatedAt),
        )
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
      const eff = await effectiveCategories(rows.map((r) => r.p));
      return {
        total: Number(totalRow?.total ?? 0),
        rows: rows.map(({ p, ownerName, masterName }) => ({
          uid: p.uid,
          name: p.name,
          address: p.address,
          ownerName,
          masterName,
          masterRelationStatus: p.masterRelationStatus,
          visitStatus: p.visitStatus,
          isActive: p.isActive,
          categories: eff.get(p.id) ?? [],
        })),
      };
    }),

  /** Detail MY PLACE read-only untuk kurasi (K-07). */
  placeDetail: adminProcedure
    .input(z.object({ uid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .select({ p: myPlaces, ownerName: users.name, ownerDeleted: users.deletedAt })
        .from(myPlaces)
        .innerJoin(users, eq(users.id, myPlaces.userId))
        .where(eq(myPlaces.uid, input.uid));
      if (!r || r.ownerDeleted) notFound();
      const p = r.p;
      const [own, eff, ratings] = await Promise.all([
        categoriesForPlaces([p.id]),
        effectiveCategories([p]),
        placeRatings([p.id]),
      ]);
      const fromM = alias(masterPlaces, "from_m");
      const toM = alias(masterPlaces, "to_m");
      const history = await ctx.db
        .select({
          uid: myPlaceMasterHistories.uid,
          action: myPlaceMasterHistories.action,
          reason: myPlaceMasterHistories.reason,
          performedAt: myPlaceMasterHistories.performedAt,
          fromName: fromM.name,
          toName: toM.name,
          snapshot: myPlaceMasterHistories.snapshotData,
        })
        .from(myPlaceMasterHistories)
        .leftJoin(fromM, eq(fromM.id, myPlaceMasterHistories.fromMasterPlaceId))
        .leftJoin(toM, eq(toM.id, myPlaceMasterHistories.toMasterPlaceId))
        .where(eq(myPlaceMasterHistories.myPlaceId, p.id))
        .orderBy(desc(myPlaceMasterHistories.performedAt), desc(myPlaceMasterHistories.id));
      let master: { uid: string; name: string; status: string } | null = null;
      if (p.masterPlaceId) {
        const [m] = await ctx.db
          .select()
          .from(masterPlaces)
          .where(eq(masterPlaces.id, p.masterPlaceId));
        if (m)
          master = {
            uid: m.uid,
            name: m.name,
            status: m.isActive ? "ACTIVE" : "INACTIVE",
          };
      }
      const vp = await ctx.db
        .select({ ph: visitPhotos, visitedAt: visits.visitedAt })
        .from(visitPhotos)
        .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
        .where(eq(visits.myPlaceId, p.id))
        .orderBy(desc(visits.visitedAt))
        .limit(50);
      const [vc] = await ctx.db
        .select({ n: sql<number>`count(*)` })
        .from(visits)
        .where(eq(visits.myPlaceId, p.id));
      const [ic] = await ctx.db
        .select({ n: sql<number>`count(*)` })
        .from(itineraryPlaces)
        .where(eq(itineraryPlaces.myPlaceId, p.id));
      return {
        uid: p.uid,
        ownerName: r.ownerName,
        name: p.name,
        address: p.address,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        googlePlaceId: p.googlePlaceId,
        masterRelationStatus: p.masterRelationStatus,
        visitStatus: p.visitStatus,
        isActive: p.isActive,
        master,
        storedCategories: own.get(p.id) ?? [],
        categories: eff.get(p.id) ?? [],
        rating: ratings.get(p.id) ?? { avg: null, count: 0 },
        visitCount: Number(vc?.n ?? 0),
        itineraryCount: Number(ic?.n ?? 0),
        photos: vp.map((x) => ({
          uid: x.ph.uid,
          url: visitPhotoUrl(x.ph),
          caption: x.ph.caption,
          visitedAt: x.visitedAt,
        })),
        reviewPhotos: (await myPlacePhotosFor([p.id])).get(p.id) ?? [],
        history,
      };
    }),

  /**
   * Draft MASTER yang disalin dari snapshot pengajuan (`snapshot`) atau data MY PLACE saat ini
   * (`current`). Admin mengubah draft, bukan MY PLACE (K-07).
   */
  draft: adminProcedure
    .input(
      z.object({
        placeUid: uidSchema,
        source: z.enum(["snapshot", "current"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const p = await placeByUid(input.placeUid);
      let d: SnapshotData | null = null;
      if (input.source === "snapshot") d = await latestSnapshot(p.id);
      if (!d) d = await ctx.db.transaction((tx) => buildSnapshot(tx, p));
      const cats = d.category_codes.length
        ? await ctx.db
            .select({ uid: categories.uid, slug: categories.slug, isActive: categories.isActive })
            .from(categories)
            .where(inArray(categories.slug, d.category_codes))
        : [];
      return {
        googlePlaceId: d.google_place_id,
        name: d.name,
        address: d.address ?? "",
        description: d.description,
        latitude: d.latitude,
        longitude: d.longitude,
        categoryUids: cats.filter((c) => c.isActive).map((c) => c.uid),
        masterRelationStatus: p.masterRelationStatus,
      };
    }),

  /** TX-06 (2a) — approve dengan MASTER baru dari draft. */
  approveNew: adminProcedure
    .input(
      z.object({
        placeUid: uidSchema,
        googlePlaceId: z.string().max(255).nullish(),
        name: nameSchema,
        address: z.string().trim().min(1, "REQUIRED"),
        description: longTextSchema.nullish(),
        latitude: latSchema,
        longitude: lngSchema,
        categoryUids: z.array(uidSchema).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { placeUid, ...draft } = input;
      const uid = await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(eq(myPlaces.uid, placeUid))
          .for("update");
        if (!p) notFound();
        if (p.masterRelationStatus !== "REVIEW") fail("NOT_IN_REVIEW");
        const masterId = await insertMaster(tx, draft, ctx.user.id);
        await referPlace(tx, p, masterId, ctx.user.id);
        const [m] = await tx
          .select({ uid: masterPlaces.uid })
          .from(masterPlaces)
          .where(eq(masterPlaces.id, masterId));
        return m!.uid;
      });
      return { masterUid: uid };
    }),

  /** TX-06 (2b) — approve dengan mereferensikan MASTER ACTIVE existing. */
  approveExisting: adminProcedure
    .input(z.object({ placeUid: uidSchema, masterUid: uidSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(eq(myPlaces.uid, input.placeUid))
          .for("update");
        if (!p) notFound();
        if (p.masterRelationStatus !== "REVIEW") fail("NOT_IN_REVIEW");
        const [m] = await tx
          .select()
          .from(masterPlaces)
          .where(and(eq(masterPlaces.uid, input.masterUid), activeMasterCond));
        if (!m) fail("MASTER_NOT_ACTIVE");
        await referPlace(tx, p, m.id, ctx.user.id);
      });
      return { ok: true };
    }),

  /** TX-06 (2c) — reject; history menyimpan snapshot pengajuan yang ditolak (K-09). */
  reject: adminProcedure
    .input(z.object({ placeUid: uidSchema, reason: z.string().trim().min(1, "REQUIRED").max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(eq(myPlaces.uid, input.placeUid))
          .for("update");
        if (!p) notFound();
        if (p.masterRelationStatus !== "REVIEW") fail("NOT_IN_REVIEW");
        const [h] = await tx
          .select()
          .from(myPlaceMasterHistories)
          .where(
            and(
              eq(myPlaceMasterHistories.myPlaceId, p.id),
              eq(myPlaceMasterHistories.action, "SUBMITTED"),
            ),
          )
          .orderBy(
            desc(myPlaceMasterHistories.performedAt),
            desc(myPlaceMasterHistories.id),
          )
          .limit(1);
        const snapshot = h?.snapshotData ?? (await buildSnapshot(tx, p));
        const [r] = await tx
          .update(myPlaces)
          .set({ masterRelationStatus: "REJECTED" })
          .where(
            and(eq(myPlaces.id, p.id), eq(myPlaces.masterRelationStatus, "REVIEW")),
          );
        if (!r.affectedRows) fail("CONFLICT", "CONFLICT");
        await addHistory(tx, {
          myPlaceId: p.id,
          action: "REJECTED",
          snapshot,
          reason: input.reason,
          performedBy: ctx.user.id,
        });
      });
      return { ok: true };
    }),

  /**
   * TX-07 — REFER inisiatif (UNREFERRED/REVIEW/REJECTED → REFERRED) atau RE-REFER
   * (REFERRED → MASTER lain). MY PLACE inactive tetap dapat diproses (K-29c).
   */
  refer: adminProcedure
    .input(
      z.object({
        placeUid: uidSchema,
        masterUid: uidSchema,
        reason: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(eq(myPlaces.uid, input.placeUid))
          .for("update");
        if (!p) notFound();
        const [m] = await tx
          .select()
          .from(masterPlaces)
          .where(and(eq(masterPlaces.uid, input.masterUid), activeMasterCond));
        if (!m) fail("MASTER_NOT_ACTIVE");
        await referPlace(tx, p, m.id, ctx.user.id, { reason: input.reason || null });
      });
      return { ok: true };
    }),

  /** TX-07 — UNREFER manual. */
  unrefer: adminProcedure
    .input(
      z.object({
        placeUid: uidSchema,
        reason: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(myPlaces)
          .where(eq(myPlaces.uid, input.placeUid))
          .for("update");
        if (!p) notFound();
        if (p.masterRelationStatus !== "REFERRED" || !p.masterPlaceId)
          fail("NOT_REFERRED");
        const [r] = await tx
          .update(myPlaces)
          .set({ masterPlaceId: null, masterRelationStatus: "UNREFERRED" })
          .where(
            and(eq(myPlaces.id, p.id), eq(myPlaces.masterRelationStatus, "REFERRED")),
          );
        if (!r.affectedRows) fail("CONFLICT", "CONFLICT");
        await addHistory(tx, {
          myPlaceId: p.id,
          action: "UNREFERRED",
          from: p.masterPlaceId,
          to: null,
          reason: input.reason || null,
          performedBy: ctx.user.id,
        });
      });
      return { ok: true };
    }),

  /** MY PLACE yang saat ini mereferensikan sebuah MASTER (untuk RE-REFER / UNREFER). */
  referencing: adminProcedure
    .input(z.object({ masterUid: uidSchema }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({ p: myPlaces, ownerName: users.name })
        .from(myPlaces)
        .innerJoin(users, eq(users.id, myPlaces.userId))
        .innerJoin(masterPlaces, eq(masterPlaces.id, myPlaces.masterPlaceId))
        .where(and(eq(masterPlaces.uid, input.masterUid), ownerOk))
        .orderBy(asc(myPlaces.name));
      return rows.map(({ p, ownerName }) => ({
        uid: p.uid,
        name: p.name,
        ownerName,
        isActive: p.isActive,
      }));
    }),
});
