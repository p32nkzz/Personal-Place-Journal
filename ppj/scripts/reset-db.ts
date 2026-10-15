/**
 * Mengosongkan SELURUH tabel pada database yang dikonfigurasi (DATABASE_URL), lalu migrasi + seed ulang.
 * Hanya untuk development. Jalankan: npm run db:reset -- --yes
 */
import { execSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { createConnection } from "mysql2/promise";

import { env } from "~/env";

if (env.NODE_ENV === "production") throw new Error("db:reset tidak boleh dijalankan di production.");
if (!process.argv.includes("--yes")) {
  console.error("Perintah ini MENGHAPUS semua data. Tambahkan --yes untuk melanjutkan.");
  process.exit(1);
}

const conn = await createConnection({ uri: env.DATABASE_URL });
const [rows] = await conn.query("SELECT table_name AS n FROM information_schema.tables WHERE table_schema = DATABASE()");
await conn.query("SET FOREIGN_KEY_CHECKS=0");
for (const r of rows as { n: string }[]) await conn.query(`DROP TABLE IF EXISTS \`${r.n}\``);
await conn.query("SET FOREIGN_KEY_CHECKS=1");
await conn.end();
console.log(`${(rows as unknown[]).length} tabel dihapus.`);

for (const dir of [env.UPLOAD_DIR, env.BACKUP_DIR]) {
  await rm(path.resolve(process.cwd(), dir), { recursive: true, force: true });
}

execSync("npm run db:migrate", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
process.exit(0);
