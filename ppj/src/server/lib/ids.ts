import { v7 as uuidv7 } from "uuid";

/** UID publik (UUID v7) — dibuat backend, immutable (ERD 6.2). */
export const newUid = () => uuidv7();
