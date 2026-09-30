"use client";

import React, { useState, useMemo } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Sliders,
  Sparkles,
} from "lucide-react";

type CompanyOption = {
  company_code: string;
  company_name: string;
};

type SyncModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: CompanyOption[];
};

export default function SyncModal({
  isOpen,
  onClose,
  onSuccess,
  companies,
}: SyncModalProps) {
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  }, []);
  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    companies.length > 0 ? [companies[0].company_code] : ["PT.JJP"]
  );
  const [arsiran, setArsiran] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<{
    batchId?: string;
    status?: string;
    message?: string;
    rowsUpserted?: number;
    successfulRequests?: number;
    failedRequests?: number;
    warnings?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first company if none selected
  React.useEffect(() => {
    if (companies.length > 0 && selectedCompanies.length === 0) {
      setSelectedCompanies([companies[0].company_code]);
    }
  }, [companies, selectedCompanies.length]);

  // Estimate requests
  const estimatedRequests = useMemo(() => {
    try {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      const days = differenceInDays(e, s);
      if (days < 0) return 0;
      const windows = Math.max(1, Math.ceil(days / 28));
      return windows * selectedCompanies.length;
    } catch {
      return 0;
    }
  }, [startDate, endDate, selectedCompanies.length]);

  if (!isOpen) return null;

  const handleToggleCompany = (code: string) => {
    if (selectedCompanies.includes(code)) {
      setSelectedCompanies(selectedCompanies.filter((c) => c !== code));
    } else {
      setSelectedCompanies([...selectedCompanies, code]);
    }
  };

  const handleSelectAll = () => {
    setSelectedCompanies(companies.map((c) => c.company_code));
  };

  const handleDeselectAll = () => {
    setSelectedCompanies([]);
  };

  const handleStartSync = async () => {
    if (selectedCompanies.length === 0) {
      setError("Pilih minimal satu perusahaan untuk sinkronisasi.");
      return;
    }
    if (startDate > endDate) {
      setError("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgressMsg("Memulai sinkronisasi data dari endpoint IoT ASP.NET...");

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          companyCodes: selectedCompanies,
          arsiran,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan sinkronisasi");
      }

      setResult(data);
      setProgressMsg("Sinkronisasi berhasil!");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("iot:sync-complete"));
      }
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setProgressMsg("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[10px_10px_0px_0px_#000] overflow-hidden">
        {/* Neobrutalism Header Window Bar */}
        <div className="flex items-center justify-between border-b-[3px] border-black px-6 py-3.5 bg-[#FFE600]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#FFE600] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </div>
            <div>
              <h3 className="text-base font-black text-black tracking-tight uppercase">
                Sinkronisasi Curah Hujan
              </h3>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-black font-black hover:bg-[#FF6BB5] transition shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-[#FFD1D1] border-2 border-black p-4 text-black font-bold text-xs shadow-[3px_3px_0px_0px_#000]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-black" />
              <div>
                <span className="uppercase tracking-wide font-black">Error:</span> {error}
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl bg-[#99F6D5] border-[3px] border-black p-4 space-y-3 shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-black font-black text-sm uppercase tracking-wide">
                <CheckCircle2 className="h-5 w-5 text-black" />
                {result.status === "running"
                  ? "Sinkronisasi Berjalan di Background!"
                  : `Sinkronisasi Selesai! (${result.status || "OK"})`}
              </div>
              {result.rowsUpserted !== undefined ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                    <div className="text-black font-bold text-[10px] uppercase">Baris Disimpan</div>
                    <div className="text-base font-black text-black">
                      {(result.rowsUpserted ?? 0).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                    <div className="text-black font-bold text-[10px] uppercase">Req Berhasil</div>
                    <div className="text-base font-black text-black">
                      {result.successfulRequests ?? 0}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                    <div className="text-black font-bold text-[10px] uppercase">Req Gagal</div>
                    <div className="text-base font-black text-black">
                      {result.failedRequests ?? 0}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-800">
                  {result.message || "Proses sinkronisasi sedang berjalan di server. Anda dapat memantau pergerakan progres di halaman ini."}
                </p>
              )}
            </div>
          )}

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                min="2025-01-01"
                max={endDate}
                disabled={isLoading}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayStr}
                disabled={isLoading}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* Arsiran */}
          <div>
            <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" />
              Parameter Arsiran
            </label>
            <input
              type="number"
              value={arsiran}
              min={1}
              max={30}
              disabled={isLoading}
              onChange={(e) => setArsiran(Number(e.target.value) || 7)}
              className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition disabled:opacity-50"
            />
          </div>

          {/* Company Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Perusahaan ({selectedCompanies.length}/{companies.length})
              </label>
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                  className="px-2 py-0.5 rounded border border-black bg-white hover:bg-[#FFE600] transition shadow-[1px_1px_0px_0px_#000]"
                >
                  PILIH SEMUA
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isLoading}
                  className="px-2 py-0.5 rounded border border-black bg-white hover:bg-slate-100 transition shadow-[1px_1px_0px_0px_#000]"
                >
                  RESET
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2.5 rounded-lg border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
              {companies.map((c) => {
                const isChecked = selectedCompanies.includes(c.company_code);
                return (
                  <button
                    key={c.company_code}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleToggleCompany(c.company_code)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold border-2 border-black transition ${
                      isChecked
                        ? "bg-[#FFE600] shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white hover:bg-slate-100 shadow-none"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded border-2 border-black flex items-center justify-center shrink-0 ${
                        isChecked ? "bg-black text-white" : "bg-white"
                      }`}
                    >
                      {isChecked && <span className="text-[10px] leading-none">✓</span>}
                    </div>
                    <span className="truncate font-black">{c.company_code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimate Card */}
          <div className="rounded-lg bg-[#E9D5FF] border-2 border-black p-3.5 flex items-center justify-between text-xs font-bold shadow-[3px_3px_0px_0px_#000]">
            <span className="flex items-center gap-1.5 uppercase font-black">
              <Sparkles className="h-4 w-4" />
              Estimasi Request API:
            </span>
            <span className="font-black bg-white border border-black px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_#000]">
              ~{estimatedRequests} requests (Window 28 hari)
            </span>
          </div>

          {isLoading && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-black">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {progressMsg}
              </div>
              <div className="h-3 w-full border-2 border-black bg-white rounded-full overflow-hidden shadow-[2px_2px_0px_0px_#000]">
                <div className="h-full bg-[#00E599] rounded-full animate-pulse w-3/4 border-r-2 border-black"></div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t-[3px] border-black px-6 py-4 bg-[#F4F0EA]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition active:shadow-none disabled:opacity-50"
          >
            {result ? "Tutup" : "Batal"}
          </button>
          <button
            type="button"
            onClick={handleStartSync}
            disabled={isLoading || selectedCompanies.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-[#00E599] px-5 py-2 text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Menyinkronkan...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Mulai Sinkronisasi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
