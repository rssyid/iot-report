import { describe, it, expect } from "vitest";
import {
  parseApiDateKey,
  isDateKey,
  normalizeDateKey,
  buildEndingDates,
  buildSummaryDateMap,
} from "../src/lib/date-parser";

describe("date-parser", () => {
  it("correctly identifies dynamic date keys", () => {
    expect(isDateKey("8-28")).toBe(true);
    expect(isDateKey("08-28")).toBe(true);
    expect(isDateKey("9-1")).toBe(true);
    expect(isDateKey("12-31")).toBe(true);
    expect(isDateKey("CompanyCode")).toBe(false);
    expect(isDateKey("MTD")).toBe(false);
    expect(isDateKey("Location")).toBe(false);
    expect(isDateKey("Station_ID")).toBe(false);
  });

  it("normalizes date keys", () => {
    expect(normalizeDateKey("08-28")).toBe("8-28");
    expect(normalizeDateKey("8-28")).toBe("8-28");
    expect(normalizeDateKey("09-01")).toBe("9-1");
  });

  it("parses dynamic date key within ending date window", () => {
    // Window: 2026-08-28 to 2026-09-24 (28 days)
    const endingDate = "2026-09-24";
    expect(parseApiDateKey("8-28", endingDate)).toBe("2026-08-28");
    expect(parseApiDateKey("9-1", endingDate)).toBe("2026-09-01");
    expect(parseApiDateKey("9-24", endingDate)).toBe("2026-09-24");
    // Out of window date should return null
    expect(parseApiDateKey("7-15", endingDate)).toBe(null);
  });

  it("correctly handles year rollover (e.g. Dec to Jan)", () => {
    // Ending date 2026-01-10 -> window includes 2025-12-14 to 2026-01-10
    const endingDate = "2026-01-10";
    expect(parseApiDateKey("12-25", endingDate)).toBe("2025-12-25");
    expect(parseApiDateKey("1-5", endingDate)).toBe("2026-01-05");
  });

  it("prioritizes summary map Tanggal2 when available", () => {
    const summaryRows = [
      { Tanggal: "08-28", Tanggal2: "2026-08-28" },
      { Tanggal: "09-01", Tanggal2: "2026-09-01" },
    ];
    const map = buildSummaryDateMap(summaryRows);
    expect(parseApiDateKey("8-28", "2026-09-24", map)).toBe("2026-08-28");
    expect(parseApiDateKey("9-1", "2026-09-24", map)).toBe("2026-09-01");
  });

  it("builds correct sequence of 28-day ending dates", () => {
    const dates = buildEndingDates("2026-01-01", "2026-02-28");
    expect(dates.length).toBeGreaterThan(1);
    expect(dates[0]).toBe("2026-01-28");
    expect(dates[dates.length - 1]).toBe("2026-02-28");
  });
});
