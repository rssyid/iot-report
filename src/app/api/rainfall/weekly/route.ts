import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const companyCode = searchParams.get("companyCode");
    const estCode = searchParams.get("estCode");
    const stationId = searchParams.get("stationId");
    const gisWeekId = searchParams.get("gisWeekId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000", 10), 5000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    let whereClause = "where 1=1";
    if (startDate) {
      whereClause += ` and rw.end_date >= '${startDate}'::date`;
    }
    if (endDate) {
      whereClause += ` and rw.start_date <= '${endDate}'::date`;
    }
    if (companyCode) {
      whereClause += ` and c.company_code = '${companyCode}'`;
    }
    if (estCode) {
      whereClause += ` and (e.est_code = '${estCode}' or e.est_alias = '${estCode}')`;
    }
    if (stationId) {
      whereClause += ` and rs.station_id = '${stationId}'`;
    }
    if (gisWeekId) {
      whereClause += ` and rw.gis_week_id = ${parseInt(gisWeekId, 10)}`;
    }

    const countQuery = `
      select count(*)::integer as total
      from rainfall_weekly rw
      join rain_stations rs on rs.id = rw.station_id
      left join companies c on c.id = rw.company_id
      left join estates e on e.id = rw.estate_id
      ${whereClause}
    `;

    const dataQuery = `
      select
        rw.gis_week_id as "gisWeekId",
        rw.year,
        rw.month,
        rw.week,
        rw.week_name as "weekName",
        rw.formatted_name as "formattedName",
        rw.start_date as "startDate",
        rw.end_date as "endDate",
        c.company_code as "companyCode",
        c.company_name as "companyName",
        e.est_code as "estCode",
        e.est_alias as "estAlias",
        e.est_complete as "estComplete",
        rs.station_id as "stationId",
        rs.location,
        rw.rainfall_mm::float as "rainfallMm",
        rw.observed_days as "observedDays",
        rw.rainy_days as "rainyDays"
      from rainfall_weekly rw
      join rain_stations rs on rs.id = rw.station_id
      left join companies c on c.id = rw.company_id
      left join estates e on e.id = rw.estate_id
      ${whereClause}
      order by rw.start_date desc, c.company_code, rs.station_id
      limit ${limit} offset ${offset}
    `;

    const [countResult, dataResult] = await Promise.all([
      sql(countQuery),
      sql(dataQuery),
    ]);

    const total = countResult[0]?.total ?? 0;

    return NextResponse.json({
      data: dataResult,
      meta: {
        startDate,
        endDate,
        total,
        limit,
        offset,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
