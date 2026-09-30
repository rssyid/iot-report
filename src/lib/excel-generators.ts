import ExcelJS from "exceljs";
import { downloadExcelWorkbook } from "./export-utils";

// ---------------------------------------------------------------------------
// 1. DAILY MATRIX EXPORT & COPY
// ---------------------------------------------------------------------------

export type DailyMatrixExportData = {
  dates: Array<{
    date: string;
    day: string;
    monthName: string;
    year: number;
    weekShortName: string;
    isEndOfWeek: boolean;
  }>;
  monthGroups: Array<{
    monthName: string;
    year: number;
    colSpan: number;
  }>;
  weekGroups: Array<{
    gisWeekId: number;
    weekShortName: string;
    colSpan: number;
  }>;
  companies: Array<{
    companyCode: string;
    companyName: string;
    estates: Array<{
      estCode: string;
      dailyValues: Record<string, number>;
      totalMm: number;
    }>;
    ch: {
      dailyValues: Record<string, number>;
      total: number;
    };
    hh: {
      dailyValues: Record<string, number>;
      total: number;
    };
  }>;
  startDate: string;
  endDate: string;
};

export async function exportDailyMatrixExcel(data: DailyMatrixExportData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rainfall IoT System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Catatan Harian", {
    views: [{ showGridLines: true }],
  });

  // 1. Title Rows
  ws.addRow(["CATATAN HARIAN CURAH HUJAN (MM)"]);
  ws.addRow([`Periode: ${data.startDate} s/d ${data.endDate}`]);
  ws.addRow([]); // Blank row

  const titleCell = ws.getCell("A1");
  titleCell.font = { name: "Arial", size: 14, bold: true };
  const subCell = ws.getCell("A2");
  subCell.font = { name: "Arial", size: 10, italic: true };

  // Header Start Row: Row 4
  const headerStartRow = 4;
  const numDays = data.dates.length;
  const totalColIndex = numDays + 3; // Col A=1 (Company), B=2 (Estate), C..=Dates, Total=numDays+3

  // Row 4: Bulan
  const r4 = ["Company", "Estate"];
  for (const mg of data.monthGroups) {
    r4.push(`${mg.monthName} ${mg.year}`);
    for (let i = 1; i < mg.colSpan; i++) {
      r4.push("");
    }
  }
  r4.push("Total");
  ws.addRow(r4);

  // Row 5: Week
  const r5 = ["", ""];
  for (const wg of data.weekGroups) {
    r5.push(wg.weekShortName);
    for (let i = 1; i < wg.colSpan; i++) {
      r5.push("");
    }
  }
  r5.push("");
  ws.addRow(r5);

  // Row 6: Day (DD)
  const r6 = ["", ""];
  for (const d of data.dates) {
    r6.push(d.day);
  }
  r6.push("");
  ws.addRow(r6);

  // Apply Merge to Headers
  // Merge Company (A4:A6)
  ws.mergeCells(4, 1, 6, 1);
  // Merge Estate (B4:B6)
  ws.mergeCells(4, 2, 6, 2);
  // Merge Total (Col totalColIndex, Row 4:6)
  ws.mergeCells(4, totalColIndex, 6, totalColIndex);

  // Merge Months (Row 4)
  let curCol = 3;
  for (const mg of data.monthGroups) {
    if (mg.colSpan > 1) {
      ws.mergeCells(4, curCol, 4, curCol + mg.colSpan - 1);
    }
    curCol += mg.colSpan;
  }

  // Merge Weeks (Row 5)
  curCol = 3;
  for (const wg of data.weekGroups) {
    if (wg.colSpan > 1) {
      ws.mergeCells(5, curCol, 5, curCol + wg.colSpan - 1);
    }
    curCol += wg.colSpan;
  }

  // Header Styling
  for (let r = 4; r <= 6; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= totalColIndex; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };

      // Colors
      if (r === 4) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFCBD5E1" }, // Slate 300
        };
      } else if (r === 5) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF08A" }, // Soft Yellow
        };
      } else {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      // Border
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: r === 6 ? "medium" : "thin" },
        right: { style: "thin" },
      };
    }
  }

  // Set week boundary borders on headers
  data.dates.forEach((d, idx) => {
    const colIdx = idx + 3;
    if (d.isEndOfWeek) {
      for (let r = 4; r <= 6; r++) {
        const cell = ws.getCell(r, colIdx);
        cell.border = {
          ...cell.border,
          right: { style: "medium" },
        };
      }
    }
  });

  // Data Rows
  let curDataRow = 7;
  for (const comp of data.companies) {
    const startCompRow = curDataRow;
    const compRowsCount = comp.estates.length + 2;

    // Estate rows
    for (const est of comp.estates) {
      const rowVals: any[] = [comp.companyCode, est.estCode];
      for (const d of data.dates) {
        rowVals.push(est.dailyValues[d.date] ?? 0);
      }
      rowVals.push(est.totalMm);

      const addedRow = ws.addRow(rowVals);
      addedRow.height = 18;

      for (let c = 1; c <= totalColIndex; c++) {
        const cell = addedRow.getCell(c);
        cell.font = { name: "Arial", size: 9 };
        cell.alignment = {
          vertical: "middle",
          horizontal: c === 1 || c === 2 ? "center" : "center",
        };

        const isEnd = c >= 3 && c < totalColIndex && data.dates[c - 3]?.isEndOfWeek;
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: isEnd || c === 1 || c === 2 || c === totalColIndex ? "medium" : "thin" },
        };

        if (c >= 3) {
          cell.numFmt = "#,##0";
        }
        if (c === totalColIndex) {
          cell.font = { name: "Arial", size: 9, bold: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        }
      }
      curDataRow++;
    }

    // CH Row
    const chVals: any[] = [comp.companyCode, "CH"];
    for (const d of data.dates) {
      chVals.push(comp.ch.dailyValues[d.date] ?? 0);
    }
    chVals.push(comp.ch.total);
    const chRow = ws.addRow(chVals);
    chRow.height = 19;
    for (let c = 1; c <= totalColIndex; c++) {
      const cell = chRow.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } }; // Light Yellow

      const isEnd = c >= 3 && c < totalColIndex && data.dates[c - 3]?.isEndOfWeek;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: isEnd || c === 1 || c === 2 || c === totalColIndex ? "medium" : "thin" },
      };
      if (c >= 3) cell.numFmt = "#,##0";
    }
    curDataRow++;

    // HH Row
    const hhVals: any[] = [comp.companyCode, "HH"];
    for (const d of data.dates) {
      hhVals.push(comp.hh.dailyValues[d.date] ?? 0);
    }
    hhVals.push(comp.hh.total);
    const hhRow = ws.addRow(hhVals);
    hhRow.height = 19;
    for (let c = 1; c <= totalColIndex; c++) {
      const cell = hhRow.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; // Slate 200

      const isEnd = c >= 3 && c < totalColIndex && data.dates[c - 3]?.isEndOfWeek;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" }, // Bottom of company group is thick
        right: { style: isEnd || c === 1 || c === 2 || c === totalColIndex ? "medium" : "thin" },
      };
      if (c >= 3) cell.numFmt = "#,##0";
    }
    curDataRow++;

    // Merge Company Column vertically
    ws.mergeCells(startCompRow, 1, curDataRow - 1, 1);
    const compCell = ws.getCell(startCompRow, 1);
    compCell.font = { name: "Arial", size: 10, bold: true };
    compCell.alignment = { vertical: "middle", horizontal: "center" };
    compCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE600" } }; // Yellow Neobrutalist
  }

  // Column Widths
  ws.getColumn(1).width = 12; // Company
  ws.getColumn(2).width = 10; // Estate
  for (let c = 3; c < totalColIndex; c++) {
    ws.getColumn(c).width = 5.5; // Date numbers
  }
  ws.getColumn(totalColIndex).width = 10; // Total

  const fileName = `Catatan_Harian_Curah_Hujan_${data.startDate}_sd_${data.endDate}.xlsx`;
  await downloadExcelWorkbook(wb, fileName);
}

