import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";
import { and, eq, lt } from "drizzle-orm";
import { escape, escapeId, type RowDataPacket } from "mysql2";
import { type Pool } from "mysql2/promise";

import { db } from "~/server/db";
import { backupLogs } from "~/server/db/schema";
import { backupRoot, uploadRoot } from "./files";
import { fail, isDuplicateError } from "./errors";
import { newUid } from "./ids";

type PoolLike = Pool;

/** Dump database sebagai SQL (struktur + data) tanpa tool eksternal. */
async function dumpDatabase(pool: PoolLike): Promise<string> {
  const [tables] = await pool.query<RowDataPacket[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const names = tables.map((r) => String(Object.values(r)[0]));
  const out: string[] = [
    "-- Personal Place Journal database backup",
    `-- Generated at ${new Date().toISOString()}`,
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ];
  for (const name of names) {
    const [create] = await pool.query<RowDataPacket[]>(`SHOW CREATE TABLE ${escapeId(name)}`);
    out.push(`DROP TABLE IF EXISTS ${escapeId(name)};`);
    out.push(`${String(create[0]?.["Create Table"])};`, "");
    const [cols] = await pool.query<RowDataPacket[]>(
      "SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND (GENERATION_EXPRESSION IS NULL OR GENERATION_EXPRESSION = '') ORDER BY ORDINAL_POSITION",
      [name],
    );
    const colNames = cols.map((c) => String(c.n));
    if (!colNames.length) continue;
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${colNames.map((c) => escapeId(c)).join(",")} FROM ${escapeId(name)}`);
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const values = chunk
        .map((r) => `(${colNames.map((c) => escape(r[c] as string)).join(",")})`)
        .join(",\n");
      out.push(`INSERT INTO ${escapeId(name)} (${colNames.map((c) => escapeId(c)).join(",")}) VALUES\n${values};`);
    }
    out.push("");
  }
  out.push("SET FOREIGN_KEY_CHECKS=1;");
  return out.join("\n");
}

/** TX-14 — backup manual: satu proses RUNNING pada satu waktu (CR-BKP-03). */
export async function runManualBackup(adminId: number) {
  const uid = newUid();
  let logId: number;
  // Proses RUNNING yang tertinggal (mis. server mati) > 1 jam dianggap gagal agar tidak memblokir selamanya.
  await db
    .update(backupLogs)
    .set({
      status: "FAILED",
      finishedAt: new Date(),
      errorMessage: "Proses backup terhenti (timeout)",
    })
    .where(
      and(
        eq(backupLogs.status, "RUNNING"),
        lt(backupLogs.startedAt, new Date(Date.now() - 3600 * 1000)),
      ),
    );
  try {
    const [r] = await db.insert(backupLogs).values({
      uid,
      triggeredBy: adminId,
      triggerType: "MANUAL",
      status: "RUNNING",
    });
    logId = r.insertId;
  } catch (e) {
    if (isDuplicateError(e)) fail("BACKUP_RUNNING", "CONFLICT");
    throw e;
  }

  try {
    await mkdir(backupRoot(), { recursive: true });
    await mkdir(uploadRoot(), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `ppj-backup-${stamp}-${uid.slice(0, 8)}.zip`;
    const abs = path.join(backupRoot(), fileName);
    const pool = (db as unknown as { $client: PoolLike }).$client;
    const sqlText = await dumpDatabase(pool);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(abs);
      const zip = new ZipArchive({ zlib: { level: 6 } });
      output.on("close", () => resolve());
      output.on("error", reject);
      zip.on("error", reject);
      zip.pipe(output);
      zip.append(sqlText, { name: "database.sql" });
      zip.directory(uploadRoot(), "uploads", (entry) => entry);
      void zip.finalize();
    });

    const size = (await stat(abs)).size;
    await db
      .update(backupLogs)
      .set({
        status: "SUCCESS",
        finishedAt: new Date(),
        fileReference: fileName,
        fileSizeBytes: size,
      })
      .where(eq(backupLogs.id, logId));
  } catch (e) {
    await db
      .update(backupLogs)
      .set({
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: e instanceof Error ? e.message.slice(0, 1000) : String(e),
      })
      .where(eq(backupLogs.id, logId));
  }
  return { uid };
}
