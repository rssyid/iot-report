import { db } from "../db";
import {
  companies,
  estates,
  rainStations,
  rainfallDaily,
  syncBatches,
  syncRequests,
  apiRawResponses,
} from "../db/schema";
import { eq, and, sql, or } from "drizzle-orm";
import {
  buildEndingDates,
  buildSummaryDateMap,
  isDateKey,
  parseApiDateKey,
} from "./date-parser";
import { fetchRainfall4Weeks, type StationRow } from "./rainfall-api";

function createConcurrencyLimiter(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    active--;
    if (queue.length > 0) {
      active++;
      const run = queue.shift();
      run?.();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(next);
      };

      if (active < concurrency) {
        active++;
        execute();
      } else {
        queue.push(execute);
      }
    });
  };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

export type SyncOptions = {
  startDate: string;
  endDate: string;
  companyCodes: string[];
  arsiran?: number;
  batchId?: string;
};

export type SyncResult = {
  batchId: string;
  status: "completed" | "failed" | "partial";
  companies: number;
  successfulRequests: number;
  failedRequests: number;
  rowsUpserted: number;
  warnings: string[];
};

export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const { startDate, endDate, companyCodes } = options;
  const arsiran = options.arsiran ?? 7;
  const warnings: string[] = [];
  const endingDates = buildEndingDates(startDate, endDate);
  const totalTasksCount = companyCodes.length * endingDates.length;

  // Create or retrieve batch
  let batchId = options.batchId;
  if (!batchId) {
    const [newBatch] = await db
      .insert(syncBatches)
      .values({
        requestedStartDate: startDate,
        requestedEndDate: endDate,
        companyCount: totalTasksCount,
        status: "running",
      })
      .returning({ id: syncBatches.id });
    batchId = newBatch.id;
  } else {
    // Update companyCount to accurate total task count if batch pre-created
    await db
      .update(syncBatches)
      .set({ companyCount: totalTasksCount })
      .where(eq(syncBatches.id, batchId))
      .catch(() => {});
  }

  // Pre-load companies and estates into fast memory cache
  const allCompanies = await db.select().from(companies);
  const companyMap = new Map(allCompanies.map((c) => [c.companyCode, c]));

  const allEstates = await db.select().from(estates);
  // Map keyed by `${companyId}:${estCodeOrAlias}`
  const estateMap = new Map<string, typeof estates.$inferSelect>();
  for (const est of allEstates) {
    estateMap.set(`${est.companyId}:${est.estCode.toUpperCase()}`, est);
    if (est.estAlias) {
      estateMap.set(`${est.companyId}:${est.estAlias.toUpperCase()}`, est);
    }
  }

  // Station cache to minimize database hits
  const stationCache = new Map<string, string>(); // station_id -> uuid
  const existingStations = await db.select().from(rainStations);
  for (const st of existingStations) {
    stationCache.set(st.stationId, st.id);
  }

  const concurrency = Number(process.env.SYNC_MAX_CONCURRENCY || "5");
  const limit = createConcurrencyLimiter(concurrency);

  let successfulRequests = 0;
  let failedRequests = 0;
  let totalRowsUpserted = 0;

  // Process all companies and ending dates
  const tasks: Promise<void>[] = [];

  for (const companyCode of companyCodes) {
    const comp = companyMap.get(companyCode);

    for (const endingDate of endingDates) {
      tasks.push(
        limit(async () => {
          // Log request record with retry
          const [requestRecord] = await withRetry(() =>
            db
              .insert(syncRequests)
              .values({
                batchId: batchId!,
                companyCode,
                endingDate,
                arsiran,
                status: "pending",
                startedAt: new Date(),
              })
              .returning({ id: syncRequests.id })
          );

          const requestId = requestRecord.id;

          try {
            const apiResult = await fetchRainfall4Weeks({
              companyCode,
              endingDate,
              arsiran,
            });

            // Optionally store raw response for auditing/debugging
            try {
              await withRetry(() =>
                db.insert(apiRawResponses).values({
                  syncRequestId: requestId,
                  responseJson: apiResult.raw as Record<string, unknown>,
                })
              );
            } catch (rawErr) {
              console.warn("Could not save raw response:", rawErr);
            }

            const { stationRows, dailySummaryRows } = apiResult;

            if (stationRows.length === 0) {
              warnings.push(
                `No stations returned for ${companyCode} ending on ${endingDate}`
              );
            }

            const summaryDateMap = buildSummaryDateMap(dailySummaryRows);
            const dailyRecordsToUpsert: Array<{
              companyId: string | null;
              estateId: string | null;
              stationId: string;
              rainDate: string;
              rainfallMm: string;
              sourceMtd: string | null;
              sourceArsiran: number;
              sourceEndingDate: string;
              rawDateKey: string;
              importBatchId: string;
            }> = [];

            for (const st of stationRows) {
              const stationCode = st.Station_ID?.trim();
              if (!stationCode) continue;

              const companyId = comp?.id ?? null;
              const estCodeLookup = st.EstCode?.trim().toUpperCase();
              const matchedEstate = companyId && estCodeLookup
                ? estateMap.get(`${companyId}:${estCodeLookup}`)
                : null;

              // Ensure station exists in rain_stations
              let stationDbId = stationCache.get(stationCode);
              if (!stationDbId) {
                const [upsertedStation] = await withRetry(() =>
                  db
                    .insert(rainStations)
                    .values({
                      stationId: stationCode,
                      companyId,
                      estateId: matchedEstate?.id ?? null,
                      sourceEstCode: st.EstCode ?? null,
                      location: st.Location ?? null,
                      firstSeenAt: new Date(),
                      lastSeenAt: new Date(),
                    })
                    .onConflictDoUpdate({
                      target: rainStations.stationId,
                      set: {
                        companyId: sql`coalesce(${rainStations.companyId}, excluded.company_id)`,
                        estateId: sql`coalesce(${rainStations.estateId}, excluded.estate_id)`,
                        location: sql`coalesce(excluded.location, ${rainStations.location})`,
                        lastSeenAt: new Date(),
                        updatedAt: new Date(),
                      },
                    })
                    .returning({ id: rainStations.id })
                );

                stationDbId = upsertedStation.id;
                stationCache.set(stationCode, stationDbId);
              }

              // Extract dynamic daily rainfall values
              for (const key of Object.keys(st)) {
                if (!isDateKey(key)) continue;

                const parsedDate = parseApiDateKey(key, endingDate, summaryDateMap);
                if (!parsedDate) continue;

                // Restrict to requested date range
                if (parsedDate < startDate || parsedDate > endDate) continue;

                const rawVal = st[key];
                const rainfallMm = Number(rawVal) || 0;
                const mtdVal = st.MTD != null && st.MTD !== "" ? Number(st.MTD) : null;

                dailyRecordsToUpsert.push({
                  companyId,
                  estateId: matchedEstate?.id ?? null,
                  stationId: stationDbId,
                  rainDate: parsedDate,
                  rainfallMm: rainfallMm.toFixed(2),
                  sourceMtd: mtdVal != null ? mtdVal.toFixed(2) : null,
                  sourceArsiran: arsiran,
                  sourceEndingDate: endingDate,
                  rawDateKey: key,
                  importBatchId: batchId!,
                });
              }
            }

            // Chunked idempotent upsert to avoid large SQL statement limits
            const chunkSize = 200;
            for (let i = 0; i < dailyRecordsToUpsert.length; i += chunkSize) {
              const chunk = dailyRecordsToUpsert.slice(i, i + chunkSize);
              if (chunk.length === 0) continue;

              await withRetry(() =>
                db
                  .insert(rainfallDaily)
                  .values(chunk)
                  .onConflictDoUpdate({
                    target: [rainfallDaily.stationId, rainfallDaily.rainDate],
                    set: {
                      companyId: sql`coalesce(excluded.company_id, ${rainfallDaily.companyId})`,
                      estateId: sql`coalesce(excluded.estate_id, ${rainfallDaily.estateId})`,
                      rainfallMm: sql`excluded.rainfall_mm`,
                      sourceMtd: sql`excluded.source_mtd`,
                      sourceArsiran: sql`excluded.source_arsiran`,
                      sourceEndingDate: sql`excluded.source_ending_date`,
                      rawDateKey: sql`excluded.raw_date_key`,
                      importBatchId: sql`coalesce(excluded.import_batch_id, ${rainfallDaily.importBatchId})`,
                      updatedAt: new Date(),
                    },
                  })
              );
            }

            totalRowsUpserted += dailyRecordsToUpsert.length;
            successfulRequests++;

            const progress = successfulRequests + failedRequests;
            console.log(
              `[${progress}/${tasks.length}] ${companyCode} @ ${endingDate} -> +${dailyRecordsToUpsert.length} rows (Total upserted: ${totalRowsUpserted})`
            );

            try {
              await withRetry(() =>
                db
                  .update(syncRequests)
                  .set({
                    status: "completed",
                    httpStatus: 200,
                    rowsReceived: dailyRecordsToUpsert.length,
                    finishedAt: new Date(),
                  })
                  .where(eq(syncRequests.id, requestId))
              );
            } catch (dbErr) {
              console.warn("Could not update syncRequest status to completed:", dbErr);
            }

            // Live progress update to batch
            await db
              .update(syncBatches)
              .set({
                successCount: successfulRequests,
                failedCount: failedRequests,
              })
              .where(eq(syncBatches.id, batchId!))
              .catch(() => {});
          } catch (err: unknown) {
            failedRequests++;
            const errMsg = err instanceof Error ? err.message : String(err);
            warnings.push(
              `Error fetching ${companyCode} ending on ${endingDate}: ${errMsg}`
            );

            const progress = successfulRequests + failedRequests;
            console.warn(
              `[${progress}/${tasks.length}] FAILED: ${companyCode} @ ${endingDate}: ${errMsg}`
            );

            try {
              await withRetry(() =>
                db
                  .update(syncRequests)
                  .set({
                    status: "failed",
                    errorMessage: errMsg,
                    finishedAt: new Date(),
                  })
                  .where(eq(syncRequests.id, requestId))
              );
            } catch (dbErr) {
              console.warn("Could not update syncRequest status to failed:", dbErr);
            }

            // Live progress update to batch on failure
            await db
              .update(syncBatches)
              .set({
                successCount: successfulRequests,
                failedCount: failedRequests,
              })
              .where(eq(syncBatches.id, batchId!))
              .catch(() => {});
          }
        })
      );
    }
  }

  await Promise.all(tasks);

  const finalStatus =
    failedRequests === 0
      ? "completed"
      : successfulRequests > 0
      ? "partial"
      : "failed";

  try {
    await withRetry(() =>
      db
        .update(syncBatches)
        .set({
          status: finalStatus,
          successCount: successfulRequests,
          failedCount: failedRequests,
          finishedAt: new Date(),
          errorMessage: warnings.length > 0 ? warnings.slice(0, 5).join("; ") : null,
        })
        .where(eq(syncBatches.id, batchId))
    );
  } catch (bErr) {
    console.warn("Could not update final syncBatch record:", bErr);
  }

  return {
    batchId,
    status: finalStatus,
    companies: companyCodes.length,
    successfulRequests,
    failedRequests,
    rowsUpserted: totalRowsUpserted,
    warnings,
  };
}
