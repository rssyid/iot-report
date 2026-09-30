import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync-engine";
import { sql } from "@/db";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Auto-cleanup stale batches stuck in 'running' for more than 10 minutes
    await sql`
      UPDATE sync_batches 
      SET status = 'failed', 
          error_message = 'Timeout / proses terputus sebelum selesai',
          finished_at = started_at + interval '1 minute'
      WHERE status = 'running' 
        AND started_at < NOW() - interval '10 minutes'
    `.catch(() => {});

    // 2. Query recent batches
    const batches = await sql`
      SELECT 
        b.id,
        b.status,
        b.requested_start_date as "requestedStartDate",
        b.requested_end_date as "requestedEndDate",
        b.started_at as "startedAt",
        b.finished_at as "finishedAt",
        b.company_count as "companyCount",
        b.success_count as "successCount",
        b.failed_count as "failedCount",
        b.error_message as "errorMessage",
        COALESCE(SUM(r.rows_received), 0)::int as "totalRows"
      FROM sync_batches b
      LEFT JOIN sync_requests r ON b.id = r.batch_id
      GROUP BY b.id
      ORDER BY b.started_at DESC
      LIMIT 15
    `;

    return NextResponse.json(
      { data: batches },
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

const syncSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  companyCodes: z.array(z.string()).min(1, "At least one company must be selected"),
  arsiran: z.number().int().positive().optional().default(7),
  async: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = syncSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { startDate, endDate, companyCodes, arsiran, async: isAsync } = validated.data;

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "startDate cannot be after endDate" },
        { status: 400 }
      );
    }

    if (isAsync) {
      // Create batch record immediately
      const [batch] = await sql`
        INSERT INTO sync_batches (
          requested_start_date, 
          requested_end_date, 
          company_count, 
          status, 
          started_at
        ) VALUES (
          ${startDate}, 
          ${endDate}, 
          ${companyCodes.length}, 
          'running', 
          NOW()
        )
        RETURNING id
      `;

      // Trigger sync in background non-blocking
      runSync({
        startDate,
        endDate,
        companyCodes,
        arsiran,
        batchId: batch.id,
      }).catch((err) => {
        console.error("Background rainfall sync error:", err);
      });

      return NextResponse.json({
        message: "Sinkronisasi Curah Hujan dimulai di background",
        batchId: batch.id,
        status: "running",
      });
    }

    // Synchronous execution fallback if async is explicitly false
    const result = await runSync({
      startDate,
      endDate,
      companyCodes,
      arsiran,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
