"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw, MapPin, Layers, Sliders, Settings, Radio } from "lucide-react";

const SETTING_TABS = [
  {
    title: "Sinkronisasi Data",
    href: "/setting/sync",
    icon: RefreshCw,
    color: "#00E599",
  },
  {
    title: "Koordinat Stasiun",
    href: "/setting/stations",
    icon: MapPin,
    color: "#FFE600",
  },
  {
    title: "Device TMAT",
    href: "/setting/tmat-devices",
    icon: Radio,
    color: "#86EFAC",
  },
  {
    title: "Batas GeoJSON",
    href: "/setting/boundaries",
    icon: Layers,
    color: "#93C5FD",
  },
  {
    title: "Konfigurasi Sistem",
    href: "/setting/config",
    icon: Sliders,
    color: "#FED7AA",
  },
];

export default function SettingNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-black pb-4">
      {SETTING_TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-black text-xs font-black uppercase tracking-tight transition ${
              isActive
                ? "bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white text-slate-700 hover:text-black hover:bg-slate-100 shadow-[1.5px_1.5px_0px_0px_#000]"
            }`}
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded border border-black"
              style={{ backgroundColor: tab.color }}
            >
              <Icon className="h-3 w-3 text-black stroke-[2.5]" />
            </div>
            <span>{tab.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
