import { eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { masterPlacePhotos, visitPhotos } from "~/server/db/schema";
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
  originType: "ADMIN" | "VISIT";
  sourceVisitPhotoId?: number | null;
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
