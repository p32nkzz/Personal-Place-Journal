import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  appSettings,
  categories,
  refMasterHistoryActions,
  refMasterRelationStatuses,
  refTagColors,
  refUserRoles,
  users,
} from "~/server/db/schema";
import { newUid } from "~/server/lib/ids";

async function upsertRef(
  table:
    | typeof refUserRoles
    | typeof refMasterRelationStatuses
    | typeof refMasterHistoryActions,
  rows: { code: string; name: string }[],
) {
  for (const [i, r] of rows.entries()) {
    const [exists] = await db.select().from(table).where(eq(table.code, r.code));
    if (!exists) await db.insert(table).values({ ...r, sortOrder: i + 1 });
  }
}

await upsertRef(refUserRoles, [
  { code: "ADMIN", name: "Admin" },
  { code: "EXPLORER", name: "Explorer" },
]);
await upsertRef(refMasterRelationStatuses, [
  { code: "UNREFERRED", name: "Unreferred" },
  { code: "REVIEW", name: "Review" },
  { code: "REJECTED", name: "Rejected" },
  { code: "REFERRED", name: "Referred" },
]);
await upsertRef(refMasterHistoryActions, [
  { code: "SUBMITTED", name: "Submitted" },
  { code: "REJECTED", name: "Rejected" },
  { code: "REFERRED", name: "Referred" },
  { code: "RE-REFER", name: "Re-refer" },
  { code: "UNREFERRED", name: "Unreferred" },
]);

const colors: [string, string][] = [
  ["#EF4444", "Red"],
  ["#F97316", "Orange"],
  ["#F59E0B", "Amber"],
  ["#22C55E", "Green"],
  ["#10B981", "Emerald"],
  ["#06B6D4", "Cyan"],
  ["#3B82F6", "Blue"],
  ["#8B5CF6", "Violet"],
  ["#EC4899", "Pink"],
  ["#64748B", "Slate"],
];
for (const [i, [hexCode, name]] of colors.entries()) {
  const [exists] = await db
    .select()
    .from(refTagColors)
    .where(eq(refTagColors.hexCode, hexCode));
  if (!exists)
    await db.insert(refTagColors).values({ hexCode, name, sortOrder: i + 1 });
}

const cats: [string, string][] = [
  ["tempat-makan", "Tempat Makan"],
  ["wisata", "Wisata"],
  ["cafe", "Cafe"],
  ["fasilitas-umum", "Fasilitas Umum"],
  ["playground", "Playground"],
];
for (const [i, [slug, name]] of cats.entries()) {
  const [exists] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug));
  if (!exists)
    await db
      .insert(categories)
      .values({ uid: newUid(), slug, name, sortOrder: i + 1 });
}

const settings: [string, string, string][] = [
  ["photo.allowed_types", "jpg,png,webp", "Tipe file foto yang diizinkan"],
  ["photo.max_size_mb", "5", "Ukuran maksimum per file (MB)"],
  ["photo.max_per_visit", "10", "Jumlah maksimum foto per VISIT"],
  ["photo.max_per_master_place", "20", "Jumlah maksimum foto per MASTER PLACE"],
  ["photo.max_per_my_place", "10", "Jumlah maksimum foto tinjauan per MY PLACE"],
  ["avatar.allowed_types", "jpg,png,webp", "Tipe file avatar profil yang diizinkan"],
  ["avatar.max_size_mb", "5", "Ukuran maksimum avatar profil (MB)"],
  ["app.timezone", "Asia/Jakarta", "Zona waktu default aplikasi (IANA)"],
  ["map.recent_page_size", "3", "Jumlah data awal & per muat pada filter tempat (peta)"],
  ["map.color_master", "#111827", "Warna pin MASTER PLACE pada peta"],
  ["map.color_mine", "#CA8A04", "Warna pin Tempat Saya (bukan favorit)"],
  ["map.color_favorite", "#FACC15", "Warna pin Tempat Saya favorit"],
  ["map.color_new_pin", "#DC2626", "Warna pin tempat baru"],
];
for (const [key, value, description] of settings) {
  const [exists] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key));
  if (!exists)
    await db
      .insert(appSettings)
      .values({ uid: newUid(), key, value, description });
}

const [admin] = await db
  .select()
  .from(users)
  .where(eq(users.username, env.SEED_ADMIN_USERNAME.toLowerCase()));
if (!admin) {
  await db.insert(users).values({
    uid: newUid(),
    name: env.SEED_ADMIN_NAME,
    username: env.SEED_ADMIN_USERNAME.toLowerCase(),
    email: env.SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10),
    role: "ADMIN",
    mustChangePassword: true,
  });
  console.log(`Admin awal dibuat: ${env.SEED_ADMIN_USERNAME}`);
}

console.log("Seed selesai.");
process.exit(0);