/**
 * Generates HTML and TSV string for Daily Matrix to copy into clipboard
 */
export function buildDailyMatrixClipboardData(data: DailyMatrixExportData): {
  html: string;
  tsv: string;
} {
  // Build TSV
  const tsvLines: string[] = [];

  // Row 1: Months
  const r1 = ["Company", "Estate"];
  for (const mg of data.monthGroups) {
    r1.push(`${mg.monthName} ${mg.year}`);
    for (let i = 1; i < mg.colSpan; i++) r1.push("");
  }
  r1.push("Total");
  tsvLines.push(r1.join("\t"));

  // Row 2: Weeks
  const r2 = ["", ""];
  for (const wg of data.weekGroups) {
    r2.push(wg.weekShortName);
    for (let i = 1; i < wg.colSpan; i++) r2.push("");
  }
  r2.push("");
  tsvLines.push(r2.join("\t"));

  // Row 3: Days
  const r3 = ["", ""];
  for (const d of data.dates) r3.push(d.day);
  r3.push("");
  tsvLines.push(r3.join("\t"));

  // Data rows
  for (const comp of data.companies) {
    for (const est of comp.estates) {
      const line = [comp.companyCode, est.estCode];
      for (const d of data.dates) line.push(String(est.dailyValues[d.date] ?? 0));
      line.push(String(est.totalMm));
      tsvLines.push(line.join("\t"));
    }
    // CH
    const chLine = [comp.companyCode, "CH"];
    for (const d of data.dates) chLine.push(String(comp.ch.dailyValues[d.date] ?? 0));
    chLine.push(String(comp.ch.total));
    tsvLines.push(chLine.join("\t"));

    // HH
    const hhLine = [comp.companyCode, "HH"];
    for (const d of data.dates) hhLine.push(String(comp.hh.dailyValues[d.date] ?? 0));
    hhLine.push(String(comp.hh.total));
    tsvLines.push(hhLine.join("\t"));
  }

  // Build HTML
  let html = `<table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;">`;
  html += `<thead>`;
  html += `<tr style="background:#CBD5E1;font-weight:bold;text-align:center;">`;
  html += `<th rowspan="3">Company</th><th rowspan="3">Estate</th>`;
  for (const mg of data.monthGroups) {
    html += `<th colspan="${mg.colSpan}">${mg.monthName} ${mg.year}</th>`;
  }
  html += `<th rowspan="3">Total</th></tr>`;

  html += `<tr style="background:#FEF08A;font-weight:bold;text-align:center;">`;
  for (const wg of data.weekGroups) {
    html += `<th colspan="${wg.colSpan}">${wg.weekShortName}</th>`;
  }
  html += `</tr>`;

  html += `<tr style="background:#F8FAFC;font-weight:bold;text-align:center;">`;
  for (const d of data.dates) {
    html += `<th>${d.day}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (const comp of data.companies) {
    const rowSpan = comp.estates.length + 2;
    comp.estates.forEach((est, idx) => {
      html += `<tr>`;
      if (idx === 0) {
        html += `<td rowspan="${rowSpan}" style="background:#FFE600;font-weight:bold;text-align:center;vertical-align:middle;">${comp.companyCode}</td>`;
      }
      html += `<td style="font-weight:bold;text-align:center;">${est.estCode}</td>`;
      for (const d of data.dates) {
        html += `<td style="text-align:center;">${est.dailyValues[d.date] ?? 0}</td>`;
      }
      html += `<td style="font-weight:bold;text-align:center;background:#F1F5F9;">${est.totalMm}</td></tr>`;
    });

    // CH
    html += `<tr style="background:#FEF9C3;font-weight:bold;">`;
    if (comp.estates.length === 0) {
      html += `<td>${comp.companyCode}</td>`;
    }
    html += `<td style="text-align:center;">CH</td>`;
    for (const d of data.dates) {
      html += `<td style="text-align:center;">${comp.ch.dailyValues[d.date] ?? 0}</td>`;
    }
    html += `<td style="text-align:center;">${comp.ch.total}</td></tr>`;

    // HH
    html += `<tr style="background:#E2E8F0;font-weight:bold;">`;
    html += `<td style="text-align:center;">HH</td>`;
    for (const d of data.dates) {
      html += `<td style="text-align:center;">${comp.hh.dailyValues[d.date] ?? 0}</td>`;
    }
    html += `<td style="text-align:center;">${comp.hh.total}</td></tr>`;
  }

  html += `</tbody></table>`;

  return { html, tsv: tsvLines.join("\n") };
}


// ---------------------------------------------------------------------------
// 2. WEEKLY GIS TABLE EXPORT & COPY
// ---------------------------------------------------------------------------

export type WeeklyRecordItem = {
  formattedName: string;
  startDate: string;
  endDate: string;
  companyCode: string;
  companyName: string;
  estCode: string;
  estAlias: string | null;
  stationId: string;
  rainfallMm: number;
  observedDays: number;
  rainyDays: number;
};

export async function exportWeeklyGisExcel(
  records: WeeklyRecordItem[],
  startDate: string,
  endDate: string
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Mingguan GIS", {
    views: [{ showGridLines: true }],
  });

  ws.addRow(["AGREGAT MINGGUAN CURAH HUJAN (GIS WEEK)"]);
  ws.addRow([`Periode: ${startDate} s/d ${endDate}`]);
  ws.addRow([]);

  const headers = [
    "Minggu GIS",
    "Tanggal Mulai",
    "Tanggal Selesai",
    "Company Code",
    "Company Name",
    "Estate Code",
    "Estate Alias",
    "Stasiun ID",
    "Total Curah Hujan (mm)",
    "Hari Teramati",
    "Hari Hujan",
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE600" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });

  records.forEach((r) => {
    const row = ws.addRow([
      r.formattedName,
      r.startDate,
      r.endDate,
      r.companyCode,
      r.companyName,
      r.estCode,
      r.estAlias || "-",
      r.stationId,
      r.rainfallMm,
      r.observedDays,
      r.rainyDays,
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (colNumber === 9) {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right" };
      } else if (colNumber >= 10) {
        cell.alignment = { horizontal: "center" };
      }
    });
  });

  ws.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 24 },
    { width: 14 },
    { width: 12 },
    { width: 20 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
  ];

  await downloadExcelWorkbook(wb, `Mingguan_GIS_${startDate}_sd_${endDate}.xlsx`);
}

export function buildWeeklyGisClipboardData(records: WeeklyRecordItem[]): {
  html: string;
  tsv: string;
} {
  const headers = [
    "Minggu GIS",
    "Periode",
    "Company",
    "Estate",
    "Stasiun ID",
    "Total Curah Hujan (mm)",
    "Hari Teramati",
    "Hari Hujan",
  ];

  const tsvLines = [headers.join("\t")];
  records.forEach((r) => {
    tsvLines.push(
      [
        r.formattedName,
        `${r.startDate} s/d ${r.endDate}`,
        r.companyCode,
        r.estCode,
        r.stationId,
        String(r.rainfallMm),
        String(r.observedDays),
        String(r.rainyDays),
      ].join("\t")
    );
  });

  let html = `<table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;"><thead><tr style="background:#FFE600;font-weight:bold;">`;
  headers.forEach((h) => (html += `<th>${h}</th>`));
  html += `</tr></thead><tbody>`;
  records.forEach((r) => {
    html += `<tr><td>${r.formattedName}</td><td>${r.startDate} s/d ${r.endDate}</td><td>${r.companyCode}</td><td>${r.estCode}</td><td>${r.stationId}</td><td style="text-align:right;">${r.rainfallMm}</td><td style="text-align:center;">${r.observedDays}</td><td style="text-align:center;">${r.rainyDays}</td></tr>`;
  });
  html += `</tbody></table>`;

  return { html, tsv: tsvLines.join("\n") };
}


// ---------------------------------------------------------------------------
// 3. COMPANY WEEKLY MATRIX EXPORT & COPY
// ---------------------------------------------------------------------------

export type CompanyWeeklyExportData = {
  weeks: Array<{
    gisWeekId: number;
    weekName: string;
    formattedName: string;
    startDate: string;
    endDate: string;
  }>;
  companies: Array<{
    companyCode: string;
    companyName: string;
    stationCount: number;
    weeklyStats: Record<string, { totalMm: number; avgMm: number; rainyDays: number }>;
  }>;
};

export async function exportCompanyWeeklyExcel(data: CompanyWeeklyExportData) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Mingguan Company", {
    views: [{ showGridLines: true }],
  });

  ws.addRow(["MATRIKS CURAH HUJAN MINGGUAN PERUSAHAAN"]);
  ws.addRow([`Jumlah Minggu: ${data.weeks.length} Minggu Terakhir`]);
  ws.addRow([]);

  // Row 4: Week formatted names
  const r4 = ["Company Code", "Company Name", "Jumlah Stasiun"];
  for (const w of data.weeks) {
    r4.push(w.formattedName, "", "");
  }
  ws.addRow(r4);

  // Row 5: Sub-headers (Total, Rata-rata, Hari Hujan)
  const r5 = ["", "", ""];
  for (let i = 0; i < data.weeks.length; i++) {
    r5.push("Total (mm)", "Rata-rata (mm)", "Hari Hujan");
  }
  ws.addRow(r5);

  ws.mergeCells(4, 1, 5, 1);
  ws.mergeCells(4, 2, 5, 2);
  ws.mergeCells(4, 3, 5, 3);

  let cIdx = 4;
  for (let i = 0; i < data.weeks.length; i++) {
    ws.mergeCells(4, cIdx, 4, cIdx + 2);
    cIdx += 3;
  }

  const totalCols = 3 + data.weeks.length * 3;
  for (let r = 4; r <= 5; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: r === 4 ? "FFFFE600" : "FFF1F5F9" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: r === 5 ? "medium" : "thin" },
        right: { style: c > 3 && (c - 3) % 3 === 0 ? "medium" : "thin" },
      };
    }
  }

  // Data rows
  data.companies.forEach((comp) => {
    const rVals: any[] = [comp.companyCode, comp.companyName, comp.stationCount];
    for (const w of data.weeks) {
      const stat = comp.weeklyStats[w.gisWeekId] || { totalMm: 0, avgMm: 0, rainyDays: 0 };
      rVals.push(stat.totalMm, stat.avgMm, stat.rainyDays);
    }

    const row = ws.addRow(rVals);
    row.height = 18;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: c > 3 && (c - 3) % 3 === 0 ? "medium" : "thin" },
      };

      if (c === 1 || c === 3) {
        cell.alignment = { horizontal: "center" };
      } else if (c >= 4) {
        cell.alignment = { horizontal: "center" };
        cell.numFmt = (c - 3) % 3 === 0 ? "#,##0" : "#,##0.0";
      }
    }
  });

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 14;
  for (let c = 4; c <= totalCols; c++) {
    ws.getColumn(c).width = 12;
  }

  await downloadExcelWorkbook(wb, `Matriks_Mingguan_Company_${data.weeks.length}_Weeks.xlsx`);
}

