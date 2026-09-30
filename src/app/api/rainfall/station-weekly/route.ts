import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weeksParam = searchParams.get("weeks");
    const companyParam = searchParams.get("company"); // companyCode or companyId
    const estateParam = searchParams.get("estate"); // estCode or estateId

    const numWeeks = weeksParam === "8" ? 8 : weeksParam === "12" ? 12 : 4;

    // 1. Get latest observed week
    const latestWeekRow = await sql`
      SELECT cw.gis_week_id, cw.formatted_name, cw.end_date
      FROM calendar_weeks cw
      JOIN rainfall_daily rd ON rd.rain_date BETWEEN cw.start_date AND cw.end_date
      ORDER BY cw.gis_week_id DESC
      LIMIT 1;
    `;

    if (!latestWeekRow || latestWeekRow.length === 0) {
      return NextResponse.json({
        meta: { weeksCount: numWeeks },
        weeks: [],
        stations: [],
      });
    }

    const latestWeekId = Number(latestWeekRow[0].gis_week_id);
    const startWeekId = latestWeekId - numWeeks + 1;

    // 2. Fetch weeks within range (ascending: earliest to latest week)
    const weeksData = await sql`
      SELECT 
        gis_week_id AS "gisWeekId",
        week_name AS "weekName",
        formatted_name AS "formattedName",
        to_char(start_date, 'YYYY-MM-DD') AS "startDate",
        to_char(end_date, 'YYYY-MM-DD') AS "endDate"
      FROM calendar_weeks
      WHERE gis_week_id BETWEEN ${startWeekId} AND ${latestWeekId}
      ORDER BY gis_week_id ASC;
    `;

    const weeks = weeksData.map((w: any) => ({
      gisWeekId: Number(w.gisWeekId),
      weekName: w.weekName,
      formattedName: w.formattedName,
      startDate: w.startDate,
      endDate: w.endDate,
      isThisWeek: Number(w.gisWeekId) === latestWeekId,
    }));

    // 3. Build dynamic filter clauses
    let filterClause = "WHERE rs.active = true";
    if (companyParam && companyParam !== "ALL") {
      const sanitizedCompany = companyParam.replace(/['"\\]/g, "");
      filterClause += ` AND (c.company_code = '${sanitizedCompany}' OR c.id::text = '${sanitizedCompany}')`;
    }
    if (estateParam && estateParam !== "ALL") {
      const sanitizedEstate = estateParam.replace(/['"\\]/g, "");
      filterClause += ` AND (e.est_code = '${sanitizedEstate}' OR e.est_alias = '${sanitizedEstate}' OR e.id::text = '${sanitizedEstate}')`;
    }

    const query = `
      SELECT 
        rs.id AS "stationDbId",
        rs.station_id AS "stationId",
        rs.location,
        c.id AS "companyId",
        c.company_code AS "companyCode",
        c.company_name AS "companyName",
        e.id AS "estateId",
        e.est_code AS "estCode",
        e.est_complete AS "estComplete",
        e.display_order AS "displayOrder",
        cw.gis_week_id AS "gisWeekId",
        COALESCE(SUM(rd.rainfall_mm), 0)::numeric(12, 2) AS "totalMm",
        COUNT(DISTINCT CASE WHEN rd.rainfall_mm > 0 THEN rd.rain_date END)::int AS "rainyDays"
      FROM rain_stations rs
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN estates e ON rs.estate_id = e.id
      CROSS JOIN (
        SELECT gis_week_id, start_date, end_date
        FROM calendar_weeks
        WHERE gis_week_id BETWEEN ${startWeekId} AND ${latestWeekId}
      ) cw
      LEFT JOIN rainfall_daily rd 
        ON rd.station_id = rs.id 
        AND rd.rain_date BETWEEN cw.start_date AND cw.end_date
      ${filterClause}
      GROUP BY 
        rs.id, rs.station_id, rs.location,
        c.id, c.company_code, c.company_name,
        e.id, e.est_code, e.est_complete, e.display_order,
        cw.gis_week_id
      ORDER BY 
        c.company_code ASC, 
        COALESCE(e.display_order, 999) ASC, 
        rs.station_id ASC, 
        cw.gis_week_id ASC;
    `;

    const matrixRows = await sql(query);

    // 4. Structure data by station
    const stationsMap = new Map<string, any>();
    for (const row of matrixRows) {
      if (!stationsMap.has(row.stationDbId)) {
        stationsMap.set(row.stationDbId, {
          stationDbId: row.stationDbId,
          stationId: row.stationId,
          location: row.location || "-",
          companyId: row.companyId,
          companyCode: row.companyCode,
          companyName: row.companyName,
          estateId: row.estateId,
          estCode: row.estCode,
          estComplete: row.estComplete,
          displayOrder: row.displayOrder ?? 999,
          weeklyStats: {},
        });
      }

      const stn = stationsMap.get(row.stationDbId);
      stn.weeklyStats[row.gisWeekId] = {
        totalMm: Number(row.totalMm),
        rainyDays: Number(row.rainyDays),
      };
    }

    const stations = Array.from(stationsMap.values());

    return NextResponse.json(
      {
        meta: {
          weeksCount: numWeeks,
          startWeekId,
          latestWeekId,
          latestWeekName: latestWeekRow[0].formatted_name,
        },
        weeks,
        stations,
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
