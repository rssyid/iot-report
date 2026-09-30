"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import UploadBoundaryModal from "@/components/UploadBoundaryModal";
import SettingNavTabs from "@/components/SettingNavTabs";
import Link from "next/link";

type CompanyItem = {
  company_code: string;
  company_name: string;
  hasBoundary?: boolean;
};

export default function SettingBoundariesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBoundaryCompany, setSelectedBoundaryCompany] = useState<CompanyItem | null>(null);
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/companies?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.data) {
        setCompanies(json.data);
      }
    } catch (err) {
      console.error("Error loading companies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const mappedCount = companies.filter((c) => c.hasBoundary).length;

  return (
    <div className="min-h-screen pb-16 text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-[3px] border-black shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#93C5FD] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <Layers className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">
                Batas Wilayah Perusahaan (GeoJSON)
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Upload Poligon Batas Kebun Konsesi untuk Masking Peta Isohyet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadCompanies}
              disabled={isLoading}
              title="Perbarui data tabel batas"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <Link
              href="/rainfall/map"
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] transition active:shadow-none"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka Peta Isohyet
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <SettingNavTabs />

        {/* Feature Highlights Banner */}
        <div className="rounded-xl bg-[#E9D5FF] border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000] flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-black mt-0.5" />
          <div className="text-xs font-bold text-slate-800 space-y-1">
            <div className="font-black uppercase text-black">
              Dukungan Proyeksi Spasial Otomatis (WGS84 & Web Mercator)
            </div>
            <p>
              Modul ini mendukung file <code>.geojson</code> dan <code>.json</code> (tipe Polygon & MultiPolygon). Jika file GIS Anda diekspor dalam satuan meter (<strong>EPSG:3857 / Web Mercator</strong>), sistem secara otomatis mengonversinya ke derajat lintang & bujur (<strong>WGS84 / EPSG:4326</strong>) agar pas terpetakan pada Leaflet & Turf.js.
            </p>
          </div>
        </div>

        {/* Company GeoJSON Boundaries Section */}
        <div className="rounded-xl bg-[#FFFDF5] p-6 sm:p-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-5">
            <div>
              <span className="inline-block bg-[#93C5FD] border-2 border-black text-black text-[11px] font-black uppercase px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_#000] mb-2">
                Batas Spasial GIS
              </span>
              <h2 className="text-2xl font-black uppercase text-black tracking-tight flex items-center gap-2">
                <Layers className="h-6 w-6" />
                Daftar Poligon Perusahaan
              </h2>
              <p className="text-xs font-bold text-slate-700 max-w-xl mt-1">
                Poligon batas kebun digunakan sebagai batas wilayah (<em>boundary mask</em>) pada perhitungan interpolasi peta <strong>Rainfall Isohyet</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-xl border-2 border-black bg-[#99F6D5] px-4 py-2 text-center shadow-[3px_3px_0px_0px_#000]">
                <div className="text-[10px] font-black uppercase">Sudah Ada Batas</div>
                <div className="text-lg font-black text-black">
                  {mappedCount} / {companies.length}
                </div>
              </div>
              <div className="rounded-xl border-2 border-black bg-[#FED7AA] px-4 py-2 text-center shadow-[3px_3px_0px_0px_#000]">
                <div className="text-[10px] font-black uppercase">Belum Ada Batas</div>
                <div className="text-lg font-black text-black">
                  {companies.length - mappedCount}
                </div>
              </div>
            </div>
          </div>

          {/* Companies Boundary Table */}
          <div className="rounded-xl border-[3px] border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_#000]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-[3px] border-black bg-[#93C5FD] font-black uppercase text-black">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Kode Perusahaan</th>
                    <th className="py-3 px-4">Nama Perusahaan</th>
                    <th className="py-3 px-4">Status Batas Spasial</th>
                    <th className="py-3 px-4 text-center w-40">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-600">
                        <div className="inline-flex items-center gap-2 font-black uppercase text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin text-black" />
                          Memuat data batas perusahaan...
                        </div>
                      </td>
                    </tr>
                  ) : (
                    companies.map((c, idx) => (
                      <tr key={c.company_code} className="hover:bg-[#FFFDF5] transition duration-150">
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded text-[11px] shadow-[1px_1px_0px_0px_#000]">
                            {c.company_code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-black">
                          {c.company_name}
                        </td>
                        <td className="py-3 px-4">
                          {c.hasBoundary ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#86EFAC] border-2 border-black px-2.5 py-0.5 text-[11px] font-black text-black uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                              GeoJSON Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FED7AA] border-2 border-black px-2.5 py-0.5 text-[11px] font-black text-black uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
                              <AlertCircle className="h-3.5 w-3.5 text-black" />
                              Belum Ada Batas
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedBoundaryCompany(c);
                              setIsBoundaryModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-white px-3 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#93C5FD] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
                          >
                            <Layers className="h-3 w-3" />
                            {c.hasBoundary ? "Kelola Batas" : "Upload Batas"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer Summary */}
            <div className="flex items-center justify-between border-t-2 border-black bg-[#F4F0EA] px-4 py-2.5 text-[11px] font-black uppercase text-slate-700">
              <div>
                Total {companies.length} Perusahaan Terdaftar
              </div>
              <div>
                {mappedCount} Memiliki Batas Poligon ({companies.length > 0 ? Math.round((mappedCount / companies.length) * 100) : 0}%)
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Boundary Modal */}
      <UploadBoundaryModal
        isOpen={isBoundaryModalOpen}
        onClose={() => {
          setIsBoundaryModalOpen(false);
          setSelectedBoundaryCompany(null);
        }}
        onSuccess={() => {
          loadCompanies();
        }}
        company={selectedBoundaryCompany}
      />
    </div>
  );
}
