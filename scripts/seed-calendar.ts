import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { db } from "../src/db";
import { calendarWeeks } from "../src/db/schema";
import { sql } from "drizzle-orm";

type CalendarWeekItem = {
  id: number;
  month: number;
  year: number;
  week: number;
  start_date: string;
  end_date: string;
  week_name: string;
  formatted_name: string;
  gis_week_id: number;
};

async function main() {
  console.log("Seeding calendar_weeks from calendar_weeks.json...");

  const filePath = path.join(process.cwd(), "src", "data", "calendar_weeks.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: CalendarWeekItem[] = JSON.parse(raw);

  console.log(`Found ${data.length} calendar weeks to seed.`);

  const chunkSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize).map((item) => ({
      id: item.id,
      month: item.month,
      year: item.year,
      week: item.week,
      startDate: item.start_date,
      endDate: item.end_date,
      weekName: item.week_name,
      formattedName: item.formatted_name,
      gisWeekId: item.gis_week_id,
    }));

    await db
      .insert(calendarWeeks)
      .values(chunk)
      .onConflictDoUpdate({
        target: calendarWeeks.id,
        set: {
          month: sql`excluded.month`,
          year: sql`excluded.year`,
          week: sql`excluded.week`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          weekName: sql`excluded.week_name`,
          formattedName: sql`excluded.formatted_name`,
          gisWeekId: sql`excluded.gis_week_id`,
        },
      });

    totalInserted += chunk.length;
  }

  console.log(`Successfully seeded/updated ${totalInserted} calendar weeks.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed calendar failed:", err);
  process.exit(1);
});
