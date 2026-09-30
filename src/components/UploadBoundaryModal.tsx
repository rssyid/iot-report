"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Building2,
  Trash2,
  Layers,
  Sparkles,
  Compass,
} from "lucide-react";
import { sanitizeAndValidateGeoJson, SanitizeResult } from "@/lib/geojson";

type CompanyItem = {
  company_code: string;
  company_name: string;
  hasBoundary?: boolean;
};

type UploadBoundaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: CompanyItem | null;
};

export default function UploadBoundaryModal({
  isOpen,
  onClose,
  onSuccess,
  company,
}: UploadBoundaryModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<SanitizeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !company) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".geojson") && !file.name.toLowerCase().endsWith(".json")) {
      setError("File harus berekstensi .geojson atau .json");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = sanitizeAndValidateGeoJson(text);

        setSelectedFile(file);
        setParsedResult(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Validasi GeoJSON gagal: ${msg}`);
        setSelectedFile(null);
        setParsedResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!parsedResult) {
      setError("Pilih file GeoJSON terlebih dahulu");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(company.company_code)}/boundary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geojson: parsedResult.geojson }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah batas GeoJSON");
      }

      setSuccessMsg(data.message || `Batas GeoJSON untuk ${company.company_code} berhasil disimpan!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBoundary = async () => {
    if (!confirm(`Yakin ingin menghapus batas GeoJSON untuk ${company.company_code}?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(company.company_code)}/boundary`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus batas GeoJSON");
      }

      setSuccessMsg("Batas GeoJSON berhasil dihapus.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[10px_10px_0px_0px_#000] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-[3px] border-black px-6 py-3.5 bg-[#93C5FD]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#93C5FD] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-black tracking-tight uppercase">
                Batas Wilayah GeoJSON
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-black font-black hover:bg-[#FF6BB5] transition shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-[#FFD1D1] border-2 border-black p-3.5 text-black font-bold text-xs shadow-[3px_3px_0px_0px_#000]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-black" />
              <div>
                <span className="uppercase tracking-wide font-black">Error:</span> {error}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 rounded-lg bg-[#99F6D5] border-2 border-black p-3.5 text-black font-bold text-xs shadow-[3px_3px_0px_0px_#000]">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-black" />
              <span className="uppercase tracking-wide font-black">{successMsg}</span>
            </div>
          )}

          {/* Company Target Card */}
          <div className="rounded-lg bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-black" />
              <span className="font-black text-black text-sm uppercase">
                {company.company_code} - {company.company_name}
              </span>
            </div>
            {company.hasBoundary ? (
              <span className="text-[10px] font-black uppercase bg-[#86EFAC] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                GeoJSON Aktif
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase bg-[#FED7AA] border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                Belum Ada Batas
              </span>
            )}
          </div>

          {/* Dropzone Upload Input */}
          <div>
            <label className="block text-xs font-black uppercase text-black mb-1.5">
              Pilih File Poligon Batas (.geojson / .json)
            </label>
            <div className="relative border-2 border-dashed border-black rounded-xl p-5 text-center bg-white hover:bg-[#FFFDF5] transition shadow-[3px_3px_0px_0px_#000]">
              <input
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                onChange={handleFileChange}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <UploadCloud className="h-5 w-5 text-black" />
                </div>
                <div className="text-xs font-black uppercase text-black">
                  {selectedFile ? selectedFile.name : "Klik atau seret file GeoJSON ke sini"}
                </div>
                <p className="text-[11px] text-slate-500 font-bold">
                  Mendukung Polygon & MultiPolygon (WGS84 EPSG:4326 maupun Web Mercator EPSG:3857)
                </p>
              </div>
            </div>
          </div>

          {/* File Parsing Preview Summary */}
          {parsedResult && (
            <div className="rounded-lg bg-[#E9D5FF] border-2 border-black p-3.5 space-y-2.5 shadow-[3px_3px_0px_0px_#000]">
              <div className="flex items-center justify-between text-xs font-black uppercase text-black">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-black" />
                  GeoJSON Siap Diunggah
                </span>
                {parsedResult.isReprojected && (
                  <span className="bg-[#FFE600] border border-black px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Auto-WGS84
                  </span>
                )}
              </div>

              {parsedResult.isReprojected && (
                <div className="rounded bg-[#FEF08A] border border-black p-2 text-[10px] font-bold text-slate-800">
                  Koordinat terdeteksi dalam proyeksi meter (EPSG:3857). Sistem otomatis mengonversi ke derajat lintang & bujur (WGS84 / EPSG:4326) agar pas di peta Leaflet.
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                <div className="bg-white p-2 rounded border border-black">
                  <span className="text-slate-500 uppercase text-[9px] block">Jumlah Fitur</span>
                  <span className="font-black text-black">{parsedResult.featureCount}</span>
                </div>
                <div className="bg-white p-2 rounded border border-black">
                  <span className="text-slate-500 uppercase text-[9px] block">Geometri</span>
                  <span className="font-black text-black">
                    {parsedResult.geometryTypes.join(", ") || "Polygon"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-black">
                  <span className="text-slate-500 uppercase text-[9px] block">Contoh Koordinat</span>
                  <span className="font-mono text-[10px] font-bold text-black truncate block">
                    {parsedResult.sampleCoordinate
                      ? `${parsedResult.sampleCoordinate[1].toFixed(4)}, ${parsedResult.sampleCoordinate[0].toFixed(4)}`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Delete Option if Boundary exists */}
          {company.hasBoundary && (
            <div className="pt-2 border-t-2 border-dashed border-slate-300 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">
                Hapus poligon batas yang aktif saat ini:
              </span>
              <button
                type="button"
                onClick={handleDeleteBoundary}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-[#FFD1D1] px-2.5 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-red-300 transition active:shadow-none disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Hapus Batas
              </button>
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
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isLoading || !parsedResult}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-[#00E599] px-5 py-2 text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UploadCloud className="h-4 w-4" />
            {isLoading ? "Mengunggah..." : "Simpan Batas GeoJSON"}
          </button>
        </div>
      </div>
    </div>
  );
}
