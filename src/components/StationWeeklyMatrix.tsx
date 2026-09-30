"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Radio,
  RefreshCw,
  Search,
  Droplets,
  Calendar,
  CloudRain,
  Building2,
  MapPin,
  Sparkles,
} from "lucide-react";
import SearchableSelect, { SelectOption } from "./SearchableSelect";
import ExportCopyButtons from "./ExportCopyButtons";
import {
  exportStationWeeklyExcel,
  buildStationWeeklyClipboardData,
} from "@/lib/excel-generators";
import { copyTableToClipboard } from "@/lib/export-utils";

type WeekInfo = {
  gisWeekId: number;
  weekName: string;
  formattedName: string;
  startDate: string;
  endDate: string;
  isThisWeek: boolean;
};

type StationWeeklyStat = {
  totalMm: number;
  rainyDays: number;
};

type StationMatrixItem = {
  stationDbId: string;
  stationId: string;
  location: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  estateId: string;
  estCode: string;
  estComplete: string;
  displayOrder: number;
  weeklyStats: Record<string, StationWeeklyStat>;
};

type EstateItem = {
  id: string;
  estCode: string;
  estAlias: string | null;
  estComplete: string;
  wilayah: string | null;
  displayOrder: number;
};

type CompanyItem = {
  id: string;
  company_code: string;
  company_name: string;
  region: string | null;
  estate_count: number;
  station_count: number;
  estates: EstateItem[];
};

type StationWeeklyMatrixProps = {
  companies: CompanyItem[];
};

