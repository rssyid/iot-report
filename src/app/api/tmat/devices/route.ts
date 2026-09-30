import { NextResponse } from "next/server";
import { sql } from "@/db";
import { db } from "@/db";
import { tmatDevices } from "@/db/schema";

export const dynamic = "force-dynamic";

// GET /api/tmat/devices
// Returns list of all TMAT devices with latest reading snapshot
export async function GET() {
  try {
    const rows = await sql`
      WITH latest_readings AS (
        SELECT DISTINCT ON (device_id)
          device_id,
          record_date,
          record_hour,
          tmat_value,
          battery,
          signal,
          ch_rainfall,
          created_at
        FROM tmat_hourly
        ORDER BY device_id, record_date DESC, record_hour DESC
      )
      SELECT 
        d.id,
        d.company_code AS "companyCode",
        d.device_id AS "deviceId",
        d.device_name AS "deviceName",
        d.estate,
        d.block,
        d.latitude,
        d.longitude,
        d.active,
        d.first_seen_at AS "firstSeenAt",
        d.last_seen_at AS "lastSeenAt",
        d.created_at AS "createdAt",
        d.updated_at AS "updatedAt",
        lr.record_date AS "latestDate",
        lr.record_hour AS "latestHour",
        lr.tmat_value AS "latestTmat",
        lr.battery AS "latestBattery",
        lr.signal AS "latestSignal",
        lr.ch_rainfall AS "latestCh"
      FROM tmat_devices d
      LEFT JOIN latest_readings lr ON d.id = lr.device_id
      ORDER BY d.company_code ASC, d.estate ASC, d.block ASC, d.device_name ASC;
    `;

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/tmat/devices
// Create a new TMAT device
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyCode,
      deviceId,
      deviceName,
      estate,
      block,
      latitude,
      longitude,
      active = true,
    } = body;

    if (!companyCode || !deviceId || !deviceName || !estate || !block) {
      return NextResponse.json(
        { error: "companyCode, deviceId, deviceName, estate, dan block wajib diisi." },
        { status: 400 }
      );
    }

    const [newDevice] = await db
      .insert(tmatDevices)
      .values({
        companyCode: companyCode.trim().toUpperCase(),
        deviceId: String(deviceId).trim(),
        deviceName: deviceName.trim(),
        estate: estate.trim().toUpperCase(),
        block: block.trim().toUpperCase(),
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        active: Boolean(active),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ data: newDevice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
