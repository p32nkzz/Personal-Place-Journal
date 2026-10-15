import { eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { masterPlacePhotos, myPlacePhotos, visitPhotos } from "~/server/db/schema";
import { fail } from "./errors";
import { newUid } from "./ids";
import { getPhotoRules } from "./settings";

/** Batas jumlah foto per VISIT sesuai aturan aktif (P-14: foto existing tidak dihapus). */
export async function assertVisitPhotoCapacity(visitId: number) {
  const rules = await getPhotoRules();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(visitPhotos)
    .where(eq(visitPhotos.visitId, visitId));
  if (Number(row?.n ?? 0) >= rules.maxPerVisit) fail("PHOTO_LIMIT_REACHED");
}

export async function insertVisitPhoto(p: {
  visitId: number;
  storageType: "UPLOAD" | "EXTERNAL" | "S3";
  filePath?: string | null;
  externalUrl?: string | null;
  fileName?: string | null;
  caption?: string | null;
}) {
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(visitPhotos)
    .where(eq(visitPhotos.visitId, p.visitId));
  const n = Number(count?.n ?? 0);
  await db.insert(visitPhotos).values({
    uid: newUid(),
    visitId: p.visitId,
    filePath: p.filePath ?? null,
    externalUrl: p.externalUrl ?? null,
    fileName: p.fileName ?? null,
    caption: p.caption ?? null,
    storageType: p.storageType,
    isPrimary: n === 0,
    sortOrder: n,
  });
}

export async function assertMasterPhotoCapacity(masterId: number) {
  const rules = await getPhotoRules();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(masterPlacePhotos)
    .where(eq(masterPlacePhotos.masterPlaceId, masterId));
  if (Number(row?.n ?? 0) >= rules.maxPerMasterPlace)
    fail("PHOTO_LIMIT_REACHED");
}

export async function insertMasterPhoto(p: {
  masterId: number;
  adminId: number;
  storageType: "UPLOAD" | "EXTERNAL" | "S3";
  filePath?: string | null;
  externalUrl?: string | null;
  fileName?: string | null;
  caption?: string | null;
  originType: "ADMIN" | "VISIT" | "MY_PLACE";
  sourceVisitPhotoId?: number | null;
  sourceMyPlacePhotoId?: number | null;
}) {
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(masterPlacePhotos)
    .where(eq(masterPlacePhotos.masterPlaceId, p.masterId));
  const n = Number(count?.n ?? 0);
  await db.insert(masterPlacePhotos).values({
    uid: newUid(),
    masterPlaceId: p.masterId,
    sourceVisitPhotoId: p.sourceVisitPhotoId ?? null,
    sourceMyPlacePhotoId: p.sourceMyPlacePhotoId ?? null,
    filePath: p.filePath ?? null,
    externalUrl: p.externalUrl ?? null,
    fileName: p.fileName ?? null,
    caption: p.caption ?? null,
    storageType: p.storageType,
    originType: p.originType,
    isPrimary: n === 0,
    sortOrder: n,
    createdBy: p.adminId,
  });
}

/** Batas jumlah foto tinjauan per MY PLACE (photo.max_per_my_place). */
export async function assertMyPlacePhotoCapacity(myPlaceId: number) {
  const rules = await getPhotoRules();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(myPlacePhotos)
    .where(eq(myPlacePhotos.myPlaceId, myPlaceId));
  if (Number(row?.n ?? 0) >= rules.maxPerMyPlace) fail("PHOTO_LIMIT_REACHED");
}

export async function insertMyPlacePhoto(p: {
  myPlaceId: number;
  storageType: "UPLOAD" | "EXTERNAL" | "S3";
  filePath?: string | null;
  externalUrl?: string | null;
  fileName?: string | null;
  caption?: string | null;
}) {
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(myPlacePhotos)
    .where(eq(myPlacePhotos.myPlaceId, p.myPlaceId));
  const n = Number(count?.n ?? 0);
  await db.insert(myPlacePhotos).values({
    uid: newUid(),
    myPlaceId: p.myPlaceId,
    filePath: p.filePath ?? null,
    externalUrl: p.externalUrl ?? null,
    fileName: p.fileName ?? null,
    caption: p.caption ?? null,
    storageType: p.storageType,
    isPrimary: n === 0,
    sortOrder: n,
  });
}
