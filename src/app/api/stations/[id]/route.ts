import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Station ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { latitude, longitude, location } = body;

    let parsedLat: number | null = null;
    let parsedLng: number | null = null;

    if (latitude !== undefined && latitude !== null && latitude !== "") {
      const latNum = Number(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        return NextResponse.json(
          { error: "Latitude harus berupa angka antara -90 dan 90" },
          { status: 400 }
        );
      }
      parsedLat = latNum;
    }

    if (longitude !== undefined && longitude !== null && longitude !== "") {
      const lngNum = Number(longitude);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        return NextResponse.json(
          { error: "Longitude harus berupa angka antara -180 dan 180" },
          { status: 400 }
        );
      }
      parsedLng = lngNum;
    }

    const trimmedLocation = typeof location === "string" ? location.trim() : null;

    const rows = await sql`
      UPDATE rain_stations
      SET
        latitude = ${parsedLat !== null ? parsedLat.toFixed(7) : null},
        longitude = ${parsedLng !== null ? parsedLng.toFixed(7) : null},
        location = COALESCE(${trimmedLocation}, location),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id,
        station_id AS "stationId",
        location,
        latitude,
        longitude,
        updated_at AS "updatedAt";
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Stasiun tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Koordinat stasiun berhasil diperbarui",
      data: rows[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
