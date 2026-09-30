"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Database,
  Radio,
  Building2,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Timer,
  ChevronRight,
} from "lucide-react";
import SyncModal from "@/components/SyncModal";
import TmatSyncModal from "@/components/TmatSyncModal";
import SettingNavTabs from "@/components/SettingNavTabs";

type CompanyOption = {
  company_code: string;
  company_name: string;
};

interface RainBatch {
  id: string;
  requestedStartDate: string;
  requestedEndDate: string;
  companyCount: number;
  successCount: number;
  failedCount: number;
  totalRows: number;
  status: "running" | "completed" | "partial" | "failed";
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface TmatBatch {
  id: string;
  requestedStartDate: string;
  requestedEndDate: string;
  deviceCount: number;
  successCount: number;
  failedCount: number;
  totalRows: number;
  status: "running" | "completed" | "partial" | "failed";
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export default function SettingSyncPage() {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isTmatModalOpen, setIsTmatModalOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [stats, setStats] = useState<{
    records: number;
    stations: number;
    companiesCount: number;
    latestDate: string | null;
  }>({
    records: 0,
    stations: 0,
    companiesCount: 0,
    latestDate: null,
  });

  const [tmatStats, setTmatStats] = useState<{
    totalHourly: number;
    devicesCount: number;
    latestDate: string;
  }>({
    totalHourly: 0,
    devicesCount: 0,
    latestDate: "-",
  });

  const [rainBatches, setRainBatches] = useState<RainBatch[]>([]);
  const [tmatBatches, setTmatBatches] = useState<TmatBatch[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocalSyncingRain, setIsLocalSyncingRain] = useState(false);
  const [isLocalSyncingTmat, setIsLocalSyncingTmat] = useState(false);

  const loadInfo = async () => {
    setIsRefreshing(true);
    try {
      const now = Date.now();
      const [cRes, sRes, tRes, bRes, rRes] = await Promise.all([
        fetch("/api/companies"),
        fetch(`/api/rainfall/summary?_t=${now}`),
        fetch("/api/tmat/devices"),
        fetch(`/api/tmat/sync?_t=${now}`),
        fetch(`/api/sync?_t=${now}`),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();
      const tJson = await tRes.json();
      const bJson = await bRes.json();
      const rJson = await rRes.json();

      if (cJson.data) {
        setCompanies(cJson.data);
        setStats((prev) => ({
          ...prev,
          companiesCount: cJson.data.length,
        }));
      }
      if (sJson && !sJson.error) {
        setStats((prev) => ({
          ...prev,
          records: sJson.totalRecords ?? prev.records,
          stations: sJson.stationCount ?? prev.stations,
          latestDate: sJson.latestObservedDate ?? prev.latestDate,
        }));
      }
      if (tJson.data) {
        setTmatStats((prev) => ({
          ...prev,
          devicesCount: tJson.data.length,
        }));
      }
      if (bJson.summary) {
        setTmatStats({
          totalHourly: bJson.summary.totalHourlyRecords,
          devicesCount: bJson.summary.activeDevicesCount,
          latestDate: bJson.summary.latestDate
            ? `${bJson.summary.latestDate} ${String(bJson.summary.latestHour ?? 0).padStart(2, "0")}:00`
            : "-",
        });
      }
      if (bJson.data && Array.isArray(bJson.data)) {
        setTmatBatches(bJson.data);
      }
      if (rJson.data && Array.isArray(rJson.data)) {
        setRainBatches(rJson.data);
      }
    } catch (err) {
      console.error("Error loading sync info:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInfo();

    const handleSyncStarted = (e: any) => {
      const type = e.detail?.type;
      if (type === "rainfall") setIsLocalSyncingRain(true);
      if (type === "tmat") setIsLocalSyncingTmat(true);
    };

    const handleSyncComplete = () => {
      setIsLocalSyncingRain(false);
      setIsLocalSyncingTmat(false);
      loadInfo();
    };

    const handleSyncError = (e: any) => {
      setIsLocalSyncingRain(false);
      setIsLocalSyncingTmat(false);
      loadInfo();
    };

    window.addEventListener("iot:sync-started", handleSyncStarted);
    window.addEventListener("iot:sync-complete", handleSyncComplete);
    window.addEventListener("iot:sync-error", handleSyncError);

    return () => {
      window.removeEventListener("iot:sync-started", handleSyncStarted);
      window.removeEventListener("iot:sync-complete", handleSyncComplete);
      window.removeEventListener("iot:sync-error", handleSyncError);
    };
  }, []);

  // Check if any TMAT or Rainfall sync is currently running (with 10-minute freshness guard)
  const isRecent = (dateStr: string) => {
    try {
      return Date.now() - new Date(dateStr).getTime() < 10 * 60 * 1000;
    } catch {
      return false;
    }
  };
  const runningBatch = tmatBatches.find((b) => b.status === "running" && isRecent(b.startedAt));
  const runningRainBatch = rainBatches.find((b) => b.status === "running" && isRecent(b.startedAt));

  // Auto-poll if a TMAT batch is running
  useEffect(() => {
    if (!runningBatch) return;

    const timer = setInterval(() => {
      fetch(`/api/tmat/sync?_t=${Date.now()}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setTmatBatches(json.data);
          if (json.summary) {
            setTmatStats({
              totalHourly: json.summary.totalHourlyRecords,
              devicesCount: json.summary.activeDevicesCount,
              latestDate: json.summary.latestDate
                ? `${json.summary.latestDate} ${String(json.summary.latestHour ?? 0).padStart(2, "0")}:00`
                : "-",
            });
          }
        })
        .catch(console.error);
    }, 2000);

    return () => clearInterval(timer);
  }, [runningBatch?.id, runningBatch?.status, runningBatch?.successCount]);

  // Auto-poll if a Rainfall batch is running
  useEffect(() => {
    if (!runningRainBatch) return;

    const timer = setInterval(() => {
      fetch(`/api/sync?_t=${Date.now()}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setRainBatches(json.data);
        })
        .catch(console.error);
    }, 2000);

    return () => clearInterval(timer);
  }, [runningRainBatch?.id, runningRainBatch?.status, runningRainBatch?.successCount]);

  const calculateDuration = (startedAt: string, finishedAt: string | null) => {
    if (!finishedAt) return "-";
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const sec = Math.round((end - start) / 1000);
    if (sec < 60) return `${sec} detik`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${min}m ${remSec}s`;
  };

  return (
    <div className="min-h-screen pb-16 text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-[3px] border-black shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00E599] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <RefreshCw className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">
                Sinkronisasi Data IoT
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Integrasi Telemetri Curah Hujan & Piezometer Muka Air Tanah (TMAT)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <SettingNavTabs />

        {/* 1. Rainfall Sync Card */}
        <div className="rounded-xl bg-[#FFFDF5] p-6 sm:p-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-5">
            <div>
              <span className="inline-block bg-[#FFE600] border-2 border-black text-black text-[11px] font-black uppercase px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_#000] mb-2">
                Telemetri Curah Hujan
              </span>
              <h2 className="text-2xl font-black uppercase text-black tracking-tight">
                Sinkronisasi Data Curah Hujan
              </h2>
              <p className="text-xs font-bold text-slate-700 max-w-xl mt-1">
                Tarik data pengamatan harian dari endpoint eksternal ASP.NET Web Services (<code>GetArsStation4Weeks</code>), normalisasikan tanggal dinamis, dan simpan secara idempotent ke database Neon PostgreSQL.
              </p>
            </div>

            <div>
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00E599] border-2 border-black px-6 py-3.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition"
              >
                <RefreshCw className="h-4 w-4 stroke-[2.5]" />
                Sinkronisasi Curah Hujan
              </button>
            </div>
          </div>

          {/* Live Progress Banner when running */}
          {(runningRainBatch || isLocalSyncingRain) && (
            <div className="p-4 bg-amber-50 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-black text-xs uppercase text-amber-950">
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-800" />
                  Proses Sinkronisasi Curah Hujan Sedang Berjalan...
                </span>
                <span className="text-xs font-black font-mono">
                  {runningRainBatch
                    ? `${runningRainBatch.successCount} / ${runningRainBatch.companyCount} Request (${runningRainBatch.companyCount > 0 ? Math.round((runningRainBatch.successCount / runningRainBatch.companyCount) * 100) : 0}%)`
                    : "Menyinkronkan data..."}
                </span>
              </div>
              <div className="w-full bg-slate-200 border border-black rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#00E599] h-full transition-all duration-300"
                  style={{
                    width:
                      runningRainBatch && runningRainBatch.companyCount > 0
                        ? `${(runningRainBatch.successCount / runningRainBatch.companyCount) * 100}%`
                        : "70%",
                  }}
                />
              </div>
              <p className="text-[11px] font-bold text-slate-600">
                {runningRainBatch
                  ? `${runningRainBatch.totalRows.toLocaleString("id-ID")} baris data harian telah berhasil disimpan. Halaman ini akan otomatis diperbarui.`
                  : "Menarik data telemetri dari web service ASP.NET dan menyimpan ke Neon PostgreSQL..."}
              </p>
            </div>
          )}

          {/* Quick Metrics Rainfall */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-black" />
                Data Tersimpan
              </div>
              <div className="text-xl font-black text-black mt-1">
                {stats.records.toLocaleString("id-ID")}
              </div>
              <div className="text-[10px] font-bold text-slate-500">Baris harian terverifikasi</div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-black" />
                Ombrometer Terhubung
              </div>
              <div className="text-xl font-black text-black mt-1">
                {stats.stations}
              </div>
              <div className="text-[10px] font-bold text-slate-500">Sensor aktif di master</div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-black" />
                Perusahaan
              </div>
              <div className="text-xl font-black text-black mt-1">
                {stats.companiesCount}
              </div>
              <div className="text-[10px] font-bold text-slate-500">34 Estate terdaftar</div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-black" />
                Data Terbaru
              </div>
              <div className="text-base font-black text-black mt-1.5 truncate">
                {stats.latestDate || "-"}
              </div>
              <div className="text-[10px] font-bold text-slate-500">Sinkronisasi mutakhir</div>
            </div>
          </div>

          {/* Riwayat Sinkronisasi Curah Hujan Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-tight flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Riwayat Sinkronisasi Curah Hujan (Ombrometer)
              </h3>
              <button
                onClick={loadInfo}
                disabled={isRefreshing}
                className="px-2.5 py-1 border-2 border-black rounded-lg bg-white hover:bg-slate-100 text-[11px] font-bold shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1 active:translate-x-[0.5px] active:translate-y-[0.5px] disabled:opacity-50"
                title="Refresh Status & Riwayat"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Riwayat
              </button>
            </div>

            <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_#000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b-2 border-black font-black uppercase tracking-tight text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Waktu Mulai</th>
                      <th className="py-2.5 px-3">Periode Data</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Request Sukses / Total</th>
                      <th className="py-2.5 px-3">Total Baris</th>
                      <th className="py-2.5 px-3">Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {rainBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada riwayat sinkronisasi Curah Hujan.
                        </td>
                      </tr>
                    ) : (
                      rainBatches.map((batch) => {
                        const isDone = batch.status === "completed";
                        const isRunning = batch.status === "running";
                        const isPartial = batch.status === "partial";
                        const isErr = batch.status === "failed";

                        return (
                          <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {new Date(batch.startedAt).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "medium",
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                              {batch.requestedStartDate} s/d {batch.requestedEndDate}
                            </td>
                            <td className="py-2.5 px-3">
                              {isRunning && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-[#FFE600] text-black font-black text-[10px]">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Running
                                </span>
                              )}
                              {isDone && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-[#86EFAC] text-emerald-950 font-black text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                  Completed
                                </span>
                              )}
                              {isPartial && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-amber-200 text-amber-950 font-black text-[10px]">
                                  <AlertCircle className="h-3 w-3 text-amber-700" />
                                  Partial
                                </span>
                              )}
                              {isErr && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-rose-200 text-rose-950 font-black text-[10px]">
                                  <XCircle className="h-3 w-3 text-rose-700" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <span className="text-emerald-700 font-black">
                                {batch.successCount}
                              </span>{" "}
                              / {batch.companyCount} Paket
                              {batch.failedCount > 0 && (
                                <span className="text-rose-600 font-bold ml-1.5">
                                  ({batch.failedCount} gagal)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black">
                              {batch.totalRows.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                              {calculateDuration(batch.startedAt, batch.finishedAt)}
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
        </div>

        {/* 2. TMAT Synchronization Card */}
        <div className="rounded-xl bg-[#FFFDF5] p-6 sm:p-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-5">
            <div>
              <span className="inline-block bg-[#86EFAC] border-2 border-black text-black text-[11px] font-black uppercase px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_#000] mb-2">
                Telemetri Piezometer Holykell
              </span>
              <h2 className="text-2xl font-black uppercase text-black tracking-tight flex items-center gap-2">
                Sinkronisasi Data TMAT (Tinggi Muka Air Tanah)
              </h2>
              <p className="text-xs font-bold text-slate-700 max-w-xl mt-1">
                Tarik data fluktuasi air per jam dari endpoint <code>GetMonthlyTMATHolykell</code> untuk 94 sensor aktif. Otomatis menarik dari tanggal & jam terakhir hingga saat ini.
              </p>
            </div>

            <div>
              <button
                onClick={() => setIsTmatModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#86EFAC] border-2 border-black px-6 py-3.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition"
              >
                <RefreshCw className="h-4 w-4 stroke-[2.5]" />
                Sinkronisasi TMAT
              </button>
            </div>
          </div>

          {/* Live Progress Banner when running */}
          {(runningBatch || isLocalSyncingTmat) && (
            <div className="p-4 bg-amber-50 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-black text-xs uppercase text-amber-950">
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-800" />
                  Proses Sinkronisasi TMAT Sedang Berjalan...
                </span>
                <span className="text-xs font-black font-mono">
                  {runningBatch
                    ? `${runningBatch.successCount} / ${runningBatch.deviceCount} Device (${runningBatch.deviceCount > 0 ? Math.round((runningBatch.successCount / runningBatch.deviceCount) * 100) : 0}%)`
                    : "Menyinkronkan 94 sensor..."}
                </span>
              </div>
              <div className="w-full bg-slate-200 border border-black rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#00E599] h-full transition-all duration-300"
                  style={{
                    width:
                      runningBatch && runningBatch.deviceCount > 0
                        ? `${(runningBatch.successCount / runningBatch.deviceCount) * 100}%`
                        : "70%",
                  }}
                />
              </div>
              <p className="text-[11px] font-bold text-slate-600">
                {runningBatch
                  ? `${runningBatch.totalRows.toLocaleString("id-ID")} titik rekaman jam telah berhasil disimpan. Halaman ini akan otomatis diperbarui.`
                  : "Menarik data fluktuasi air per jam piezometer Holykell dan menyimpan ke Neon PostgreSQL..."}
              </p>
            </div>
          )}

          {/* Quick Metrics TMAT */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-black" />
                Data Per Jam
              </div>
              <div className="text-xl font-black text-black mt-1">
                {tmatStats.totalHourly.toLocaleString("id-ID")}
              </div>
              <div className="text-[10px] font-bold text-slate-500">Titik jam tersimpan</div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-black" />
                Sensor Terhubung
              </div>
              <div className="text-xl font-black text-black mt-1">
                {tmatStats.devicesCount}
              </div>
              <div className="text-[10px] font-bold text-slate-500">Unit piezometer Holykell</div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-black" />
                Cakupan PT
              </div>
              <div className="text-xl font-black text-black mt-1">
                10 PT
              </div>
              <div className="text-[10px] font-bold text-slate-500">BAS, GAN, JJP, THIP, dll</div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-black" />
                Status Penarikan
              </div>
              <div className="text-base font-black text-black mt-1.5 truncate">
                {tmatStats.latestDate}
              </div>
              <div className="text-[10px] font-bold text-slate-500">Terupdate ke hari ini</div>
            </div>
          </div>

          {/* Riwayat Sinkronisasi TMAT Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-tight flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Riwayat Sinkronisasi TMAT
              </h3>
              <button
                onClick={loadInfo}
                className="px-2.5 py-1 border-2 border-black rounded-lg bg-white hover:bg-slate-100 text-[11px] font-bold shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1 active:translate-x-[0.5px] active:translate-y-[0.5px]"
                title="Refresh Status & Riwayat"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh Riwayat
              </button>
            </div>

            <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_#000]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b-2 border-black font-black uppercase tracking-tight text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Waktu Mulai</th>
                      <th className="py-2.5 px-3">Periode Data</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Device Sukses / Total</th>
                      <th className="py-2.5 px-3">Total Baris</th>
                      <th className="py-2.5 px-3">Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {tmatBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada riwayat sinkronisasi TMAT.
                        </td>
                      </tr>
                    ) : (
                      tmatBatches.map((batch) => {
                        const isDone = batch.status === "completed";
                        const isRunning = batch.status === "running";
                        const isErr = batch.status === "failed";

                        return (
                          <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {new Date(batch.startedAt).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "medium",
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                              {batch.requestedStartDate} s/d {batch.requestedEndDate}
                            </td>
                            <td className="py-2.5 px-3">
                              {isRunning && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-[#FFE600] text-black font-black text-[10px]">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Running
                                </span>
                              )}
                              {isDone && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-[#86EFAC] text-emerald-950 font-black text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                  Completed
                                </span>
                              )}
                              {isErr && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-rose-200 text-rose-950 font-black text-[10px]">
                                  <XCircle className="h-3 w-3 text-rose-700" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <span className="text-emerald-700 font-black">
                                {batch.successCount}
                              </span>{" "}
                              / {batch.deviceCount}
                              {batch.failedCount > 0 && (
                                <span className="text-rose-600 font-bold ml-1.5">
                                  ({batch.failedCount} gagal)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black">
                              {batch.totalRows.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                              {calculateDuration(batch.startedAt, batch.finishedAt)}
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
        </div>
      </main>

      {/* Rainfall Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={() => {
          loadInfo();
        }}
        companies={companies}
      />

      {/* TMAT Sync Modal */}
      <TmatSyncModal
        isOpen={isTmatModalOpen}
        onClose={() => setIsTmatModalOpen(false)}
        onSuccess={() => {
          loadInfo();
        }}
      />
    </div>
  );
}
