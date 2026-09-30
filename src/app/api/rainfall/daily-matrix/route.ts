import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";
import { parseISO, format, eachDayOfInterval } from "date-fns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const companyCodeParam = searchParams.get("companyCode");
    const estCodeParam = searchParams.get("estCode");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = parseISO(startDateParam);
    const end = parseISO(endDateParam);

    if (start > end) {
      return NextResponse.json(
        { error: "startDate cannot be greater than endDate" },
        { status: 400 }
      );
    }

    // 1. Fetch weeks overlapping with the date range
    const weeksRows = await sql`
      SELECT 
        cw.gis_week_id AS "gisWeekId",
        cw.week_name AS "weekName",
        cw.formatted_name AS "formattedName",
        to_char(cw.start_date, 'YYYY-MM-DD') AS "startDate",
        to_char(cw.end_date, 'YYYY-MM-DD') AS "endDate"
      FROM calendar_weeks cw
      WHERE cw.start_date <= ${endDateParam}::date AND cw.end_date >= ${startDateParam}::date
      ORDER BY cw.gis_week_id ASC;
    `;

    // 2. Generate date interval and map with calendar_weeks
    const dateInterval = eachDayOfInterval({ start, end });
    const dates = dateInterval.map((d, idx) => {
      const monthIdx = d.getMonth();
      const dateStr = format(d, "yyyy-MM-dd");

      // Find matching week
      const matchingWeek = weeksRows.find(
        (w: any) => dateStr >= w.startDate && dateStr <= w.endDate
      );

      // Convert "Sep 2026, W1" -> "Sep W1"
      let weekShortName = "W?";
      let gisWeekId = 0;
      let weekStartDate = dateStr;
      let weekEndDate = dateStr;
      let isEndOfWeek = idx === dateInterval.length - 1; // Default last item is border

      if (matchingWeek) {
        gisWeekId = Number(matchingWeek.gisWeekId);
        weekStartDate = matchingWeek.startDate;
        weekEndDate = matchingWeek.endDate;
        weekShortName = matchingWeek.formattedName.replace(/\s*\d{4},\s*/, " ");
        isEndOfWeek = dateStr === matchingWeek.endDate || idx === dateInterval.length - 1;
      }

      return {
        date: dateStr,
        day: format(d, "dd"),
        monthName: INDONESIAN_MONTHS[monthIdx],
        year: d.getFullYear(),
        gisWeekId,
        weekShortName,
        weekStartDate,
        weekEndDate,
        isEndOfWeek,
      };
    });

    // 3. Build month groups for header colspan (Baris 1)
    const monthGroups: Array<{
      monthName: string;
      year: number;
      colSpan: number;
    }> = [];

    for (const d of dates) {
      const lastGroup = monthGroups[monthGroups.length - 1];
      if (
        lastGroup &&
        lastGroup.monthName === d.monthName &&
        lastGroup.year === d.year
      ) {
        lastGroup.colSpan += 1;
      } else {
        monthGroups.push({
          monthName: d.monthName,
          year: d.year,
          colSpan: 1,
        });
      }
    }

    // 4. Build week groups for header colspan (Baris 2)
    const weekGroups: Array<{
      gisWeekId: number;
      weekShortName: string;
      startDate: string;
      endDate: string;
      colSpan: number;
    }> = [];

    for (const d of dates) {
      const lastGroup = weekGroups[weekGroups.length - 1];
      if (lastGroup && lastGroup.gisWeekId === d.gisWeekId) {
        lastGroup.colSpan += 1;
      } else {
        weekGroups.push({
          gisWeekId: d.gisWeekId,
          weekShortName: d.weekShortName,
          startDate: d.weekStartDate,
          endDate: d.weekEndDate,
          colSpan: 1,
        });
      }
    }

    // 5. Build filter clause
    let filterClause = "WHERE c.active = true AND e.active = true";
    if (companyCodeParam && companyCodeParam !== "ALL") {
      const sanitizedCompany = companyCodeParam.replace(/['"\\]/g, "");
      filterClause += ` AND c.company_code = '${sanitizedCompany}'`;
    }
    if (estCodeParam && estCodeParam !== "ALL") {
      const sanitizedEst = estCodeParam.replace(/['"\\]/g, "");
      filterClause += ` AND (e.est_code = '${sanitizedEst}' OR e.est_alias = '${sanitizedEst}')`;
    }

    // 6. Query estate daily averages
    const query = `
      SELECT 
        c.id AS "companyId",
        c.company_code AS "companyCode",
        c.company_name AS "companyName",
        e.id AS "estateId",
        e.est_code AS "estCode",
        e.est_alias AS "estAlias",
        e.est_complete AS "estComplete",
        e.display_order AS "displayOrder",
        rd.rain_date::text AS "rainDate",
        COALESCE(AVG(rd.rainfall_mm), 0)::numeric(10,2) AS "avgMm"
      FROM companies c
      JOIN estates e ON e.company_id = c.id
      LEFT JOIN rain_stations rs ON rs.estate_id = e.id AND rs.active = true
      LEFT JOIN rainfall_daily rd ON rd.station_id = rs.id AND rd.rain_date BETWEEN '${startDateParam}'::date AND '${endDateParam}'::date
      ${filterClause}
      GROUP BY c.id, c.company_code, c.company_name, e.id, e.est_code, e.est_alias, e.est_complete, e.display_order, rd.rain_date
      ORDER BY c.company_code ASC, COALESCE(e.display_order, 999) ASC, e.est_code ASC;
    `;

    const rawRows = await sql(query);

    // 7. Structure data by Company -> Estate -> daily values
    const companiesMap = new Map<
      string,
      {
        companyCode: string;
        companyName: string;
        estatesMap: Map<
          string,
          {
            estCode: string;
            estAlias: string | null;
            estComplete: string;
            displayOrder: number;
            dailyMap: Map<string, number>;
          }
        >;
      }
    >();

    for (const r of rawRows) {
      if (!companiesMap.has(r.companyCode)) {
        companiesMap.set(r.companyCode, {
          companyCode: r.companyCode,
          companyName: r.companyName,
          estatesMap: new Map(),
        });
      }

      const comp = companiesMap.get(r.companyCode)!;
      if (!comp.estatesMap.has(r.estCode)) {
        comp.estatesMap.set(r.estCode, {
          estCode: r.estCode,
          estAlias: r.estAlias,
          estComplete: r.estComplete,
          displayOrder: r.displayOrder ?? 999,
          dailyMap: new Map(),
        });
      }

      if (r.rainDate) {
        const est = comp.estatesMap.get(r.estCode)!;
        est.dailyMap.set(r.rainDate, Math.round(Number(r.avgMm)));
      }
    }

    // 8. Assemble response with CH and HH rows per Company
    const companies = Array.from(companiesMap.values()).map((comp) => {
      const estates = Array.from(comp.estatesMap.values()).map((est) => {
        const dailyValues: Record<string, number> = {};
        let totalMm = 0;

        for (const d of dates) {
          const val = est.dailyMap.get(d.date) ?? 0;
          dailyValues[d.date] = val;
          totalMm += val;
        }

        return {
          estCode: est.estCode,
          estAlias: est.estAlias,
          estComplete: est.estComplete,
          displayOrder: est.displayOrder,
          dailyValues,
          totalMm,
        };
      });

      // Calculate CH (Rata-rata Curah Hujan Company) & HH (Hari Hujan Company)
      const chDailyValues: Record<string, number> = {};
      const hhDailyValues: Record<string, number> = {};
      let chTotalSum = 0;
      let hhTotalSum = 0;

      for (const d of dates) {
        const dateKey = d.date;
        let daySum = 0;
        let hasRain = false;

        for (const est of estates) {
          const val = est.dailyValues[dateKey] ?? 0;
          daySum += val;
          if (val > 0) hasRain = true;
        }

        const estCount = estates.length > 0 ? estates.length : 1;
        const chVal = Math.round(daySum / estCount);
        const hhVal = hasRain ? 1 : 0;

        chDailyValues[dateKey] = chVal;
        hhDailyValues[dateKey] = hhVal;

        chTotalSum += chVal;
        hhTotalSum += hhVal;
      }

      // Total CH: rata-rata total curah hujan seluruh estate di company tsb
      const totalAllEstates = estates.reduce((acc, curr) => acc + curr.totalMm, 0);
      const chTotal = estates.length > 0 ? Math.round(totalAllEstates / estates.length) : 0;

      return {
        companyCode: comp.companyCode,
        companyName: comp.companyName,
        estates,
        ch: {
          dailyValues: chDailyValues,
          total: chTotal,
        },
        hh: {
          dailyValues: hhDailyValues,
          total: hhTotalSum,
        },
      };
    });

    return NextResponse.json(
      {
        dates,
        monthGroups,
        weekGroups,
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
