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

    let rdWhere = "where 1=1";
    let rwWhere = "where 1=1";

    if (startDate) {
      rdWhere += ` and rd.rain_date >= '${startDate}'::date`;
      rwWhere += ` and rw.end_date >= '${startDate}'::date`;
    }
    if (endDate) {
      rdWhere += ` and rd.rain_date <= '${endDate}'::date`;
      rwWhere += ` and rw.start_date <= '${endDate}'::date`;
    }
    if (companyCode) {
      rdWhere += ` and c.company_code = '${companyCode}'`;
      rwWhere += ` and c.company_code = '${companyCode}'`;
    }
    if (estCode) {
      rdWhere += ` and (e.est_code = '${estCode}' or e.est_alias = '${estCode}')`;
      rwWhere += ` and (e.est_code = '${estCode}' or e.est_alias = '${estCode}')`;
    }
    if (stationId) {
      rdWhere += ` and rs.station_id = '${stationId}'`;
      rwWhere += ` and rs.station_id = '${stationId}'`;
    }

    const summaryQuery = `
      select
        coalesce(sum(rd.rainfall_mm), 0)::float as "totalRainfall",
        coalesce(avg(rd.rainfall_mm), 0)::float as "averageDaily",
        count(case when rd.rainfall_mm > 0 then 1 end)::integer as "rainyDays",
        count(*)::integer as "totalRecords",
        count(distinct rd.station_id)::integer as "stationCount",
        max(rd.rain_date) as "latestObservedDate"
      from rainfall_daily rd
      join rain_stations rs on rs.id = rd.station_id
      left join companies c on c.id = rd.company_id
      left join estates e on e.id = rd.estate_id
      ${rdWhere}
    `;

    // Query for latest week total
    const latestWeekQuery = `
      select
        rw.formatted_name as "latestWeekName",
        coalesce(sum(rw.rainfall_mm), 0)::float as "latestWeekRainfall"
      from rainfall_weekly rw
      join rain_stations rs on rs.id = rw.station_id
      left join companies c on c.id = rw.company_id
      left join estates e on e.id = rw.estate_id
      ${rwWhere}
      group by rw.gis_week_id, rw.formatted_name, rw.start_date
      order by rw.start_date desc
      limit 1
    `;

    const [summaryResult, latestWeekResult] = await Promise.all([
      sql(summaryQuery),
      sql(latestWeekQuery),
    ]);

    const summary = summaryResult[0] || {
      totalRainfall: 0,
      averageDaily: 0,
      rainyDays: 0,
      totalRecords: 0,
      stationCount: 0,
      latestObservedDate: null,
    };

    return NextResponse.json({
      ...summary,
      latestWeekName: latestWeekResult[0]?.latestWeekName ?? null,
      latestWeekRainfall: latestWeekResult[0]?.latestWeekRainfall ?? 0,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
