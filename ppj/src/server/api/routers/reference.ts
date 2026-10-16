import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";

import {
  activeProcedure,
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import {
  appSettings,
  categories,
  masterPlaceCategories,
  myPlaceCategories,
  refTagColors,
} from "~/server/db/schema";
import { fail, isDuplicateError, notFound } from "~/server/lib/errors";
import { newUid } from "~/server/lib/ids";
import { getCategoryPageSize, getTagPageSize, getMapColors, getMapSearchConfig, getPhotoRules, getTimezone, SETTING_DEFAULTS, validateSetting } from "~/server/lib/settings";
import { slugify } from "~/server/lib/slug";
import { hexColorSchema, longTextSchema, nameSchema } from "~/server/lib/validation";

export const categoriesRouter = createTRPCRouter({
  /** 24.15 — pilihan CATEGORY aktif (Guest boleh membaca). */
  listActive: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        uid: categories.uid,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.id)),
  ),

  adminList: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    const [m, p] = await Promise.all([
      ctx.db
        .select({
          id: masterPlaceCategories.categoryId,
          n: sql<number>`count(*)`,
        })
        .from(masterPlaceCategories)
        .groupBy(masterPlaceCategories.categoryId),
      ctx.db
        .select({
          id: myPlaceCategories.categoryId,
          n: sql<number>`count(*)`,
        })
        .from(myPlaceCategories)
        .groupBy(myPlaceCategories.categoryId),
    ]);
    const used = new Map<number, number>();
    for (const r of [...m, ...p]) used.set(r.id, (used.get(r.id) ?? 0) + Number(r.n));
    return rows.map((r) => ({ ...r, usage: used.get(r.id) ?? 0 }));
  }),

  /** Tabel Admin: pencarian, filter status, urutan, dan paging di server. */
  adminPage: adminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).optional(),
        status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
        sort: z.enum(["sortOrder", "name", "createdAt"]).default("sortOrder"),
        order: z.enum(["asc", "desc"]).default("asc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [];
      if (input.q) {
        const q = `%${input.q}%`;
        conds.push(or(like(categories.name, q), like(categories.slug, q), like(categories.description, q)));
      }
      if (input.status !== "ALL") conds.push(eq(categories.isActive, input.status === "ACTIVE"));
      const where = conds.length ? and(...conds) : undefined;
      const col = categories[input.sort];
      const [totalRow] = await ctx.db.select({ total: sql<number>`count(*)` }).from(categories).where(where);
      const rows = await ctx.db
        .select({
          category: categories,
          usage: sql<number>`((select count(*) from master_place_categories mc where mc.category_id = ${categories.id}) + (select count(*) from my_place_categories pc where pc.category_id = ${categories.id}))`,
        })
        .from(categories)
        .where(where)
        .orderBy(input.order === "asc" ? asc(col) : desc(col), asc(categories.id))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
      return {
        total: Number(totalRow?.total ?? 0),
        rows: rows.map((r) => ({ ...r.category, usage: Number(r.usage) })),
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        description: longTextSchema.optional(),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const base = slugify(input.name);
      let slug = base;
      for (let i = 2; ; i++) {
        const [e] = await ctx.db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, slug));
        if (!e) break;
        slug = `${base}-${i}`;
      }
      await ctx.db.insert(categories).values({
        uid: newUid(),
        name: input.name,
        slug,
        description: input.description || null,
        sortOrder: input.sortOrder,
      });
      return { ok: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        uid: z.string().uuid(),
        name: nameSchema,
        description: longTextSchema.optional(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [r] = await ctx.db
        .update(categories)
        .set({
          name: input.name,
          description: input.description || null,
          sortOrder: input.sortOrder,
        })
        .where(eq(categories.uid, input.uid));
      if (!r.affectedRows) notFound();
      return { ok: true };
    }),

  setActive: adminProcedure
    .input(z.object({ uid: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(categories)
        .set({ isActive: input.isActive })
        .where(eq(categories.uid, input.uid));
      return { ok: true };
    }),

  /** K-39 — hapus permanen hanya bila belum pernah dipakai (FK RESTRICT). */
  delete: adminProcedure
    .input(z.object({ uid: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [r] = await ctx.db
          .delete(categories)
          .where(eq(categories.uid, input.uid));
        if (!r.affectedRows) notFound();
      } catch (e) {
        const err = e as { errno?: number; cause?: { errno?: number } };
        if (err.errno === 1451 || err.cause?.errno === 1451)
          fail("CATEGORY_IN_USE");
        throw e;
      }
      return { ok: true };
    }),
});

