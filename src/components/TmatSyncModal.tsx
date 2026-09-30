"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Radio,
  Layers,
} from "lucide-react";

interface TmatSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TmatSyncModal({
  isOpen,
  onClose,
  onSuccess,
}: TmatSyncModalProps) {
  const [syncMode, setSyncMode] = useState<"AUTO" | "CUSTOM">("AUTO");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleStartSync = async () => {
    const payload: Record<string, any> = {};
    if (syncMode === "CUSTOM") {
      payload.startDate = startDate;
      payload.endDate = endDate;
    }

    // Close modal immediately so user is not blocked
    onClose();

    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("iot:sync-started", { detail: { type: "tmat" } })
        );
      }

      const res = await fetch("/api/tmat/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memulai sinkronisasi");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("iot:sync-complete", { detail: json }));
      }
      onSuccess();
    } catch (err: any) {
      console.error("TMAT sync error:", err);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("iot:sync-error", { detail: { type: "tmat", error: err.message } })
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border-3 border-black rounded-2xl w-full max-w-md shadow-[8px_8px_0px_0px_#000] overflow-hidden">
        {/* Header */}
        <div className="bg-[#86EFAC] border-b-2 border-black p-4 flex items-center justify-between">
          <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Sinkronisasi Telemetri TMAT
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 border-2 border-black rounded-lg bg-white hover:bg-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-bold text-slate-600">
            Pilih metode penarikan data dari Web Service Holykell untuk 94 sensor TMAT aktif:
          </p>

          {/* Mode Switch */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSyncMode("AUTO")}
              className={`p-3 rounded-xl border-2 border-black text-left flex flex-col justify-between transition ${
                syncMode === "AUTO"
                  ? "bg-[#FFE600] shadow-[2.5px_2.5px_0px_0px_#000]"
                  : "bg-slate-50 hover:bg-slate-100 opacity-80"
              }`}
            >
              <span className="text-xs font-black uppercase text-black">
                Otomatis (Gap Data)
              </span>
              <span className="text-[10px] font-bold text-slate-600 mt-1">
                Tarik data kosong saja dari tanggal terakhir s/d hari ini
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSyncMode("CUSTOM")}
              className={`p-3 rounded-xl border-2 border-black text-left flex flex-col justify-between transition ${
                syncMode === "CUSTOM"
                  ? "bg-[#FFE600] shadow-[2.5px_2.5px_0px_0px_#000]"
                  : "bg-slate-50 hover:bg-slate-100 opacity-80"
              }`}
            >
              <span className="text-xs font-black uppercase text-black">
                Kustom Tanggal
              </span>
              <span className="text-[10px] font-bold text-slate-600 mt-1">
                Tentukan rentang tanggal manual yang ingin ditarik ulang
              </span>
            </button>
          </div>

          {/* Custom Date Inputs */}
          {syncMode === "CUSTOM" && (
            <div className="p-3 bg-slate-50 border-2 border-black rounded-xl space-y-3">
              <span className="text-[11px] font-black uppercase text-slate-700 block">
                Rentang Tanggal Penarikan
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Tanggal Akhir
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Result Alert */}
          {resultMsg && (
            <div
              className={`p-3 rounded-xl border-2 border-black flex items-center gap-2 text-xs font-bold ${
                resultMsg.type === "success"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-rose-100 text-rose-900"
              }`}
            >
              {resultMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-700 flex-shrink-0" />
              )}
              <span>{resultMsg.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border-2 border-black rounded-xl font-bold text-xs hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleStartSync}
              disabled={isLoading}
              className="px-5 py-2 border-2 border-black rounded-xl bg-[#86EFAC] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-emerald-300 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {isLoading ? "Memproses..." : "Mulai Sinkronisasi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
