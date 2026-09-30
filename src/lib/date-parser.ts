import { addDays, format, parseISO, subDays } from "date-fns";

/**
 * Normalizes a date key like "8-28" or "08-28" to standard "M-D"
 */
export function normalizeDateKey(key: string): string {
  const match = /^0?(\d{1,2})-0?(\d{1,2})$/.exec(key.trim());
  if (!match) return key.trim();
  return `${Number(match[1])}-${Number(match[2])}`;
}

/**
 * Checks if a string is a dynamic date key like "8-28" or "09-01"
 */
export function isDateKey(key: string): boolean {
  return /^0?(\d{1,2})-0?(\d{1,2})$/.test(key.trim());
}

/**
 * Builds a fast lookup map from the summary rows (d[1])
 * which contain Tanggal ("08-28") and Tanggal2 ("2026-08-28")
 */
export function buildSummaryDateMap(
  summaryRows: Array<{ Tanggal?: string; Tanggal2?: string; [key: string]: unknown }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of summaryRows) {
    if (row.Tanggal && row.Tanggal2) {
      const normalized = normalizeDateKey(row.Tanggal);
      map.set(normalized, row.Tanggal2);
    }
  }
  return map;
}

/**
 * Parses an API dynamic date key (e.g. "8-28") into a strict "YYYY-MM-DD" string.
 * Uses window [endingDate - 27 days, endingDate].
 */
export function parseApiDateKey(
  key: string,
  endingDateStr: string,
  summaryDateMap?: Map<string, string>
): string | null {
  const trimmed = key.trim();

  // If a summary map is provided and has this key, use it directly
  if (summaryDateMap) {
    const normalized = normalizeDateKey(trimmed);
    const mapped = summaryDateMap.get(normalized);
    if (mapped && /^\d{4}-\d{2}-\d{2}$/.test(mapped)) {
      return mapped;
    }
  }

  // Regex parse month and day
  const match = /^0?(\d{1,2})-0?(\d{1,2})$/.exec(trimmed);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const endingDate = parseISO(endingDateStr);
  const windowStart = subDays(endingDate, 27);
  const windowEnd = endingDate;

  const endingYear = endingDate.getFullYear();
  const candidateYears = [endingYear - 1, endingYear, endingYear + 1];

  const validCandidates: string[] = [];

  for (const year of candidateYears) {
    // Construct local date without UTC shifts
    const d = new Date(year, month - 1, day);
    // Verify valid date (e.g. Feb 31 does not roll over to March)
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      if (d >= windowStart && d <= windowEnd) {
        validCandidates.push(format(d, "yyyy-MM-dd"));
      }
    }
  }

  return validCandidates.length === 1 ? validCandidates[0] : null;
}

/**
 * Builds list of ending dates from startDate to endDate with 28-day intervals.
 */
export function buildEndingDates(startDateStr: string, endDateStr: string): string[] {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  if (start > end) {
    return [];
  }

  const dates: string[] = [];
  let cursor = addDays(start, 27);

  while (cursor < end) {
    dates.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 28);
  }

  dates.push(format(end, "yyyy-MM-dd"));
  return Array.from(new Set(dates));
}
