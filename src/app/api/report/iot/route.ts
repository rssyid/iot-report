import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import {
  iotReportBlocks,
  calendarWeeks,
  tmatHourly,
  rainfallDaily,
  tmatDevices,
  rainStations,
  companies,
} from "@/db/schema";
import { eq, and, desc, asc, lte, inArray } from "drizzle-orm";
import { parseISO, getDay, addDays, format } from "date-fns";

export const dynamic = "force-dynamic";

// Find Tuesday date in a week range [startDate, endDate]
function getTuesdayInWeek(startDateStr: string, endDateStr: string): string {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  let cur = start;
  while (cur <= end) {
    // getDay: 0 is Sunday, 2 is Tuesday
    if (getDay(cur) === 2) {
      return format(cur, "yyyy-MM-dd");
    }
    cur = addDays(cur, 1);
  }
  // Fallback to start + 1 or start
  return format(addDays(start, 1), "yyyy-MM-dd");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyCode = searchParams.get("companyCode") || "PT.THIP";
    const weeksCount = Math.min(12, Math.max(4, Number(searchParams.get("weeksCount")) || 4));
    const refDate = searchParams.get("referenceDate") || new Date().toISOString().split("T")[0];

    // 1. Fetch all companies for selector
    const allCompanies = await db.select().from(companies).where(eq(companies.active, true));

    // 2. Fetch N calendar weeks ending on or before reference date
    // Sort desc to get latest N, then reverse to chronological order
    const rawWeeks = await sql`
      SELECT 
        id, 
        month, 
        year, 
        week, 
        start_date AS "startDate", 
        end_date AS "endDate", 
        week_name AS "weekName", 
        formatted_name AS "formattedName",
        gis_week_id AS "gisWeekId"
      FROM calendar_weeks
      WHERE start_date <= ${refDate}::date
      ORDER BY start_date DESC
      LIMIT ${weeksCount};
    `;

    // Reverse to chronological order (oldest to newest)
    const weeksList = (rawWeeks as any[]).reverse().map((w) => ({
      ...w,
      tuesdayDate: getTuesdayInWeek(w.startDate, w.endDate),
    }));

    // 3. Fetch report blocks for this company
    const blocks = await db
      .select()
      .from(iotReportBlocks)
      .where(eq(iotReportBlocks.companyCode, companyCode))
      .orderBy(asc(iotReportBlocks.wilayah), asc(iotReportBlocks.displayOrder), asc(iotReportBlocks.estate), asc(iotReportBlocks.block));

    // 4. Fetch available stations and devices for dropdowns
    const availableStations = await sql`
      SELECT 
        rs.id,
        rs.station_id AS "stationId",
        COALESCE(e.est_alias, e.est_code, rs.source_est_code, 'Lainnya') AS "estate",
        rs.location
      FROM rain_stations rs
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN estates e ON rs.estate_id = e.id
      WHERE c.company_code = ${companyCode}
      ORDER BY COALESCE(e.est_alias, e.est_code, rs.source_est_code, 'Z') ASC, rs.station_id ASC
    `;

    const availableDevices = await sql`
      SELECT 
        id,
        device_id AS "deviceId",
        device_name AS "deviceName",
        COALESCE(estate, 'Lainnya') AS "estate",
        block
      FROM tmat_devices
      WHERE company_code = ${companyCode}
      ORDER BY COALESCE(estate, 'Z') ASC, device_name ASC
    `;

    // 5. Compute weekly CH and TMAT for each block
    const processedBlocks = await Promise.all(
      blocks.map(async (block, index) => {
        const weeklyData: Array<{
          weekId: number;
          weekNum: number;
          month: number;
          year: number;
          weekLabel: string;
          monthName: string;
          ch: number | null;
          tmat: number | null;
        }> = [];

        for (const week of weeksList) {
          // A. Calculate weekly Rainfall (sum mm for rainStationId)
          let chVal: number | null = null;
          if (block.rainStationId) {
            const [chRes] = await sql`
              SELECT COALESCE(SUM(rainfall_mm), 0)::float AS total_ch
              FROM rainfall_daily
              WHERE station_id = ${block.rainStationId}::uuid
                AND rain_date >= ${week.startDate}::date
                AND rain_date <= ${week.endDate}::date
            `;
            if (chRes && chRes.total_ch !== null) {
              chVal = Math.round(chRes.total_ch);
            }
          }

          // B. Calculate weekly TMAT (Tuesday 07:00 ± 3 jam, range jam 04–10)
          // Jika tidak ada data dalam range tersebut → null (No Data)
          let tmatVal: number | null = null;
          if (block.tmatDeviceId) {
            // Step 1: Try exact Tuesday 07:00
            const [exactRes] = await sql`
              SELECT tmat_value::float AS val
              FROM tmat_hourly
              WHERE device_id = ${block.tmatDeviceId}::uuid
                AND record_date = ${week.tuesdayDate}::date
                AND record_hour = 7
                AND tmat_value IS NOT NULL
              LIMIT 1;
            `;

            if (exactRes && exactRes.val !== null) {
              tmatVal = Math.round(exactRes.val);
            } else {
              // Step 2: Nearest hour on Tuesday within ±3h window (04:00–10:00)
              const [tuesdayNearest] = await sql`
                SELECT tmat_value::float AS val
                FROM tmat_hourly
                WHERE device_id = ${block.tmatDeviceId}::uuid
                  AND record_date = ${week.tuesdayDate}::date
                  AND record_hour >= 4
                  AND record_hour <= 10
                  AND tmat_value IS NOT NULL
                ORDER BY ABS(record_hour - 7) ASC
                LIMIT 1;
              `;

              if (tuesdayNearest && tuesdayNearest.val !== null) {
                tmatVal = Math.round(tuesdayNearest.val);
              }
              // No further fallback — data outside ±3h window is treated as No Data
            }
          }

          // Month abbreviation
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
          const monthName = monthNames[week.month - 1] || `Bulan ${week.month}`;

          weeklyData.push({
            weekId: week.id,
            weekNum: week.week,
            month: week.month,
            year: week.year,
            weekLabel: `W${week.week}`,
            monthName,
            ch: chVal,
            tmat: tmatVal,
          });
        }

        // C. Calculate Selisih Mingguan (last week vs previous week)
        let diffVal: number | null = null;
        let diffSymbol: string = "";
        let diffLabel: string = "No Data";
        let diffColorCategory: "cepat" | "lambat" | "normal" | "nodata" = "nodata";

        if (weeklyData.length >= 2) {
          const lastW = weeklyData[weeklyData.length - 1];
          const prevW = weeklyData[weeklyData.length - 2];

          if (lastW.tmat !== null && prevW.tmat !== null) {
            diffVal = lastW.tmat - prevW.tmat;
            const absVal = Math.abs(diffVal);

            if (diffVal > 0) {
              diffSymbol = "▼"; // air surut / makin dalam
              diffLabel = `▼ ${absVal}`;
            } else if (diffVal < 0) {
              diffSymbol = "▲"; // air naik / makin dangkal
              diffLabel = `▲ ${absVal}`;
            } else {
              diffSymbol = "-";
              diffLabel = "0";
            }

            // Kriteria Gambar 2:
            // 1. Merah (Terlalu Cepat): TMAT > 45 dan Turun lebih dari 7cm (diffVal > 7)
            // 2. Kuning (Terlalu Lambat): TMAT (Banjir s.d 45) dan Turun lambat (antara -7 s.d 0)
            // 3. Hijau (Normal): TMAT > 45 & Turun lambat (diffVal <= 7) ATAU TMAT < 45 & Turun cepat (diffVal < -7 atau diffVal > 0)
            const tmatLast = lastW.tmat;

            if (tmatLast > 45 && diffVal > 7) {
              diffColorCategory = "cepat"; // Merah
            } else if (tmatLast <= 45 && diffVal > 0 && diffVal <= 7) {
              diffColorCategory = "lambat"; // Kuning: hanya bila air surut lambat (1 s.d 7 cm)
            } else {
              diffColorCategory = "normal"; // Hijau: air naik (▲), seimbang, atau dinamika normal
            }
          }
        }

        return {
          ...block,
          no: index + 1,
          weeklyData,
          selisihMingguan: {
            diffVal,
            diffSymbol,
            diffLabel,
            category: diffColorCategory,
          },
        };
      })
    );

    return NextResponse.json({
      companyCode,
      weeks: weeksList,
      blocks: processedBlocks,
      companies: allCompanies.map((c) => ({
        code: c.companyCode,
        name: c.companyName,
      })),
      availableStations: (availableStations as any[]).map((s) => ({
        id: s.id,
        stationId: s.stationId,
        estate: s.estate || "Lainnya",
        location: s.location || "",
      })),
      availableDevices: (availableDevices as any[]).map((d) => ({
        id: d.id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        estate: d.estate || "Lainnya",
        block: d.block || "",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/report/iot
// Add a new block to company report
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyCode,
      wilayah = 1,
      estate,
      block,
      statusTanam = "Muda",
      idl = "Sudah",
      tglSurvey,
      rainStationId,
      tmatDeviceId,
      pic = "",
      rekomendasi = "",
      targetPlan = "",
      progressLastWeek = "0",
      progressThisWeek = "0",
    } = body;

    if (!companyCode || !estate || !block) {
      return NextResponse.json(
        { error: "companyCode, estate, dan block wajib diisi" },
        { status: 400 }
      );
    }

    // Auto-compute display order
    const [maxOrder] = await sql`
      SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
      FROM iot_report_blocks
      WHERE company_code = ${companyCode}
    `;

    const [newBlock] = await db
      .insert(iotReportBlocks)
      .values({
        companyCode: companyCode.trim().toUpperCase(),
        displayOrder: maxOrder?.next_order || 1,
        wilayah: Number(wilayah) || 1,
        estate: estate.trim().toUpperCase(),
        block: block.trim().toUpperCase(),
        statusTanam: statusTanam.trim(),
        idl: idl.trim(),
        tglSurvey: tglSurvey ? tglSurvey : null,
        rainStationId: rainStationId || null,
        tmatDeviceId: tmatDeviceId || null,
        pic: pic.trim(),
        rekomendasi: rekomendasi.trim(),
        targetPlan: targetPlan.trim(),
        progressLastWeek: String(progressLastWeek).trim(),
        progressThisWeek: String(progressThisWeek).trim(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ data: newBlock }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/report/iot
// Batch update blocks (inline edit saving)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { blocks } = body;

    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: "blocks array wajib disertakan" }, { status: 400 });
    }

    const updatedResults = [];
    for (const b of blocks) {
      if (!b.id) continue;

      // Auto convert 100 to "Done"
      let lastW = b.progressLastWeek !== undefined ? String(b.progressLastWeek).trim() : undefined;
      let thisW = b.progressThisWeek !== undefined ? String(b.progressThisWeek).trim() : undefined;
      if (lastW === "100") lastW = "Done";
      if (thisW === "100") thisW = "Done";

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (b.wilayah !== undefined) updateData.wilayah = Number(b.wilayah);
      if (b.estate !== undefined) updateData.estate = String(b.estate).trim().toUpperCase();
      if (b.block !== undefined) updateData.block = String(b.block).trim().toUpperCase();
      if (b.statusTanam !== undefined) updateData.statusTanam = String(b.statusTanam).trim();
      if (b.idl !== undefined) updateData.idl = String(b.idl).trim();
      if (b.tglSurvey !== undefined) updateData.tglSurvey = b.tglSurvey ? b.tglSurvey : null;
      if (b.rainStationId !== undefined) updateData.rainStationId = b.rainStationId || null;
      if (b.tmatDeviceId !== undefined) updateData.tmatDeviceId = b.tmatDeviceId || null;
      if (b.pic !== undefined) updateData.pic = String(b.pic).trim();
      if (b.rekomendasi !== undefined) updateData.rekomendasi = String(b.rekomendasi).trim();
      if (b.targetPlan !== undefined) updateData.targetPlan = String(b.targetPlan).trim();
      if (lastW !== undefined) updateData.progressLastWeek = lastW;
      if (thisW !== undefined) updateData.progressThisWeek = thisW;

      const [res] = await db
        .update(iotReportBlocks)
        .set(updateData)
        .where(eq(iotReportBlocks.id, b.id))
        .returning();

      if (res) updatedResults.push(res);
    }

    return NextResponse.json({ message: "Berhasil menyimpan perubahan", count: updatedResults.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/report/iot?id=...
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Parameter id wajib disertakan" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(iotReportBlocks)
      .where(eq(iotReportBlocks.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Blok tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Blok berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
