import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "~/server/auth/session";
import { db } from "~/server/db";
import {
  masterPlacePhotos,
  masterPlaces,
  myPlaces,
  users,
  visitPhotos,
  visits,
} from "~/server/db/schema";
import { MIME, readUpload } from "~/server/lib/files";

export const runtime = "nodejs";

function respond(data: Buffer, filePath: string, isPublic: boolean) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "jpg";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": isPublic
        ? "public, max-age=3600"
        : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Menyajikan foto. MASTER PHOTO: publik bila MASTER ACTIVE (Guest), selain itu Admin/Explorer
 * yang berhak. VISIT PHOTO: pemilik atau Admin (mode Admin, read-only untuk kurasi).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; uid: string }> },
) {
  const { kind, uid } = await params;
  const user = await getCurrentUser();

  if (kind === "master") {
    const [r] = await db
      .select({ ph: masterPlacePhotos, m: masterPlaces })
      .from(masterPlacePhotos)
      .innerJoin(masterPlaces, eq(masterPlaces.id, masterPlacePhotos.masterPlaceId))
      .where(eq(masterPlacePhotos.uid, uid));
    if (!r?.ph.filePath) return new NextResponse("Not found", { status: 404 });
    const isActive = r.m.isActive && !r.m.deletedAt;
    const isAdmin = user?.role === "ADMIN" && user.mode === "ADMIN";
    let allowed = isActive || isAdmin;
    if (!allowed && user && !user.mustChangePassword && !r.m.deletedAt) {
      const [ref] = await db
        .select({ id: myPlaces.id })
        .from(myPlaces)
        .where(and(eq(myPlaces.masterPlaceId, r.m.id), eq(myPlaces.userId, user.id)))
        .limit(1);
      allowed = !!ref;
    }
    if (!allowed) return new NextResponse("Not found", { status: 404 });
    try {
      return respond(await readUpload(r.ph.filePath), r.ph.filePath, isActive);
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  if (kind === "visit") {
    if (!user || user.mustChangePassword)
      return new NextResponse("Forbidden", { status: 403 });
    const [r] = await db
      .select({ ph: visitPhotos, p: myPlaces, ownerDeleted: users.deletedAt })
      .from(visitPhotos)
      .innerJoin(visits, eq(visits.id, visitPhotos.visitId))
      .innerJoin(myPlaces, eq(myPlaces.id, visits.myPlaceId))
      .innerJoin(users, eq(users.id, myPlaces.userId))
      .where(eq(visitPhotos.uid, uid));
    if (!r?.ph.filePath) return new NextResponse("Not found", { status: 404 });
    const isOwner = r.p.userId === user.id && user.mode === "EXPLORER";
    const isAdmin = user.role === "ADMIN" && user.mode === "ADMIN" && !r.ownerDeleted;
    if (!isOwner && !isAdmin) return new NextResponse("Not found", { status: 404 });
    try {
      return respond(await readUpload(r.ph.filePath), r.ph.filePath, false);
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
