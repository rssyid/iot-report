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
    const limit = Math.min(parseInt(searchParams.get("limit") || "5000", 10), 10000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    let whereClause = "where 1=1";
    if (startDate) {
      whereClause += ` and rd.rain_date >= '${startDate}'::date`;
    }
    if (endDate) {
      whereClause += ` and rd.rain_date <= '${endDate}'::date`;
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

    const countQuery = `
      select count(*)::integer as total
      from rainfall_daily rd
      join rain_stations rs on rs.id = rd.station_id
      left join companies c on c.id = rd.company_id
      left join estates e on e.id = rd.estate_id
      ${whereClause}
    `;

    const dataQuery = `
      select
        rd.id,
        rd.rain_date as "rainDate",
        c.company_code as "companyCode",
        c.company_name as "companyName",
        e.est_code as "estCode",
        e.est_alias as "estAlias",
        e.est_complete as "estComplete",
        rs.station_id as "stationId",
        rs.location,
        rs.latitude::float as "latitude",
        rs.longitude::float as "longitude",
        rd.rainfall_mm::float as "rainfallMm",
        rd.source_mtd::float as "sourceMtd",
        rd.source_ending_date as "sourceEndingDate",
        rd.raw_date_key as "rawDateKey"
      from rainfall_daily rd
      join rain_stations rs on rs.id = rd.station_id
      left join companies c on c.id = rd.company_id
      left join estates e on e.id = rd.estate_id
      ${whereClause}
      order by rd.rain_date desc, c.company_code, rs.station_id
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
