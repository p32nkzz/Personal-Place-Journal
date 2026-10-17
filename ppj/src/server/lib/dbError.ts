/** Kode error jaringan/driver/MySQL yang berarti database tidak dapat dijangkau atau tidak dapat dipakai. */
const DB_UNREACHABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
  "ER_ACCESS_DENIED_ERROR",
  "ER_DBACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_CON_COUNT_ERROR",
  "ER_SERVER_SHUTDOWN",
  "POOL_CLOSED",
]);

/** Menelusuri error, cause, dan AggregateError.errors untuk mengenali kegagalan koneksi database. */
export function isDbConnectionError(e: unknown, depth = 0): boolean {
  if (!e || typeof e !== "object" || depth > 5) return false;
  const err = e as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
  if (typeof err.code === "string" && DB_UNREACHABLE_CODES.has(err.code)) return true;
  if (
    typeof err.message === "string" &&
    /ECONNREFUSED|ETIMEDOUT|Connection lost|connect EHOSTUNREACH|getaddrinfo (ENOTFOUND|EAI_AGAIN)|Pool is closed/i.test(err.message)
  )
    return true;
  if (Array.isArray(err.errors) && err.errors.some((x) => isDbConnectionError(x, depth + 1))) return true;
  return isDbConnectionError(err.cause, depth + 1);
}
