import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await sql`
      select
        c.id,
        c.company_code,
        c.company_name,
        c.region,
        c.active,
        (c.boundary_geojson IS NOT NULL) AS "hasBoundary",
        (
          select count(*)::integer
          from estates e
          where e.company_id = c.id and e.active = true
        ) as estate_count,
        (
          select count(*)::integer
          from rain_stations rs
          where rs.company_id = c.id and rs.active = true
        ) as station_count,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'id', e.id,
                'estCode', e.est_code,
                'estAlias', e.est_alias,
                'estComplete', e.est_complete,
                'wilayah', e.wilayah,
                'displayOrder', e.display_order
              ) order by e.display_order asc, e.est_code asc
            )
            from estates e
            where e.company_id = c.id and e.active = true
          ),
          '[]'::json
        ) as estates
      from companies c
      where c.active = true
      order by c.company_code;
    `;

    return NextResponse.json(
      { data: rows },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