export function buildCompanyWeeklyClipboardData(data: CompanyWeeklyExportData): {
  html: string;
  tsv: string;
} {
  const r1 = ["Company Code", "Company Name", "Jumlah Stasiun"];
  const r2 = ["", "", ""];
  for (const w of data.weeks) {
    r1.push(w.formattedName, "", "");
    r2.push("Total (mm)", "Rata-rata (mm)", "Hari Hujan");
  }

  const tsvLines = [r1.join("\t"), r2.join("\t")];
  data.companies.forEach((comp) => {
    const line = [comp.companyCode, comp.companyName, String(comp.stationCount)];
    for (const w of data.weeks) {
      const stat = comp.weeklyStats[w.gisWeekId] || { totalMm: 0, avgMm: 0, rainyDays: 0 };
      line.push(String(stat.totalMm), String(stat.avgMm), String(stat.rainyDays));
    }
    tsvLines.push(line.join("\t"));
  });

  let html = `<table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;"><thead><tr style="background:#FFE600;font-weight:bold;">`;
  html += `<th rowspan="2">Company Code</th><th rowspan="2">Company Name</th><th rowspan="2">Jumlah Stasiun</th>`;
  for (const w of data.weeks) {
    html += `<th colspan="3">${w.formattedName}</th>`;
  }
  html += `</tr><tr style="background:#F1F5F9;font-weight:bold;">`;
  for (let i = 0; i < data.weeks.length; i++) {
    html += `<th>Total (mm)</th><th>Rata-rata (mm)</th><th>Hari Hujan</th>`;
  }
  html += `</tr></thead><tbody>`;

  data.companies.forEach((comp) => {
    html += `<tr><td>${comp.companyCode}</td><td>${comp.companyName}</td><td style="text-align:center;">${comp.stationCount}</td>`;
    for (const w of data.weeks) {
      const stat = comp.weeklyStats[w.gisWeekId] || { totalMm: 0, avgMm: 0, rainyDays: 0 };
      html += `<td style="text-align:right;">${stat.totalMm}</td><td style="text-align:right;">${stat.avgMm}</td><td style="text-align:center;">${stat.rainyDays}</td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody></table>`;

  return { html, tsv: tsvLines.join("\n") };
}


// ---------------------------------------------------------------------------
// 4. STATION WEEKLY MATRIX EXPORT & COPY
// ---------------------------------------------------------------------------

export type StationWeeklyExportData = {
  weeks: Array<{
    gisWeekId: number;
    weekName: string;
    formattedName: string;
    startDate: string;
    endDate: string;
  }>;
  stations: Array<{
    stationId: string;
    companyCode: string;
    estCode: string;
    location: string;
    weeklyStats: Record<string, { totalMm: number; rainyDays: number }>;
  }>;
};

export async function exportStationWeeklyExcel(data: StationWeeklyExportData) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Mingguan Stasiun", {
    views: [{ showGridLines: true }],
  });

  ws.addRow(["MATRIKS CURAH HUJAN MINGGUAN PER STASIUN / OMBROMETER"]);
  ws.addRow([`Jumlah Minggu: ${data.weeks.length} Minggu Terakhir`]);
  ws.addRow([]);

  // Row 4: Week formatted names
  const r4 = ["Stasiun ID", "Company", "Estate", "Lokasi"];
  for (const w of data.weeks) {
    r4.push(w.formattedName, "");
  }
  ws.addRow(r4);

  // Row 5: Sub-headers (Total mm, Hari Hujan)
  const r5 = ["", "", "", ""];
  for (let i = 0; i < data.weeks.length; i++) {
    r5.push("Total (mm)", "Hari Hujan");
  }
  ws.addRow(r5);

  ws.mergeCells(4, 1, 5, 1);
  ws.mergeCells(4, 2, 5, 2);
  ws.mergeCells(4, 3, 5, 3);
  ws.mergeCells(4, 4, 5, 4);

  let cIdx = 5;
  for (let i = 0; i < data.weeks.length; i++) {
    ws.mergeCells(4, cIdx, 4, cIdx + 1);
    cIdx += 2;
  }

  const totalCols = 4 + data.weeks.length * 2;
  for (let r = 4; r <= 5; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: r === 4 ? "FFFFE600" : "FFF1F5F9" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: r === 5 ? "medium" : "thin" },
        right: { style: c > 4 && (c - 4) % 2 === 0 ? "medium" : "thin" },
      };
    }
  }

  // Data rows
  data.stations.forEach((stn) => {
    const rVals: any[] = [stn.stationId, stn.companyCode, stn.estCode, stn.location];
    for (const w of data.weeks) {
      const stat = stn.weeklyStats[w.gisWeekId] || { totalMm: 0, rainyDays: 0 };
      rVals.push(stat.totalMm, stat.rainyDays);
    }

    const row = ws.addRow(rVals);
    row.height = 18;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 9 };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: c > 4 && (c - 4) % 2 === 0 ? "medium" : "thin" },
      };

      if (c <= 4) {
        cell.alignment = { horizontal: c === 1 ? "left" : "center" };
      } else {
        cell.alignment = { horizontal: "center" };
        cell.numFmt = (c - 4) % 2 === 1 ? "#,##0.0" : "#,##0";
      }
    }
  });

  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 12;
  for (let c = 5; c <= totalCols; c++) {
    ws.getColumn(c).width = 13;
  }

  await downloadExcelWorkbook(wb, `Matriks_Mingguan_Stasiun_${data.weeks.length}_Weeks.xlsx`);
}

