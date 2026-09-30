import { NextResponse } from "next/server";
import { db } from "@/db";
import { tmatDevices } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// PUT /api/tmat/devices/[id]
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.companyCode !== undefined) updateData.companyCode = String(body.companyCode).trim().toUpperCase();
    if (body.deviceId !== undefined) updateData.deviceId = String(body.deviceId).trim();
    if (body.deviceName !== undefined) updateData.deviceName = String(body.deviceName).trim();
    if (body.estate !== undefined) updateData.estate = String(body.estate).trim().toUpperCase();
    if (body.block !== undefined) updateData.block = String(body.block).trim().toUpperCase();
    if (body.latitude !== undefined) updateData.latitude = body.latitude ? String(body.latitude) : null;
    if (body.longitude !== undefined) updateData.longitude = body.longitude ? String(body.longitude) : null;
    if (body.active !== undefined) updateData.active = Boolean(body.active);

    const [updated] = await db
      .update(tmatDevices)
      .set(updateData)
      .where(eq(tmatDevices.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/tmat/devices/[id]
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const [deleted] = await db
      .delete(tmatDevices)
      .where(eq(tmatDevices.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Device berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
