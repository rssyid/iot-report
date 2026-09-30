import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  numeric,
  bigserial,
  bigint,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyCode: varchar("company_code", { length: 30 }).notNull().unique(),
  companyName: text("company_name").notNull(),
  region: text("region"),
  boundaryGeojson: jsonb("boundary_geojson"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const estates = pgTable(
  "estates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    estCode: varchar("est_code", { length: 30 }).notNull(),
    estAlias: varchar("est_alias", { length: 30 }),
    estComplete: text("est_complete").notNull(),
    wilayah: varchar("wilayah", { length: 30 }),
    displayOrder: integer("display_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("estates_company_est_code_unique").on(table.companyId, table.estCode),
  ]
);

export const rainStations = pgTable("rain_stations", {
  id: uuid("id").defaultRandom().primaryKey(),
  stationId: varchar("station_id", { length: 80 }).notNull().unique(),
  companyId: uuid("company_id").references(() => companies.id),
  estateId: uuid("estate_id").references(() => estates.id),
  sourceEstCode: varchar("source_est_code", { length: 30 }),
  location: text("location"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calendarWeeks = pgTable(
  "calendar_weeks",
  {
    id: integer("id").primaryKey(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    week: integer("week").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    weekName: varchar("week_name", { length: 30 }).notNull(),
    formattedName: varchar("formatted_name", { length: 80 }).notNull(),
    gisWeekId: integer("gis_week_id").notNull().unique(),
  },
  (table) => [
    unique("calendar_weeks_year_month_week_unique").on(
      table.year,
      table.month,
      table.week
    ),
  ]
);

export const rainfallDaily = pgTable(
  "rainfall_daily",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    companyId: uuid("company_id").references(() => companies.id),
    estateId: uuid("estate_id").references(() => estates.id),
    stationId: uuid("station_id")
      .notNull()
      .references(() => rainStations.id),
    rainDate: date("rain_date").notNull(),
    rainfallMm: numeric("rainfall_mm", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    sourceMtd: numeric("source_mtd", { precision: 12, scale: 2 }),
    sourceArsiran: integer("source_arsiran").notNull().default(7),
    sourceEndingDate: date("source_ending_date"),
    rawDateKey: varchar("raw_date_key", { length: 20 }),
    importBatchId: uuid("import_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("rainfall_daily_station_date_unique").on(
      table.stationId,
      table.rainDate
    ),
    index("rainfall_daily_date_idx").on(table.rainDate),
    index("rainfall_daily_company_date_idx").on(
      table.companyId,
      table.rainDate
    ),
    index("rainfall_daily_estate_date_idx").on(
      table.estateId,
      table.rainDate
    ),
  ]
);

export const syncBatches = pgTable("sync_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestedStartDate: date("requested_start_date").notNull(),
  requestedEndDate: date("requested_end_date").notNull(),
  companyCount: integer("company_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const syncRequests = pgTable("sync_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => syncBatches.id, { onDelete: "cascade" }),
  companyCode: varchar("company_code", { length: 30 }).notNull(),
  endingDate: date("ending_date").notNull(),
  arsiran: integer("arsiran").notNull().default(7),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  httpStatus: integer("http_status"),
  rowsReceived: integer("rows_received").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const apiRawResponses = pgTable("api_raw_responses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  syncRequestId: bigint("sync_request_id", { mode: "number" })
    .notNull()
    .references(() => syncRequests.id, { onDelete: "cascade" }),
  responseJson: jsonb("response_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tmatDevices = pgTable(
  "tmat_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyCode: varchar("company_code", { length: 30 }).notNull(),
    deviceId: varchar("device_id", { length: 80 }).notNull(),
    deviceName: text("device_name").notNull(),
    estate: varchar("estate", { length: 30 }).notNull(),
    block: varchar("block", { length: 30 }).notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    active: boolean("active").notNull().default(true),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("tmat_devices_company_device_unique").on(
      table.companyCode,
      table.deviceId
    ),
    index("tmat_devices_company_idx").on(table.companyCode),
    index("tmat_devices_estate_idx").on(table.estate),
  ]
);

export const tmatHourly = pgTable(
  "tmat_hourly",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => tmatDevices.id, { onDelete: "cascade" }),
    recordDate: date("record_date").notNull(),
    recordHour: integer("record_hour").notNull(),
    tmatValue: numeric("tmat_value", { precision: 12, scale: 4 }),
    battery: numeric("battery", { precision: 8, scale: 2 }),
    signal: numeric("signal", { precision: 8, scale: 2 }),
    chRainfall: numeric("ch_rainfall", { precision: 8, scale: 2 }),
    rawDateKey: varchar("raw_date_key", { length: 30 }),
    importBatchId: uuid("import_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("tmat_hourly_device_date_hour_unique").on(
      table.deviceId,
      table.recordDate,
      table.recordHour
    ),
    index("tmat_hourly_device_date_idx").on(
      table.deviceId,
      table.recordDate
    ),
    index("tmat_hourly_date_idx").on(table.recordDate),
  ]
);

export const tmatSyncBatches = pgTable("tmat_sync_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestedStartDate: date("requested_start_date").notNull(),
  requestedEndDate: date("requested_end_date").notNull(),
  deviceCount: integer("device_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  totalRows: integer("total_rows").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const iotReportBlocks = pgTable(
  "iot_report_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyCode: varchar("company_code", { length: 30 }).notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    wilayah: integer("wilayah").notNull().default(1),
    estate: varchar("estate", { length: 30 }).notNull(),
    block: varchar("block", { length: 30 }).notNull(),
    statusTanam: varchar("status_tanam", { length: 30 }).default("Muda"),
    idl: varchar("idl", { length: 30 }).default("Sudah"),
    tglSurvey: date("tgl_survey"),
    rainStationId: uuid("rain_station_id").references(() => rainStations.id, {
      onDelete: "set null",
    }),
    tmatDeviceId: uuid("tmat_device_id").references(() => tmatDevices.id, {
      onDelete: "set null",
    }),
    pic: varchar("pic", { length: 100 }).default("Joni Pambudi"),
    rekomendasi: text("rekomendasi"),
    targetPlan: text("target_plan"),
    progressLastWeek: varchar("progress_last_week", { length: 30 }).default("0"),
    progressThisWeek: varchar("progress_this_week", { length: 30 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("iot_report_blocks_company_idx").on(table.companyCode),
    index("iot_report_blocks_estate_idx").on(table.estate),
  ]
);


