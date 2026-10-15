import { migrate } from "drizzle-orm/mysql2/migrator";

import { db } from "~/server/db";

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrasi selesai.");
process.exit(0);
