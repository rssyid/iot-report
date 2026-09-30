import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { batchId } = params;

    const batches = await sql`
      select
        id,
        requested_start_date as "requestedStartDate",
        requested_end_date as "requestedEndDate",
        company_count as "companyCount",
        success_count as "successCount",
        failed_count as "failedCount",
        status,
        error_message as "errorMessage",
        started_at as "startedAt",
        finished_at as "finishedAt"
      from sync_batches
      where id = ${batchId}::uuid
    `;

    if (batches.length === 0) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const requests = await sql`
      select
        id,
        company_code as "companyCode",
        ending_date as "endingDate",
        arsiran,
        status,
        http_status as "httpStatus",
        rows_received as "rowsReceived",
        error_message as "errorMessage",
        started_at as "startedAt",
        finished_at as "finishedAt"
      from sync_requests
      where batch_id = ${batchId}::uuid
      order by ending_date asc, company_code asc
    `;

    return NextResponse.json({
      batch: batches[0],
      requests,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
