import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/db";
import { tmatDevices } from "../src/db/schema";
import { sql } from "drizzle-orm";

interface RawDevice {
  company_code: string;
  device_id: string;
  device_name: string;
  estate: string;
  block: string;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
}

const rawList: RawDevice[] = [
  { company_code: "PT.BAS", device_id: "441", device_name: "BS-KSU-A07-T-HK105-AWL-BT", estate: "KSU", block: "A07", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "419", device_name: "GN-KSY-M096-T-HK099-AWL-BT", estate: "KSY", block: "M096", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "424", device_name: "GN-KBQ-G72-T-HK101-AWL-BT", estate: "KBQ", block: "G72", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "427", device_name: "GN-KSY-M127-T-HK104-AWL-BT", estate: "KSY", block: "M127", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "428", device_name: "GN-KTR-K67-T-HK103-AWL-BT", estate: "KTR", block: "K67", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "439", device_name: "GN-KTR-J079-T-HK115-AWL-BT", estate: "KTR", block: "J079", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "440", device_name: "GN-KTR-I55-T-HK113-AWL-BT", estate: "KTR", block: "I55", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "443", device_name: "GN-KBQ-G72-T-HK114-AWL-BT", estate: "KBQ", block: "G72", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "445", device_name: "GN-KBQ-E61-T-HK116-AWL-BT", estate: "KBQ", block: "E61", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "446", device_name: "GN-KTR-N58-T-HK108-AWL-BT", estate: "KTR", block: "N58", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "219253", device_name: "GN-KTR-K68-T-HK058-AWL", estate: "KTR", block: "K68", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "219254", device_name: "GN-KSY-M096-T-HK007-AWL", estate: "KSY", block: "M096", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "269346", device_name: "GN-KTR-I55-T-HK062-AWL", estate: "KTR", block: "I55", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "269347", device_name: "GN-KBQ-G72-T-HK060-AWL", estate: "KBQ", block: "G72", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "269349", device_name: "GN-KTR-J79-T-HK010-AWL", estate: "KTR", block: "J79", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "269357", device_name: "GN-KSY-M127-T-HK063-AWL", estate: "KSY", block: "M127", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "269377", device_name: "GN-KTR-N58-T-HK67-AWL", estate: "KTR", block: "N58", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.GAN", device_id: "269384", device_name: "GN-KBQ-E61-T-HK061-AWL", estate: "KBQ", block: "E61", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "423", device_name: "JJ-KSB-A43-T-HK082-AWL-BT", estate: "KSB", block: "A43", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "442", device_name: "JJ-KSB-B54-T-HK084-AWL-BT", estate: "KSB", block: "B54", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "444", device_name: "JJ-KSR-B05C-T-HK083-AWL-BT", estate: "KSR", block: "B05C", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "269350", device_name: "JJ-KSB-C50-T-HK055-AWL", estate: "KSB", block: "C50", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "269351", device_name: "JJ-KSB-D18-T-HK056-AWL", estate: "KSB", block: "D18", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "269370", device_name: "JJ-KSR-A17B-T-HK043-AWL", estate: "KSR", block: "A17B", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "269379", device_name: "JJ-KSB-B17-T-HK057-AWL", estate: "KSB", block: "B17", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "901444", device_name: "JJ-KSR-C13R-T-HK083-AWL-BT", estate: "KSR", block: "C13R", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.JJP", device_id: "901269356", device_name: "JJ-KSB-D18-T-HK064-AWL", estate: "KSB", block: "D18", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.NJP", device_id: "438", device_name: "NJ-KAB-F42-T-HK106-AWL-BT", estate: "KAB", block: "F42", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PANPL", device_id: "434", device_name: "PN-KPE-D16-T-HK111-AWL-BT", estate: "KPE", block: "D16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PANPP", device_id: "434", device_name: "PN-KPE-D16-T-HK111-AWL-BT", estate: "KPE", block: "D16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PANPS", device_id: "434", device_name: "PN-KPE-D16-T-HK111-AWL-BT", estate: "KPE", block: "D16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PLDK", device_id: "269381", device_name: "PD-KRJ-D28-T-HK059-AWL", estate: "KRJ", block: "D28", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PLDS", device_id: "269381", device_name: "PD-KRJ-D28-T-HK059-AWL", estate: "KRJ", block: "D28", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PTW", device_id: "435", device_name: "PT-KSA-H28-T-HK109-AWL-BT", estate: "KSA", block: "H28", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PTW", device_id: "436", device_name: "PT-KST-H52-T-HK110-AWL-BT", estate: "KST", block: "H52", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PTW", device_id: "219244", device_name: "PT-KSA-C10-T-HK008-AWL", estate: "KSA", block: "C10", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PTW", device_id: "269356", device_name: "PT-KST-H52-T-HK064-AWL", estate: "KST", block: "H52", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PTW", device_id: "269358", device_name: "PT-KSA-H28-T-HK066-AWL", estate: "KSA", block: "H28", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.PTW", device_id: "269364", device_name: "PT-KST-G66R-T-HK065-AWL", estate: "KST", block: "G66R", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.SAM", device_id: "437", device_name: "SA-KSN-W02-T-HK112-AWL-BT", estate: "KSN", block: "W02", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.SUMK", device_id: "447", device_name: "SU-KNP-F37-T-HK107-AWL-BT", estate: "KNP", block: "F37", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.SUMS", device_id: "447", device_name: "SU-KNP-F37-T-HK107-AWL-BT", estate: "KNP", block: "F37", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "412", device_name: "TH-SEN-20-T-HK085-AWL-BT", estate: "SEN", block: "20", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "413", device_name: "TH-MER-7302-T-HK088-AWL-BT", estate: "MER", block: "73-02", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "414", device_name: "TH-NYA-4620-T-HK090-AWL-BT", estate: "NYA", block: "46-20", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "415", device_name: "TH-SEN-2507-T-HK086-AWL-BT", estate: "SEN", block: "25-07", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "416", device_name: "TH-MHO-4009-T-HK098-AWL-BT", estate: "MHO", block: "40-09", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "417", device_name: "TH-KEM-4016-T-HK100-AWL-BT", estate: "KEM", block: "40-16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "418", device_name: "TH-MER-7103-T-HK087-AWL-BT", estate: "MER", block: "71-03", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "421", device_name: "TH-SUN-3102-T-HK089-AWL-BT", estate: "SUN", block: "31-02", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "422", device_name: "TH-KEP-4303-T-HK097-AWL-BT", estate: "KEP", block: "43-03", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "429", device_name: "TH-TAY-28-T-HK092-AWL-BT", estate: "TAY", block: "28", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "430", device_name: "TH-KEM-54-T-HK091-AWL-BT", estate: "KEM", block: "54", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "431", device_name: "TH-KEM-4016-T-HK094-AWL-BT", estate: "KEM", block: "40-16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "200385", device_name: "TH-NAS-5108-T-HK01-AWL", estate: "NAS", block: "51-08", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "219241", device_name: "TH-TEB-6709-T-HK004-AWL", estate: "TEB", block: "67-09", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "219247", device_name: "TH-BEL-4933-T-HK002-AWL", estate: "BEL", block: "49-33", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "219249", device_name: "TH-BIT-7117-T-HK003-AWL", estate: "BIT", block: "71-17", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "219251", device_name: "TH-MHO-4009-T-HK006-AWL", estate: "MHO", block: "40-09", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238309", device_name: "TH-EBO-7007-T-HK015-AWL", estate: "EBO", block: "70-07", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238333", device_name: "TH-PUL-2417-T-HK027-AWL", estate: "PUL", block: "24-17", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238345", device_name: "TH-CEN-1121-T-HK037-AWL", estate: "CEN", block: "11-21", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238364", device_name: "TH-NAS-4310-T-HK018-AWL", estate: "NAS", block: "43-10", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238365", device_name: "TH-CEN-1322-T-HK013-AWL", estate: "CEN", block: "13-22", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238367", device_name: "TH-TAY-5017-T-HK022-AWL", estate: "TAY", block: "50-17", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238377", device_name: "TH-PUL-2613-T-HK025-AWL", estate: "PUL", block: "26-13", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238399", device_name: "TH-BEL-4933-T-HK019-AWL", estate: "BEL", block: "49-33", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238422", device_name: "TH-PUL-3116-T-HK026-AWL", estate: "PUL", block: "31-16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238429", device_name: "TH-MAG-5924-T-HK024-AWL", estate: "MAG", block: "59-24", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238431", device_name: "TH-MAG-6323-T-HK025-AWL", estate: "MAG", block: "63-23", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238432", device_name: "TH-KEM-54-T-HK037-AWL", estate: "KEM", block: "54", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238434", device_name: "TH-KEM-4016-T-HK020-AWL", estate: "KEM", block: "40-16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238435", device_name: "TH-NYA-4823-T-HK016-AWL", estate: "NYA", block: "48-23", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238442", device_name: "TH-KEM-3518-T-HK021-AWL", estate: "KEM", block: "35-18", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238445", device_name: "TH-CEN-722-T-HK012-AWL", estate: "CEN", block: "07-22", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238449", device_name: "TH-NYA-5024-T-HK017-AWL", estate: "NYA", block: "50-24", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "238455", device_name: "TH-KEP-4303-T-HK014-AWL", estate: "KEP", block: "43-03", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269344", device_name: "TH-JAT-4332-T-HK054-AWL", estate: "JAT", block: "43-32", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269345", device_name: "TH-JAT-4831-T-HK053-AWL", estate: "JAT", block: "48-31", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269360", device_name: "TH-AGT-7218-T-HK051-AWL", estate: "AGT", block: "72-18", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269361", device_name: "TH-MER-7103-T-HK045-AWL", estate: "MER", block: "71-03", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269362", device_name: "TH-EBO-7511-T-HK046-AWL", estate: "EBO", block: "75-11", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269363", device_name: "TH-JAT-4530-T-HK052-AWL", estate: "JAT", block: "45-30", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269366", device_name: "TH-SEN-20-T-HK041-AWL", estate: "SEN", block: "20", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269369", device_name: "TH-TAY-28-T-HK050-AWL", estate: "TAY", block: "28", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269386", device_name: "TH-SEG-3923-T-HK042-AWL", estate: "SEG", block: "39-23", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269392", device_name: "TH-SEN-2507-T-HK039-AWL", estate: "SEN", block: "25-07", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "269490", device_name: "TH-NYA-4620-T-HK040-AWL", estate: "NYA", block: "46-20", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "900269354", device_name: "TH-MER-7302-T-HK044-AWL", estate: "MER", block: "73-02", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "901238431", device_name: "TH-PUL-3116-T-HK025-AWL", estate: "PUL", block: "31-16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "901238432", device_name: "TH-MER-7302-T-HK037-AWL", estate: "MER", block: "73-02", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "901238455", device_name: "TH-PUL-3116-T-HK014-AWL", estate: "PUL", block: "31-16", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "901269366", device_name: "TH-BIT-7117-T-HK041-AWL", estate: "BIT", block: "71-17", latitude: null, longitude: null, is_active: true },
  { company_code: "PT.THIP", device_id: "901269490", device_name: "TH-MAG-6323-T-HK040-AWL", estate: "MAG", block: "63-23", latitude: null, longitude: null, is_active: true },
];

async function seed() {
  console.log(`Seeding ${rawList.length} TMAT devices...`);

  let inserted = 0;
  let updated = 0;

  for (const item of rawList) {
    const res = await db
      .insert(tmatDevices)
      .values({
        companyCode: item.company_code,
        deviceId: item.device_id,
        deviceName: item.device_name,
        estate: item.estate,
        block: item.block,
        latitude: item.latitude,
        longitude: item.longitude,
        active: item.is_active,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tmatDevices.companyCode, tmatDevices.deviceId],
        set: {
          deviceName: item.device_name,
          estate: item.estate,
          block: item.block,
          active: item.is_active,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (res.length > 0) {
      inserted++;
    }
  }

  console.log(`✓ Successfully seeded ${inserted} TMAT devices!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Failed to seed TMAT devices:", err);
  process.exit(1);
});
