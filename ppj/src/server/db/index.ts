import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const conn =
  globalForDb.conn ??
  createPool({
    uri: env.DATABASE_URL,
    timezone: "Z",
    decimalNumbers: true,
  });
// Mode strict: tanpa NO_AUTO_VALUE_ON_ZERO agar `DEFAULT` pada id memakai auto increment.
conn.on("connection", (c) => {
  void c.query(
    "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'",
  );
});

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema, mode: "default" });
