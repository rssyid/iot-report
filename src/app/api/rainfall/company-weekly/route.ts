import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weeksParam = parseInt(searchParams.get("weeks") || "4", 10);
    const numWeeks = [4, 8, 12].includes(weeksParam) ? weeksParam : 4;
    const endDateParam = searchParams.get("endDate");

    // 1. Find reference week (This Week)
    let latestWeekRow;
    if (endDateParam) {
      latestWeekRow = await sql`
        SELECT cw.gis_week_id, cw.week_name, cw.formatted_name, 
               to_char(cw.start_date, 'YYYY-MM-DD') as start_date, 
               to_char(cw.end_date, 'YYYY-MM-DD') as end_date
        FROM calendar_weeks cw
        WHERE ${endDateParam}::date BETWEEN cw.start_date AND cw.end_date
        LIMIT 1;
      `;
    }

    if (!latestWeekRow || latestWeekRow.length === 0) {
      latestWeekRow = await sql`
        SELECT cw.gis_week_id, cw.week_name, cw.formatted_name, 
               to_char(cw.start_date, 'YYYY-MM-DD') as start_date, 
               to_char(cw.end_date, 'YYYY-MM-DD') as end_date
        FROM calendar_weeks cw
        JOIN rainfall_daily rd ON rd.rain_date BETWEEN cw.start_date AND cw.end_date
        ORDER BY rd.rain_date DESC, cw.gis_week_id DESC
        LIMIT 1;
      `;
    }

    if (!latestWeekRow || latestWeekRow.length === 0) {
      return NextResponse.json({
        meta: { weeksCount: numWeeks, latestWeekId: null },
        weeks: [],
        companies: [],
      });
    }

    const latestWeekId = latestWeekRow[0].gis_week_id;
    const startWeekId = latestWeekId - numWeeks + 1;

    // 2. Fetch weeks list ordered chronologically ASC (earlier on left, this week on rightmost)
    const weeks = await sql`
      SELECT 
        gis_week_id AS "gisWeekId",
        week_name AS "weekName",
        formatted_name AS "formattedName",
        to_char(start_date, 'YYYY-MM-DD') AS "startDate",
        to_char(end_date, 'YYYY-MM-DD') AS "endDate",
        (gis_week_id = ${latestWeekId}) AS "isThisWeek"
      FROM calendar_weeks
      WHERE gis_week_id BETWEEN ${startWeekId} AND ${latestWeekId}
      ORDER BY gis_week_id ASC;
    `;

    // 3. Aggregate matrix rows per company and week
    const matrixRows = await sql`
      SELECT 
        c.id AS "companyId",
        c.company_code AS "companyCode",
        c.company_name AS "companyName",
        (
          SELECT count(*)::integer 
          FROM rain_stations rs 
          WHERE rs.company_id = c.id AND rs.active = true
        ) AS "stationCount",
        cw.gis_week_id AS "gisWeekId",
        COALESCE(SUM(rd.rainfall_mm), 0)::float AS "totalMm",
        COUNT(DISTINCT rd.rain_date) FILTER (WHERE rd.rainfall_mm > 0)::integer AS "rainyDays",
        ROUND(
          COALESCE(SUM(rd.rainfall_mm), 0) / NULLIF(
            (SELECT count(*) FROM rain_stations rs WHERE rs.company_id = c.id AND rs.active = true), 0
          ), 2
        )::float AS "avgMm"
      FROM companies c
      CROSS JOIN (
        SELECT gis_week_id, start_date, end_date
        FROM calendar_weeks
        WHERE gis_week_id BETWEEN ${startWeekId} AND ${latestWeekId}
      ) cw
      LEFT JOIN rainfall_daily rd 
        ON rd.company_id = c.id 
        AND rd.rain_date BETWEEN cw.start_date AND cw.end_date
      WHERE c.active = true
      GROUP BY c.id, c.company_code, c.company_name, cw.gis_week_id
      ORDER BY c.company_code ASC, cw.gis_week_id ASC;
    `;

    // 4. Structure data by company with weeklyStats map
    const companiesMap = new Map<string, any>();
    for (const row of matrixRows) {
      if (!companiesMap.has(row.companyCode)) {
        companiesMap.set(row.companyCode, {
          companyId: row.companyId,
          companyCode: row.companyCode,
          companyName: row.companyName,
          stationCount: row.stationCount,
          weeklyStats: {},
        });
      }

      const comp = companiesMap.get(row.companyCode);
      comp.weeklyStats[row.gisWeekId] = {
        totalMm: row.totalMm,
        rainyDays: row.rainyDays,
        avgMm: row.avgMm,
      };
    }

    const companies = Array.from(companiesMap.values());

    return NextResponse.json(
      {
        meta: {
          weeksCount: numWeeks,
          startWeekId,
          latestWeekId,
          latestWeekName: latestWeekRow[0].formatted_name,
        },
        weeks,
        companies,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
