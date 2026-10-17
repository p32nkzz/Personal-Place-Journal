import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "~/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cek ketersediaan database: 200 bila terhubung, 503 bila tidak. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
}
