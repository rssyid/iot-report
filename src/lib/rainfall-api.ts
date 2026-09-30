export type StationRow = {
  CompanyCode: string;
  EstCode: string;
  Station_ID: string;
  Location: string | null;
  MTD?: number | string | null;
  [key: string]: unknown;
};

export type DailySummaryRow = {
  AvgHarian?: number;
  Tanggal?: string;
  Tanggal2?: string;
  avgharian1?: number;
  [key: string]: unknown;
};

export type RainfallApiResult = {
  stationRows: StationRow[];
  dailySummaryRows: DailySummaryRow[];
  raw: unknown;
};

export async function fetchRainfall4Weeks(input: {
  companyCode: string;
  endingDate: string;
  arsiran?: number;
}): Promise<RainfallApiResult> {
  const apiUrl =
    process.env.RAINFALL_API_URL ||
    "https://app.gis-div.com/iot/Service/webservice.asmx/GetArsStation4Weeks";
  const arsiran = input.arsiran ?? Number(process.env.RAINFALL_ARSIRAN ?? 7);

  const payload = {
    companycode: input.companyCode,
    endingdate: input.endingDate,
    arsiran: String(arsiran),
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Rainfall API error (HTTP ${response.status} ${response.statusText}): ${errorText.slice(0, 300)}`
    );
  }

  const json = await response.json();

  if (!json || typeof json !== "object" || !Array.isArray(json.d)) {
    throw new Error("Invalid API response format: expected object with property 'd' as an array");
  }

  const outerArray = json.d as unknown[];

  let stationRows: StationRow[] = [];
  let dailySummaryRows: DailySummaryRow[] = [];

  if (typeof outerArray[0] === "string" && outerArray[0].trim().length > 0) {
    try {
      const parsed = JSON.parse(outerArray[0]);
      if (Array.isArray(parsed)) {
        stationRows = parsed;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse stationRows from d[0]: ${msg}`);
    }
  }

  if (typeof outerArray[1] === "string" && outerArray[1].trim().length > 0) {
    try {
      const parsed = JSON.parse(outerArray[1]);
      if (Array.isArray(parsed)) {
        dailySummaryRows = parsed;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Warning: Failed to parse dailySummaryRows from d[1]: ${msg}`);
    }
  }

  return {
    stationRows,
    dailySummaryRows,
    raw: json,
  };
}
