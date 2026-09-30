"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { format, subDays, parseISO, isValid } from "date-fns";
import {
  Map as MapIcon,
  Calendar,
  Building2,
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  CloudRain,
  Sliders,
  ExternalLink,
  Info,
} from "lucide-react";
import Link from "next/link";
import { MapStation, getBmkgCategory } from "@/lib/isohyet";
import DateTimelineSlider from "@/components/DateTimelineSlider";

// Dynamic import for Leaflet map component (No SSR)
const IsohyetMap = dynamic(() => import("@/components/IsohyetMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[620px] w-full flex flex-col items-center justify-center bg-[#FFFDF5] border-[3px] border-black rounded-xl shadow-[6px_6px_0px_0px_#000] gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_0px_#000]">
        <RefreshCw className="h-6 w-6 animate-spin text-black" />
      </div>
      <div className="text-sm font-black uppercase text-black">
        Memuat Engine Peta Spasial Leaflet & GIS...
      </div>
      <p className="text-xs text-slate-600 font-bold">
        Mempersiapkan tile peta dan modul kalkulasi interpolasi kontur Isohyet.
      </p>
    </div>
  ),
});

type CompanyOption = {
  company_code: string;
  company_name: string;
  hasBoundary?: boolean;
};

export default function RainfallMapPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("PT.GAN");
  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [anchorDate, setAnchorDate] = useState<string>(todayIso);
  const [latestObservedDate, setLatestObservedDate] = useState<string>(todayIso);
  const [basemap, setBasemap] = useState<"osm" | "satellite" | "positron">("osm");

  // Playback & Animation states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1500); // 1500ms default
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Layer switches
  const [showIsohyet, setShowIsohyet] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);

  // Boundary and Window Data Map
  const [boundaryGeojson, setBoundaryGeojson] = useState<any | null>(null);
  const [hasBoundaryUploaded, setHasBoundaryUploaded] = useState<boolean>(false);
  const [windowDataMap, setWindowDataMap] = useState<Record<string, MapStation[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate 30-day window dates ending at anchorDate
  const dateList = useMemo(() => {
    try {
      const end = parseISO(anchorDate);
      if (!isValid(end)) return [anchorDate];
      const list: string[] = [];
      for (let i = 29; i >= 0; i--) {
        list.push(format(subDays(end, i), "yyyy-MM-dd"));
      }
      return list;
    } catch {
      return [anchorDate];
    }
  }, [anchorDate]);

  // Current index of selectedDate in dateList
  const currentIndex = useMemo(() => {
    const idx = dateList.indexOf(selectedDate);
    return idx >= 0 ? idx : dateList.length - 1;
  }, [dateList, selectedDate]);

  // Active stations for the currently selected date
  const stations = useMemo(() => {
    return windowDataMap[selectedDate] || [];
  }, [windowDataMap, selectedDate]);

  // Load Companies list and summary on mount
  useEffect(() => {
    async function initData() {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/rainfall/summary"),
        ]);
        const cJson = await cRes.json();
        const sJson = await sRes.json();

        if (sJson?.latestObservedDate) {
          setLatestObservedDate(sJson.latestObservedDate);
          setSelectedDate(sJson.latestObservedDate);
          setAnchorDate(sJson.latestObservedDate);
        }

        if (cJson.data && cJson.data.length > 0) {
          setCompanies(cJson.data);
          const preferred = cJson.data.find(
            (c: any) => c.company_code === "PT.GAN" || c.company_code === "PT.PTW"
          );
          if (preferred) {
            setSelectedCompany(preferred.company_code);
          } else {
            setSelectedCompany(cJson.data[0].company_code);
          }
        }
      } catch (err) {
        console.error("Error initializing map data:", err);
      }
    }
    initData();
  }, []);

  // Fetch 30-Day Window Data & Boundary GeoJSON
  const fetchWindowData = async () => {
    if (!selectedCompany || dateList.length === 0) return;

    setIsLoading(true);
    setError(null);

    const startDate = dateList[0];
    const endDate = dateList[dateList.length - 1];

    try {
      // 1. Fetch Company Boundary GeoJSON
      const boundaryPromise = fetch(
        `/api/companies/${encodeURIComponent(selectedCompany)}/boundary`
      ).then(async (r) => {
        if (!r.ok) return null;
        const d = await r.json();
        return d.data?.boundaryGeojson || null;
      });

      // 2. Fetch Daily Rainfall for 30-day window
      const rainfallPromise = fetch(
        `/api/rainfall/daily?companyCode=${encodeURIComponent(
          selectedCompany
        )}&startDate=${startDate}&endDate=${endDate}&limit=10000`
      ).then(async (r) => {
        if (!r.ok) return [];
        const d = await r.json();
        return d.data || [];
      });

      const [boundary, rainfallRows] = await Promise.all([
        boundaryPromise,
        rainfallPromise,
      ]);

      setBoundaryGeojson(boundary);
      setHasBoundaryUploaded(!!boundary);

      // Group rows by rainDate (YYYY-MM-DD)
      const grouped: Record<string, MapStation[]> = {};
      for (const r of rainfallRows) {
        if (r.latitude !== null && r.longitude !== null) {
          const dStr = r.rainDate;
          if (!grouped[dStr]) grouped[dStr] = [];
          grouped[dStr].push({
            stationId: r.stationId,
            companyCode: r.companyCode,
            estComplete: r.estComplete,
            estAlias: r.estAlias,
            location: r.location,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            rainfallMm: Number(r.rainfallMm || 0),
          });
        }
      }

      setWindowDataMap(grouped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Gagal memuat data peta: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWindowData();
  }, [selectedCompany, anchorDate]);

  // Auto-Play Timer Effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const nextIdx = currentIndex + 1;
      if (nextIdx >= dateList.length) {
        if (isLooping) {
          setSelectedDate(dateList[0]);
        } else {
          setIsPlaying(false);
        }
      } else {
        setSelectedDate(dateList[nextIdx]);
      }
    }, playSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, dateList, isLooping, playSpeed]);

  // Handle Date Selection from Slider or Calendar Input
  const handleSliderIndexChange = (index: number) => {
    setIsPlaying(false);
    if (index >= 0 && index < dateList.length) {
      setSelectedDate(dateList[index]);
    }
  };

  const handleDateSelect = (newDate: string) => {
    setIsPlaying(false);
    if (dateList.includes(newDate)) {
      setSelectedDate(newDate);
    } else {
      // Out of current window: set anchor date to newDate and fetch new window
      setAnchorDate(newDate);
      setSelectedDate(newDate);
    }
  };

  // Aggregate stats for current active date
  const stats = useMemo(() => {
    if (stations.length === 0) {
      return { max: 0, min: 0, avg: 0, count: 0, wetCount: 0 };
    }
    const vals = stations.map((s) => s.rainfallMm);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const wetCount = vals.filter((v) => v > 0).length;
    return { max, min, avg, count: stations.length, wetCount };
  }, [stations]);

  const currentCompanyObj = companies.find((c) => c.company_code === selectedCompany);

  return (
    <div className="min-h-screen pb-16 text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-[3px] border-black shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#93C5FD] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <MapIcon className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">
                Peta Isohyet Curah Hujan Harian
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Visualisasi Spasial Kontur Interpolasi IDW & Masking Batas Wilayah Perusahaan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWindowData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#FFE600] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Controls & Filter Card */}
        <div className="rounded-xl bg-[#FFFDF5] p-5 sm:p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Company Selector */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Pilih Perusahaan
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setIsPlaying(false);
                }}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.company_code} value={c.company_code}>
                    {c.company_code} - {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Basemap Selection */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Tipe Peta (Basemap)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBasemap("osm")}
                  className={`py-1.5 rounded-lg border-2 border-black text-[11px] font-black uppercase transition ${
                    basemap === "osm"
                      ? "bg-[#FFE600] shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-slate-100 shadow-none"
                  }`}
                >
                  Peta OSM
                </button>
                <button
                  type="button"
                  onClick={() => setBasemap("satellite")}
                  className={`py-1.5 rounded-lg border-2 border-black text-[11px] font-black uppercase transition ${
                    basemap === "satellite"
                      ? "bg-[#FFE600] shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-slate-100 shadow-none"
                  }`}
                >
                  Satelit
                </button>
                <button
                  type="button"
                  onClick={() => setBasemap("positron")}
                  className={`py-1.5 rounded-lg border-2 border-black text-[11px] font-black uppercase transition ${
                    basemap === "positron"
                      ? "bg-[#FFE600] shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-slate-100 shadow-none"
                  }`}
                >
                  Terang
                </button>
              </div>
            </div>

            {/* Layer Toggles */}
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                Layer Spasial
              </label>
              <div className="flex flex-wrap gap-2 text-xs font-bold pt-0.5">
                <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                  <input
                    type="checkbox"
                    checked={showIsohyet}
                    onChange={(e) => setShowIsohyet(e.target.checked)}
                    className="accent-black rounded"
                  />
                  <span>Kontur Isohyet</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                  <input
                    type="checkbox"
                    checked={showStations}
                    onChange={(e) => setShowStations(e.target.checked)}
                    className="accent-black rounded"
                  />
                  <span>Stasiun</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                  <input
                    type="checkbox"
                    checked={showBoundary}
                    onChange={(e) => setShowBoundary(e.target.checked)}
                    className="accent-black rounded"
                  />
                  <span>Batas Kebun</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Date Timeline Slider Component (Play / Pause, Scrubber, Integrated Calendar) */}
        <DateTimelineSlider
          dateList={dateList}
          currentIndex={currentIndex}
          onChangeIndex={handleSliderIndexChange}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          speed={playSpeed}
          onChangeSpeed={setPlaySpeed}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping(!isLooping)}
          isLoadingData={isLoading}
          latestAvailableDate={latestObservedDate}
          dataCountForActiveDate={stations.length}
        />

        {/* Boundary Missing Warning Banner */}
        {!hasBoundaryUploaded && !isLoading && (
          <div className="rounded-xl bg-[#FED7AA] border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-black mt-0.5" />
              <div>
                <span className="font-black uppercase text-xs text-black">
                  Batas Poligon GeoJSON Belum Diunggah untuk {selectedCompany}
                </span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  Visualisasi interpolasi Isohyet saat ini ditampilkan mencakup sebaran titik sensor. Agar kontur terpotong rapi mengikuti batas kebun konsesi, silakan unggah file GeoJSON di menu Setting.
                </p>
              </div>
            </div>
            <Link
              href="/setting/boundaries"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] transition active:shadow-none whitespace-nowrap self-start sm:self-center"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Upload di Setting
            </Link>
          </div>
        )}

        {/* Quick Spatial Rainfall Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
              <Droplets className="h-3 w-3 text-black" />
              Tertinggi ({selectedDate})
            </div>
            <div className="text-xl font-black text-black mt-1">
              {stats.max.toFixed(1)} <span className="text-xs font-bold">mm</span>
            </div>
            <div className="text-[10px] font-bold text-slate-600">
              Kategori: {getBmkgCategory(stats.max).desc}
            </div>
          </div>

          <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
              <CloudRain className="h-3 w-3 text-black" />
              Rata-rata ({selectedDate})
            </div>
            <div className="text-xl font-black text-black mt-1">
              {stats.avg.toFixed(1)} <span className="text-xs font-bold">mm</span>
            </div>
            <div className="text-[10px] font-bold text-slate-600">
              Rata-rata seluruh sensor
            </div>
          </div>

          <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-black" />
              Stasiun Berhujan
            </div>
            <div className="text-xl font-black text-black mt-1">
              {stats.wetCount} / {stats.count}
            </div>
            <div className="text-[10px] font-bold text-slate-600">
              {stats.count > 0 ? Math.round((stats.wetCount / stats.count) * 100) : 0}% stasiun mencatat hujan
            </div>
          </div>

          <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
            <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-black" />
              Batas Spasial
            </div>
            <div className="text-base font-black text-black mt-1.5 truncate">
              {hasBoundaryUploaded ? (
                <span className="text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> GeoJSON Aktif
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Belum Diunggah
                </span>
              )}
            </div>
            <div className="text-[10px] font-bold text-slate-600">
              {hasBoundaryUploaded ? "Masking poligon aktif" : "Tanpa masking poligon"}
            </div>
          </div>
        </div>

        {/* Map Visualization Area */}
        <div className="space-y-2">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-[#FFD1D1] border-2 border-black p-3.5 text-black font-bold text-xs shadow-[3px_3px_0px_0px_#000]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-black" />
              <div>
                <span className="uppercase tracking-wide font-black">Error:</span> {error}
              </div>
            </div>
          )}

          {/* Isohyet Map Component */}
          <IsohyetMap
            stations={stations}
            boundaryGeojson={boundaryGeojson}
            companyCode={selectedCompany}
            companyName={currentCompanyObj?.company_name || selectedCompany}
            selectedDate={selectedDate}
            basemap={basemap}
            showStations={showStations}
            showIsohyet={showIsohyet}
            showBoundary={showBoundary}
          />
        </div>

        {/* Station Rain Table for Selected Date */}
        <div className="rounded-xl bg-[#FFFDF5] p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
            <h3 className="text-sm font-black uppercase tracking-tight text-black flex items-center gap-2">
              <CloudRain className="h-4 w-4" />
              Daftar Stasiun & Nilai Pengamatan Curah Hujan ({selectedDate})
            </h3>
            <span className="text-[11px] font-bold text-slate-600">
              Total {stations.length} stasiun di {selectedCompany}
            </span>
          </div>

          <div className="rounded-lg border-2 border-black bg-white overflow-hidden shadow-[3px_3px_0px_0px_#000]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-black bg-[#FFE600] font-black uppercase text-black">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">ID Stasiun</th>
                    <th className="py-2.5 px-3">Estate</th>
                    <th className="py-2.5 px-3">Lokasi Sensor</th>
                    <th className="py-2.5 px-3">Koordinat (Lat, Long)</th>
                    <th className="py-2.5 px-3 text-right">Curah Hujan (mm)</th>
                    <th className="py-2.5 px-3">Kategori BMKG</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-black font-bold">
                  {stations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                        {isLoading
                          ? "Memuat data curah hujan..."
                          : `Tidak ada data stasiun berkoordinat untuk perusahaan ${selectedCompany} pada tanggal ${selectedDate}.`}
                      </td>
                    </tr>
                  ) : (
                    stations.map((st, i) => {
                      const cat = getBmkgCategory(st.rainfallMm);
                      return (
                        <tr key={st.stationId} className="hover:bg-[#FFFDF5] transition">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {i + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-black text-black bg-[#F4F0EA] border border-black px-1.5 py-0.5 rounded text-[11px]">
                              {st.stationId}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-black text-black">
                            {st.estComplete} {st.estAlias ? `(${st.estAlias})` : ""}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {st.location || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {st.latitude.toFixed(6)}, {st.longitude.toFixed(6)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-sm">
                            {st.rainfallMm.toFixed(1)} mm
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="inline-block px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]"
                              style={{ backgroundColor: cat.color, color: cat.text }}
                            >
                              {cat.desc}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
