/**
 * Skema database Personal Place Journal — mengikuti ERD-PPJ-001 v1.2.0.
 *
 * Catatan engine (MySQL 5.7): CHECK, partial unique, dan functional index tidak ditegakkan oleh
 * engine; aturan tersebut ditegakkan di service layer (lihat src/server/services).
 * Seluruh kolom *_at disimpan UTC (koneksi memakai timezone "Z").
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  time,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () => bigint("id", { mode: "number" }).primaryKey().autoincrement();
const uid = () => varchar("uid", { length: 36 }).notNull();
const createdAt = () =>
  datetime("created_at", { fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  datetime("updated_at", { fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());
const ts = (name: string) => datetime(name, { fsp: 3 });
const fk = (name: string) => bigint(name, { mode: "number" });
const coord = (name: string) =>
  decimal(name, { precision: 10, scale: 7, mode: "number" });

/* ------------------------------------------------------------------ */
/* Reference tables (tanpa FK, tanpa UID)                              */
/* ------------------------------------------------------------------ */

const refColumns = () => ({
  id: id(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const refUserRoles = mysqlTable(
  "ref_user_roles",
  refColumns(),
  (t) => [
    uniqueIndex("uq_ref_user_roles__code").on(t.code),
    index("ix_ref_user_roles__sort_order").on(t.sortOrder),
    index("ix_ref_user_roles__is_active").on(t.isActive),
  ],
);

export const refMasterRelationStatuses = mysqlTable(
  "ref_master_relation_statuses",
  refColumns(),
  (t) => [
    uniqueIndex("uq_ref_master_relation_statuses__code").on(t.code),
    index("ix_ref_master_relation_statuses__sort_order").on(t.sortOrder),
  ],
);

export const refMasterHistoryActions = mysqlTable(
  "ref_master_history_actions",
  refColumns(),
  (t) => [
    uniqueIndex("uq_ref_master_history_actions__code").on(t.code),
    index("ix_ref_master_history_actions__sort_order").on(t.sortOrder),
  ],
);

export const refTagColors = mysqlTable(
  "ref_tag_colors",
  {
    id: id(),
    hexCode: varchar("hex_code", { length: 7 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_ref_tag_colors__hex_code").on(t.hexCode),
    index("ix_ref_tag_colors__sort_order").on(t.sortOrder),
    index("ix_ref_tag_colors__is_active").on(t.isActive),
  ],
);

/* ------------------------------------------------------------------ */
/* users                                                               */
/* ------------------------------------------------------------------ */

export const users = mysqlTable(
  "users",
  {
    id: id(),
    uid: uid(),
    name: varchar("name", { length: 255 }).notNull(),
    username: varchar("username", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("EXPLORER"),
    preferredLanguage: mysqlEnum("preferred_language", ["ID", "EN"])
      .notNull()
      .default("ID"),
    mustChangePassword: boolean("must_change_password")
      .notNull()
      .default(false),
    deletedBy: fk("deleted_by"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_users__uid").on(t.uid),
    uniqueIndex("uq_users__email").on(t.email),
    uniqueIndex("uq_users__username").on(t.username),
    index("ix_users__role").on(t.role),
    index("ix_users__deleted_at").on(t.deletedAt),
    index("ix_users__deleted_by").on(t.deletedBy),
    index("ix_users__is_active").on(t.isActive),
    foreignKey({
      name: "fk_users__deleted_by",
      columns: [t.deletedBy],
      foreignColumns: [t.id],
    }).onDelete("restrict"),
  ],
);

/* ------------------------------------------------------------------ */
/* categories                                                          */
/* ------------------------------------------------------------------ */

export const categories = mysqlTable(
  "categories",
  {
    id: id(),
    uid: uid(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_categories__uid").on(t.uid),
    uniqueIndex("uq_categories__slug").on(t.slug),
    index("ix_categories__is_active_sort_order").on(t.isActive, t.sortOrder),
  ],
);

/* ------------------------------------------------------------------ */
/* master_places                                                       */
/* ------------------------------------------------------------------ */

export const masterPlaces = mysqlTable(
  "master_places",
  {
    id: id(),
    uid: uid(),
    googlePlaceId: varchar("google_place_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    description: text("description"),
    latitude: coord("latitude").notNull(),
    longitude: coord("longitude").notNull(),
    createdBy: fk("created_by").notNull(),
    updatedBy: fk("updated_by"),
    deletedBy: fk("deleted_by"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_master_places__uid").on(t.uid),
    index("ix_master_places__is_active_deleted_at").on(t.isActive, t.deletedAt),
    index("ix_master_places__google_place_id").on(t.googlePlaceId),
    index("ix_master_places__latitude_longitude").on(t.latitude, t.longitude),
    index("ix_master_places__created_by").on(t.createdBy),
    index("ix_master_places__updated_by").on(t.updatedBy),
    index("ix_master_places__deleted_by").on(t.deletedBy),
    foreignKey({
      name: "fk_master_places__created_by",
      columns: [t.createdBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_master_places__updated_by",
      columns: [t.updatedBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_master_places__deleted_by",
      columns: [t.deletedBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

export const masterPlaceCategories = mysqlTable(
  "master_place_categories",
  {
    masterPlaceId: fk("master_place_id").notNull(),
    categoryId: fk("category_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: "pk_master_place_categories",
      columns: [t.masterPlaceId, t.categoryId],
    }),
    index("ix_master_place_categories__category_id").on(t.categoryId),
    foreignKey({
      name: "fk_master_place_categories__master_place_id",
      columns: [t.masterPlaceId],
      foreignColumns: [masterPlaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_master_place_categories__category_id",
      columns: [t.categoryId],
      foreignColumns: [categories.id],
    }).onDelete("restrict"),
  ],
);

/* ------------------------------------------------------------------ */
/* my_places                                                           */
/* ------------------------------------------------------------------ */

export const myPlaces = mysqlTable(
  "my_places",
  {
    id: id(),
    uid: uid(),
    userId: fk("user_id").notNull(),
    masterPlaceId: fk("master_place_id"),
    googlePlaceId: varchar("google_place_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    description: text("description"),
    latitude: coord("latitude").notNull(),
    longitude: coord("longitude").notNull(),
    masterRelationStatus: varchar("master_relation_status", { length: 50 })
      .notNull()
      .default("UNREFERRED"),
    visitStatus: mysqlEnum("visit_status", ["PLAN", "VISITED"])
      .notNull()
      .default("PLAN"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_my_places__uid").on(t.uid),
    index("ix_my_places__user_id_is_active").on(t.userId, t.isActive),
    index("ix_my_places__user_id_master_relation_status").on(
      t.userId,
      t.masterRelationStatus,
    ),
    index("ix_my_places__user_id_visit_status").on(t.userId, t.visitStatus),
    index("ix_my_places__user_id_is_favorite").on(t.userId, t.isFavorite),
    index("ix_my_places__master_relation_status_is_active").on(
      t.masterRelationStatus,
      t.isActive,
    ),
    index("ix_my_places__master_place_id_is_active").on(
      t.masterPlaceId,
      t.isActive,
    ),
    index("ix_my_places__google_place_id").on(t.googlePlaceId),
    index("ix_my_places__latitude_longitude").on(t.latitude, t.longitude),
    foreignKey({
      name: "fk_my_places__user_id",
      columns: [t.userId],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_my_places__master_place_id",
      columns: [t.masterPlaceId],
      foreignColumns: [masterPlaces.id],
    }).onDelete("set null"),
  ],
);

export const myPlaceCategories = mysqlTable(
  "my_place_categories",
  {
    myPlaceId: fk("my_place_id").notNull(),
    categoryId: fk("category_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: "pk_my_place_categories",
      columns: [t.myPlaceId, t.categoryId],
    }),
    index("ix_my_place_categories__category_id").on(t.categoryId),
    foreignKey({
      name: "fk_my_place_categories__my_place_id",
      columns: [t.myPlaceId],
      foreignColumns: [myPlaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_my_place_categories__category_id",
      columns: [t.categoryId],
      foreignColumns: [categories.id],
    }).onDelete("restrict"),
  ],
);

/* ------------------------------------------------------------------ */
/* tags                                                                */
/* ------------------------------------------------------------------ */

export const tags = mysqlTable(
  "tags",
  {
    id: id(),
    uid: uid(),
    userId: fk("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#64748B"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_tags__uid").on(t.uid),
    uniqueIndex("uq_tags__user_id_name").on(t.userId, t.name),
    uniqueIndex("uq_tags__user_id_slug").on(t.userId, t.slug),
    foreignKey({
      name: "fk_tags__user_id",
      columns: [t.userId],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

export const myPlaceTags = mysqlTable(
  "my_place_tags",
  {
    myPlaceId: fk("my_place_id").notNull(),
    tagId: fk("tag_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: "pk_my_place_tags",
      columns: [t.myPlaceId, t.tagId],
    }),
    index("ix_my_place_tags__tag_id").on(t.tagId),
    foreignKey({
      name: "fk_my_place_tags__my_place_id",
      columns: [t.myPlaceId],
      foreignColumns: [myPlaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_my_place_tags__tag_id",
      columns: [t.tagId],
      foreignColumns: [tags.id],
    }).onDelete("cascade"),
  ],
);

/* ------------------------------------------------------------------ */
/* my_place_master_histories (append-only)                             */
/* ------------------------------------------------------------------ */

export type SnapshotData = {
  schema_version: 1;
  name: string;
  address: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  google_place_id: string | null;
  category_codes: string[];
};

export const myPlaceMasterHistories = mysqlTable(
  "my_place_master_histories",
  {
    id: id(),
    uid: uid(),
    myPlaceId: fk("my_place_id").notNull(),
    fromMasterPlaceId: fk("from_master_place_id"),
    toMasterPlaceId: fk("to_master_place_id"),
    action: varchar("action", { length: 50 }).notNull(),
    snapshotData: json("snapshot_data").$type<SnapshotData>(),
    reason: text("reason"),
    note: text("note"),
    performedBy: fk("performed_by").notNull(),
    performedAt: ts("performed_at")
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("uq_my_place_master_histories__uid").on(t.uid),
    index("ix_my_place_master_histories__my_place_id_performed_at").on(
      t.myPlaceId,
      t.performedAt,
    ),
    index("ix_my_place_master_histories__from_master_place_id").on(
      t.fromMasterPlaceId,
    ),
    index("ix_my_place_master_histories__to_master_place_id").on(
      t.toMasterPlaceId,
    ),
    index("ix_my_place_master_histories__performed_by").on(t.performedBy),
    index("ix_my_place_master_histories__action").on(t.action),
    foreignKey({
      name: "fk_my_place_master_histories__my_place_id",
      columns: [t.myPlaceId],
      foreignColumns: [myPlaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_my_place_master_histories__from_master_place_id",
      columns: [t.fromMasterPlaceId],
      foreignColumns: [masterPlaces.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_my_place_master_histories__to_master_place_id",
      columns: [t.toMasterPlaceId],
      foreignColumns: [masterPlaces.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_my_place_master_histories__performed_by",
      columns: [t.performedBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

/* ------------------------------------------------------------------ */
/* itineraries & itinerary_places                                      */
/* ------------------------------------------------------------------ */

export const itineraries = mysqlTable(
  "itineraries",
  {
    id: id(),
    uid: uid(),
    userId: fk("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_itineraries__uid").on(t.uid),
    index("ix_itineraries__user_id").on(t.userId),
    index("ix_itineraries__start_date").on(t.startDate),
    index("ix_itineraries__end_date").on(t.endDate),
    foreignKey({
      name: "fk_itineraries__user_id",
      columns: [t.userId],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

export const itineraryPlaces = mysqlTable(
  "itinerary_places",
  {
    id: id(),
    uid: uid(),
    itineraryId: fk("itinerary_id").notNull(),
    myPlaceId: fk("my_place_id").notNull(),
    plannedDate: date("planned_date", { mode: "string" }),
    plannedTime: time("planned_time"),
    note: text("note"),
    sequence: int("sequence").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_itinerary_places__uid").on(t.uid),
    uniqueIndex("uq_itinerary_places__itinerary_id_sequence").on(
      t.itineraryId,
      t.sequence,
    ),
    index("ix_itinerary_places__my_place_id").on(t.myPlaceId),
    index("ix_itinerary_places__planned_date").on(t.plannedDate),
    foreignKey({
      name: "fk_itinerary_places__itinerary_id",
      columns: [t.itineraryId],
      foreignColumns: [itineraries.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_itinerary_places__my_place_id",
      columns: [t.myPlaceId],
      foreignColumns: [myPlaces.id],
    }).onDelete("cascade"),
  ],
);

/* ------------------------------------------------------------------ */
/* visits & visit_photos                                               */
/* ------------------------------------------------------------------ */

export const visits = mysqlTable(
  "visits",
  {
    id: id(),
    uid: uid(),
    myPlaceId: fk("my_place_id").notNull(),
    itineraryId: fk("itinerary_id"),
    itineraryPlaceId: fk("itinerary_place_id"),
    visitedAt: ts("visited_at").notNull(),
    rating: smallint("rating"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_visits__uid").on(t.uid),
    index("ix_visits__my_place_id_visited_at").on(t.myPlaceId, t.visitedAt),
    index("ix_visits__itinerary_id_visited_at").on(t.itineraryId, t.visitedAt),
    index("ix_visits__itinerary_place_id").on(t.itineraryPlaceId),
    foreignKey({
      name: "fk_visits__my_place_id",
      columns: [t.myPlaceId],
      foreignColumns: [myPlaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_visits__itinerary_id",
      columns: [t.itineraryId],
      foreignColumns: [itineraries.id],
    }).onDelete("set null"),
    foreignKey({
      name: "fk_visits__itinerary_place_id",
      columns: [t.itineraryPlaceId],
      foreignColumns: [itineraryPlaces.id],
    }).onDelete("set null"),
  ],
);

const storageType = () =>
  mysqlEnum("storage_type", ["UPLOAD", "EXTERNAL", "S3"])
    .notNull()
    .default("UPLOAD");

export const visitPhotos = mysqlTable(
  "visit_photos",
  {
    id: id(),
    uid: uid(),
    visitId: fk("visit_id").notNull(),
    filePath: varchar("file_path", { length: 1000 }),
    externalUrl: text("external_url"),
    fileName: varchar("file_name", { length: 255 }),
    caption: text("caption"),
    storageType: storageType(),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_visit_photos__uid").on(t.uid),
    index("ix_visit_photos__visit_id_sort_order").on(t.visitId, t.sortOrder),
    index("ix_visit_photos__storage_type").on(t.storageType),
    foreignKey({
      name: "fk_visit_photos__visit_id",
      columns: [t.visitId],
      foreignColumns: [visits.id],
    }).onDelete("cascade"),
  ],
);

export const masterPlacePhotos = mysqlTable(
  "master_place_photos",
  {
    id: id(),
    uid: uid(),
    masterPlaceId: fk("master_place_id").notNull(),
    sourceVisitPhotoId: fk("source_visit_photo_id"),
    filePath: varchar("file_path", { length: 1000 }),
    externalUrl: text("external_url"),
    fileName: varchar("file_name", { length: 255 }),
    caption: text("caption"),
    storageType: storageType(),
    originType: mysqlEnum("origin_type", ["ADMIN", "VISIT"])
      .notNull()
      .default("ADMIN"),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: int("sort_order").notNull().default(0),
    createdBy: fk("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_master_place_photos__uid").on(t.uid),
    index("ix_master_place_photos__master_place_id_sort_order").on(
      t.masterPlaceId,
      t.sortOrder,
    ),
    index("ix_master_place_photos__source_visit_photo_id").on(
      t.sourceVisitPhotoId,
    ),
    index("ix_master_place_photos__created_by").on(t.createdBy),
    foreignKey({
      name: "fk_master_place_photos__master_place_id",
      columns: [t.masterPlaceId],
      foreignColumns: [masterPlaces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_master_place_photos__source_visit_photo_id",
      columns: [t.sourceVisitPhotoId],
      foreignColumns: [visitPhotos.id],
    }).onDelete("set null"),
    foreignKey({
      name: "fk_master_place_photos__created_by",
      columns: [t.createdBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

/* ------------------------------------------------------------------ */
/* account, config, backup                                             */
/* ------------------------------------------------------------------ */

export const emailChangeRequests = mysqlTable(
  "email_change_requests",
  {
    id: id(),
    userId: fk("user_id").notNull(),
    requestedBy: fk("requested_by").notNull(),
    newEmail: varchar("new_email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: ts("expires_at").notNull(),
    confirmedAt: ts("confirmed_at"),
    cancelledAt: ts("cancelled_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("uq_email_change_requests__token_hash").on(t.tokenHash),
    index("ix_email_change_requests__user_id").on(t.userId),
    index("ix_email_change_requests__requested_by").on(t.requestedBy),
    index("ix_email_change_requests__expires_at").on(t.expiresAt),
    foreignKey({
      name: "fk_email_change_requests__user_id",
      columns: [t.userId],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_email_change_requests__requested_by",
      columns: [t.requestedBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

export const appSettings = mysqlTable(
  "app_settings",
  {
    id: id(),
    uid: uid(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    description: varchar("description", { length: 255 }),
    updatedBy: fk("updated_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("uq_app_settings__uid").on(t.uid),
    uniqueIndex("uq_app_settings__key").on(t.key),
    index("ix_app_settings__updated_by").on(t.updatedBy),
    foreignKey({
      name: "fk_app_settings__updated_by",
      columns: [t.updatedBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

export const backupLogs = mysqlTable(
  "backup_logs",
  {
    id: id(),
    uid: uid(),
    triggeredBy: fk("triggered_by"),
    fileReference: varchar("file_reference", { length: 1000 }),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    errorMessage: text("error_message"),
    triggerType: mysqlEnum("trigger_type", ["MANUAL", "SCHEDULED"])
      .notNull()
      .default("MANUAL"),
    status: mysqlEnum("status", ["RUNNING", "SUCCESS", "FAILED"])
      .notNull()
      .default("RUNNING"),
    startedAt: ts("started_at")
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: ts("finished_at"),
    createdAt: createdAt(),
    // Satu baris RUNNING saja (CR-BKP-03): kolom turunan unik, NULL bila bukan RUNNING.
    runningLock: varchar("running_lock", { length: 7 }).generatedAlwaysAs(
      sql`(CASE WHEN \`status\` = 'RUNNING' THEN 'RUNNING' ELSE NULL END)`,
      { mode: "virtual" },
    ),
  },
  (t) => [
    uniqueIndex("uq_backup_logs__uid").on(t.uid),
    uniqueIndex("uq_backup_logs__running").on(t.runningLock),
    index("ix_backup_logs__started_at").on(t.startedAt),
    index("ix_backup_logs__triggered_by").on(t.triggeredBy),
    index("ix_backup_logs__status").on(t.status),
    foreignKey({
      name: "fk_backup_logs__triggered_by",
      columns: [t.triggeredBy],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);

export type User = typeof users.$inferSelect;
export type MasterPlace = typeof masterPlaces.$inferSelect;
export type MyPlace = typeof myPlaces.$inferSelect;
