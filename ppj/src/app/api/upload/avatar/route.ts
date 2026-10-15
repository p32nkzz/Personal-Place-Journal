import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { getCurrentUser } from "~/server/auth/session";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { processImage, removeUpload, saveUpload } from "~/server/lib/files";
import { getAvatarRules } from "~/server/lib/settings";

export const runtime = "nodejs";

/** Upload/ganti avatar profil sendiri (TX-19); file lama dihapus setelah yang baru tersimpan. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  try {
    const { data, ext } = await processImage(
      Buffer.from(await file.arrayBuffer()),
      await getAvatarRules(),
    );
    const rel = await saveUpload("avatar", data, ext);
    const [old] = await db.select().from(users).where(eq(users.id, user.id));
    try {
      await db
        .update(users)
        .set({ avatarFilePath: rel, avatarStorageType: "UPLOAD", updatedAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (e) {
      await removeUpload(rel);
      throw e;
    }
    await removeUpload(old?.avatarFilePath ?? null);
  } catch (e) {
    const message = e instanceof TRPCError ? e.message : "UPLOAD_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