export const colorsRouter = createTRPCRouter({
  /** 24.16 — preset warna TAG aktif. */
  listActive: activeProcedure.query(({ ctx }) =>
    ctx.db
      .select({ hexCode: refTagColors.hexCode, name: refTagColors.name })
      .from(refTagColors)
      .where(eq(refTagColors.isActive, true))
      .orderBy(asc(refTagColors.sortOrder), asc(refTagColors.id)),
  ),

  adminList: adminProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).optional(),
        status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
        sort: z.enum(["sortOrder", "name", "hexCode"]).default("sortOrder"),
        order: z.enum(["asc", "desc"]).default("asc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conds = [];
      if (input.q) {
        const q = `%${input.q}%`;
        conds.push(or(like(refTagColors.name, q), like(refTagColors.hexCode, q)));
      }
      if (input.status !== "ALL") conds.push(eq(refTagColors.isActive, input.status === "ACTIVE"));
      const where = conds.length ? and(...conds) : undefined;
      const col = refTagColors[input.sort];
      const [totalRow] = await ctx.db.select({ total: sql<number>`count(*)` }).from(refTagColors).where(where);
      const rows = await ctx.db
        .select()
        .from(refTagColors)
        .where(where)
        .orderBy(input.order === "asc" ? asc(col) : desc(col), asc(refTagColors.id))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);
      return { total: Number(totalRow?.total ?? 0), rows };
    }),

  create: adminProcedure
    .input(
      z.object({
        hexCode: hexColorSchema,
        name: nameSchema,
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.insert(refTagColors).values({
          hexCode: input.hexCode.toUpperCase(),
          name: input.name,
          sortOrder: input.sortOrder,
        });
      } catch (e) {
        if (isDuplicateError(e)) fail("COLOR_EXISTS");
        throw e;
      }
      return { ok: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: nameSchema,
        sortOrder: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(refTagColors)
        .set({ name: input.name, sortOrder: input.sortOrder })
        .where(eq(refTagColors.id, input.id));
      return { ok: true };
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(refTagColors)
        .set({ isActive: input.isActive })
        .where(eq(refTagColors.id, input.id));
      return { ok: true };
    }),

  /** TAG menyimpan warna aktual (tanpa FK), sehingga preset aman dihapus (DD-05). */
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(refTagColors).where(eq(refTagColors.id, input.id));
      return { ok: true };
    }),
});

export const settingsRouter = createTRPCRouter({
  /** Zona waktu default aplikasi — dapat dibaca siapa pun. */
  timezone: publicProcedure.query(async () => ({ timezone: await getTimezone() })),

  /** Konfigurasi daftar filter tempat pada peta — dapat dibaca siapa pun. */
  mapSearch: publicProcedure.query(() => getMapSearchConfig()),

  /** Warna pin peta — dapat dibaca siapa pun (Guest melihat pin MASTER). */
  mapColors: publicProcedure.query(() => getMapColors()),

  /** Aturan foto aktif (untuk validasi sisi klien; penegakan tetap di server). */
  /** Jumlah TAG per pemuatan (daftar & form MY PLACE) — TAG milik user, jadi hanya untuk akun aktif. */
  tagPageSize: activeProcedure.query(async () => ({ pageSize: await getTagPageSize() })),

  /** Jumlah kategori per pemuatan (Peta, daftar & form MY PLACE) — dapat dibaca siapa pun (Guest memakai Peta). */
  categoryPageSize: publicProcedure.query(async () => ({ pageSize: await getCategoryPageSize() })),

  photoRules: activeProcedure.query(() => getPhotoRules()),

  list: adminProcedure.query(({ ctx }) =>
    ctx.db.select().from(appSettings).orderBy(asc(appSettings.key)),
  ),

  /** TX-16 — ubah nilai aturan; key tidak dapat ditambah/dihapus. */
  update: adminProcedure
    .input(z.object({ key: z.string().max(100), value: z.string().trim().max(255) }))
    .mutation(async ({ ctx, input }) => {
      const err = validateSetting(input.key, input.value);
      if (err) fail(err);
      const value =
        input.key === "photo.allowed_types" || input.key === "avatar.allowed_types"
          ? input.value
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
              .join(",")
          : input.value;
      const normalized = input.key.startsWith("map.color_") ? value.toUpperCase() : value;
      const [r] = await ctx.db
        .update(appSettings)
        .set({ value: normalized, updatedBy: ctx.user.id })
        .where(eq(appSettings.key, input.key));
      if (!r.affectedRows) {
        // Kunci warna bawaan yang belum di-seed dibuat saat pertama diubah (kunci lain tetap hanya via seed).
        const def = SETTING_DEFAULTS[input.key];
        if (!def) notFound();
        await ctx.db.insert(appSettings).values({
          uid: newUid(),
          key: input.key,
          value: normalized,
          description:
            input.key === "map.recent_page_size"
              ? "Jumlah data awal & per muat pada filter tempat (peta)"
              : input.key === "category.page_size"
                ? "Jumlah kategori per muat pada filter & pemilih kategori"
                : input.key === "visit.page_size"
                  ? "Jumlah kunjungan per halaman pada detail MY PLACE"
                  : input.key === "tag.page_size"
                  ? "Jumlah TAG per muat pada filter & pemilih TAG"
                  : input.key === "app.timezone"
                ? "Zona waktu default aplikasi (IANA)"
                : "Warna pin peta",
          updatedBy: ctx.user.id,
        });
      }
      return { ok: true };
    }),
});
