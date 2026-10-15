import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { getCurrentUser } from "~/server/auth/session";
import { db } from "~/server/db";
import { myPlaces } from "~/server/db/schema";
import { processImage, removeUpload, saveUpload } from "~/server/lib/files";
import { assertMyPlacePhotoCapacity, insertMyPlacePhoto } from "~/server/lib/photos";
import { getPhotoRules } from "~/server/lib/settings";

export const runtime = "nodejs";

/** Upload foto tinjauan MY PLACE (multipart): aturan app_settings + hapus EXIF/GPS. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword || user.mode !== "EXPLORER")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const placeUid = String(form.get("placeUid") ?? "");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 2000);
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!placeUid || !files.length)
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const [place] = await db
    .select()
    .from(myPlaces)
    .where(and(eq(myPlaces.uid, placeUid), eq(myPlaces.userId, user.id)));
  if (!place) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const rules = await getPhotoRules();
  let saved = 0;
  try {
    for (const file of files) {
      await assertMyPlacePhotoCapacity(place.id);
      const { data, ext } = await processImage(Buffer.from(await file.arrayBuffer()), rules);
      const rel = await saveUpload("my", data, ext);
      try {
        await insertMyPlacePhoto({
          myPlaceId: place.id,
          storageType: "UPLOAD",
          filePath: rel,
          fileName: file.name.slice(0, 255),
          caption: caption || null,
        });
      } catch (e) {
        await removeUpload(rel);
        throw e;
      }
      saved++;
    }
  } catch (e) {
    const message = e instanceof TRPCError ? e.message : "UPLOAD_FAILED";
    return NextResponse.json({ error: message, saved }, { status: 400 });
  }
  return NextResponse.json({ ok: true, saved });
}
