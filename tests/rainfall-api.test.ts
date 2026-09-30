import { describe, it, expect } from "vitest";

describe("rainfall api response parsing logic", () => {
  it("properly un-wraps ASP.NET d array containing stringified JSON", () => {
    const mockApiResponse = {
      d: [
        JSON.stringify([
          {
            CompanyCode: "PT.JJP",
            EstCode: "JJP1",
            Station_ID: "ST-RF-JJP1-059",
            Location: "AFD-3",
            "8-28": 0,
            "8-29": 12.5,
            MTD: 100,
          },
        ]),
        JSON.stringify([
          {
            AvgHarian: 5.5,
            Tanggal: "08-28",
            Tanggal2: "2026-08-28",
            avgharian1: 19.3,
          },
        ]),
      ],
    };

    expect(Array.isArray(mockApiResponse.d)).toBe(true);
    const stationRows = JSON.parse(mockApiResponse.d[0]);
    const summaryRows = JSON.parse(mockApiResponse.d[1]);

    expect(stationRows.length).toBe(1);
    expect(stationRows[0].CompanyCode).toBe("PT.JJP");
    expect(stationRows[0]["8-29"]).toBe(12.5);
    expect(stationRows[0].MTD).toBe(100);

    expect(summaryRows.length).toBe(1);
    expect(summaryRows[0].Tanggal2).toBe("2026-08-28");
  });

  it("handles empty d array gracefully", () => {
    const mockEmpty = { d: ["[]", "[]"] };
    const stations = JSON.parse(mockEmpty.d[0]);
    expect(stations).toEqual([]);
  });
});
