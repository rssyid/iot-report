"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Calendar, Sparkles } from "lucide-react";
import ExportCopyButtons from "./ExportCopyButtons";
import {
  exportDailyMatrixExcel,
  buildDailyMatrixClipboardData,
} from "@/lib/excel-generators";
import { copyTableToClipboard } from "@/lib/export-utils";

type DateInfo = {
  date: string;
  day: string;
  monthName: string;
  year: number;
  gisWeekId: number;
  weekShortName: string;
  weekStartDate: string;
  weekEndDate: string;
  isEndOfWeek: boolean;
};

type MonthGroup = {
  monthName: string;
  year: number;
  colSpan: number;
};

type WeekGroup = {
  gisWeekId: number;
  weekShortName: string;
  startDate: string;
  endDate: string;
  colSpan: number;
};

type EstateRow = {
  estCode: string;
  estAlias: string | null;
  estComplete: string;
  displayOrder: number;
  dailyValues: Record<string, number>;
  totalMm: number;
};

type CompanyGroup = {
  companyCode: string;
  companyName: string;
  estates: EstateRow[];
  ch: {
    dailyValues: Record<string, number>;
    total: number;
  };
  hh: {
    dailyValues: Record<string, number>;
    total: number;
  };
};

type DailyRainfallMatrixProps = {
  startDate: string;
  endDate: string;
  selectedCompany: string;
  selectedEstate: string;
};

