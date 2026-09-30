import { db } from "../db";
import { tmatDevices, tmatHourly, tmatSyncBatches } from "../db/schema";
import { eq, sql, max } from "drizzle-orm";
import { format, parseISO, addDays, endOfMonth, min, isAfter } from "date-fns";

export interface TMATHourlyRaw {
  dateformatted: string;
  tanggal?: string;
  hari?: number;
  jam: number;
  tanggaldata?: string;
  data: number | null;
  battery: number | null;
  sinyal: number | null;
  jamdata?: number;
  rowno?: number;
  rownom?: number;
  hariLabel?: string;
  labeljam?: number;
  clock?: string;
  CH?: number | null;
}

const TMAT_API_URL =
  process.env.TMAT_API_URL ||
  "https://app.gis-div.com/iot/Service/webservice.asmx/GetMonthlyTMATHolykell";

/**
 * Concurrency limiter implementation
 */
export function createConcurrencyLimiter(concurrency: number) {
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

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500
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

/**
 * Fetch raw TMAT records for a single device over a date range from API
 */
export async function fetchTMATDeviceRange(
  companyCode: string,
  deviceId: string,
  startingDate: string,
  endingDate: string
): Promise<TMATHourlyRaw[]> {
  return withRetry(async () => {
    const payload = {
      companycode: companyCode,
      deviceid: deviceId,
      startingdate: startingDate,
      endingdate: endingDate,
      rainfall: "",
    };

    const res = await fetch(TMAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const json = await res.json();
    if (!json || typeof json.d !== "string") {
      return [];
    }

    const parsed: TMATHourlyRaw[] = JSON.parse(json.d);
    return Array.isArray(parsed) ? parsed : [];
  });
}

/**
 * Split a wide date range (e.g. 2026-01-01 to 2026-09-28) into monthly chunks
 * to avoid endpoint 500 timeouts.
 */
export function splitIntoMonthlyChunks(
  startDateStr: string,
  endDateStr: string
): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  if (isAfter(start, end)) return [];

  let current = start;
  while (!isAfter(current, end)) {
    const chunkEnd = min([endOfMonth(current), end]);
    chunks.push({
      start: format(current, "yyyy-MM-dd"),
      end: format(chunkEnd, "yyyy-MM-dd"),
    });
    current = addDays(chunkEnd, 1);
  }

  return chunks;
}

export interface TMATSyncOptions {
  startDate?: string; // If omitted, auto-detects from latest record
  endDate?: string;   // Defaults to today
  deviceIds?: string[]; // Specific devices or all active if omitted
  companyCodes?: string[];
  concurrency?: number;
  batchId?: string;
  onProgress?: (progress: {
    deviceIndex: number;
    totalDevices: number;
    deviceCode: string;
    rows: number;
    status: "success" | "error" | "skipped";
    message?: string;
  }) => void;
}

export interface TMATSyncResult {
  batchId: string;
  status: "completed" | "partial" | "failed";
  deviceCount: number;
  successCount: number;
  failedCount: number;
  totalRows: number;
  errorMessage?: string;
}

/**
 * Main TMAT sync function
 */
export async function runTMATSync(options: TMATSyncOptions = {}): Promise<TMATSyncResult> {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const defaultEndDate = options.endDate || todayStr;
  const concurrencyLimit = options.concurrency || 3;
  const limiter = createConcurrencyLimiter(concurrencyLimit);

  // 1. Fetch devices to sync
  const query = db.select().from(tmatDevices);
  let devicesList = await query;

  if (options.companyCodes && options.companyCodes.length > 0) {
    devicesList = devicesList.filter((d) =>
      options.companyCodes!.includes(d.companyCode)
    );
  }

  if (options.deviceIds && options.deviceIds.length > 0) {
    devicesList = devicesList.filter((d) =>
      options.deviceIds!.includes(d.deviceId)
    );
  }

  // Filter only active devices
  devicesList = devicesList.filter((d) => d.active);

  if (devicesList.length === 0) {
    return {
      batchId: options.batchId || "no-op",
      status: "completed",
      deviceCount: 0,
      successCount: 0,
      failedCount: 0,
      totalRows: 0,
    };
  }

  // 2. Create or reuse batch record
  let batchId = options.batchId;
  const currentYearStart = `${new Date().getFullYear()}-01-01`;
  const overallStart = options.startDate || currentYearStart;
  if (!batchId) {
    const [batch] = await withRetry(async () => {
      return await db
        .insert(tmatSyncBatches)
        .values({
          requestedStartDate: overallStart,
          requestedEndDate: defaultEndDate,
          deviceCount: devicesList.length,
          status: "running",
        })
        .returning();
    });
    batchId = batch.id;
  }

  let totalUpsertedRows = 0;
  let successDevices = 0;
  let failedDevices = 0;

  // 3. Process devices
  const tasks = devicesList.map((device, idx) => {
    return limiter(async () => {
      try {
        // Determine sync start date for this device
        let devStartDate = options.startDate;
        if (!devStartDate) {
          // Auto-detect empty dates / last record in DB
          const maxRec = await withRetry(async () => {
            const [r] = await db
              .select({ maxDate: max(tmatHourly.recordDate) })
              .from(tmatHourly)
              .where(eq(tmatHourly.deviceId, device.id));
            return r;
          });

          if (maxRec && maxRec.maxDate) {
            // Start from maxDate so new/latest hours of that date (up to current hour) are fetched
            devStartDate = maxRec.maxDate;
            if (isAfter(parseISO(devStartDate), parseISO(defaultEndDate))) {
              options.onProgress?.({
                deviceIndex: idx + 1,
                totalDevices: devicesList.length,
                deviceCode: `${device.companyCode} / ${device.deviceId}`,
                rows: 0,
                status: "skipped",
                message: `Already up to date (${maxRec.maxDate})`,
              });
              successDevices++;
              return;
            }
          } else {
            devStartDate = currentYearStart;
          }
        }

        // Generate monthly chunks
        const chunks = splitIntoMonthlyChunks(devStartDate, defaultEndDate);
        let deviceRowsCount = 0;

        for (const chunk of chunks) {
          const rawRows = await fetchTMATDeviceRange(
            device.companyCode,
            device.deviceId,
            chunk.start,
            chunk.end
          );

          if (rawRows.length > 0) {
            const BATCH_SIZE = 250;
            for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
              const slice = rawRows.slice(i, i + BATCH_SIZE);
              const insertValues = slice.map((row) => ({
                deviceId: device.id,
                recordDate: row.dateformatted,
                recordHour: Number(row.jam),
                tmatValue:
                  row.data != null && !isNaN(Number(row.data))
                    ? String(Number(row.data).toFixed(4))
                    : null,
                battery:
                  row.battery != null && !isNaN(Number(row.battery))
                    ? String(Number(row.battery))
                    : null,
                signal:
                  row.sinyal != null && !isNaN(Number(row.sinyal))
                    ? String(Number(row.sinyal))
                    : null,
                chRainfall:
                  row.CH != null && !isNaN(Number(row.CH))
                    ? String(Number(row.CH))
                    : null,
                rawDateKey: row.dateformatted,
                importBatchId: batchId,
              }));

              await withRetry(async () => {
                await db
                  .insert(tmatHourly)
                  .values(insertValues)
                  .onConflictDoUpdate({
                    target: [
                      tmatHourly.deviceId,
                      tmatHourly.recordDate,
                      tmatHourly.recordHour,
                    ],
                    set: {
                      tmatValue: sql`EXCLUDED.tmat_value`,
                      battery: sql`EXCLUDED.battery`,
                      signal: sql`EXCLUDED.signal`,
                      chRainfall: sql`EXCLUDED.ch_rainfall`,
                      rawDateKey: sql`EXCLUDED.raw_date_key`,
                      importBatchId: sql`EXCLUDED.import_batch_id`,
                    },
                  });
              }, 4, 1200);

              deviceRowsCount += slice.length;
            }
          }
        }

        // Update device lastSeenAt
        await withRetry(async () => {
          await db
            .update(tmatDevices)
            .set({
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tmatDevices.id, device.id));
        });

        totalUpsertedRows += deviceRowsCount;
        successDevices++;

        // Live progress update to batch record
        await withRetry(async () => {
          await db
            .update(tmatSyncBatches)
            .set({
              successCount: successDevices,
              failedCount: failedDevices,
              totalRows: totalUpsertedRows,
            })
            .where(eq(tmatSyncBatches.id, batchId));
        }).catch(() => {});

        options.onProgress?.({
          deviceIndex: idx + 1,
          totalDevices: devicesList.length,
          deviceCode: `${device.companyCode} / ${device.deviceId}`,
          rows: deviceRowsCount,
          status: "success",
        });
      } catch (err: any) {
        failedDevices++;
        options.onProgress?.({
          deviceIndex: idx + 1,
          totalDevices: devicesList.length,
          deviceCode: `${device.companyCode} / ${device.deviceId}`,
          rows: 0,
          status: "error",
          message: err.message,
        });
      }
    });
  });

  await Promise.all(tasks);

  const finalStatus =
    failedDevices === 0
      ? "completed"
      : successDevices > 0
      ? "partial"
      : "failed";

  // Update batch record
  await withRetry(async () => {
    await db
      .update(tmatSyncBatches)
      .set({
        status: finalStatus,
        successCount: successDevices,
        failedCount: failedDevices,
        totalRows: totalUpsertedRows,
        finishedAt: new Date(),
      })
      .where(eq(tmatSyncBatches.id, batchId));
  });

  return {
    batchId,
    status: finalStatus,
    deviceCount: devicesList.length,
    successCount: successDevices,
    failedCount: failedDevices,
    totalRows: totalUpsertedRows,
  };
}
