import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        rs.id,
        rs.station_id AS "stationId",
        rs.company_id AS "companyId",
        c.company_code AS "companyCode",
        c.company_name AS "companyName",
        rs.estate_id AS "estateId",
        e.est_code AS "estCode",
        e.est_alias AS "estAlias",
        e.est_complete AS "estComplete",
        e.display_order AS "displayOrder",
        rs.location,
        rs.latitude,
        rs.longitude,
        rs.active,
        rs.last_seen_at AS "lastSeenAt"
      FROM rain_stations rs
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN estates e ON rs.estate_id = e.id
      ORDER BY c.company_code ASC, COALESCE(e.display_order, 999) ASC, rs.station_id ASC;
    `;

    return NextResponse.json({ data: rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
