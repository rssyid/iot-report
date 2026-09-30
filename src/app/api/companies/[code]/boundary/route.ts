import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";
import { sanitizeAndValidateGeoJson } from "@/lib/geojson";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = decodeURIComponent(params.code);
    const rows = await sql`
      SELECT 
        id,
        company_code AS "companyCode",
        company_name AS "companyName",
        boundary_geojson AS "boundaryGeojson"
      FROM companies
      WHERE UPPER(company_code) = UPPER(${code})
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: `Perusahaan ${code} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: rows[0],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = decodeURIComponent(params.code);
    const body = await request.json();
    const rawGeojson = body.geojson;

    if (!rawGeojson) {
      return NextResponse.json(
        { error: "Data GeoJSON tidak ditemukan dalam request body" },
        { status: 400 }
      );
    }

    // Sanitize and reproject coordinates (EPSG:3857 -> WGS84)
    const { geojson, isReprojected, featureCount, geometryTypes, sampleCoordinate } =
      sanitizeAndValidateGeoJson(rawGeojson);

    const geojsonString = JSON.stringify(geojson);

    const rows = await sql`
      UPDATE companies
      SET 
        boundary_geojson = ${geojsonString},
        updated_at = NOW()
      WHERE UPPER(company_code) = UPPER(${code})
      RETURNING 
        id,
        company_code AS "companyCode",
        company_name AS "companyName",
        (boundary_geojson IS NOT NULL) AS "hasBoundary";
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: `Perusahaan ${code} tidak ditemukan di database` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Batas GeoJSON untuk ${code} berhasil disimpan${
        isReprojected ? " (Otomatis dikonversi dari EPSG:3857 ke WGS84)" : ""
      }`,
      data: {
        ...rows[0],
        featureCount,
        geometryTypes,
        isReprojected,
        sampleCoordinate,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = decodeURIComponent(params.code);
    const rows = await sql`
      UPDATE companies
      SET 
        boundary_geojson = NULL,
        updated_at = NOW()
      WHERE UPPER(company_code) = UPPER(${code})
      RETURNING id, company_code AS "companyCode";
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: `Perusahaan ${code} tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Batas GeoJSON untuk ${code} berhasil dihapus`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
