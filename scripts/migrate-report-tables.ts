import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sql } from "../src/db";

async function main() {
  console.log("Migrating iot_report_blocks table...");

  await sql`
    CREATE TABLE IF NOT EXISTS iot_report_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_code VARCHAR(30) NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      wilayah INTEGER NOT NULL DEFAULT 1,
      estate VARCHAR(30) NOT NULL,
      block VARCHAR(30) NOT NULL,
      status_tanam VARCHAR(30) DEFAULT 'Muda',
      idl VARCHAR(30) DEFAULT 'Sudah',
      tgl_survey DATE,
      rain_station_id UUID REFERENCES rain_stations(id) ON DELETE SET NULL,
      tmat_device_id UUID REFERENCES tmat_devices(id) ON DELETE SET NULL,
      pic VARCHAR(100) DEFAULT 'Joni Pambudi',
      rekomendasi TEXT,
      target_plan TEXT,
      progress_last_week VARCHAR(30) DEFAULT '0',
      progress_this_week VARCHAR(30) DEFAULT '0',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `;
  console.log("✓ iot_report_blocks table created/verified.");

  await sql`CREATE INDEX IF NOT EXISTS iot_report_blocks_company_idx ON iot_report_blocks (company_code)`;
  await sql`CREATE INDEX IF NOT EXISTS iot_report_blocks_estate_idx ON iot_report_blocks (estate)`;
  console.log("✓ iot_report_blocks indexes verified.");

  console.log("Report tables migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
