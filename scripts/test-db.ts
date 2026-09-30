import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sql } from "../src/db";

async function check() {
  const c = await sql`select count(*) as count from companies`;
  const e = await sql`select count(*) as count from estates`;
  const w = await sql`select count(*) as count from calendar_weeks`;
  const st = await sql`select count(*) as count from rain_stations`;
  const rd = await sql`select count(*) as count from rainfall_daily`;

  console.log("DB STATUS:");
  console.log(`- companies: ${c[0].count}`);
  console.log(`- estates: ${e[0].count}`);
  console.log(`- calendar_weeks: ${w[0].count}`);
  console.log(`- rain_stations: ${st[0].count}`);
  console.log(`- rainfall_daily: ${rd[0].count}`);

  const kpi = await sql`
    select
      count(*)::integer as records,
      count(distinct station_id)::integer as stations,
      sum(rainfall_mm)::numeric(12,2) as total_mm,
      avg(rainfall_mm)::numeric(12,2) as avg_mm,
      min(rain_date) as min_date,
      max(rain_date) as max_date
    from rainfall_daily
  `;
  console.log("OVERALL KPI:", kpi[0]);
}

check().catch(console.error);
