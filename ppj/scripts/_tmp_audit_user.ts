import { eq, inArray } from "drizzle-orm";
import { db } from "~/server/db";
import { appSettings, myPlaces, users } from "~/server/db/schema";
import { newUid } from "~/server/lib/ids";
import { hashPassword } from "~/server/lib/password";
const mode = process.argv[2];
const names = ["zzaudit"];
if (mode === "create") {
  const hash = await hashPassword(process.env.AUDIT_PW!);
  await db.insert(users).values({ uid: newUid(), name: "ZZ Audit", username: "zzaudit", email: "zzaudit@example.invalid", passwordHash: hash, role: "EXPLORER" });
} else if (mode === "delete") {
  const us = await db.select().from(users).where(inArray(users.username, names));
  for (const u of us) {
    await db.delete(myPlaces).where(eq(myPlaces.userId, u.id));
    await db.update(appSettings).set({ updatedBy: null }).where(eq(appSettings.updatedBy, u.id));
    await db.delete(users).where(eq(users.id, u.id));
  }
  console.log("deleted:", (await db.select().from(users).where(inArray(users.username, names))).length === 0);
}
process.exit(0);
