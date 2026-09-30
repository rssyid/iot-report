import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sql } from "../src/db";

async function main() {
  console.log("Creating or replacing view rainfall_weekly...");
  await sql`
    create or replace view rainfall_weekly as
    select
      cw.gis_week_id,
      cw.year,
      cw.month,
      cw.week,
      cw.week_name,
      cw.formatted_name,
      cw.start_date,
      cw.end_date,
      rd.company_id,
      rd.estate_id,
      rd.station_id,
      sum(rd.rainfall_mm)::numeric(12,2) as rainfall_mm,
      count(*)::integer as observed_days,
      count(*) filter (where rd.rainfall_mm > 0)::integer as rainy_days
    from rainfall_daily rd
    join calendar_weeks cw
      on rd.rain_date between cw.start_date and cw.end_date
    group by
      cw.gis_week_id, cw.year, cw.month, cw.week, cw.week_name,
      cw.formatted_name, cw.start_date, cw.end_date,
      rd.company_id, rd.estate_id, rd.station_id;
  `;
  console.log("View rainfall_weekly created successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create view:", err);
  process.exit(1);
});
