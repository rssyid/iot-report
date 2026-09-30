import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

// GET /api/tmat/data?deviceId=...&startDate=...&endDate=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!deviceId) {
      return NextResponse.json(
        { error: "Parameter deviceId wajib disertakan" },
        { status: 400 }
      );
    }

    // 1. Fetch device metadata
    const [device] = await sql`
      SELECT 
        id,
        company_code AS "companyCode",
        device_id AS "deviceId",
        device_name AS "deviceName",
        estate,
        block,
        latitude,
        longitude,
        active,
        last_seen_at AS "lastSeenAt"
      FROM tmat_devices
      WHERE id = ${deviceId}::uuid
      LIMIT 1;
    `;

    if (!device) {
      return NextResponse.json(
        { error: "Device tidak ditemukan" },
        { status: 404 }
      );
    }

    // 2. Fetch hourly records
    let recordsQuery;
    if (startDate && endDate) {
      recordsQuery = sql`
        SELECT 
          id,
          record_date AS "recordDate",
          record_hour AS "recordHour",
          tmat_value::float AS "tmatValue",
          battery::float AS "battery",
          signal::float AS "signal",
          ch_rainfall::float AS "chRainfall",
          raw_date_key AS "rawDateKey"
        FROM tmat_hourly
        WHERE device_id = ${deviceId}::uuid
          AND record_date >= ${startDate}::date
          AND record_date <= ${endDate}::date
        ORDER BY record_date ASC, record_hour ASC;
      `;
    } else {
      // Default to last 30 days
      recordsQuery = sql`
        SELECT 
          id,
          record_date AS "recordDate",
          record_hour AS "recordHour",
          tmat_value::float AS "tmatValue",
          battery::float AS "battery",
          signal::float AS "signal",
          ch_rainfall::float AS "chRainfall",
          raw_date_key AS "rawDateKey"
        FROM tmat_hourly
        WHERE device_id = ${deviceId}::uuid
          AND record_date >= (CURRENT_DATE - INTERVAL '30 days')::date
        ORDER BY record_date ASC, record_hour ASC;
      `;
    }

    const records = await recordsQuery;

    // 3. Calculate statistics
    let sum = 0;
    let validCount = 0;
    let minVal: number | null = null;
    let maxVal: number | null = null;

    for (const r of records) {
      if (r.tmatValue !== null && !isNaN(r.tmatValue)) {
        sum += r.tmatValue;
        validCount++;
        if (minVal === null || r.tmatValue < minVal) minVal = r.tmatValue;
        if (maxVal === null || r.tmatValue > maxVal) maxVal = r.tmatValue;
      }
    }

    const avgVal = validCount > 0 ? Number((sum / validCount).toFixed(2)) : null;

    // Logika Tinggi Muka Air Tanah (TMAT):
    // Semakin kecil angka (cm), semakin dekat ke permukaan tanah = Level Air Tertinggi (Max TMAT)
    // Semakin besar angka (cm), semakin dalam di bawah tanah = Level Air Terendah (Min TMAT)
    const highestWaterLevel = minVal !== null ? Number(minVal.toFixed(2)) : null;
    const lowestWaterLevel = maxVal !== null ? Number(maxVal.toFixed(2)) : null;

    return NextResponse.json({
      device,
      stats: {
        totalRecords: records.length,
        validRecords: validCount,
        avgTmat: avgVal,
        maxTmat: highestWaterLevel, // Level air tertinggi (terdekat permukaan)
        minTmat: lowestWaterLevel,  // Level air terendah (terdalam ke bawah tanah)
      },
      records,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