export function buildStationWeeklyClipboardData(data: StationWeeklyExportData): {
  html: string;
  tsv: string;
} {
  const r1 = ["Stasiun ID", "Company", "Estate", "Lokasi"];
  const r2 = ["", "", "", ""];
  for (const w of data.weeks) {
    r1.push(w.formattedName, "");
    r2.push("Total (mm)", "Hari Hujan");
  }

  const tsvLines = [r1.join("\t"), r2.join("\t")];
  data.stations.forEach((stn) => {
    const line = [stn.stationId, stn.companyCode, stn.estCode, stn.location];
    for (const w of data.weeks) {
      const stat = stn.weeklyStats[w.gisWeekId] || { totalMm: 0, rainyDays: 0 };
      line.push(String(stat.totalMm), String(stat.rainyDays));
    }
    tsvLines.push(line.join("\t"));
  });

  let html = `<table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;"><thead><tr style="background:#FFE600;font-weight:bold;">`;
  html += `<th rowspan="2">Stasiun ID</th><th rowspan="2">Company</th><th rowspan="2">Estate</th><th rowspan="2">Lokasi</th>`;
  for (const w of data.weeks) {
    html += `<th colspan="2">${w.formattedName}</th>`;
  }
  html += `</tr><tr style="background:#F1F5F9;font-weight:bold;">`;
  for (let i = 0; i < data.weeks.length; i++) {
    html += `<th>Total (mm)</th><th>Hari Hujan</th>`;
  }
  html += `</tr></thead><tbody>`;

  data.stations.forEach((stn) => {
    html += `<tr><td>${stn.stationId}</td><td>${stn.companyCode}</td><td>${stn.estCode}</td><td>${stn.location}</td>`;
    for (const w of data.weeks) {
      const stat = stn.weeklyStats[w.gisWeekId] || { totalMm: 0, rainyDays: 0 };
      html += `<td style="text-align:right;">${stat.totalMm}</td><td style="text-align:center;">${stat.rainyDays}</td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody></table>`;

  return { html, tsv: tsvLines.join("\n") };
}
