import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "~/server/auth/session";
import { db } from "~/server/db";
import { backupLogs } from "~/server/db/schema";
import { backupRoot } from "~/server/lib/files";

export const runtime = "nodejs";

/** Unduh file backup berstatus SUCCESS — hanya Admin (mode Admin). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const user = await getCurrentUser();
  if (
    !user ||
    user.mustChangePassword ||
    user.role !== "ADMIN" ||
    user.mode !== "ADMIN"
  )
    return new NextResponse("Forbidden", { status: 403 });
  const { uid } = await params;
  const [b] = await db.select().from(backupLogs).where(eq(backupLogs.uid, uid));
  if (!b || b.status !== "SUCCESS" || !b.fileReference)
    return new NextResponse("Not found", { status: 404 });
  const abs = path.resolve(backupRoot(), path.basename(b.fileReference));
  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${path.basename(b.fileReference)}"`,
    },
  });
}
