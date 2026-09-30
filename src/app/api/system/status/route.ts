import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    // 1. Check DB connectivity
    await sql`SELECT 1`;

    // 2. Ombrometer / Rainfall stats
    const [stationCountRes] = await sql`
      SELECT count(*)::int as count 
      FROM rain_stations 
      WHERE active = true
    `;

    const [latestRainBatch] = await sql`
      SELECT 
        started_at,
        finished_at,
        status, 
        requested_start_date,
        requested_end_date
      FROM sync_batches 
      ORDER BY started_at DESC 
      LIMIT 1
    `;


    const [latestRainData] = await sql`
      SELECT MAX(rain_date) as "maxDate" 
      FROM rainfall_daily
    `;

    // 3. TMAT stats
    const [tmatDeviceCountRes] = await sql`
      SELECT count(*)::int as count 
      FROM tmat_devices 
      WHERE active = true
    `;

    const [latestTmatBatch] = await sql`
      SELECT 
        started_at AS "startedAt", 
        finished_at AS "finishedAt", 
        status, 
        requested_start_date AS "requestedStartDate",
        requested_end_date AS "requestedEndDate"
      FROM tmat_sync_batches 
      ORDER BY started_at DESC 
      LIMIT 1
    `;

    const [latestTmatData] = await sql`
      SELECT record_date, record_hour 
      FROM tmat_hourly 
      ORDER BY record_date DESC, record_hour DESC 
      LIMIT 1
    `;

    const lastRainAt =
      latestRainBatch?.finished_at ||
      latestRainBatch?.started_at ||
      (latestRainBatch as any)?.finishedAt ||
      (latestRainBatch as any)?.startedAt ||
      null;

    const lastTmatAt =
      latestTmatBatch?.finishedAt ||
      latestTmatBatch?.startedAt ||
      (latestTmatBatch as any)?.finished_at ||
      (latestTmatBatch as any)?.started_at ||
      null;

    return NextResponse.json(
      {
        database: "CONNECTED",
        ombrometer: {
          activeStations: stationCountRes?.count ?? 34,
          lastSyncAt: lastRainAt,
          lastSyncStatus: latestRainBatch?.status || null,
          latestDataDate: latestRainData?.maxDate || (latestRainBatch as any)?.requested_end_date || latestRainBatch?.requestedEndDate || null,
        },
        tmat: {
          activeDevices: tmatDeviceCountRes?.count ?? 94,
          lastSyncAt: lastTmatAt,
          lastSyncStatus: latestTmatBatch?.status || null,
          latestDataDate: latestTmatData?.record_date || latestTmatBatch?.requestedEndDate || null,
          latestDataHour: latestTmatData?.record_hour ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        database: "ERROR",
        error: error.message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
