"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, subDays } from "date-fns";
import {
  CloudRain,
  Calendar,
  Building2,
  MapPin,
  Radio,
  RefreshCw,
  TrendingUp,
  Droplets,
  CalendarDays,
  Clock,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import SyncModal from "./SyncModal";
import SearchableSelect from "./SearchableSelect";
import CompanyWeeklyMatrix from "./CompanyWeeklyMatrix";
import StationWeeklyMatrix from "./StationWeeklyMatrix";
import DailyRainfallMatrix from "./DailyRainfallMatrix";
import ExportCopyButtons from "./ExportCopyButtons";
import {
  exportWeeklyGisExcel,
  buildWeeklyGisClipboardData,
} from "@/lib/excel-generators";
import { copyTableToClipboard } from "@/lib/export-utils";

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

type DailyRecord = {
  id: number;
  rainDate: string;
  companyCode: string;
  companyName: string;
  estCode: string;
  estAlias: string | null;
  estComplete: string;
  stationId: string;
  location: string | null;
  rainfallMm: number;
  sourceMtd: number | null;
  sourceEndingDate: string | null;
  rawDateKey: string | null;
};

type WeeklyRecord = {
  gisWeekId: number;
  year: number;
  month: number;
  week: number;
  weekName: string;
  formattedName: string;
  startDate: string;
  endDate: string;
  companyCode: string;
  companyName: string;
  estCode: string;
  estAlias: string | null;
  estComplete: string;
  stationId: string;
  location: string | null;
  rainfallMm: number;
  observedDays: number;
  rainyDays: number;
};

type SummaryKPI = {
  totalRainfall: number;
  averageDaily: number;
  rainyDays: number;
  totalRecords: number;
  stationCount: number;
  latestObservedDate: string | null;
  latestWeekName: string | null;
  latestWeekRainfall: number;
};

const numberFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export default function Dashboard() {
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const yesterdayDate = useMemo(() => subDays(new Date(), 1), []);
  const yesterdayStr = useMemo(() => format(yesterdayDate, "yyyy-MM-dd"), [yesterdayDate]);
  const defaultStartStr = useMemo(
    () => format(subDays(yesterdayDate, 29), "yyyy-MM-dd"),
    [yesterdayDate]
  );

  // Filter States (Default: 30 hari kebelakang sampai kemarin T-1)
  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(yesterdayStr);
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [selectedEstate, setSelectedEstate] = useState<string>("ALL");
  const [selectedStation, setSelectedStation] = useState<string>("ALL");

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "daily" | "weekly" | "company-weekly" | "station-weekly"
  >("daily");

  // Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Data States
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyRecord[]>([]);
  const [summary, setSummary] = useState<SummaryKPI>({
    totalRainfall: 0,
    averageDaily: 0,
    rainyDays: 0,
    totalRecords: 0,
    stationCount: 0,
    latestObservedDate: null,
    latestWeekName: null,
    latestWeekRainfall: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Check if yesterday's observation is missing in database
  const isYesterdayDataMissing = useMemo(() => {
    if (isLoading) return false;
    if (!summary.latestObservedDate) return true;
    return summary.latestObservedDate < yesterdayStr;
  }, [isLoading, summary.latestObservedDate, yesterdayStr]);
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Fetch Companies on mount
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetch("/api/companies");
        const json = await res.json();
        if (json.data) {
          setCompanies(json.data);
        }
      } catch (err) {
        console.error("Failed to load companies:", err);
      }
    }
    loadCompanies();
  }, []);

  // Filtered estates for current company selection (sorted by displayOrder)
  const availableEstates = useMemo(() => {
    let list: EstateItem[] = [];
    if (selectedCompany === "ALL") {
      list = companies.flatMap((c) => c.estates || []);
    } else {
      const comp = companies.find((c) => c.company_code === selectedCompany);
      list = comp?.estates || [];
    }
    return [...list].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.estComplete.localeCompare(b.estComplete)
    );
  }, [companies, selectedCompany]);

  // Available station IDs
  const availableStations = useMemo(() => {
    const set = new Set<string>();
    dailyData.forEach((d) => {
      if (d.stationId) set.add(d.stationId);
    });
    return Array.from(set).sort();
  }, [dailyData]);

  // Options for SearchableSelect
  const companyOptions = useMemo(() => {
    return companies.map((c) => ({
      value: c.company_code,
      label: c.company_code,
      subLabel: c.company_name,
      badge: `${c.estate_count} Est`,
    }));
  }, [companies]);

  const estateOptions = useMemo(() => {
    return availableEstates.map((est) => ({
      value: est.estCode,
      label: `${est.estCode}${est.estAlias ? ` (${est.estAlias})` : ""}`,
      subLabel: est.estComplete,
      badge: est.displayOrder ? `#${est.displayOrder}` : undefined,
    }));
  }, [availableEstates]);

  const stationOptions = useMemo(() => {
    return availableStations.map((st) => ({
      value: st,
      label: st,
    }));
  }, [availableStations]);

  // Load KPI Summary, Daily Data, and Weekly Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedCompany !== "ALL") params.set("companyCode", selectedCompany);
      if (selectedEstate !== "ALL") params.set("estCode", selectedEstate);
      if (selectedStation !== "ALL") params.set("stationId", selectedStation);

      const [sumRes, dailyRes, weeklyRes] = await Promise.all([
        fetch(`/api/rainfall/summary?${params.toString()}`),
        fetch(`/api/rainfall/daily?${params.toString()}&limit=5000`),
        fetch(`/api/rainfall/weekly?${params.toString()}&limit=1000`),
      ]);

      const [sumJson, dailyJson, weeklyJson] = await Promise.all([
        sumRes.json(),
        dailyRes.json(),
        weeklyRes.json(),
      ]);

      if (sumJson && !sumJson.error) {
        setSummary(sumJson);
      }
      if (dailyJson && dailyJson.data) {
        setDailyData(dailyJson.data);
      }
      if (weeklyJson && weeklyJson.data) {
        setWeeklyData(weeklyJson.data);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
      setCurrentPage(1);
    }
  }, [startDate, endDate, selectedCompany, selectedEstate, selectedStation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart Data Preparation: Daily aggregate per date
  const dailyChartData = useMemo(() => {
    const map = new Map<string, { rainDate: string; totalMm: number; count: number }>();
    for (const d of dailyData) {
      const current = map.get(d.rainDate) || {
        rainDate: d.rainDate,
        totalMm: 0,
        count: 0,
      };
      current.totalMm += d.rainfallMm;
      current.count += 1;
      map.set(d.rainDate, current);
    }

    return Array.from(map.values())
      .sort((a, b) => a.rainDate.localeCompare(b.rainDate))
      .map((item) => ({
        date: item.rainDate,
        totalMm: Number(item.totalMm.toFixed(2)),
        avgMm: Number((item.totalMm / (item.count || 1)).toFixed(2)),
      }));
  }, [dailyData]);

  // Chart Data Preparation: Weekly aggregate per formatted week
  const weeklyChartData = useMemo(() => {
    const map = new Map<
      number,
      {
        gisWeekId: number;
        formattedName: string;
        startDate: string;
        rainfallMm: number;
      }
    >();

    for (const w of weeklyData) {
      const cur = map.get(w.gisWeekId) || {
        gisWeekId: w.gisWeekId,
        formattedName: w.formattedName,
        startDate: w.startDate,
        rainfallMm: 0,
      };
      cur.rainfallMm += w.rainfallMm;
      map.set(w.gisWeekId, cur);
    }

    return Array.from(map.values())
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((item) => ({
        weekName: item.formattedName,
        startDate: item.startDate,
        rainfallMm: Number(item.rainfallMm.toFixed(2)),
      }));
  }, [weeklyData]);

  // Filtered Table Data
  const filteredDailyTable = useMemo(() => {
    if (!tableSearch) return dailyData;
    const q = tableSearch.toLowerCase();
    return dailyData.filter(
      (d) =>
        d.rainDate.includes(q) ||
        d.companyCode.toLowerCase().includes(q) ||
        d.estCode.toLowerCase().includes(q) ||
        d.estComplete.toLowerCase().includes(q) ||
        d.stationId.toLowerCase().includes(q) ||
        (d.location && d.location.toLowerCase().includes(q))
    );
  }, [dailyData, tableSearch]);

  const filteredWeeklyTable = useMemo(() => {
    if (!tableSearch) return weeklyData;
    const q = tableSearch.toLowerCase();
    return weeklyData.filter(
      (w) =>
        w.formattedName.toLowerCase().includes(q) ||
        w.companyCode.toLowerCase().includes(q) ||
        w.estCode.toLowerCase().includes(q) ||
        w.estComplete.toLowerCase().includes(q) ||
        w.stationId.toLowerCase().includes(q)
    );
  }, [weeklyData, tableSearch]);

  const totalTableItems =
    activeTab === "daily" ? filteredDailyTable.length : filteredWeeklyTable.length;
  const totalPages = Math.max(1, Math.ceil(totalTableItems / pageSize));
  const paginatedDaily = useMemo(
    () =>
      filteredDailyTable.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredDailyTable, currentPage]
  );
  const paginatedWeekly = useMemo(
    () =>
      filteredWeeklyTable.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredWeeklyTable, currentPage]
  );

  return (
    <div className="min-h-screen pb-16 text-black">
      {/* Neobrutalism Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-[3px] border-black shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <CloudRain className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">
                Rainfall Data
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Curah Hujan Mingguan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border-2 border-black px-3.5 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition disabled:opacity-50"
              title="Segarkan data saat ini"
            >
              <RefreshCw className={`h-3.5 w-3.5 stroke-[2.5] ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Warning Banner: Data Kemarin Belum Terupdate */}
        {isYesterdayDataMissing && (
          <div className="rounded-xl bg-[#FFF385] p-4 sm:p-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#FF4D4D] text-white border border-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                    Peringatan Update Data
                  </span>
                  <span className="text-[11px] font-black text-black uppercase">
                    Target Data: {format(yesterdayDate, "dd-MM-yyyy")}
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase text-black tracking-tight mt-1">
                  Data Curah Hujan Kemarin ({format(yesterdayDate, "dd MMMM yyyy")}) Belum Tersedia!
                </h3>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  Pengamatan curah hujan 24 jam (periode 07:00 kemarin s/d 07:00 hari ini) belum tercatat. Data terakhir yang tersedia di sistem adalah tanggal{" "}
                  <strong>{summary.latestObservedDate || "Belum ada"}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black bg-[#00E599] text-black text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
              >
                <RefreshCw className="h-4 w-4 stroke-[2.5]" />
                Sinkronisasi Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Neobrutalism Filter Box */}
        <div className="rounded-xl bg-[#FFFDF5] p-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-black bg-[#FFE600] border-2 border-black px-2.5 py-1 rounded-md shadow-[2px_2px_0px_0px_#000]">
              <Filter className="h-3.5 w-3.5 stroke-[2.5]" />
              Filter & Parameter
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStartDate(defaultStartStr);
                  setEndDate(yesterdayStr);
                  setSelectedCompany("ALL");
                  setSelectedEstate("ALL");
                  setSelectedStation("ALL");
                }}
                className="text-xs font-black uppercase px-2.5 py-1 rounded-md border-2 border-black bg-white hover:bg-[#FFD1D1] transition shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Reset Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Mulai
              </label>
              <input
                type="date"
                value={startDate}
                min="2025-01-01"
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385]"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Sampai
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385]"
              />
            </div>

            {/* Company Searchable Dropdown */}
            <SearchableSelect
              label="Perusahaan"
              icon={Building2}
              value={selectedCompany}
              options={companyOptions}
              allOptionLabel="Semua Perusahaan"
              placeholder="Cari perusahaan..."
              onChange={(val) => {
                setSelectedCompany(val);
                setSelectedEstate("ALL");
                setSelectedStation("ALL");
              }}
            />

            {/* Estate Searchable Dropdown */}
            <SearchableSelect
              label="Estate"
              icon={MapPin}
              value={selectedEstate}
              options={estateOptions}
              allOptionLabel="Semua Estate"
              placeholder="Cari estate..."
              onChange={(val) => {
                setSelectedEstate(val);
                setSelectedStation("ALL");
              }}
            />

            {/* Station Searchable Dropdown */}
            <SearchableSelect
              label="Ombrometer"
              icon={Radio}
              value={selectedStation}
              options={stationOptions}
              allOptionLabel="Semua Ombrometer"
              placeholder="Cari ombrometer..."
              onChange={(val) => setSelectedStation(val)}
            />
          </div>
        </div>

        {/* 5 Bold Neobrutalist KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Curah Hujan (Blue) */}
          <div className="rounded-xl bg-[#93C5FD] p-4 border-[3px] border-black shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-black tracking-wider">
                Total Curah Hujan
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#93C5FD] border-2 border-black">
                <Droplets className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-black tracking-tight">
                {numberFormatter.format(summary.totalRainfall)}
                <span className="text-xs font-black ml-1 uppercase">mm</span>
              </div>
              <p className="text-[10px] font-bold text-slate-800 mt-1">Volume akumulasi teramati</p>
            </div>
          </div>

          {/* Card 2: Rata-Rata Harian (Green) */}
          <div className="rounded-xl bg-[#86EFAC] p-4 border-[3px] border-black shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-black tracking-wider">
                Rata-Rata Harian
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#86EFAC] border-2 border-black">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-black tracking-tight">
                {numberFormatter.format(summary.averageDaily)}
                <span className="text-xs font-black ml-1 uppercase">mm</span>
              </div>
              <p className="text-[10px] font-bold text-slate-800 mt-1">Intensitas harian rata-rata</p>
            </div>
          </div>

          {/* Card 3: Hari Hujan (Pink) */}
          <div className="rounded-xl bg-[#FBCFE8] p-4 border-[3px] border-black shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-black tracking-wider">
                Hari Hujan
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#FBCFE8] border-2 border-black">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-black tracking-tight">
                {summary.rainyDays.toLocaleString("id-ID")}
                <span className="text-xs font-bold text-black/70 ml-1">
                  / {summary.totalRecords.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-800 mt-1">Hari dengan curah hujan &gt; 0 mm</p>
            </div>
          </div>

          {/* Card 4: Stasiun Aktif (Orange) */}
          <div className="rounded-xl bg-[#FED7AA] p-4 border-[3px] border-black shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-black tracking-wider">
                Stasiun Terhubung
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#FED7AA] border-2 border-black">
                <Radio className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-black tracking-tight">
                {summary.stationCount.toLocaleString("id-ID")}
                <span className="text-xs font-black ml-1 uppercase">Stasiun</span>
              </div>
              <p className="text-[10px] font-bold text-slate-800 mt-1">Ombrometer Aktif</p>
            </div>
          </div>

          {/* Card 5: Data Terakhir (Purple) */}
          <div className="rounded-xl bg-[#E9D5FF] p-4 border-[3px] border-black shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-black tracking-wider">
                Data Terakhir
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#E9D5FF] border-2 border-black">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-black tracking-tight truncate">
                {summary.latestObservedDate || "N/A"}
              </div>
              {summary.latestWeekName && (
                <div className="text-[10px] font-black text-black mt-1 bg-white/70 px-1.5 py-0.5 rounded border border-black inline-block">
                  {summary.latestWeekName} ({numberFormatter.format(summary.latestWeekRainfall)} mm)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selection Segments */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1.5 rounded-xl border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_#000] flex-wrap gap-1 sm:gap-0">
            <button
              onClick={() => setActiveTab("daily")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                activeTab === "daily"
                  ? "bg-[#FFE600] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]"
                  : "bg-transparent text-black hover:bg-slate-100"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Tab Catatan Harian
            </button>
            <button
              onClick={() => setActiveTab("weekly")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                activeTab === "weekly"
                  ? "bg-[#FFE600] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]"
                  : "bg-transparent text-black hover:bg-slate-100"
              }`}
            >
              <Layers className="h-4 w-4" />
              Tab Mingguan GIS
            </button>
            <button
              onClick={() => setActiveTab("company-weekly")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                activeTab === "company-weekly"
                  ? "bg-[#FFE600] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]"
                  : "bg-transparent text-black hover:bg-slate-100"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Tab Mingguan Company
            </button>
            <button
              onClick={() => setActiveTab("station-weekly")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                activeTab === "station-weekly"
                  ? "bg-[#FFE600] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000]"
                  : "bg-transparent text-black hover:bg-slate-100"
              }`}
            >
              <Radio className="h-4 w-4" />
              Tab Mingguan Stasiun
            </button>
          </div>

          {activeTab !== "company-weekly" && activeTab !== "station-weekly" && (
            <div className="text-xs font-black uppercase bg-white border-2 border-black px-3 py-1.5 rounded-lg shadow-[3px_3px_0px_0px_#000]">
              {isLoading
                ? "MEMUAT DATA..."
                : `TOTAL: ${totalTableItems.toLocaleString("id-ID")} DATA`}
            </div>
          )}
        </div>

        {activeTab === "company-weekly" ? (
          <CompanyWeeklyMatrix />
        ) : activeTab === "station-weekly" ? (
          <StationWeeklyMatrix companies={companies} />
        ) : (
          <>
            {/* Neobrutalism Chart Box */}
            <div className="rounded-xl bg-[#FFFDF5] p-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-black flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {activeTab === "daily"
                  ? "Grafik Volume Curah Hujan Harian (mm)"
                  : "Grafik Agregasi Mingguan Berdasarkan Kalender GIS (mm)"}
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                {activeTab === "daily"
                  ? "Fluktuasi curah hujan per hari pengamatan"
                  : "Perbandingan total curah hujan mingguan perkebunan"}
              </p>
            </div>
            <div className="hidden sm:block">
              <span className="text-[10px] font-black uppercase bg-[#00E599] border-2 border-black px-2 py-1 rounded shadow-[2px_2px_0px_0px_#000]">
                Data Curah Hujan
              </span>
            </div>
          </div>

          <div className="h-80 w-full pt-4">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center text-xs font-black uppercase">
                <RefreshCw className="h-6 w-6 animate-spin text-black mb-2 mr-2" />
                Memuat grafik...
              </div>
            ) : activeTab === "daily" ? (
              dailyChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-black text-slate-500 uppercase">
                  Tidak ada data untuk rentang tanggal ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#000", fontWeight: 700 }}
                      axisLine={{ stroke: "#000", strokeWidth: 2 }}
                      tickLine={{ stroke: "#000", strokeWidth: 2 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#000", fontWeight: 700 }}
                      axisLine={{ stroke: "#000", strokeWidth: 2 }}
                      tickLine={{ stroke: "#000", strokeWidth: 2 }}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${numberFormatter.format(val)} mm`, "Curah Hujan"]}
                      labelFormatter={(label) => `Tanggal: ${label}`}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "2px solid #000",
                        boxShadow: "3px 3px 0px 0px #000",
                        backgroundColor: "#FFE600",
                        fontWeight: 900,
                        fontSize: "12px",
                        color: "#000",
                      }}
                    />
                    <Bar
                      dataKey="totalMm"
                      fill="#3B82F6"
                      stroke="#000"
                      strokeWidth={2}
                      name="Curah Hujan (mm)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : weeklyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-black text-slate-500 uppercase">
                Tidak ada data mingguan pada rentang ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="weekName"
                    tick={{ fontSize: 11, fill: "#000", fontWeight: 700 }}
                    axisLine={{ stroke: "#000", strokeWidth: 2 }}
                    tickLine={{ stroke: "#000", strokeWidth: 2 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#000", fontWeight: 700 }}
                    axisLine={{ stroke: "#000", strokeWidth: 2 }}
                    tickLine={{ stroke: "#000", strokeWidth: 2 }}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${numberFormatter.format(val)} mm`, "Total Mingguan"]}
                    labelFormatter={(label) => `Minggu: ${label}`}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "2px solid #000",
                      boxShadow: "3px 3px 0px 0px #000",
                      backgroundColor: "#00E599",
                      fontWeight: 900,
                      fontSize: "12px",
                      color: "#000",
                    }}
                  />
                  <Bar
                    dataKey="rainfallMm"
                    fill="#00E599"
                    stroke="#000"
                    strokeWidth={2}
                    name="Curah Hujan Mingguan (mm)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Data Table Section */}
        {activeTab === "daily" ? (
          <DailyRainfallMatrix
            startDate={startDate}
            endDate={endDate}
            selectedCompany={selectedCompany}
            selectedEstate={selectedEstate}
          />
        ) : (
          <div className="rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-[#F4F0EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-tight text-black flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Tabel Agregat Mingguan (GIS Week)
              </h3>

              <div className="flex items-center gap-3 flex-wrap">
                <ExportCopyButtons
                  onExportExcel={() => exportWeeklyGisExcel(weeklyData, startDate, endDate)}
                  onCopyTable={async () => {
                    const { html, tsv } = buildWeeklyGisClipboardData(weeklyData);
                    return await copyTableToClipboard(html, tsv);
                  }}
                  disabled={weeklyData.length === 0}
                />

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-black" />
                  <input
                    type="text"
                    placeholder="Cari stasiun, estate, kode..."
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-lg border-2 border-black pl-8 pr-3 py-1.5 text-xs font-bold text-black placeholder-black/50 bg-white shadow-[2px_2px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFE600] border-b-2 border-black text-black font-black uppercase">
                    <th className="py-3 px-4 border-r border-black/20">Minggu GIS</th>
                    <th className="py-3 px-4 border-r border-black/20">Periode</th>
                    <th className="py-3 px-4 border-r border-black/20">Company</th>
                    <th className="py-3 px-4 border-r border-black/20">Estate</th>
                    <th className="py-3 px-4 border-r border-black/20">Stasiun ID</th>
                    <th className="py-3 px-4 text-right border-r border-black/20">Total Curah Hujan</th>
                    <th className="py-3 px-4 text-center border-r border-black/20">Observed</th>
                    <th className="py-3 px-4 text-center">Hari Hujan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 text-black font-medium">
                  {paginatedWeekly.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-bold uppercase text-xs">
                        Tidak ada data mingguan yang cocok.
                      </td>
                    </tr>
                  ) : (
                    paginatedWeekly.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#FFFDEB] transition">
                        <td className="py-3 px-4 font-black border-r border-black/10">
                          <span className="bg-[#E9D5FF] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                            {row.formattedName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] font-bold border-r border-black/10">
                          {row.startDate} s/d {row.endDate}
                        </td>
                        <td className="py-3 px-4 font-black border-r border-black/10">
                          {row.companyCode}
                        </td>
                        <td className="py-3 px-4 border-r border-black/10">
                          <span className="font-black">{row.estCode}</span>
                          <span className="block text-[11px] text-slate-600 font-bold">
                            {row.estComplete}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold border-r border-black/10">
                          {row.stationId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black border-r border-black/10">
                          <span
                            className={
                              row.rainfallMm > 0
                                ? "bg-[#00E599] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]"
                                : "text-black/40"
                            }
                          >
                            {numberFormatter.format(row.rainfallMm)} mm
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold border-r border-black/10">
                          {row.observedDays} hari
                        </td>
                        <td className="py-3 px-4 text-center font-black">
                          <span className="bg-[#FBCFE8] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                            {row.rainyDays} hari
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          {/* Neobrutalism Pagination */}
          <div className="flex items-center justify-between p-4 border-t-2 border-black bg-[#F4F0EA] text-xs font-black uppercase">
            <div>
              Halaman {currentPage} dari {totalPages} ({totalTableItems.toLocaleString("id-ID")} total baris)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center justify-center h-8 w-8 rounded-lg border-2 border-black bg-white hover:bg-[#FFE600] disabled:opacity-40 disabled:hover:bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center justify-center h-8 w-8 rounded-lg border-2 border-black bg-white hover:bg-[#FFE600] disabled:opacity-40 disabled:hover:bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
        )}
        </>
        )}
      </main>

      {/* Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        companies={companies}
      />
    </div>
  );
}
