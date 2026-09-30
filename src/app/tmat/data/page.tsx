"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Radio,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  MapPin,
  Clock,
  Battery,
  Wifi,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Activity,
  Maximize2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ReferenceLine,
  Legend,
} from "recharts";
import ExcelJS from "exceljs";
import { format, subDays, subHours, parseISO } from "date-fns";

interface TmatDevice {
  id: string;
  companyCode: string;
  deviceId: string;
  deviceName: string;
  estate: string;
  block: string;
  latitude: string | null;
  longitude: string | null;
  active: boolean;
  latestDate: string | null;
  latestHour: number | null;
  latestTmat: string | null;
  latestBattery: string | null;
  latestSignal: string | null;
  latestCh: string | null;
}

interface HourlyRecord {
  id: number;
  recordDate: string;
  recordHour: number;
  tmatValue: number | null;
  battery: number | null;
  signal: number | null;
  chRainfall: number | null;
  rawDateKey: string;
}

interface DeviceStats {
  totalRecords: number;
  validRecords: number;
  avgTmat: number | null;
  minTmat: number | null;
  maxTmat: number | null;
}

type RangePreset = "24H" | "7D" | "30D" | "YTD" | "CUSTOM";

export default function TmatDataPage() {
  const [devices, setDevices] = useState<TmatDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<TmatDevice | null>(null);
  const [isDevicesLoading, setIsDevicesLoading] = useState(true);

  // Filters for device list
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [estateFilter, setEstateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE">("ACTIVE");

  // Chart Date Range & Data states
  const [preset, setPreset] = useState<RangePreset>("30D");
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [hourlyData, setHourlyData] = useState<HourlyRecord[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Fetch devices list on load
  const loadDevices = async () => {
    setIsDevicesLoading(true);
    try {
      const res = await fetch(`/api/tmat/devices?_t=${Date.now()}`);
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setDevices(json.data);
        // Default select first active device if none selected
        if (!selectedDevice && json.data.length > 0) {
          const first = json.data.find((d: TmatDevice) => d.active) || json.data[0];
          setSelectedDevice(first);
        }
      }
    } catch (err) {
      console.error("Failed to load TMAT devices:", err);
    } finally {
      setIsDevicesLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  // 2. Fetch chart data when selectedDevice, startDate, or endDate changes
  useEffect(() => {
    if (!selectedDevice) return;

    let isMounted = true;
    const fetchChartData = async () => {
      setIsChartLoading(true);
      try {
        const queryParams = new URLSearchParams({
          deviceId: selectedDevice.id,
          startDate,
          endDate,
          _t: String(Date.now()),
        });
        const res = await fetch(`/api/tmat/data?${queryParams.toString()}`);
        const json = await res.json();
        if (isMounted && json.records) {
          setHourlyData(json.records);
          setDeviceStats(json.stats || null);
        }
      } catch (err) {
        console.error("Failed to load TMAT chart data:", err);
      } finally {
        if (isMounted) setIsChartLoading(false);
      }
    };

    fetchChartData();

    return () => {
      isMounted = false;
    };
  }, [selectedDevice, startDate, endDate]);

  // Handle Preset changes
  const applyPreset = (newPreset: RangePreset) => {
    setPreset(newPreset);
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    if (newPreset === "24H") {
      setStartDate(format(subDays(today, 1), "yyyy-MM-dd"));
      setEndDate(todayStr);
    } else if (newPreset === "7D") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(todayStr);
    } else if (newPreset === "30D") {
      setStartDate(format(subDays(today, 30), "yyyy-MM-dd"));
      setEndDate(todayStr);
    } else if (newPreset === "YTD") {
      setStartDate(format(new Date(today.getFullYear(), 0, 1), "yyyy-MM-dd"));
      setEndDate(todayStr);
    }
  };

  // Companies & Estates dropdown list
  const companiesList = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => set.add(d.companyCode));
    return Array.from(set).sort();
  }, [devices]);

  const estatesList = useMemo(() => {
    const set = new Set<string>();
    devices
      .filter((d) => companyFilter === "ALL" || d.companyCode === companyFilter)
      .forEach((d) => set.add(d.estate));
    return Array.from(set).sort();
  }, [devices, companyFilter]);

  // Filtered devices list for the left sidebar
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (companyFilter !== "ALL" && d.companyCode !== companyFilter) return false;
      if (estateFilter !== "ALL" && d.estate !== estateFilter) return false;
      if (statusFilter === "ACTIVE" && !d.active) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          d.deviceName.toLowerCase().includes(q) ||
          d.deviceId.toLowerCase().includes(q) ||
          d.estate.toLowerCase().includes(q) ||
          d.block.toLowerCase().includes(q) ||
          d.companyCode.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [devices, companyFilter, estateFilter, statusFilter, searchQuery]);

  // Prepare chart formatted data
  const chartPoints = useMemo(() => {
    return hourlyData.map((d) => {
      const timeStr = `${String(d.recordHour).padStart(2, "0")}:00`;
      const dateParts = d.recordDate.split("-");
      const shortDate = `${dateParts[2]}/${dateParts[1]}`;
      return {
        ...d,
        label: `${shortDate} ${timeStr}`,
        fullTimestamp: `${d.recordDate} ${timeStr}`,
        displayTmat: d.tmatValue !== null ? Number(d.tmatValue.toFixed(2)) : null,
      };
    });
  }, [hourlyData]);

  // Export Excel
  const handleExportExcel = async () => {
    if (!selectedDevice || hourlyData.length === 0) return;
    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IoT Water Management";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Data TMAT", {
        views: [{ showGridLines: true }],
      });

      // Title & Meta headers
      sheet.addRow(["LAPORAN TELEMETRI TINGGI MUKA AIR TANAH (TMAT)"]);
      sheet.addRow([`Nama Perangkat: ${selectedDevice.deviceName}`]);
      sheet.addRow([
        `PT: ${selectedDevice.companyCode} | Estate: ${selectedDevice.estate} | Blok: ${selectedDevice.block} | Device ID: ${selectedDevice.deviceId}`,
      ]);
      sheet.addRow([`Periode: ${startDate} s/d ${endDate}`]);
      sheet.addRow([
        `Rata-rata TMAT: ${deviceStats?.avgTmat ?? "-"} cm | Min: ${deviceStats?.minTmat ?? "-"} cm | Max: ${deviceStats?.maxTmat ?? "-"} cm`,
      ]);
      sheet.addRow([]); // Blank row

      // Table Header
      const headerRow = sheet.addRow([
        "No",
        "Tanggal",
        "Jam",
        "Waktu Lengkap",
        "TMAT (cm)",
        "Baterai (V)",
        "Sinyal",
        "Curah Hujan (mm)",
      ]);

      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Add Data Rows
      hourlyData.forEach((row, idx) => {
        const timeStr = `${String(row.recordHour).padStart(2, "0")}:00`;
        const r = sheet.addRow([
          idx + 1,
          row.recordDate,
          row.recordHour,
          `${row.recordDate} ${timeStr}`,
          row.tmatValue !== null ? Number(row.tmatValue.toFixed(2)) : "",
          row.battery !== null ? row.battery : "",
          row.signal !== null ? row.signal : "",
          row.chRainfall !== null ? row.chRainfall : "",
        ]);

        r.alignment = { vertical: "middle" };
        r.getCell(1).alignment = { horizontal: "center" };
        r.getCell(2).alignment = { horizontal: "center" };
        r.getCell(3).alignment = { horizontal: "center" };
        r.getCell(5).alignment = { horizontal: "right" };
        r.getCell(6).alignment = { horizontal: "right" };
        r.getCell(7).alignment = { horizontal: "right" };
        r.getCell(8).alignment = { horizontal: "right" };
      });

      // Format column widths
      sheet.columns = [
        { width: 8 },
        { width: 14 },
        { width: 8 },
        { width: 20 },
        { width: 16 },
        { width: 14 },
        { width: 12 },
        { width: 18 },
      ];

      // Download buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TMAT_${selectedDevice.companyCode}_${selectedDevice.deviceId}_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel error:", err);
      alert("Gagal mengekspor data ke Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-[#86EFAC] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Radio className="h-6 w-6 text-black" />
            </div>
            Data Telemetri TMAT (Tinggi Muka Air Tanah)
          </h1>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Monitoring fluktuasi kedalaman air tanah sensor piezometer IoT secara berkala dan interaktif.
          </p>
        </div>

        {/* Global Refresh */}
        <button
          onClick={loadDevices}
          disabled={isDevicesLoading}
          className="px-3.5 py-2 border-2 border-black rounded-xl bg-white hover:bg-slate-100 font-black text-xs uppercase shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isDevicesLoading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Device */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama sensor, device ID, estate, blok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black shadow-[1.5px_1.5px_0px_0px_#000]"
            />
          </div>

          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setEstateFilter("ALL");
            }}
            className="border-2 border-black rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <option value="ALL">Semua Company</option>
            {companiesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Estate Filter */}
          <select
            value={estateFilter}
            onChange={(e) => setEstateFilter(e.target.value)}
            className="border-2 border-black rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <option value="ALL">Semua Estate</option>
            {estatesList.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border-2 border-black rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <option value="ACTIVE">Sensor Aktif Saja</option>
            <option value="ALL">Semua Sensor</option>
          </select>
        </div>

        <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
          {filteredDevices.length} dari {devices.length} Sensor
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Devices List Panel (4 Columns) */}
        <div className="lg:col-span-4 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden flex flex-col max-h-[820px]">
          {/* List Header */}
          <div className="p-3.5 bg-slate-100 border-b-2 border-black flex items-center justify-between">
            <span className="font-black text-xs uppercase tracking-tight flex items-center gap-1.5">
              <Radio className="h-4 w-4" />
              Daftar Sensor TMAT
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Pilih untuk melihat grafik
            </span>
          </div>

          {/* Scrollable list items */}
          <div className="overflow-y-auto divide-y-2 divide-slate-100 p-2 space-y-1">
            {isDevicesLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-black" />
                <span className="text-xs font-bold">Memuat perangkat...</span>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                Tidak ada device ditemukan.
              </div>
            ) : (
              filteredDevices.map((dev) => {
                const isSelected = selectedDevice?.id === dev.id;
                return (
                  <button
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-[#FFE600] border-black shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white border-transparent hover:border-black/30 hover:bg-slate-50"
                    }`}
                  >
                    {/* Top Row: Company & Estate Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-black text-[10px] border ${
                            isSelected
                              ? "bg-black text-white border-black"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}
                        >
                          {dev.companyCode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-900 border border-blue-200">
                          Est: {dev.estate}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                          Blok: {dev.block}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full border border-black ${
                          dev.active ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={dev.active ? "Aktif" : "Nonaktif"}
                      />
                    </div>

                    {/* Middle: Device Name */}
                    <div className="font-mono text-xs font-black truncate text-black">
                      {dev.deviceName}
                    </div>

                    {/* Bottom: ID & Latest Value */}
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="font-mono font-bold text-slate-500">
                        ID: {dev.deviceId}
                      </span>

                      {dev.latestTmat !== null ? (
                        <span className="font-black text-black">
                          {Number(dev.latestTmat).toFixed(1)} cm
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Data</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Detail View & Interactive Line Chart (8 Columns) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDevice ? (
            <>
              {/* Device Info Card */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-4">
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg border-2 border-black bg-[#FFE600] font-black text-xs uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
                        {selectedDevice.companyCode}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg border border-black bg-blue-50 font-bold text-xs text-blue-900">
                        Estate: {selectedDevice.estate}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg border border-black bg-amber-50 font-bold text-xs text-amber-900">
                        Blok: {selectedDevice.block}
                      </span>
                    </div>

                    <h2 className="text-lg font-black font-mono mt-1.5 text-black">
                      {selectedDevice.deviceName}
                    </h2>
                    <p className="text-xs font-mono text-slate-500">
                      Holykell ID: <span className="font-bold text-black">{selectedDevice.deviceId}</span>
                    </p>
                  </div>

                  {/* Telemetri Snapshot Header */}
                  <div className="flex items-center gap-3">
                    {selectedDevice.latitude && selectedDevice.longitude && (
                      <div className="text-right text-[11px] font-mono text-slate-600 hidden sm:block">
                        <div className="flex items-center gap-1 justify-end font-bold text-emerald-800">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {Number(selectedDevice.latitude).toFixed(4)}, {Number(selectedDevice.longitude).toFixed(4)}
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl border-2 border-black bg-[#86EFAC] text-right shadow-[2px_2px_0px_0px_#000]">
                      <span className="block text-[10px] font-black uppercase text-emerald-900">
                        TMAT Terkini
                      </span>
                      <span className="text-xl font-black text-black">
                        {selectedDevice.latestTmat !== null
                          ? `${Number(selectedDevice.latestTmat).toFixed(1)} cm`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Summary Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border-2 border-black rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">
                      Rata-Rata Periode
                    </span>
                    <span className="text-base font-black text-black mt-0.5 block">
                      {deviceStats?.avgTmat !== null && deviceStats?.avgTmat !== undefined
                        ? `${deviceStats.avgTmat} cm`
                        : "-"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border-2 border-black rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">
                      TMAT Maksimum
                    </span>
                    <span className="text-base font-black text-blue-700 mt-0.5 block">
                      {deviceStats?.maxTmat !== null && deviceStats?.maxTmat !== undefined
                        ? `${deviceStats.maxTmat} cm`
                        : "-"}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                      Air Tertinggi (Dekat Permukaan)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border-2 border-black rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">
                      TMAT Minimum
                    </span>
                    <span className="text-base font-black text-rose-700 mt-0.5 block">
                      {deviceStats?.minTmat !== null && deviceStats?.minTmat !== undefined
                        ? `${deviceStats.minTmat} cm`
                        : "-"}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                      Air Terendah (Paling Dalam)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border-2 border-black rounded-xl">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">
                      Total Titik Jam
                    </span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">
                      {deviceStats?.totalRecords ?? 0} Jam
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart & Timeline Controls Card */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-4">
                {/* Control bar: Presets & Date Range */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black uppercase text-slate-600 mr-1 flex items-center gap-1">
                      <Sliders className="h-3.5 w-3.5" />
                      Rentang:
                    </span>
                    {(["24H", "7D", "30D", "YTD"] as RangePreset[]).map((p) => {
                      const labels: Record<RangePreset, string> = {
                        "24H": "24 Jam",
                        "7D": "7 Hari",
                        "30D": "30 Hari",
                        YTD: "Tahun 2026",
                        CUSTOM: "Custom",
                      };
                      const isActive = preset === p;
                      return (
                        <button
                          key={p}
                          onClick={() => applyPreset(p)}
                          className={`px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black uppercase transition ${
                            isActive
                              ? "bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000]"
                              : "bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_0px_#000]"
                          }`}
                        >
                          {labels[p]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Date Pickers & Export */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50 border-2 border-black rounded-xl px-2.5 py-1 shadow-[1.5px_1.5px_0px_0px_#000]">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setPreset("CUSTOM");
                        }}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                      />
                      <span className="text-slate-400 font-bold">s/d</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setPreset("CUSTOM");
                        }}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    {/* Export Excel Button */}
                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting || hourlyData.length === 0}
                      className="px-3 py-1.5 border-2 border-black rounded-xl bg-white hover:bg-slate-100 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 disabled:opacity-50"
                      title="Download rekaman per jam ke file Excel"
                    >
                      <Download className="h-3.5 w-3.5 text-black" />
                      <span className="hidden sm:inline">
                        {isExporting ? "Exporting..." : "Export Excel"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Instruction banner for Zoom & Pan */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 bg-amber-50/70 border border-amber-200 rounded-lg px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-amber-900">
                    <Maximize2 className="h-3.5 w-3.5 text-amber-700" />
                    <strong>Navigasi Zoom & Pan:</strong> Geser handle slider di bawah grafik untuk memperbesar (zoom-in) rentang jam tertentu.
                  </span>
                  <span className="text-[10px] text-amber-800 hidden md:inline">
                    {hourlyData.length} Titik Data Terbaca
                  </span>
                </div>

                {/* Main Interactive Recharts Line Chart */}
                <div className="w-full h-[420px] pt-2">
                  {isChartLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <RefreshCw className="h-7 w-7 animate-spin mb-2 text-black" />
                      <span className="text-xs font-bold">Memuat data time-series...</span>
                    </div>
                  ) : hourlyData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <AlertCircle className="h-8 w-8 mb-2 stroke-[1.5]" />
                      <span className="text-xs font-bold">
                        Tidak ada rekaman telemetri pada rentang tanggal ini.
                      </span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartPoints}
                        margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }}
                          interval="preserveStartEnd"
                          minTickGap={40}
                        />
                        <YAxis
                          reversed={true}
                          domain={[(dataMin: number) => Math.min(0, Math.floor(dataMin || 0)), "auto"]}
                          tick={{ fontSize: 10, fill: "#475569", fontWeight: 700 }}
                          unit=" cm"
                        />
                        <ReferenceLine
                          y={0}
                          stroke="#0F172A"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          label={{
                            value: "Permukaan Tanah (0 cm)",
                            position: "insideTopLeft",
                            fill: "#334155",
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const p = payload[0].payload as any;
                              return (
                                <div className="bg-white border-2 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_#000] text-xs space-y-1.5 min-w-[200px]">
                                  <div className="font-mono font-black text-black border-b border-slate-200 pb-1 flex items-center justify-between">
                                    <span>{p.fullTimestamp} WIB</span>
                                  </div>
                                  <div className="flex items-center justify-between text-blue-900 font-bold">
                                    <span>TMAT Air:</span>
                                    <span className="font-black text-sm">
                                      {p.displayTmat !== null ? `${p.displayTmat} cm` : "-"}
                                    </span>
                                  </div>
                                  {p.battery !== null && (
                                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                                      <span className="flex items-center gap-1">
                                        <Battery className="h-3 w-3" /> Baterai:
                                      </span>
                                      <span className="font-bold">{p.battery} V</span>
                                    </div>
                                  )}
                                  {p.signal !== null && (
                                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                                      <span className="flex items-center gap-1">
                                        <Wifi className="h-3 w-3" /> Sinyal:
                                      </span>
                                      <span className="font-bold">{p.signal}</span>
                                    </div>
                                  )}
                                  {p.chRainfall !== null && (
                                    <div className="flex items-center justify-between text-slate-600 text-[11px]">
                                      <span>Curah Hujan (CH):</span>
                                      <span className="font-bold">{p.chRainfall} mm</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ paddingBottom: 8, fontSize: 11, fontWeight: 700 }}
                        />
                        <Line
                          type="monotone"
                          name="Kedalaman TMAT (cm)"
                          dataKey="displayTmat"
                          stroke="#0284C7"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, stroke: "#000", strokeWidth: 2, fill: "#FFE600" }}
                        />
                        {/* Interactive Zoom Brush (Mini-map timeline) */}
                        <Brush
                          dataKey="label"
                          height={28}
                          stroke="#000000"
                          fill="#F1F5F9"
                          travellerWidth={10}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border-2 border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#000]">
              <Radio className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="font-black text-sm text-slate-600">
                Pilih sensor dari daftar di sebelah kiri untuk melihat informasi lengkap dan grafik fluktuasi TMAT.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
