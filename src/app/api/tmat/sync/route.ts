import { NextResponse } from "next/server";
import { runTMATSync } from "@/lib/tmat-sync-engine";
import { db, sql } from "@/db";
import { tmatSyncBatches } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/tmat/sync
// Returns latest sync batches and real-time total record summary
export async function GET() {
  try {
    // 1. Auto-cleanup stale batches stuck in 'running' for more than 15 minutes
    await sql`
      UPDATE tmat_sync_batches 
      SET status = 'failed', 
          error_message = 'Timeout / proses terputus sebelum selesai',
          finished_at = started_at + interval '1 minute'
      WHERE status = 'running' 
        AND started_at < NOW() - interval '15 minutes'
    `.catch(() => {});

    const batches = await db
      .select()
      .from(tmatSyncBatches)
      .orderBy(desc(tmatSyncBatches.startedAt))
      .limit(10);

    const [hourlyCount] = await sql`SELECT count(*)::int as count FROM tmat_hourly`;
    const [devicesCount] = await sql`SELECT count(*)::int as count FROM tmat_devices WHERE active = true`;
    const [latestReading] = await sql`
      SELECT record_date, record_hour 
      FROM tmat_hourly 
      ORDER BY record_date DESC, record_hour DESC 
      LIMIT 1
    `;

    return NextResponse.json(
      {
        data: batches,
        summary: {
          totalHourlyRecords: hourlyCount?.count || 0,
          activeDevicesCount: devicesCount?.count || 0,
          latestDate: latestReading?.record_date || null,
          latestHour: latestReading?.record_hour ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/tmat/sync
// Triggers an incremental or date-ranged sync
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { startDate, endDate, deviceIds, companyCodes } = body;

    // Determine target device count
    let targetDeviceCount = 94;
    try {
      const [devCountRes] = await sql`
        SELECT count(*)::int as count 
        FROM tmat_devices 
        WHERE active = true
      `;
      if (devCountRes?.count) targetDeviceCount = devCountRes.count;
    } catch {}

    const isFullSync = !deviceIds || deviceIds.length > 5;

    if (isFullSync) {
      // Create batch record with accurate deviceCount
      const [batch] = await db
        .insert(tmatSyncBatches)
        .values({
          requestedStartDate: startDate || `${new Date().getFullYear()}-01-01`,
          requestedEndDate: endDate || new Date().toISOString().split("T")[0],
          deviceCount: targetDeviceCount,
          status: "running",
        })
        .returning();

      // Trigger sync in background
      runTMATSync({
        startDate,
        endDate,
        deviceIds,
        companyCodes,
        batchId: batch.id,
      }).catch((err) => {
        console.error("Background TMAT sync error:", err);
      });

      return NextResponse.json({
        message: "Sinkronisasi TMAT dimulai di background",
        batchId: batch.id,
        status: "running",
        deviceCount: targetDeviceCount,
      });
    } else {
      // Small sync, wait for result
      const result = await runTMATSync({
        startDate,
        endDate,
        deviceIds,
        companyCodes,
      });

      return NextResponse.json({ data: result });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
