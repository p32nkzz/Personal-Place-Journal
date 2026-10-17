/**
 * Query bersama: nilai turunan (rating, effective category) dihitung saat dibaca (DD-09, ERD 19).
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "~/server/db";
import {
  categories,
  masterPlaceCategories,
  masterPlacePhotos,
  masterPlaces,
  myPlaceCategories,
  myPlacePhotos,
  myPlaceTags,
  myPlaces,
  tags,
  users,
  visits,
} from "~/server/db/schema";

export type CategoryDto = {
  uid: string;
  name: string;
  slug: string;
  isActive: boolean;
};
export type Rating = { avg: number | null; count: number };

/** DV-03 — rating MASTER: VISIT dari MY PLACE aktif, bukan milik user DELETED. */
export async function masterRatings(masterIds: number[]) {
  const map = new Map<number, Rating>();
  if (!masterIds.length) return map;
  const rows = await db
    .select({
      masterId: myPlaces.masterPlaceId,
      avg: sql<string>`avg(${visits.rating})`,
      cnt: sql<string>`count(${visits.rating})`,
    })
    .from(visits)
    .innerJoin(myPlaces, eq(visits.myPlaceId, myPlaces.id))
    .innerJoin(users, eq(myPlaces.userId, users.id))
    .where(
      and(
        inArray(myPlaces.masterPlaceId, masterIds),
        eq(myPlaces.isActive, true),
        isNotNull(visits.rating),
        isNull(users.deletedAt),
      ),
    )
    .groupBy(myPlaces.masterPlaceId);
  for (const r of rows) {
    if (r.masterId != null)
      map.set(r.masterId, { avg: Number(r.avg), count: Number(r.cnt) });
  }
  return map;
}

/** DV-02 — rating MY PLACE. */
export async function placeRatings(placeIds: number[]) {
  const map = new Map<number, Rating>();
  if (!placeIds.length) return map;
  const rows = await db
    .select({
      placeId: visits.myPlaceId,
      avg: sql<string>`avg(${visits.rating})`,
      cnt: sql<string>`count(${visits.rating})`,
    })
    .from(visits)
    .where(and(inArray(visits.myPlaceId, placeIds), isNotNull(visits.rating)))
    .groupBy(visits.myPlaceId);
  for (const r of rows)
    map.set(r.placeId, { avg: Number(r.avg), count: Number(r.cnt) });
  return map;
}

export async function categoriesForMasters(masterIds: number[]) {
  const map = new Map<number, CategoryDto[]>();
  if (!masterIds.length) return map;
  const rows = await db
    .select({
      masterId: masterPlaceCategories.masterPlaceId,
      uid: categories.uid,
      name: categories.name,
      slug: categories.slug,
      isActive: categories.isActive,
    })
    .from(masterPlaceCategories)
    .innerJoin(categories, eq(categories.id, masterPlaceCategories.categoryId))
    .where(inArray(masterPlaceCategories.masterPlaceId, masterIds))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  for (const r of rows) {
    const list = map.get(r.masterId) ?? [];
    list.push({ uid: r.uid, name: r.name, slug: r.slug, isActive: r.isActive });
    map.set(r.masterId, list);
  }
  return map;
}

export async function categoriesForPlaces(placeIds: number[]) {
  const map = new Map<number, CategoryDto[]>();
  if (!placeIds.length) return map;
  const rows = await db
    .select({
      placeId: myPlaceCategories.myPlaceId,
      uid: categories.uid,
      name: categories.name,
      slug: categories.slug,
      isActive: categories.isActive,
    })
    .from(myPlaceCategories)
    .innerJoin(categories, eq(categories.id, myPlaceCategories.categoryId))
    .where(inArray(myPlaceCategories.myPlaceId, placeIds))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  for (const r of rows) {
    const list = map.get(r.placeId) ?? [];
    list.push({ uid: r.uid, name: r.name, slug: r.slug, isActive: r.isActive });
    map.set(r.placeId, list);
  }
  return map;
}

