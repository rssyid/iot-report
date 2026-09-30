import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { format } from "date-fns";
import { db } from "../src/db";
import { companies } from "../src/db/schema";
import { runSync } from "../src/lib/sync-engine";

async function main() {
  const args = process.argv.slice(2);
  const companyArg = args.find((a) => a.startsWith("--company="))?.split("=")[1];
  const startArg = args.find((a) => a.startsWith("--start="))?.split("=")[1];
  const endArg = args.find((a) => a.startsWith("--end="))?.split("=")[1];

  const startDate = startArg || process.env.RAINFALL_START_DATE || "2025-01-01";
  const endDate = endArg || format(new Date(), "yyyy-MM-dd");

  let companyCodes: string[] = [];

  if (companyArg) {
    companyCodes = companyArg.split(",").map((c) => c.trim());
  } else {
    const all = await db.select({ code: companies.companyCode }).from(companies);
    companyCodes = all.map((c) => c.code);
  }

  if (companyCodes.length === 0) {
    console.error("No companies found to sync! Did you run npm run db:seed:master?");
    process.exit(1);
  }

  console.log("=== RAINFALL HISTORICAL SYNC ===");
  console.log(`Range: ${startDate} -> ${endDate}`);
  console.log(`Companies (${companyCodes.length}): ${companyCodes.join(", ")}`);
  console.log("================================");

  const result = await runSync({
    startDate,
    endDate,
    companyCodes,
  });

  console.log("\n=== SYNC COMPLETED ===");
  console.log(`Batch ID: ${result.batchId}`);
  console.log(`Status: ${result.status}`);
  console.log(`Successful Requests: ${result.successfulRequests}`);
  console.log(`Failed Requests: ${result.failedRequests}`);
  console.log(`Total Rows Upserted: ${result.rowsUpserted}`);
  if (result.warnings.length > 0) {
    console.log(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.warn(` - ${w}`));
  }
  console.log("======================");

  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed with error:", err);
  process.exit(1);
});
