"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Building2,
  RefreshCw,
  Search,
  Droplets,
  Calendar,
  CloudRain,
  Radio,
  Sparkles,
} from "lucide-react";
import ExportCopyButtons from "./ExportCopyButtons";
import {
  exportCompanyWeeklyExcel,
  buildCompanyWeeklyClipboardData,
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

type CompanyWeeklyStat = {
  totalMm: number;
  rainyDays: number;
  avgMm: number;
};

type CompanyMatrixItem = {
  companyId: string;
  companyCode: string;
  companyName: string;
  stationCount: number;
  weeklyStats: Record<string, CompanyWeeklyStat>;
};

export default function CompanyWeeklyMatrix() {
  const [selectedWeeksOption, setSelectedWeeksOption] = useState<4 | 8 | 12>(4);
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [companies, setCompanies] = useState<CompanyMatrixItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchMatrixData = async (numWeeks: 4 | 8 | 12) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rainfall/company-weekly?weeks=${numWeeks}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setWeeks(data.weeks || []);
      setCompanies(data.companies || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Gagal memuat matriks mingguan: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData(selectedWeeksOption);
  }, [selectedWeeksOption]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.companyCode.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  // Heatmap background color based on average rainfall per station
  const getCellBgColor = (avgMm: number, totalMm: number) => {
    if (totalMm <= 0) return "bg-white hover:bg-slate-50";
    if (avgMm < 20) return "bg-[#ECFDF5] hover:bg-[#D1FAE5]"; // Soft Mint Green
    if (avgMm < 50) return "bg-[#FEFCE8] hover:bg-[#FEF08A]"; // Soft Yellow
    if (avgMm < 100) return "bg-[#FFF7ED] hover:bg-[#FFEDD5]"; // Soft Orange
    return "bg-[#FEF2F2] hover:bg-[#FEE2E2]"; // Soft Red
  };

  const handleExportExcel = async () => {
    await exportCompanyWeeklyExcel({ weeks, companies: filteredCompanies });
  };

  const handleCopyTable = async () => {
    const { html, tsv } = buildCompanyWeeklyClipboardData({
      weeks,
      companies: filteredCompanies,
    });
    return await copyTableToClipboard(html, tsv);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="rounded-xl bg-[#FFFDF5] p-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block bg-[#00E599] border-2 border-black text-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_0px_#000]">
              Matriks Mingguan
            </span>
            <span className="text-xs font-bold text-slate-600">
              Perusahaan &times; Kalender GIS
            </span>
          </div>
          <h2 className="text-xl font-black uppercase text-black tracking-tight mt-1">
            Matriks Curah Hujan Mingguan Company
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-0.5">
            Kolom diurutkan kronologis dengan <strong>This Week</strong> di kolom paling kanan.
          </p>
        </div>

        {/* Range Selector & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Week Range Buttons (Last 4, 8, 12 weeks) */}
          <div className="flex items-center rounded-xl border-2 border-black bg-white p-1 shadow-[3px_3px_0px_0px_#000]">
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

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari PT / Perusahaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-56 rounded-xl border-2 border-black bg-white pl-9 pr-3 py-2 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition"
            />
          </div>

          {/* Export & Copy Buttons */}
          <ExportCopyButtons
            onExportExcel={handleExportExcel}
            onCopyTable={handleCopyTable}
            disabled={isLoading || filteredCompanies.length === 0}
          />

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchMatrixData(selectedWeeksOption)}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition disabled:opacity-50"
            title="Muat ulang matriks"
          >
            <RefreshCw className={`h-4 w-4 stroke-[2.5] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[#FFD1D1] border-2 border-black p-4 text-black font-bold text-xs shadow-[3px_3px_0px_0px_#000]">
          {error}
        </div>
      )}

      {/* Matrix Table Box */}
      <div className="rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[3px] border-black bg-[#FFE600] text-black font-black uppercase text-xs">
                {/* Fixed Left Header for Company */}
                <th className="py-4 px-4 w-60 min-w-[240px] sticky left-0 z-20 bg-[#FFE600] border-r-2 border-black shadow-[2px_0px_0px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Perusahaan (PT)</span>
                  </div>
                </th>

                {/* Week Columns from Older (left) to This Week (rightmost) */}
                {weeks.map((wk) => (
                  <th
                    key={wk.gisWeekId}
                    className={`py-3.5 px-4 min-w-[170px] border-r-2 border-black text-center ${
                      wk.isThisWeek ? "bg-[#00E599]" : "bg-[#FFE600]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {wk.isThisWeek && (
                        <span className="inline-block bg-[#FFE600] border border-black px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_#000] mb-0.5">
                          THIS WEEK
                        </span>
                      )}
                      <span className="font-black text-xs text-black">
                        {wk.formattedName}
                      </span>
                      <span className="text-[10px] font-bold text-black/75">
                        {wk.startDate} &sim; {wk.endDate}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black text-xs">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={weeks.length + 1}
                    className="py-16 text-center text-slate-600 font-black uppercase"
                  >
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-black" />
                      Memuat matriks mingguan seluruh perusahaan...
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td
                    colSpan={weeks.length + 1}
                    className="py-12 text-center text-slate-500 font-bold"
                  >
                    Tidak ada data perusahaan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp, idx) => (
                  <tr
                    key={comp.companyId}
                    className="hover:bg-slate-50 transition duration-150"
                  >
                    {/* Sticky Left Column: Company Info */}
                    <td className="py-3.5 px-4 sticky left-0 z-10 bg-white border-r-2 border-black shadow-[2px_0px_0px_0px_#000]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded text-xs shadow-[1.5px_1.5px_0px_0px_#000]">
                            {comp.companyCode}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-700 bg-slate-100 border border-black px-1.5 py-0.5 rounded">
                            <Radio className="h-3 w-3" />
                            {comp.stationCount} Stn
                          </span>
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 truncate" title={comp.companyName}>
                          {comp.companyName}
                        </div>
                      </div>
                    </td>

                    {/* Weekly Value Cells */}
                    {weeks.map((wk) => {
                      const stat = comp.weeklyStats[wk.gisWeekId] || {
                        totalMm: 0,
                        rainyDays: 0,
                        avgMm: 0,
                      };

                      const cellBg = getCellBgColor(stat.avgMm, stat.totalMm);

                      return (
                        <td
                          key={wk.gisWeekId}
                          className={`py-3 px-3.5 border-r-2 border-black text-center transition ${cellBg} ${
                            wk.isThisWeek ? "ring-2 ring-inset ring-black/10" : ""
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            {/* Total Rainfall */}
                            <div className="flex items-center gap-1 font-black text-sm text-black">
                              <Droplets className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{stat.totalMm.toFixed(1)}</span>
                              <span className="text-[10px] font-bold text-slate-500">mm</span>
                            </div>

                            {/* Average per Station */}
                            <div className="text-[11px] font-bold text-slate-700 bg-white/70 border border-black/30 rounded px-1.5 py-0.5 w-full text-center">
                              &Oslash; <span className="font-black text-black">{stat.avgMm.toFixed(2)}</span> mm/stn
                            </div>

                            {/* Rainy Days Badge */}
                            <div className="pt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] ${
                                  stat.rainyDays > 0
                                    ? "bg-[#FFE600] text-black"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                <CloudRain className="h-3 w-3 shrink-0" />
                                {stat.rainyDays} HH
                              </span>
                            </div>
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

        {/* Legend / Info Footer */}
        <div className="p-4 border-t-2 border-black bg-[#F4F0EA] flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold text-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black uppercase text-black">Intensitas Rata-rata per Stasiun:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-black bg-white"></span>
              <span>0 mm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-black bg-[#ECFDF5]"></span>
              <span>&lt; 20 mm (Ringan)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-black bg-[#FEFCE8]"></span>
              <span>20 – 50 mm (Sedang)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-black bg-[#FFF7ED]"></span>
              <span>50 – 100 mm (Lebat)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-black bg-[#FEF2F2]"></span>
              <span>&gt; 100 mm (Sangat Lebat)</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 font-bold">
            HH = Hari Hujan (&gt;0 mm dalam minggu tersebut) &bull; &Oslash; = Rata-rata Total mm / Jumlah Stasiun
          </div>
        </div>
      </div>
    </div>
  );
}
