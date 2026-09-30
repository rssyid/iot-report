import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runTMATSync } from "../src/lib/tmat-sync-engine";

async function main() {
  console.log("==========================================");
  console.log("Starting TMAT Historical Sync (2026 -> Now)");
  console.log("==========================================");

  const t0 = Date.now();

  const result = await runTMATSync({
    startDate: "2026-01-01",
    endDate: "2026-09-28",
    concurrency: 6,
    onProgress: (p) => {
      const icon =
        p.status === "success"
          ? "✓"
          : p.status === "skipped"
          ? "↷"
          : "✗";
      console.log(
        `[${p.deviceIndex}/${p.totalDevices}] ${icon} ${p.deviceCode}: ${p.rows} rows ${
          p.message ? `(${p.message})` : ""
        }`
      );
    },
  });

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("==========================================");
  console.log(`Sync Finished in ${durationSec}s`);
  console.log(`Status: ${result.status}`);
  console.log(`Devices: ${result.deviceCount} (Success: ${result.successCount}, Failed: ${result.failedCount})`);
  console.log(`Total Rows Upserted: ${result.totalRows}`);
  console.log("==========================================");

  process.exit(0);
}

main().catch((err) => {
  console.error("Historical sync failed:", err);
  process.exit(1);
});
