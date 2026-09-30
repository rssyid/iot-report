import ExcelJS from "exceljs";

/**
 * Copies table data as both HTML and plain text (TSV) to clipboard
 * so that pasting into Microsoft Excel / Google Sheets preserves cells and layout.
 */
export async function copyTableToClipboard(
  htmlContent: string,
  plainTextTsv: string
): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([htmlContent], { type: "text/html" });
      const textBlob = new Blob([plainTextTsv], { type: "text/plain" });
      const item = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(plainTextTsv);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Clipboard copy failed, falling back to text:", err);
    try {
      await navigator.clipboard.writeText(plainTextTsv);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Triggers a browser download for a generated ExcelJS Workbook
 */
export async function downloadExcelWorkbook(
  workbook: ExcelJS.Workbook,
  fileName: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Standard cell borders
 */
export const borderThin: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

export const borderMediumRight: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "medium", color: { argb: "FF000000" } },
};
