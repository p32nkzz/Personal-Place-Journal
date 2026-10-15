import { and, eq, inArray } from "drizzle-orm";

import { type db } from "~/server/db";
import {
  categories,
  masterPlaceCategories,
  masterPlaces,
  myPlaceCategories,
  myPlaceMasterHistories,
  myPlaces,
  type SnapshotData,
} from "~/server/db/schema";
import { fail } from "./errors";
import { newUid } from "./ids";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MasterDraft = {
  googlePlaceId?: string | null;
  name: string;
  address: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  categoryUids: string[];
};

/** Resolusi CATEGORY: yang baru ditambahkan harus aktif; yang sudah terhubung boleh tetap. */
async function resolveCategoryIds(
  tx: Tx,
  uids: string[],
  existingIds: number[],
) {
  if (!uids.length) return [];
  const rows = await tx
    .select()
    .from(categories)
    .where(inArray(categories.uid, uids));
  if (rows.length !== new Set(uids).size) fail("CATEGORY_NOT_FOUND");
  for (const c of rows) {
    if (!c.isActive && !existingIds.includes(c.id)) fail("CATEGORY_INACTIVE");
  }
  return rows.map((c) => c.id);
}

export async function setMasterCategories(
  tx: Tx,
  masterId: number,
  uids: string[],
) {
  const current = await tx
    .select({ categoryId: masterPlaceCategories.categoryId })
    .from(masterPlaceCategories)
    .where(eq(masterPlaceCategories.masterPlaceId, masterId));
  const currentIds = current.map((c) => c.categoryId);
  const next = await resolveCategoryIds(tx, uids, currentIds);
  const toRemove = currentIds.filter((c) => !next.includes(c));
  const toAdd = next.filter((c) => !currentIds.includes(c));
  if (toRemove.length)
    await tx
      .delete(masterPlaceCategories)
      .where(
        and(
          eq(masterPlaceCategories.masterPlaceId, masterId),
          inArray(masterPlaceCategories.categoryId, toRemove),
        ),
      );
  if (toAdd.length)
    await tx
      .insert(masterPlaceCategories)
      .values(toAdd.map((categoryId) => ({ masterPlaceId: masterId, categoryId })));
}

export async function setPlaceCategories(
  tx: Tx,
  placeId: number,
  uids: string[],
) {
  const current = await tx
    .select({ categoryId: myPlaceCategories.categoryId })
    .from(myPlaceCategories)
    .where(eq(myPlaceCategories.myPlaceId, placeId));
  const currentIds = current.map((c) => c.categoryId);
  const next = await resolveCategoryIds(tx, uids, currentIds);
  const toRemove = currentIds.filter((c) => !next.includes(c));
  const toAdd = next.filter((c) => !currentIds.includes(c));
  if (toRemove.length)
    await tx
      .delete(myPlaceCategories)
      .where(
        and(
          eq(myPlaceCategories.myPlaceId, placeId),
          inArray(myPlaceCategories.categoryId, toRemove),
        ),
      );
  if (toAdd.length)
    await tx
      .insert(myPlaceCategories)
      .values(toAdd.map((categoryId) => ({ myPlaceId: placeId, categoryId })));
}

export async function insertMaster(tx: Tx, d: MasterDraft, adminId: number) {
  const [r] = await tx.insert(masterPlaces).values({
    uid: newUid(),
    googlePlaceId: d.googlePlaceId ?? null,
    name: d.name,
    address: d.address,
    description: d.description ?? null,
    latitude: d.latitude,
    longitude: d.longitude,
    createdBy: adminId,
  });
  const masterId = r.insertId;
  await setMasterCategories(tx, masterId, d.categoryUids);
  return masterId;
}

export type HistoryInput = {
  myPlaceId: number;
  action: "SUBMITTED" | "REJECTED" | "REFERRED" | "RE-REFER" | "UNREFERRED";
  from?: number | null;
  to?: number | null;
  snapshot?: SnapshotData | null;
  reason?: string | null;
  note?: string | null;
  performedBy: number;
};

/** History append-only (ERD 12.10). */
export async function addHistory(tx: Tx, h: HistoryInput) {
  await tx.insert(myPlaceMasterHistories).values({
    uid: newUid(),
    myPlaceId: h.myPlaceId,
    fromMasterPlaceId: h.from ?? null,
    toMasterPlaceId: h.to ?? null,
    action: h.action,
    snapshotData: h.snapshot ?? null,
    reason: h.reason ?? null,
    note: h.note ?? null,
    performedBy: h.performedBy,
  });
}

/** Menyusun snapshot pengajuan dari data MY PLACE saat ini (ERD 12.10). */
export async function buildSnapshot(
  tx: Tx,
  place: typeof myPlaces.$inferSelect,
): Promise<SnapshotData> {
  const cats = await tx
    .select({ slug: categories.slug })
    .from(myPlaceCategories)
    .innerJoin(categories, eq(categories.id, myPlaceCategories.categoryId))
    .where(eq(myPlaceCategories.myPlaceId, place.id));
  return {
    schema_version: 1,
    name: place.name,
    address: place.address,
    description: place.description,
    latitude: place.latitude,
    longitude: place.longitude,
    google_place_id: place.googlePlaceId,
    category_codes: cats.map((c) => c.slug),
  };
}

/**
 * TX-07 inti: set referensi MASTER pada MY PLACE + history.
 * Status REFERRED → action `RE-REFER`, selain itu `REFERRED`.
 */
export async function referPlace(
  tx: Tx,
  place: typeof myPlaces.$inferSelect,
  masterId: number,
  performedBy: number,
  opts: { reason?: string | null; note?: string | null } = {},
) {
  const wasReferred = place.masterRelationStatus === "REFERRED";
  if (wasReferred && place.masterPlaceId === masterId) fail("SAME_MASTER");
  const [r] = await tx
    .update(myPlaces)
    .set({ masterPlaceId: masterId, masterRelationStatus: "REFERRED" })
    .where(
      and(
        eq(myPlaces.id, place.id),
        eq(myPlaces.masterRelationStatus, place.masterRelationStatus),
      ),
    );
  if (!r.affectedRows) fail("CONFLICT", "CONFLICT");
  await addHistory(tx, {
    myPlaceId: place.id,
    action: wasReferred ? "RE-REFER" : "REFERRED",
    from: wasReferred ? place.masterPlaceId : null,
    to: masterId,
    reason: opts.reason,
    note: opts.note,
    performedBy,
  });
}
