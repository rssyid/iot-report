"use client";

import React from "react";
import { Server, CheckCircle2, Sliders, Database, Globe, Calendar, Cpu } from "lucide-react";
import SettingNavTabs from "@/components/SettingNavTabs";

export default function SettingConfigPage() {
  return (
    <div className="min-h-screen pb-16 text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-[3px] border-black shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FED7AA] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <Sliders className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">
                Konfigurasi Sistem
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Parameter Lingkungan, Konektivitas Database & Web Services IoT
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <SettingNavTabs />

        {/* System Configuration Details Card */}
        <div className="rounded-xl bg-[#FFFDF5] p-6 sm:p-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <div>
              <span className="inline-block bg-[#FED7AA] border-2 border-black text-black text-[11px] font-black uppercase px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_#000] mb-2">
                Runtime Environment
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                <Server className="h-6 w-6" />
                Parameter Konfigurasi Lingkungan
              </h2>
            </div>
            <span className="text-[11px] font-black uppercase bg-[#86EFAC] border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-black" />
              Active Config
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1.5">
              <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-black" />
                Endpoint Web Service IoT
              </span>
              <div className="font-mono text-xs text-black break-all bg-[#F4F0EA] p-2 rounded border border-black">
                https://app.gis-div.com/iot/Service/webservice.asmx/GetArsStation4Weeks
              </div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1.5">
              <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-black" />
                Database Engine
              </span>
              <div className="text-xs text-black font-black flex items-center justify-between bg-[#F4F0EA] p-2 rounded border border-black">
                <span>Neon PostgreSQL (Serverless)</span>
                <span className="bg-[#93C5FD] border border-black px-1.5 py-0.5 rounded text-[10px]">drizzle-orm</span>
              </div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1.5">
              <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-black" />
                Parameter Arsiran Default
              </span>
              <div className="text-xs text-black font-black bg-[#F4F0EA] p-2 rounded border border-black">
                7 (Kerapatan visualisasi curah hujan)
              </div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1.5">
              <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-black" />
                Zona Waktu Aplikasi
              </span>
              <div className="text-xs text-black font-black flex items-center justify-between bg-[#F4F0EA] p-2 rounded border border-black">
                <span>Asia/Jakarta (WIB, UTC+7)</span>
                <span className="bg-[#FED7AA] border border-black px-1.5 py-0.5 rounded text-[10px]">Non-UTC Shift</span>
              </div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1.5">
              <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-black" />
                Batas Request Paralel (Concurrency)
              </span>
              <div className="text-xs text-black font-black bg-[#F4F0EA] p-2 rounded border border-black">
                Max 2 requests (Proteksi throttling endpoint eksternal)
              </div>
            </div>

            <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1.5">
              <span className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-black" />
                Kalender Kerja Perkebunan
              </span>
              <div className="text-xs text-black font-black flex items-center justify-between bg-[#F4F0EA] p-2 rounded border border-black">
                <span>GIS Week Calendar 2025–2026 (105 Minggu)</span>
                <span className="bg-[#E9D5FF] border border-black px-1.5 py-0.5 rounded text-[10px]">SQL View</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