export default function StationWeeklyMatrix({ companies }: StationWeeklyMatrixProps) {
  const [selectedWeeksOption, setSelectedWeeksOption] = useState<4 | 8 | 12>(4);
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [selectedEstate, setSelectedEstate] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [stations, setStations] = useState<StationMatrixItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build Company Options
  const companyOptions: SelectOption[] = useMemo(() => {
    return [
      {
        value: "ALL",
        label: "SEMUA PERUSAHAAN (ALL)",
        badge: `${companies.length} PT`,
      },
      ...companies.map((c) => ({
        value: c.company_code,
        label: `${c.company_code} - ${c.company_name}`,
        subLabel: `${c.estate_count} Estate · ${c.station_count} Stasiun`,
        badge: c.company_code,
      })),
    ];
  }, [companies]);

  // Build Estate Options based on selected Company
  const estateOptions: SelectOption[] = useMemo(() => {
    let availableEstates: EstateItem[] = [];
    if (selectedCompany === "ALL") {
      availableEstates = companies.flatMap((c) => c.estates);
    } else {
      const comp = companies.find((c) => c.company_code === selectedCompany);
      availableEstates = comp ? comp.estates : [];
    }
    const sorted = [...availableEstates].sort(
      (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
    );
    return [
      {
        value: "ALL",
        label: "SEMUA ESTATE (ALL)",
        badge: `${sorted.length} Est`,
      },
      ...sorted.map((e) => ({
        value: e.estCode,
        label: `${e.estCode} - ${e.estComplete}`,
        subLabel: e.wilayah ? `Wilayah: ${e.wilayah}` : undefined,
        badge: e.estAlias || e.estCode,
      })),
    ];
  }, [companies, selectedCompany]);

  // Fetch Matrix Data
  const fetchMatrixData = async (
    numWeeks: 4 | 8 | 12,
    compFilter: string,
    estFilter: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        weeks: String(numWeeks),
        company: compFilter,
        estate: estFilter,
        _t: String(Date.now()),
      });
      const res = await fetch(`/api/rainfall/station-weekly?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setWeeks(data.weeks || []);
      setStations(data.stations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Gagal memuat matriks mingguan stasiun: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData(selectedWeeksOption, selectedCompany, selectedEstate);
  }, [selectedWeeksOption, selectedCompany, selectedEstate]);

  // Filter stations based on real-time search input
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase();
    return stations.filter(
      (stn) =>
        stn.stationId.toLowerCase().includes(q) ||
        stn.location.toLowerCase().includes(q) ||
        stn.companyCode.toLowerCase().includes(q) ||
        stn.companyName.toLowerCase().includes(q) ||
        (stn.estCode && stn.estCode.toLowerCase().includes(q)) ||
        (stn.estComplete && stn.estComplete.toLowerCase().includes(q))
    );
  }, [stations, searchQuery]);

  // Heatmap background color based on rainfall mm
  const getCellBgColor = (totalMm: number) => {
    if (totalMm <= 0) return "bg-white hover:bg-slate-50";
    if (totalMm < 20) return "bg-[#ECFDF5] hover:bg-[#D1FAE5]"; // Soft Mint Green
    if (totalMm < 50) return "bg-[#FEFCE8] hover:bg-[#FEF08A]"; // Soft Yellow
    if (totalMm < 100) return "bg-[#FFF7ED] hover:bg-[#FFEDD5]"; // Soft Orange
    return "bg-[#FEF2F2] hover:bg-[#FEE2E2]"; // Soft Red
  };

  const numberFormatter = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const handleExportExcel = async () => {
    await exportStationWeeklyExcel({
      weeks,
      stations: filteredStations,
    });
  };

  const handleCopyTable = async () => {
    const { html, tsv } = buildStationWeeklyClipboardData({
      weeks,
      stations: filteredStations,
    });
    return await copyTableToClipboard(html, tsv);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Controls Bar */}
      <div className="rounded-xl bg-[#FFFDF5] p-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-4">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block bg-[#00E599] border-2 border-black text-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_0px_#000]">
                Matriks Mingguan
              </span>
              <span className="text-xs font-bold text-slate-600">
                Stasiun Curah Hujan &times; Kalender GIS
              </span>
            </div>
            <h2 className="text-xl font-black uppercase text-black tracking-tight mt-1">
              Matriks Curah Hujan Mingguan Per Stasiun
            </h2>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              Baris diurutkan berdasarkan Company lalu Order Estate/Stasiun. Kolom diurutkan kronologis dengan <strong>This Week</strong> di sebelah kanan.
            </p>
          </div>

          {/* Week Range Toggle Buttons */}
          <div className="flex items-center self-start md:self-auto rounded-xl border-2 border-black bg-white p-1 shadow-[3px_3px_0px_0px_#000]">
            {([4, 8, 12] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWeeksOption(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition ${
                  selectedWeeksOption === w
                    ? "bg-[#FFE600] text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                    : "text-slate-700 hover:text-black hover:bg-slate-100"
                }`}
              >
                Last {w} Weeks
              </button>
            ))}
          </div>
        </div>

        {/* Filters Row: Company, Estate, Search & Actions */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pt-3 border-t-2 border-black">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1">
            <SearchableSelect
              label="Filter Company"
              icon={Building2}
              options={companyOptions}
              value={selectedCompany}
              onChange={(val) => {
                setSelectedCompany(val);
                setSelectedEstate("ALL");
              }}
              placeholder="Pilih Perusahaan..."
              allOptionLabel="Semua Perusahaan"
            />

            <SearchableSelect
              label="Filter Estate"
              icon={MapPin}
              options={estateOptions}
              value={selectedEstate}
              onChange={setSelectedEstate}
              placeholder="Pilih Estate..."
              allOptionLabel="Semua Estate"
            />

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-black mb-1">
                Cari Stasiun
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="ID stasiun, lokasi, dll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-2 border-black bg-white pl-9 pr-3 py-2 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 pb-0.5">
            <ExportCopyButtons
              onExportExcel={handleExportExcel}
              onCopyTable={handleCopyTable}
              disabled={isLoading || filteredStations.length === 0}
            />

            <button
              onClick={() =>
                fetchMatrixData(selectedWeeksOption, selectedCompany, selectedEstate)
              }
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-white px-3.5 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border-[3px] border-red-600 bg-red-100 p-4 font-black text-red-900 shadow-[4px_4px_0px_0px_#b91c1c] text-xs">
          {error}
        </div>
      )}

      {/* Main Table Matrix */}
      <div className="rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
        {/* Table Top Status Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-black bg-white">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-black" />
            <span className="text-xs font-black uppercase text-black">
              Daftar Stasiun ({filteredStations.length}{" "}
              {filteredStations.length !== stations.length
                ? `dari ${stations.length}`
                : ""})
            </span>
          </div>
          <div className="text-[11px] font-black uppercase text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-black">
            Rentang: {weeks.length} Minggu ({weeks[0]?.formattedName || "..."} &rarr;{" "}
            {weeks[weeks.length - 1]?.formattedName || "..."})
          </div>
        </div>

        {/* Scrollable Matrix Table */}
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b-[3px] border-black">
                {/* Sticky Station Header */}
                <th
                  scope="col"
                  className="sticky left-0 z-30 bg-[#FFE600] px-4 py-3.5 text-xs font-black uppercase tracking-wider text-black border-r-[3px] border-black min-w-[280px] shadow-[2px_0px_0px_0px_#000]"
                >
                  <div className="flex items-center gap-1.5">
                    <Radio className="h-4 w-4" />
                    <span>Stasiun & Lokasi</span>
                  </div>
                </th>

                {/* Week Columns */}
                {weeks.map((w) => (
                  <th
                    key={w.gisWeekId}
                    scope="col"
                    className={`px-3 py-2 text-center border-r-2 border-black min-w-[130px] ${
                      w.isThisWeek ? "bg-[#FFE600]" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      {w.isThisWeek && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded bg-black text-[#FFE600] text-[9px] font-black uppercase tracking-widest shadow-[1px_1px_0px_0px_#000]">
                          <Sparkles className="h-2.5 w-2.5" />
                          This Week
                        </span>
                      )}
                      <span className="text-xs font-black text-black">
                        {w.formattedName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 mt-0.5">
                        {w.startDate.slice(5)} s/d {w.endDate.slice(5)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black bg-white">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={weeks.length + 1}
                    className="p-12 text-center text-xs font-black uppercase text-black"
                  >
                    <div className="inline-flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span>Sedang memuat data matriks stasiun...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStations.length === 0 ? (
                <tr>
                  <td
                    colSpan={weeks.length + 1}
                    className="p-12 text-center text-xs font-black uppercase text-slate-500"
                  >
                    Tidak ada stasiun yang cocok dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                filteredStations.map((stn) => (
                  <tr
                    key={stn.stationDbId}
                    className="hover:bg-slate-50 transition"
                  >
                    {/* Sticky Station Identity Cell */}
                    <td className="sticky left-0 z-10 bg-[#FFFDF5] px-4 py-3 border-r-[3px] border-black shadow-[2px_0px_0px_0px_#000]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-black text-white text-[10px] font-black uppercase tracking-wider">
                            {stn.companyCode}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#00E599] border border-black text-black text-[10px] font-black uppercase">
                            {stn.estCode}
                          </span>
                          {stn.location && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                              {stn.location}
                            </span>
                          )}
                        </div>

                        <div className="font-black text-xs text-black tracking-tight">
                          {stn.stationId}
                        </div>

                        <div className="text-[10px] font-bold text-slate-600 truncate">
                          {stn.estComplete || stn.companyName}
                        </div>
                      </div>
                    </td>

                    {/* Week Data Cells */}
                    {weeks.map((w) => {
                      const stat = stn.weeklyStats[w.gisWeekId] || {
                        totalMm: 0,
                        rainyDays: 0,
                      };
                      const bgClass = getCellBgColor(stat.totalMm);

                      return (
                        <td
                          key={w.gisWeekId}
                          className={`px-2 py-2.5 text-center border-r-2 border-black transition ${bgClass}`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            {/* Total Rainfall */}
                            <div className="flex items-center gap-1">
                              <Droplets
                                className={`h-3 w-3 ${
                                  stat.totalMm > 0
                                    ? "text-blue-600 fill-blue-600"
                                    : "text-slate-400"
                                }`}
                              />
                              <span className="text-xs font-black text-black">
                                {numberFormatter.format(stat.totalMm)}{" "}
                                <span className="text-[10px] font-bold text-slate-600">
                                  mm
                                </span>
                              </span>
                            </div>

                            {/* Rainy Days Badge */}
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                                stat.rainyDays > 0
                                  ? "bg-white border-black text-black shadow-[1px_1px_0px_0px_#000]"
                                  : "bg-slate-100 border-slate-300 text-slate-500"
                              }`}
                            >
                              <CloudRain className="h-2.5 w-2.5" />
                              {stat.rainyDays} HH
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t-2 border-black bg-white text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-black text-black uppercase text-[11px]">
              Keterangan Warna Heatmap:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-black bg-white">
                0 mm (Kering)
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-black bg-[#ECFDF5]">
                &lt; 20 mm
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-black bg-[#FEFCE8]">
                20 - 50 mm
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-black bg-[#FFF7ED]">
                50 - 100 mm
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-black bg-[#FEF2F2]">
                &ge; 100 mm
              </span>
            </div>
          </div>

          <div className="text-[11px] font-black uppercase text-black">
            HH = Hari Hujan (&gt; 0 mm/hari)
          </div>
        </div>
      </div>
    </div>
  );
}
