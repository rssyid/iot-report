import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sql } from "../src/db";

async function main() {
  console.log("Migrating TMAT tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS tmat_devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_code VARCHAR(30) NOT NULL,
      device_id VARCHAR(80) NOT NULL,
      device_name TEXT NOT NULL,
      estate VARCHAR(30) NOT NULL,
      block VARCHAR(30) NOT NULL,
      latitude NUMERIC(10, 7),
      longitude NUMERIC(10, 7),
      active BOOLEAN NOT NULL DEFAULT true,
      first_seen_at TIMESTAMP WITH TIME ZONE,
      last_seen_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT tmat_devices_company_device_unique UNIQUE (company_code, device_id)
    )
  `;
  console.log("✓ tmat_devices table created/verified.");

  await sql`CREATE INDEX IF NOT EXISTS tmat_devices_company_idx ON tmat_devices (company_code)`;
  await sql`CREATE INDEX IF NOT EXISTS tmat_devices_estate_idx ON tmat_devices (estate)`;
  console.log("✓ tmat_devices indexes verified.");

  await sql`
    CREATE TABLE IF NOT EXISTS tmat_hourly (
      id BIGSERIAL PRIMARY KEY,
      device_id UUID NOT NULL REFERENCES tmat_devices(id) ON DELETE CASCADE,
      record_date DATE NOT NULL,
      record_hour INTEGER NOT NULL,
      tmat_value NUMERIC(12, 4) NOT NULL,
      battery NUMERIC(8, 2),
      signal NUMERIC(8, 2),
      ch_rainfall NUMERIC(8, 2),
      raw_date_key VARCHAR(30),
      import_batch_id UUID,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT tmat_hourly_device_date_hour_unique UNIQUE (device_id, record_date, record_hour)
    )
  `;
  console.log("✓ tmat_hourly table created/verified.");

  await sql`CREATE INDEX IF NOT EXISTS tmat_hourly_device_date_idx ON tmat_hourly (device_id, record_date)`;
  await sql`CREATE INDEX IF NOT EXISTS tmat_hourly_date_idx ON tmat_hourly (record_date)`;
  console.log("✓ tmat_hourly indexes verified.");

  await sql`
    CREATE TABLE IF NOT EXISTS tmat_sync_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requested_start_date DATE NOT NULL,
      requested_end_date DATE NOT NULL,
      device_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      total_rows INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'running',
      error_message TEXT,
      started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP WITH TIME ZONE
    )
  `;
  console.log("✓ tmat_sync_batches table created/verified.");

  console.log("TMAT migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
