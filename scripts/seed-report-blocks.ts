import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { iotReportBlocks, tmatDevices, rainStations } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding sample iot_report_blocks for PT.THIP...");

  // Load devices and rain stations for lookup
  const allDevices = await db.select().from(tmatDevices);
  const allStations = await db.select().from(rainStations);

  const findDev = (devId: string) => allDevices.find((d) => d.deviceId === devId)?.id || null;
  const findStation = (stId: string) => allStations.find((s) => s.stationId === stId)?.id || null;

  const rows = [
    {
      companyCode: "PT.THIP",
      displayOrder: 1,
      wilayah: 1,
      estate: "MER",
      block: "7103",
      statusTanam: "Muda",
      idl: "Sudah",
      tglSurvey: "2026-08-15",
      rainStationId: findStation("ST-RF-THP1-046"),
      tmatDeviceId: findDev("418"),
      pic: "Joni Pambudi",
      rekomendasi: "1. IDL\n2. Tundung Weir\n3. Reverse pumping",
      targetPlan: "1. [Done]\n2. [Done] W4 Feb 26\n3. W3-Agu 26",
      progressLastWeek: "70",
      progressThisWeek: "70",
    },
    {
      companyCode: "PT.THIP",
      displayOrder: 2,
      wilayah: 1,
      estate: "MER",
      block: "7302",
      statusTanam: "Muda",
      idl: "Sudah",
      tglSurvey: "2026-08-20",
      rainStationId: findStation("ST-RF-THP1-046"),
      tmatDeviceId: findDev("413"),
      pic: "Joni Pambudi",
      rekomendasi: "1. IDL\n2. Tundung Weir\n3. Reverse pumping",
      targetPlan: "1. [Done]\n2. [Done] W1 Feb 26\n3. 5jam/hari",
      progressLastWeek: "70",
      progressThisWeek: "70",
    },
    {
      companyCode: "PT.THIP",
      displayOrder: 3,
      wilayah: 1,
      estate: "KEP",
      block: "4303",
      statusTanam: "Muda",
      idl: "Sudah",
      tglSurvey: "2026-02-13",
      rainStationId: findStation("ST-RF-THP3-050"),
      tmatDeviceId: findDev("422"),
      pic: "Joni Pambudi",
      rekomendasi: "1. Tundung Weir",
      targetPlan: "1. [Done] W3 Feb 26",
      progressLastWeek: "Done",
      progressThisWeek: "Done",
    },
    {
      companyCode: "PT.THIP",
      displayOrder: 4,
      wilayah: 1,
      estate: "EBO",
      block: "7007",
      statusTanam: "Rehab",
      idl: "Belum",
      tglSurvey: "2026-08-20",
      rainStationId: findStation("ST-RF-THP4-051"),
      tmatDeviceId: findDev("238309"),
      pic: "Joni Pambudi",
      rekomendasi: "1. IDL\n2. Tundung Weir",
      targetPlan: "1. WIP\n2. WIP",
      progressLastWeek: "0",
      progressThisWeek: "0",
    },
    {
      companyCode: "PT.THIP",
      displayOrder: 5,
      wilayah: 1,
      estate: "EBO",
      block: "7511",
      statusTanam: "Muda",
      idl: "Sudah",
      tglSurvey: "2026-08-20",
      rainStationId: findStation("ST-RF-THP4-051"),
      tmatDeviceId: findDev("269362"),
      pic: "Joni Pambudi",
      rekomendasi: "1. Tundung Weir",
      targetPlan: "1. [Done] W3 Jan 26",
      progressLastWeek: "Done",
      progressThisWeek: "Done",
    },
    {
      companyCode: "PT.THIP",
      displayOrder: 6,
      wilayah: 1,
      estate: "TEB",
      block: "6709",
      statusTanam: "Muda",
      idl: "Sudah",
      tglSurvey: "2026-08-20",
      rainStationId: findStation("ST-RF-THP5-052"),
      tmatDeviceId: findDev("219241"),
      pic: "Joni Pambudi",
      rekomendasi: "1. Tundung Weir\n2. Reverse pumping",
      targetPlan: "1. [Done] W3 Feb 26\n2. -",
      progressLastWeek: "Done",
      progressThisWeek: "50",
    },
    {
      companyCode: "PT.THIP",
      displayOrder: 7,
      wilayah: 2,
      estate: "SUN",
      block: "3102",
      statusTanam: "Muda",
      idl: "Sudah",
      tglSurvey: "2026-03-14",
      rainStationId: findStation("ST-RF-THP6-053"),
      tmatDeviceId: findDev("421"),
      pic: "Joni Pambudi",
      rekomendasi: "1. Tundung Weir",
      targetPlan: "1. [Done] W1 Feb 26",
      progressLastWeek: "Done",
      progressThisWeek: "Done",
    },
  ];

  for (const r of rows) {
    await db.insert(iotReportBlocks).values(r);
  }

  console.log(`✓ Successfully seeded ${rows.length} report blocks for PT.THIP!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
