import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { db } from "../src/db";
import { companies, estates } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

type MasterItem = {
  Region: string;
  company_code: string;
  wilayah: string;
  company_name: string;
  est_code: string;
  est_alias: string;
  est_complete: string;
  order: string;
};

async function main() {
  console.log("Seeding companies and estates from master_companies.json...");

  const filePath = path.join(process.cwd(), "src", "data", "master_companies.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: MasterItem[] = JSON.parse(raw);

  // Group unique companies by company_code
  const companyMap = new Map<
    string,
    { companyCode: string; companyName: string; region: string }
  >();

  for (const item of data) {
    const code = item.company_code.trim();
    if (!companyMap.has(code)) {
      companyMap.set(code, {
        companyCode: code,
        companyName: item.company_name.trim(),
        region: item.Region.trim(),
      });
    }
  }

  console.log(`Upserting ${companyMap.size} companies...`);
  const companyIdMap = new Map<string, string>(); // code -> id

  for (const comp of Array.from(companyMap.values())) {
    const [upserted] = await db
      .insert(companies)
      .values({
        companyCode: comp.companyCode,
        companyName: comp.companyName,
        region: comp.region,
        active: true,
      })
      .onConflictDoUpdate({
        target: companies.companyCode,
        set: {
          companyName: sql`excluded.company_name`,
          region: sql`coalesce(excluded.region, ${companies.region})`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: companies.id, companyCode: companies.companyCode });

    companyIdMap.set(upserted.companyCode, upserted.id);
  }

  console.log(`Upserting ${data.length} estates...`);
  let estateCount = 0;

  for (const item of data) {
    const companyId = companyIdMap.get(item.company_code.trim());
    if (!companyId) continue;

    const displayOrder = parseInt(item.order, 10) || 0;

    await db
      .insert(estates)
      .values({
        companyId,
        estCode: item.est_code.trim(),
        estAlias: item.est_alias?.trim() || null,
        estComplete: item.est_complete.trim(),
        wilayah: item.wilayah?.trim() || null,
        displayOrder,
        active: true,
      })
      .onConflictDoUpdate({
        target: [estates.companyId, estates.estCode],
        set: {
          estAlias: sql`coalesce(excluded.est_alias, ${estates.estAlias})`,
          estComplete: sql`excluded.est_complete`,
          wilayah: sql`excluded.wilayah`,
          displayOrder: sql`excluded.display_order`,
          updatedAt: new Date(),
        },
      });

    estateCount++;
  }

  console.log(`Successfully seeded ${companyMap.size} companies and ${estateCount} estates.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed master failed:", err);
  process.exit(1);
});
