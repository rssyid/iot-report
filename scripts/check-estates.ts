import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sql } from "../src/db";

async function main() {
  const e = await sql`select count(*) as c from estates`;
  console.log("TOTAL ESTATES IN DB:", e[0].c);

  const list = await sql`
    select c.company_code, e.est_code, e.est_alias, e.est_complete, e.display_order
    from estates e
    join companies c on c.id = e.company_id
    order by c.company_code, e.display_order asc, e.est_code asc
  `;
  console.table(list);
}

main().catch(console.error);