/** DV-04 — effective category: MASTER bila direferensikan, selain itu stored MY PLACE. */
export async function effectiveCategories(
  places: { id: number; masterPlaceId: number | null }[],
) {
  const masterIds = [
    ...new Set(places.map((p) => p.masterPlaceId).filter((x): x is number => x != null)),
  ];
  const [own, master] = await Promise.all([
    categoriesForPlaces(places.map((p) => p.id)),
    categoriesForMasters(masterIds),
  ]);
  const map = new Map<number, CategoryDto[]>();
  for (const p of places) {
    map.set(
      p.id,
      p.masterPlaceId != null
        ? (master.get(p.masterPlaceId) ?? [])
        : (own.get(p.id) ?? []),
    );
  }
  return map;
}

export type TagDto = { uid: string; name: string; color: string };

export async function tagsForPlaces(placeIds: number[]) {
  const map = new Map<number, TagDto[]>();
  if (!placeIds.length) return map;
  const rows = await db
    .select({
      placeId: myPlaceTags.myPlaceId,
      uid: tags.uid,
      name: tags.name,
      color: tags.color,
    })
    .from(myPlaceTags)
    .innerJoin(tags, eq(tags.id, myPlaceTags.tagId))
    .where(inArray(myPlaceTags.myPlaceId, placeIds))
    .orderBy(asc(tags.name));
  for (const r of rows) {
    const list = map.get(r.placeId) ?? [];
    list.push({ uid: r.uid, name: r.name, color: r.color });
    map.set(r.placeId, list);
  }
  return map;
}

export function masterPhotoUrl(p: {
  uid: string;
  storageType: string;
  externalUrl: string | null;
}) {
  return p.storageType === "EXTERNAL" && p.externalUrl
    ? p.externalUrl
    : `/api/files/master/${p.uid}`;
}

export function visitPhotoUrl(p: {
  uid: string;
  storageType: string;
  externalUrl: string | null;
}) {
  return p.storageType === "EXTERNAL" && p.externalUrl
    ? p.externalUrl
    : `/api/files/visit/${p.uid}`;
}

export function myPlacePhotoUrl(p: {
  uid: string;
  storageType: string;
  externalUrl: string | null;
}) {
  return p.storageType === "EXTERNAL" && p.externalUrl
    ? p.externalUrl
    : `/api/files/myplace/${p.uid}`;
}

/** Foto pantauan MY PLACE (utama dulu) untuk banyak tempat; id → daftar foto. */
export async function myPlacePhotosFor(placeIds: number[]) {
  const map = new Map<
    number,
    { uid: string; url: string; caption: string | null; isPrimary: boolean }[]
  >();
  if (!placeIds.length) return map;
  const rows = await db
    .select()
    .from(myPlacePhotos)
    .where(inArray(myPlacePhotos.myPlaceId, placeIds))
    .orderBy(desc(myPlacePhotos.isPrimary), asc(myPlacePhotos.sortOrder), asc(myPlacePhotos.id));
  for (const r of rows) {
    const list = map.get(r.myPlaceId) ?? [];
    list.push({ uid: r.uid, url: myPlacePhotoUrl(r), caption: r.caption, isPrimary: r.isPrimary });
    map.set(r.myPlaceId, list);
  }
  return map;
}

/** Foto utama (atau pertama) per MASTER. */
export async function primaryMasterPhotos(masterIds: number[]) {
  const map = new Map<number, string>();
  if (!masterIds.length) return map;
  const rows = await db
    .select()
    .from(masterPlacePhotos)
    .where(inArray(masterPlacePhotos.masterPlaceId, masterIds))
    .orderBy(
      sql`${masterPlacePhotos.isPrimary} desc`,
      asc(masterPlacePhotos.sortOrder),
      asc(masterPlacePhotos.id),
    );
  for (const r of rows) {
    if (!map.has(r.masterPlaceId)) map.set(r.masterPlaceId, masterPhotoUrl(r));
  }
  return map;
}

/** 24.2 — MASTER aktif. */
export const activeMasterCond = and(
  eq(masterPlaces.isActive, true),
  isNull(masterPlaces.deletedAt),
);
