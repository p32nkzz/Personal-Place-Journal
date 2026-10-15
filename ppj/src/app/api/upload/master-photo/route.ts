import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { getCurrentUser } from "~/server/auth/session";
import { db } from "~/server/db";
import { masterPlaces } from "~/server/db/schema";
import { processImage, removeUpload, saveUpload } from "~/server/lib/files";
import {
  assertMasterPhotoCapacity,
  insertMasterPhoto,
} from "~/server/lib/photos";
import { getPhotoRules } from "~/server/lib/settings";

export const runtime = "nodejs";

/** Upload langsung foto MASTER PLACE oleh Admin (mode Admin). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (
    !user ||
    user.mustChangePassword ||
    user.role !== "ADMIN" ||
    user.mode !== "ADMIN"
  )
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const masterUid = String(form.get("masterUid") ?? "");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 2000);
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!masterUid || !files.length)
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const [m] = await db
    .select()
    .from(masterPlaces)
    .where(eq(masterPlaces.uid, masterUid));
  if (!m || m.deletedAt)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const rules = await getPhotoRules();
  let saved = 0;
  try {
    for (const file of files) {
      await assertMasterPhotoCapacity(m.id);
      const { data, ext } = await processImage(
        Buffer.from(await file.arrayBuffer()),
        rules,
      );
      const rel = await saveUpload("master", data, ext);
      try {
        await insertMasterPhoto({
          masterId: m.id,
          adminId: user.id,
          storageType: "UPLOAD",
          filePath: rel,
          fileName: file.name.slice(0, 255),
          caption: caption || null,
          originType: "ADMIN",
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
