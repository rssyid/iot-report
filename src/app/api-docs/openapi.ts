// OpenAPI 3.0 specification untuk semua endpoint IoT Portal
// File ini menjadi sumber kebenaran dokumentasi API

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "IoT Telemetry Portal API",
    version: "1.0.0",
    description:
      "REST API untuk sistem monitoring curah hujan (Rainfall) dan tinggi muka air tanah (TMAT) berbasis IoT. Semua endpoint mengembalikan JSON dan tidak memerlukan autentikasi.",
    contact: {
      name: "IoT Portal",
    },
  },
  servers: [
    {
      url: "",
      description: "Server saat ini (relative)",
    },
  ],
  tags: [
    {
      name: "Companies",
      description: "Data perusahaan dan estate",
    },
    {
      name: "Stations",
      description: "Stasiun hujan (ombrometer)",
    },
    {
      name: "Rainfall",
      description: "Data curah hujan harian dan mingguan",
    },
    {
      name: "TMAT",
      description: "Tinggi Muka Air Tanah — sensor dan data per jam",
    },
    {
      name: "Report",
      description: "Laporan IoT (gabungan CH dan TMAT)",
    },
    {
      name: "Sync",
      description: "Sinkronisasi data dari sumber eksternal",
    },
  ],
  paths: {
    "/api/companies": {
      get: {
        tags: ["Companies"],
        summary: "List semua perusahaan aktif",
        description:
          "Mengembalikan daftar semua perusahaan aktif beserta estate, jumlah stasiun, dan status GeoJSON boundary.",
        operationId: "getCompanies",
        responses: {
          "200": {
            description: "Sukses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          company_code: {
                            type: "string",
                            example: "PT.THIP",
                          },
                          company_name: {
                            type: "string",
                            example: "PT Tanjung Harapan Inti Permai",
                          },
                          region: { type: "string", example: "Kalteng" },
                          active: { type: "boolean" },
                          hasBoundary: { type: "boolean" },
                          estate_count: { type: "integer", example: 5 },
                          station_count: { type: "integer", example: 34 },
                          estates: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string", format: "uuid" },
                                estCode: { type: "string", example: "TH1" },
                                estAlias: {
                                  type: "string",
                                  example: "THIP-1",
                                },
                                estComplete: {
                                  type: "string",
                                  example: "Estate 1",
                                },
                                wilayah: { type: "string" },
                                displayOrder: { type: "integer" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  data: [
                    {
                      id: "uuid-xxx",
                      company_code: "PT.THIP",
                      company_name: "PT Tanjung Harapan Inti Permai",
                      region: "Kalteng",
                      active: true,
                      hasBoundary: true,
                      estate_count: 5,
                      station_count: 34,
                      estates: [
                        {
                          id: "uuid-yyy",
                          estCode: "TH1",
                          estAlias: "THIP-1",
                          estComplete: "Estate 1",
                          wilayah: "Wilayah A",
                          displayOrder: 1,
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/companies/{code}/boundary": {
      get: {
        tags: ["Companies"],
        summary: "Ambil GeoJSON boundary perusahaan",
        description:
          "Mengembalikan polygon GeoJSON batas wilayah perusahaan berdasarkan company_code.",
        operationId: "getCompanyBoundary",
        parameters: [
          {
            name: "code",
            in: "path",
            required: true,
            schema: { type: "string", example: "PT.THIP" },
            description: "Company code (contoh: PT.THIP)",
          },
        ],
        responses: {
          "200": {
            description: "GeoJSON boundary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      example: "FeatureCollection",
                    },
                    features: { type: "array", items: { type: "object" } },
                  },
                },
                example: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Polygon", coordinates: [[]] },
                      properties: { company_code: "PT.THIP" },
                    },
                  ],
                },
              },
            },
          },
          "404": { description: "Boundary tidak ditemukan" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/stations": {
      get: {
        tags: ["Stations"],
        summary: "List semua stasiun hujan",
        description:
          "Mengembalikan seluruh stasiun hujan (ombrometer) beserta informasi perusahaan, estate, koordinat, dan status.",
        operationId: "getStations",
        responses: {
          "200": {
            description: "Sukses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          stationId: { type: "string", example: "TH1-001" },
                          companyCode: { type: "string", example: "PT.THIP" },
                          companyName: { type: "string" },
                          estCode: { type: "string", example: "TH1" },
                          estAlias: { type: "string" },
                          estComplete: { type: "string" },
                          location: {
                            type: "string",
                            example: "Blok A1",
                          },
                          latitude: { type: "number", example: -2.123 },
                          longitude: { type: "number", example: 113.456 },
                          active: { type: "boolean" },
                          lastSeenAt: {
                            type: "string",
                            format: "date-time",
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  data: [
                    {
                      id: "uuid-xxx",
                      stationId: "TH1-001",
                      companyCode: "PT.THIP",
                      companyName: "PT Tanjung Harapan Inti Permai",
                      estCode: "TH1",
                      estAlias: "THIP-1",
                      estComplete: "Estate 1",
                      location: "Blok A1",
                      latitude: -2.123,
                      longitude: 113.456,
                      active: true,
                      lastSeenAt: "2026-09-28T10:00:00Z",
                    },
                  ],
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/stations/{id}": {
      get: {
        tags: ["Stations"],
        summary: "Detail stasiun berdasarkan ID",
        operationId: "getStationById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID stasiun",
          },
        ],
        responses: {
          "200": {
            description: "Detail stasiun",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "object" },
                  },
                },
                example: {
                  data: {
                    id: "uuid-xxx",
                    stationId: "TH1-001",
                    companyCode: "PT.THIP",
                    location: "Blok A1",
                    latitude: -2.123,
                    longitude: 113.456,
                    active: true,
                  },
                },
              },
            },
          },
          "404": { description: "Stasiun tidak ditemukan" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/rainfall/daily": {
      get: {
        tags: ["Rainfall"],
        summary: "Data curah hujan harian",
        description:
          "Mengembalikan record curah hujan harian dengan support filter, pagination. Max limit 10.000 per request.",
        operationId: "getRainfallDaily",
        parameters: [
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-01" },
            description: "Tanggal mulai (YYYY-MM-DD)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-30" },
            description: "Tanggal akhir (YYYY-MM-DD)",
          },
          {
            name: "companyCode",
            in: "query",
            schema: { type: "string", example: "PT.THIP" },
            description: "Filter per perusahaan",
          },
          {
            name: "estCode",
            in: "query",
            schema: { type: "string", example: "TH1" },
            description: "Filter per estate (est_code atau est_alias)",
          },
          {
            name: "stationId",
            in: "query",
            schema: { type: "string", example: "TH1-001" },
            description: "Filter per stasiun",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 5000, maximum: 10000 },
            description: "Jumlah record per halaman (max 10.000)",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
            description: "Offset untuk pagination",
          },
        ],
        responses: {
          "200": {
            description: "Sukses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { type: "object" } },
                    meta: {
                      type: "object",
                      properties: {
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        total: { type: "integer" },
                        limit: { type: "integer" },
                        offset: { type: "integer" },
                      },
                    },
                  },
                },
                example: {
                  data: [
                    {
                      id: "uuid-xxx",
                      rainDate: "2026-09-28",
                      companyCode: "PT.THIP",
                      companyName: "PT Tanjung Harapan Inti Permai",
                      estCode: "TH1",
                      estAlias: "THIP-1",
                      stationId: "TH1-001",
                      location: "Blok A1",
                      latitude: -2.123,
                      longitude: 113.456,
                      rainfallMm: 12.5,
                      sourceMtd: 125.0,
                    },
                  ],
                  meta: {
                    startDate: "2026-09-01",
                    endDate: "2026-09-30",
                    total: 1234,
                    limit: 5000,
                    offset: 0,
                  },
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/rainfall/daily-matrix": {
      get: {
        tags: ["Rainfall"],
        summary: "Matriks curah hujan harian per estate",
        description:
          "Mengembalikan data matriks curah hujan harian per estate dalam rentang tanggal. startDate dan endDate **wajib** disertakan. Cocok untuk tampilan tabel kalender/matrix.",
        operationId: "getRainfallDailyMatrix",
        parameters: [
          {
            name: "startDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date", example: "2026-09-01" },
            description: "Tanggal mulai (YYYY-MM-DD) — wajib",
          },
          {
            name: "endDate",
            in: "query",
            required: true,
            schema: { type: "string", format: "date", example: "2026-09-30" },
            description: "Tanggal akhir (YYYY-MM-DD) — wajib",
          },
          {
            name: "companyCode",
            in: "query",
            schema: { type: "string", example: "PT.THIP" },
            description: "Filter per perusahaan (opsional)",
          },
          {
            name: "estCode",
            in: "query",
            schema: { type: "string", example: "TH1" },
            description: "Filter per estate (opsional)",
          },
        ],
        responses: {
          "200": {
            description: "Data matriks berhasil dikembalikan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    dates: { type: "array", items: { type: "object" } },
                    monthGroups: { type: "array", items: { type: "object" } },
                    weekGroups: { type: "array", items: { type: "object" } },
                    companies: { type: "array", items: { type: "object" } },
                  },
                },
                example: {
                  dates: [
                    {
                      date: "2026-09-01",
                      day: "01",
                      monthName: "September",
                      year: 2026,
                      gisWeekId: 521,
                      weekShortName: "Sep W1",
                      isEndOfWeek: false,
                    },
                  ],
                  monthGroups: [
                    { monthName: "September", year: 2026, colSpan: 30 },
                  ],
                  weekGroups: [
                    {
                      gisWeekId: 521,
                      weekShortName: "Sep W1",
                      startDate: "2026-09-01",
                      endDate: "2026-09-07",
                      colSpan: 7,
                    },
                  ],
                  companies: [
                    {
                      companyCode: "PT.THIP",
                      companyName: "PT Tanjung Harapan Inti Permai",
                      estates: [
                        {
                          estCode: "TH1",
                          dailyValues: { "2026-09-01": 5, "2026-09-02": 0 },
                          totalMm: 75,
                        },
                      ],
                      ch: { dailyValues: { "2026-09-01": 4 }, total: 60 },
                      hh: { dailyValues: { "2026-09-01": 1 }, total: 15 },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "startDate atau endDate tidak disertakan",
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/rainfall/weekly": {
      get: {
        tags: ["Rainfall"],
        summary: "Data curah hujan mingguan per stasiun",
        description:
          "Mengembalikan data curah hujan agregat mingguan (dari tabel rainfall_weekly) per record stasiun.",
        operationId: "getRainfallWeekly",
        parameters: [
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-01" },
            description: "Filter tanggal mulai",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-30" },
            description: "Filter tanggal akhir",
          },
          {
            name: "companyCode",
            in: "query",
            schema: { type: "string", example: "PT.THIP" },
          },
          {
            name: "estCode",
            in: "query",
            schema: { type: "string", example: "TH1" },
          },
          {
            name: "stationId",
            in: "query",
            schema: { type: "string", example: "TH1-001" },
          },
          {
            name: "gisWeekId",
            in: "query",
            schema: { type: "integer", example: 521 },
            description: "Filter berdasarkan ID minggu GIS",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 1000, maximum: 5000 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Data mingguan",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      gisWeekId: 521,
                      year: 2026,
                      month: 9,
                      week: 1,
                      weekName: "Sep 2026, W1",
                      formattedName: "Sep 2026, W1",
                      startDate: "2026-09-01",
                      endDate: "2026-09-07",
                      companyCode: "PT.THIP",
                      stationId: "TH1-001",
                      rainfallMm: 45.5,
                      observedDays: 7,
                      rainyDays: 3,
                    },
                  ],
                  meta: {
                    total: 500,
                    limit: 1000,
                    offset: 0,
                  },
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/rainfall/station-weekly": {
      get: {
        tags: ["Rainfall"],
        summary: "Matriks mingguan per stasiun (N minggu terakhir)",
        description:
          "Mengembalikan matriks data mingguan per stasiun untuk N minggu terakhir. Data otomatis mengambil minggu terbaru dari DB. Cocok untuk tabel summary per stasiun.",
        operationId: "getRainfallStationWeekly",
        parameters: [
          {
            name: "weeks",
            in: "query",
            schema: { type: "integer", enum: [4, 8, 12], default: 4 },
            description: "Jumlah minggu yang ditampilkan",
          },
          {
            name: "company",
            in: "query",
            schema: { type: "string", example: "PT.THIP" },
            description: "Filter per perusahaan (company_code atau id)",
          },
          {
            name: "estate",
            in: "query",
            schema: { type: "string", example: "TH1" },
            description: "Filter per estate (est_code, est_alias, atau id)",
          },
        ],
        responses: {
          "200": {
            description: "Data matriks mingguan per stasiun",
            content: {
              "application/json": {
                example: {
                  meta: {
                    weeksCount: 4,
                    startWeekId: 518,
                    latestWeekId: 521,
                    latestWeekName: "Sep 2026, W4",
                  },
                  weeks: [
                    {
                      gisWeekId: 518,
                      weekName: "Sep 2026, W1",
                      formattedName: "Sep 2026, W1",
                      startDate: "2026-09-01",
                      endDate: "2026-09-07",
                      isThisWeek: false,
                    },
                  ],
                  stations: [
                    {
                      stationId: "TH1-001",
                      companyCode: "PT.THIP",
                      estCode: "TH1",
                      weeklyStats: {
                        "518": { totalMm: 45.5, rainyDays: 3 },
                        "521": { totalMm: 12.0, rainyDays: 1 },
                      },
                    },
                  ],
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/rainfall/company-weekly": {
      get: {
        tags: ["Rainfall"],
        summary: "Matriks mingguan per perusahaan (N minggu terakhir)",
        description:
          "Mengembalikan agregasi curah hujan mingguan per perusahaan untuk N minggu terakhir. Cocok untuk dashboard ringkasan.",
        operationId: "getRainfallCompanyWeekly",
        parameters: [
          {
            name: "weeks",
            in: "query",
            schema: { type: "integer", enum: [4, 8, 12], default: 4 },
            description: "Jumlah minggu yang ditampilkan",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-28" },
            description:
              "Tanggal referensi akhir (opsional, default: minggu terbaru yang ada data)",
          },
        ],
        responses: {
          "200": {
            description: "Matriks mingguan per perusahaan",
            content: {
              "application/json": {
                example: {
                  meta: {
                    weeksCount: 4,
                    startWeekId: 518,
                    latestWeekId: 521,
                    latestWeekName: "Sep 2026, W4",
                  },
                  weeks: [
                    {
                      gisWeekId: 521,
                      weekName: "Sep 2026, W4",
                      formattedName: "Sep 2026, W4",
                      startDate: "2026-09-22",
                      endDate: "2026-09-28",
                      isThisWeek: true,
                    },
                  ],
                  companies: [
                    {
                      companyCode: "PT.THIP",
                      companyName: "PT Tanjung Harapan Inti Permai",
                      stationCount: 34,
                      weeklyStats: {
                        "521": {
                          totalMm: 1540.5,
                          rainyDays: 4,
                          avgMm: 45.3,
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/rainfall/summary": {
      get: {
        tags: ["Rainfall"],
        summary: "Ringkasan statistik curah hujan",
        description:
          "Mengembalikan statistik agregat: total curah hujan, rata-rata harian, jumlah hari hujan, jumlah record, dan nama minggu terbaru.",
        operationId: "getRainfallSummary",
        parameters: [
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-01" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-30" },
          },
          {
            name: "companyCode",
            in: "query",
            schema: { type: "string", example: "PT.THIP" },
          },
          {
            name: "estCode",
            in: "query",
            schema: { type: "string", example: "TH1" },
          },
          {
            name: "stationId",
            in: "query",
            schema: { type: "string", example: "TH1-001" },
          },
        ],
        responses: {
          "200": {
            description: "Statistik ringkasan",
            content: {
              "application/json": {
                example: {
                  totalRainfall: 4560.5,
                  averageDaily: 8.2,
                  rainyDays: 18,
                  totalRecords: 555,
                  stationCount: 34,
                  latestObservedDate: "2026-09-28",
                  latestWeekName: "Sep 2026, W4",
                  latestWeekRainfall: 1540.5,
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/tmat/devices": {
      get: {
        tags: ["TMAT"],
        summary: "List semua device TMAT",
        description:
          "Mengembalikan daftar device TMAT beserta snapshot pembacaan terakhir (tanggal, nilai TMAT, baterai, sinyal).",
        operationId: "getTmatDevices",
        responses: {
          "200": {
            description: "Sukses",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      id: "uuid-xxx",
                      companyCode: "PT.THIP",
                      deviceId: "1001",
                      deviceName: "TMAT-TH1-A1",
                      estate: "TH1",
                      block: "A1",
                      latitude: "-2.123",
                      longitude: "113.456",
                      active: true,
                      firstSeenAt: "2026-01-01T00:00:00Z",
                      lastSeenAt: "2026-09-28T10:00:00Z",
                      latestDate: "2026-09-28",
                      latestHour: 10,
                      latestTmat: 65.5,
                      latestBattery: 3.7,
                      latestSignal: -75,
                      latestCh: 0.0,
                    },
                  ],
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
      post: {
        tags: ["TMAT"],
        summary: "Tambah device TMAT baru",
        description: "Mendaftarkan device TMAT baru ke database.",
        operationId: "createTmatDevice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "companyCode",
                  "deviceId",
                  "deviceName",
                  "estate",
                  "block",
                ],
                properties: {
                  companyCode: {
                    type: "string",
                    example: "PT.THIP",
                  },
                  deviceId: { type: "string", example: "1001" },
                  deviceName: {
                    type: "string",
                    example: "TMAT-TH1-A1",
                  },
                  estate: { type: "string", example: "TH1" },
                  block: { type: "string", example: "A1" },
                  latitude: { type: "number", example: -2.123 },
                  longitude: { type: "number", example: 113.456 },
                  active: {
                    type: "boolean",
                    default: true,
                  },
                },
              },
              example: {
                companyCode: "PT.THIP",
                deviceId: "1001",
                deviceName: "TMAT-TH1-A1",
                estate: "TH1",
                block: "A1",
                latitude: -2.123,
                longitude: 113.456,
                active: true,
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Device berhasil ditambahkan",
            content: {
              "application/json": {
                example: {
                  data: {
                    id: "uuid-new",
                    companyCode: "PT.THIP",
                    deviceId: "1001",
                    deviceName: "TMAT-TH1-A1",
                    estate: "TH1",
                    block: "A1",
                    active: true,
                  },
                },
              },
            },
          },
          "400": { description: "Field wajib tidak lengkap" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/tmat/devices/{id}": {
      get: {
        tags: ["TMAT"],
        summary: "Detail device TMAT berdasarkan ID",
        operationId: "getTmatDeviceById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID device TMAT",
          },
        ],
        responses: {
          "200": {
            description: "Detail device",
            content: {
              "application/json": {
                example: {
                  data: {
                    id: "uuid-xxx",
                    companyCode: "PT.THIP",
                    deviceId: "1001",
                    deviceName: "TMAT-TH1-A1",
                    estate: "TH1",
                    block: "A1",
                    active: true,
                  },
                },
              },
            },
          },
          "404": { description: "Device tidak ditemukan" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/tmat/data": {
      get: {
        tags: ["TMAT"],
        summary: "Data TMAT per jam untuk satu device",
        description:
          "Mengembalikan data pembacaan per jam sensor TMAT untuk device tertentu, beserta statistik (avg, min, max TMAT). **Parameter `deviceId` wajib disertakan.** Default: 30 hari terakhir.",
        operationId: "getTmatData",
        parameters: [
          {
            name: "deviceId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID device TMAT (wajib)",
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-01" },
            description: "Tanggal mulai (opsional, default 30 hari terakhir)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-30" },
            description: "Tanggal akhir (opsional)",
          },
        ],
        responses: {
          "200": {
            description: "Data TMAT dan statistik",
            content: {
              "application/json": {
                example: {
                  device: {
                    id: "uuid-xxx",
                    companyCode: "PT.THIP",
                    deviceId: "1001",
                    deviceName: "TMAT-TH1-A1",
                    estate: "TH1",
                    block: "A1",
                    active: true,
                    lastSeenAt: "2026-09-28T10:00:00Z",
                  },
                  stats: {
                    totalRecords: 720,
                    validRecords: 715,
                    avgTmat: 62.5,
                    maxTmat: 45.0,
                    minTmat: 95.0,
                  },
                  records: [
                    {
                      id: "uuid-rec",
                      recordDate: "2026-09-28",
                      recordHour: 10,
                      tmatValue: 62.5,
                      battery: 3.7,
                      signal: -75,
                      chRainfall: 0.0,
                    },
                  ],
                },
              },
            },
          },
          "400": { description: "Parameter deviceId tidak disertakan" },
          "404": { description: "Device tidak ditemukan" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/tmat/sync": {
      get: {
        tags: ["TMAT"],
        summary: "Status sinkronisasi TMAT",
        description:
          "Mengembalikan daftar 10 batch sync terbaru dan ringkasan total record TMAT di database.",
        operationId: "getTmatSyncStatus",
        responses: {
          "200": {
            description: "Status sync TMAT",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      id: "uuid-batch",
                      status: "completed",
                      startedAt: "2026-09-28T08:00:00Z",
                      finishedAt: "2026-09-28T08:15:00Z",
                      deviceCount: 94,
                    },
                  ],
                  summary: {
                    totalHourlyRecords: 250000,
                    activeDevicesCount: 94,
                    latestDate: "2026-09-28",
                    latestHour: 10,
                  },
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
      post: {
        tags: ["TMAT"],
        summary: "Trigger sinkronisasi TMAT",
        description:
          "Memulai sinkronisasi data TMAT dari server eksternal. Untuk full sync (banyak device), proses berjalan di background.",
        operationId: "triggerTmatSync",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  startDate: {
                    type: "string",
                    format: "date",
                    example: "2026-09-01",
                  },
                  endDate: {
                    type: "string",
                    format: "date",
                    example: "2026-09-28",
                  },
                  deviceIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                    description: "Kosongkan untuk sync semua device",
                  },
                  companyCodes: {
                    type: "array",
                    items: { type: "string" },
                    example: ["PT.THIP"],
                  },
                },
              },
              example: {
                startDate: "2026-09-01",
                endDate: "2026-09-28",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sync dimulai",
            content: {
              "application/json": {
                example: {
                  message: "Sinkronisasi TMAT dimulai di background",
                  batchId: "uuid-batch",
                  status: "running",
                  deviceCount: 94,
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/sync": {
      post: {
        tags: ["Sync"],
        summary: "Sinkronisasi data curah hujan (Rainfall)",
        description:
          "Memulai sinkronisasi data curah hujan dari arsiran (sumber eksternal) ke database lokal untuk rentang tanggal dan daftar perusahaan tertentu.",
        operationId: "syncRainfall",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["startDate", "endDate", "companyCodes"],
                properties: {
                  startDate: {
                    type: "string",
                    format: "date",
                    example: "2026-09-01",
                    description: "Tanggal mulai (YYYY-MM-DD)",
                  },
                  endDate: {
                    type: "string",
                    format: "date",
                    example: "2026-09-28",
                    description: "Tanggal akhir (YYYY-MM-DD)",
                  },
                  companyCodes: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    example: ["PT.THIP", "PT.RKB"],
                    description: "Daftar company code yang akan disinkronkan",
                  },
                  arsiran: {
                    type: "integer",
                    default: 7,
                    example: 7,
                    description:
                      "Kode arsiran (sumber data eksternal), default 7",
                  },
                },
              },
              example: {
                startDate: "2026-09-01",
                endDate: "2026-09-28",
                companyCodes: ["PT.THIP"],
                arsiran: 7,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sync berhasil",
            content: {
              "application/json": {
                example: {
                  status: "success",
                  inserted: 340,
                  updated: 12,
                  errors: 0,
                  duration: "4.5s",
                },
              },
            },
          },
          "400": { description: "Validasi gagal" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/sync/{batchId}": {
      get: {
        tags: ["Sync"],
        summary: "Status batch sinkronisasi rainfall",
        description:
          "Mengecek status dan progress batch sinkronisasi rainfall berdasarkan batch ID.",
        operationId: "getSyncBatchStatus",
        parameters: [
          {
            name: "batchId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "ID batch sinkronisasi",
          },
        ],
        responses: {
          "200": {
            description: "Status batch",
            content: {
              "application/json": {
                example: {
                  id: "uuid-batch",
                  status: "completed",
                  startedAt: "2026-09-28T08:00:00Z",
                  finishedAt: "2026-09-28T08:05:00Z",
                  inserted: 340,
                  errors: 0,
                },
              },
            },
          },
          "404": { description: "Batch tidak ditemukan" },
          "500": { description: "Internal server error" },
        },
      },
    },

    "/api/report/iot": {
      get: {
        tags: ["Report"],
        summary: "Laporan IoT (CH + TMAT per blok)",
        description:
          "Mengembalikan laporan mingguan IoT yang menggabungkan data curah hujan (CH) dan TMAT per blok, beserta analisis selisih mingguan TMAT.",
        operationId: "getIotReport",
        parameters: [
          {
            name: "companyCode",
            in: "query",
            schema: { type: "string", example: "PT.THIP" },
            description: "Kode perusahaan (default: PT.THIP)",
          },
          {
            name: "weeksCount",
            in: "query",
            schema: { type: "integer", minimum: 4, maximum: 12, default: 4 },
            description: "Jumlah minggu yang ditampilkan (4-12)",
          },
          {
            name: "referenceDate",
            in: "query",
            schema: { type: "string", format: "date", example: "2026-09-28" },
            description: "Tanggal referensi untuk menentukan minggu",
          },
        ],
        responses: {
          "200": {
            description: "Data laporan IoT",
            content: {
              "application/json": {
                example: {
                  companyCode: "PT.THIP",
                  weeks: [
                    {
                      id: "uuid-week",
                      startDate: "2026-09-22",
                      endDate: "2026-09-28",
                      weekName: "Sep 2026, W4",
                      gisWeekId: 521,
                      tuesdayDate: "2026-09-23",
                    },
                  ],
                  blocks: [
                    {
                      id: "uuid-block",
                      estate: "TH1",
                      block: "A1",
                      statusTanam: "Muda",
                      idl: "Sudah",
                      weeklyData: [
                        {
                          weekLabel: "W4",
                          ch: 45,
                          tmat: 65,
                          monthName: "Sep",
                        },
                      ],
                      selisihMingguan: {
                        diffVal: -5,
                        diffSymbol: "▲",
                        diffLabel: "▲ 5",
                        category: "normal",
                      },
                    },
                  ],
                  companies: [
                    { code: "PT.THIP", name: "PT Tanjung Harapan" },
                  ],
                },
              },
            },
          },
          "500": { description: "Internal server error" },
        },
      },
      post: {
        tags: ["Report"],
        summary: "Tambah blok ke laporan IoT",
        description: "Mendaftarkan blok baru ke dalam laporan IoT perusahaan.",
        operationId: "createIotReportBlock",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["companyCode", "estate", "block"],
                properties: {
                  companyCode: { type: "string", example: "PT.THIP" },
                  estate: { type: "string", example: "TH1" },
                  block: { type: "string", example: "A1" },
                  wilayah: { type: "integer", default: 1 },
                  statusTanam: {
                    type: "string",
                    example: "Muda",
                    enum: ["Muda", "TBM", "TM"],
                  },
                  idl: {
                    type: "string",
                    example: "Sudah",
                    enum: ["Sudah", "Belum"],
                  },
                  rainStationId: {
                    type: "string",
                    format: "uuid",
                    description: "UUID stasiun hujan yang terhubung",
                  },
                  tmatDeviceId: {
                    type: "string",
                    format: "uuid",
                    description: "UUID device TMAT yang terhubung",
                  },
                  pic: { type: "string", example: "Joni Pambudi" },
                  rekomendasi: { type: "string" },
                  targetPlan: { type: "string" },
                  progressLastWeek: { type: "string", example: "50" },
                  progressThisWeek: { type: "string", example: "75" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Blok berhasil ditambahkan" },
          "400": { description: "Field wajib tidak lengkap" },
          "500": { description: "Internal server error" },
        },
      },
      put: {
        tags: ["Report"],
        summary: "Batch update blok laporan IoT",
        description:
          "Menyimpan perubahan pada satu atau lebih blok laporan IoT secara batch (inline edit).",
        operationId: "updateIotReportBlocks",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["blocks"],
                properties: {
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id"],
                      properties: {
                        id: { type: "string", format: "uuid" },
                        estate: { type: "string" },
                        block: { type: "string" },
                        statusTanam: { type: "string" },
                        idl: { type: "string" },
                        rainStationId: { type: "string", format: "uuid" },
                        tmatDeviceId: { type: "string", format: "uuid" },
                        progressLastWeek: { type: "string" },
                        progressThisWeek: { type: "string" },
                      },
                    },
                  },
                },
              },
              example: {
                blocks: [
                  {
                    id: "uuid-block",
                    progressThisWeek: "75",
                    statusTanam: "TM",
                  },
                ],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Berhasil disimpan",
            content: {
              "application/json": {
                example: {
                  message: "Berhasil menyimpan perubahan",
                  count: 1,
                },
              },
            },
          },
          "400": { description: "Format body tidak valid" },
          "500": { description: "Internal server error" },
        },
      },
      delete: {
        tags: ["Report"],
        summary: "Hapus blok laporan IoT",
        description: "Menghapus satu blok dari laporan IoT berdasarkan ID.",
        operationId: "deleteIotReportBlock",
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID blok yang akan dihapus",
          },
        ],
        responses: {
          "200": {
            description: "Blok berhasil dihapus",
            content: {
              "application/json": {
                example: { message: "Blok berhasil dihapus" },
              },
            },
          },
          "400": { description: "Parameter id tidak disertakan" },
          "404": { description: "Blok tidak ditemukan" },
          "500": { description: "Internal server error" },
        },
      },
    },
  },
};