export default function DailyRainfallMatrix({
  startDate,
  endDate,
  selectedCompany,
  selectedEstate,
}: DailyRainfallMatrixProps) {
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        companyCode: selectedCompany,
        estCode: selectedEstate,
        _t: String(Date.now()),
      });

      const res = await fetch(`/api/rainfall/daily-matrix?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setDates(data.dates || []);
      setMonthGroups(data.monthGroups || []);
      setWeekGroups(data.weekGroups || []);
      setCompanies(data.companies || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Gagal memuat matriks catatan harian: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedCompany, selectedEstate]);

  const handleExportExcel = async () => {
    await exportDailyMatrixExcel({
      dates,
      monthGroups,
      weekGroups,
      companies,
      startDate,
      endDate,
    });
  };

  const handleCopyTable = async () => {
    const { html, tsv } = buildDailyMatrixClipboardData({
      dates,
      monthGroups,
      weekGroups,
      companies,
      startDate,
      endDate,
    });
    return await copyTableToClipboard(html, tsv);
  };

  return (
    <div className="rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b-2 border-black bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-black" />
          <span className="text-xs font-black uppercase text-black">
            Matriks Catatan Harian Curah Hujan ({dates.length} Hari · {weekGroups.length} Minggu)
          </span>
          <span className="inline-block bg-[#FFE600] border border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
            Bulan &rarr; Week &rarr; Tanggal
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportCopyButtons
            onExportExcel={handleExportExcel}
            onCopyTable={handleCopyTable}
            disabled={isLoading || companies.length === 0}
          />

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black bg-white text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-100 border-b-2 border-black text-xs font-black text-red-900">
          {error}
        </div>
      )}

      {/* Scrollable Pivot Matrix Table */}
      <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
        <table className="w-full text-left border-collapse border border-black text-xs">
          {/* 3-Tier Sticky Header: Bulan -> Week -> Tanggal */}
          <thead className="sticky top-0 z-30 bg-white">
            {/* Tier 1: Bulan */}
            <tr className="border-b-2 border-black">
              <th
                rowSpan={3}
                className="sticky left-0 z-40 bg-[#F4F0EA] px-3 py-2 text-center font-black uppercase text-black border-r-[3px] border-b-[3px] border-black min-w-[90px] shadow-[2px_0px_0px_0px_#000]"
              >
                Company
              </th>
              <th
                rowSpan={3}
                className="sticky left-[90px] z-40 bg-[#F4F0EA] px-3 py-2 text-center font-black uppercase text-black border-r-[3px] border-b-[3px] border-black min-w-[90px] shadow-[2px_0px_0px_0px_#000]"
              >
                Estate
              </th>

              {monthGroups.map((mg, idx) => (
                <th
                  key={`${mg.monthName}-${mg.year}-${idx}`}
                  colSpan={mg.colSpan}
                  className="px-2 py-1.5 text-center font-black text-xs uppercase tracking-wider text-black border-r-[3px] border-b-2 border-black bg-[#CBD5E1]"
                >
                  {mg.monthName} {mg.year}
                </th>
              ))}

              <th
                rowSpan={3}
                className="px-3 py-2 text-center font-black uppercase text-black border-l-[3px] border-b-[3px] border-black bg-[#F4F0EA] min-w-[65px]"
              >
                Total
              </th>
            </tr>

            {/* Tier 2: Nama Week (GIS Week) */}
            <tr className="border-b-2 border-black bg-[#FEF9C3]">
              {weekGroups.map((wg, idx) => (
                <th
                  key={`${wg.gisWeekId}-${idx}`}
                  colSpan={wg.colSpan}
                  className="px-1.5 py-1 text-center font-black text-[11px] text-black border-r-[3px] border-b border-black uppercase tracking-tight bg-[#FEF08A]"
                  title={`Periode ${wg.startDate} s/d ${wg.endDate}`}
                >
                  <span className="inline-block px-1 py-0.2 bg-white/70 rounded border border-black/40 text-[10px]">
                    {wg.weekShortName}
                  </span>
                </th>
              ))}
            </tr>

            {/* Tier 3: Angka Tanggal (DD) */}
            <tr className="border-b-[3px] border-black bg-white">
              {dates.map((d) => (
                <th
                  key={d.date}
                  className={`px-1.5 py-1 text-center font-bold text-[11px] text-black min-w-[32px] max-w-[38px] ${
                    d.isEndOfWeek
                      ? "border-r-[3px] border-black bg-slate-100"
                      : "border-r border-black/30"
                  }`}
                  title={`${d.date} (${d.weekShortName})`}
                >
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td
                  colSpan={dates.length + 3}
                  className="p-12 text-center text-xs font-black uppercase text-black"
                >
                  <div className="inline-flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span>Memuat catatan harian matriks...</span>
                  </div>
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td
                  colSpan={dates.length + 3}
                  className="p-12 text-center text-xs font-black uppercase text-slate-500"
                >
                  Tidak ada data untuk filter dan rentang tanggal yang dipilih.
                </td>
              </tr>
            ) : (
              companies.map((comp) => {
                const rowSpanTotal = comp.estates.length + 2; // +1 CH, +1 HH

                return (
                  <React.Fragment key={comp.companyCode}>
                    {/* Estate Rows */}
                    {comp.estates.map((est, estIdx) => (
                      <tr
                        key={est.estCode}
                        className="border-b border-black/40 hover:bg-slate-50 transition"
                      >
                        {/* Company Column (Rendered once per group) */}
                        {estIdx === 0 && (
                          <td
                            rowSpan={rowSpanTotal}
                            className="sticky left-0 z-20 bg-white px-3 py-2 text-center font-black text-xs text-black border-r-[3px] border-b-[3px] border-black align-middle shadow-[2px_0px_0px_0px_#000]"
                          >
                            <span className="inline-block px-2 py-1 rounded border-2 border-black bg-[#FFE600] font-black text-xs uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
                              {comp.companyCode}
                            </span>
                          </td>
                        )}

                        {/* Estate Code Column */}
                        <td className="sticky left-[90px] z-10 bg-white px-3 py-1.5 text-center font-bold text-xs text-black border-r-[3px] border-black shadow-[2px_0px_0px_0px_#000]">
                          {est.estCode}
                        </td>

                        {/* Daily Values with Bold Week Border */}
                        {dates.map((d) => {
                          const val = est.dailyValues[d.date] ?? 0;
                          return (
                            <td
                              key={d.date}
                              className={`px-1 py-1.5 text-center text-[11px] ${
                                d.isEndOfWeek
                                  ? "border-r-[3px] border-black"
                                  : "border-r border-black/20"
                              } ${
                                val === 0
                                  ? "text-slate-400 font-medium"
                                  : "text-black font-bold"
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}

                        {/* Estate Total */}
                        <td className="px-2 py-1.5 text-center font-black text-xs text-black border-l-[3px] border-black bg-slate-50">
                          {est.totalMm}
                        </td>
                      </tr>
                    ))}

                    {/* CH Row (Curah Hujan Rata-rata Company) */}
                    <tr className="border-b border-black/60 bg-[#FEF08A]/40 font-black">
                      {comp.estates.length === 0 && (
                        <td className="sticky left-0 z-20 bg-white px-3 py-2 text-center font-black text-xs text-black border-r-[3px] border-black">
                          {comp.companyCode}
                        </td>
                      )}
                      <td className="sticky left-[90px] z-10 bg-[#FEF08A] px-3 py-1.5 text-center font-black text-xs text-black border-r-[3px] border-black shadow-[2px_0px_0px_0px_#000]">
                        CH
                      </td>

                      {dates.map((d) => {
                        const val = comp.ch.dailyValues[d.date] ?? 0;
                        return (
                          <td
                            key={d.date}
                            className={`px-1 py-1.5 text-center text-[11px] font-black ${
                              d.isEndOfWeek
                                ? "border-r-[3px] border-black"
                                : "border-r border-black/30"
                            } ${val === 0 ? "text-slate-400" : "text-black"}`}
                          >
                            {val}
                          </td>
                        );
                      })}

                      <td className="px-2 py-1.5 text-center font-black text-xs text-black border-l-[3px] border-black bg-[#FEF08A]">
                        {comp.ch.total}
                      </td>
                    </tr>

                    {/* HH Row (Hari Hujan Company: 1 jika ada hujan, 0 jika kering) */}
                    <tr className="border-b-[3px] border-black bg-[#E2E8F0]/60 font-black">
                      <td className="sticky left-[90px] z-10 bg-[#CBD5E1] px-3 py-1.5 text-center font-black text-xs text-black border-r-[3px] border-black shadow-[2px_0px_0px_0px_#000]">
                        HH
                      </td>

                      {dates.map((d) => {
                        const val = comp.hh.dailyValues[d.date] ?? 0;
                        return (
                          <td
                            key={d.date}
                            className={`px-1 py-1.5 text-center text-[11px] font-black ${
                              d.isEndOfWeek
                                ? "border-r-[3px] border-black"
                                : "border-r border-black/30"
                            } ${val === 0 ? "text-slate-400" : "text-blue-700"}`}
                          >
                            {val}
                          </td>
                        );
                      })}

                      <td className="px-2 py-1.5 text-center font-black text-xs text-black border-l-[3px] border-black bg-[#CBD5E1]">
                        {comp.hh.total}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend & Note Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t-2 border-black bg-white text-xs font-bold text-slate-700">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-black text-black uppercase text-[11px]">
            Keterangan:
          </span>
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-[#FEF08A] border border-black font-black text-black">
              CH = Curah Hujan (Rata-rata Estate)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#CBD5E1] border border-black font-black text-black">
              HH = Hari Hujan (1 jika ada hujan &gt; 0 mm, 0 jika kering)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white border-2 border-black font-black text-black">
              Garis Pembatas Tebal (3px) = Batas Akhir Minggu GIS
            </span>
          </div>
        </div>

        <div className="text-[11px] font-bold text-slate-600">
          Format angka dibulatkan tanpa desimal (mm).
        </div>
      </div>
    </div>
  );
}
