"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudRain,
  Waves,
  FileText,
  Settings,
  Map,
  Database,
  ChevronDown,
  Menu,
  X,
  Radio,
  Sparkles,
  RefreshCw,
  MapPin,
  Layers,
  Sliders,
  Code2,
  Clock,
} from "lucide-react";

type SubMenuItem = {
  title: string;
  href: string;
  icon: React.ElementType;
};

type MenuItem = {
  title: string;
  icon: React.ElementType;
  color: string;
  href?: string;
  subMenus?: SubMenuItem[];
};

const navigationConfig: MenuItem[] = [
  {
    title: "Rainfall",
    icon: CloudRain,
    color: "#93C5FD", // blue
    subMenus: [
      { title: "Rainfall data", href: "/rainfall/data", icon: Database },
      { title: "Rainfall map", href: "/rainfall/map", icon: Map },
    ],
  },
  {
    title: "TMAT",
    icon: Waves,
    color: "#86EFAC", // green
    subMenus: [
      { title: "TMAT data", href: "/tmat/data", icon: Database },
      { title: "TMAT Map", href: "/tmat/map", icon: Map },
    ],
  },
  {
    title: "Report",
    icon: FileText,
    color: "#FBCFE8", // pink
    subMenus: [
      { title: "Report IoT", href: "/report/iot", icon: Database },
    ],
  },
  {
    title: "API Docs",
    icon: Code2,
    color: "#C7D2FE", // indigo
    href: "/api-docs",
  },
  {
    title: "Setting",
    icon: Settings,
    color: "#FED7AA", // orange
    subMenus: [
      { title: "Sinkronisasi data", href: "/setting/sync", icon: RefreshCw },
      { title: "Koordinat stasiun", href: "/setting/stations", icon: MapPin },
      { title: "Device TMAT", href: "/setting/tmat-devices", icon: Radio },
      { title: "Batas GeoJSON", href: "/setting/boundaries", icon: Layers },
      { title: "Konfigurasi sistem", href: "/setting/config", icon: Sliders },
    ],
  },
];

interface SystemStatus {
  database: string;
  ombrometer: {
    activeStations: number;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    latestDataDate: string | null;
  };
  tmat: {
    activeDevices: number;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    latestDataDate: string | null;
    latestDataHour: number | null;
  };
}

function formatSyncTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "-";
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statusData, setStatusData] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/system/status?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setStatusData(json);
        }
      } catch (err) {
        console.error("Failed to fetch system status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);

    const handleSyncComplete = () => {
      fetchStatus();
    };
    window.addEventListener("iot:sync-complete", handleSyncComplete);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("iot:sync-complete", handleSyncComplete);
    };
  }, []);

  // Auto-expand sections that contain active route
  const isSubActive = (href: string) => {
    if (href === "/rainfall/data") {
      return (
        pathname === "/" ||
        pathname === "/rainfall" ||
        pathname === "/rainfall/data"
      );
    }
    return pathname.startsWith(href);
  };

  const isMenuSectionActive = (item: MenuItem) => {
    if (item.href) return pathname.startsWith(item.href);
    return item.subMenus?.some((sub) => isSubActive(sub.href)) ?? false;
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Rainfall: true,
    TMAT: true,
    Report: true,
    Setting: true,
  });

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <>
      {/* Mobile Hamburger Toggle Bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#FFFDF5] border-b-[3px] border-black px-4 py-3 shadow-[0px_3px_0px_0px_#000]">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFE600] border-2 border-black font-black text-black shadow-[2px_2px_0px_0px_#000]">
            <Radio className="h-5 w-5" />
          </div>
          <span className="font-black text-base uppercase tracking-tight text-black">
            IoT TELEMETRY
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-white text-black font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 w-72 bg-[#FFFDF5] border-r-[3px] border-black flex flex-col justify-between shadow-[4px_0px_0px_0px_#000] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo / Brand Header */}
          <div className="p-5 border-b-[3px] border-black bg-[#FFE600]">
            <Link
              href="/rainfall/data"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 group"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-[#FFE600] border-2 border-black shadow-[3px_3px_0px_0px_#000] group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition">
                <CloudRain className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="font-black text-lg tracking-tight text-black uppercase leading-none">
                  IoT PORTAL
                </div>
                <div className="text-[10px] font-black uppercase text-black/70 tracking-widest mt-1">
                  Telemetry GIS System
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-3 flex-1">
            {navigationConfig.map((item) => {
              const isSectionActive = isMenuSectionActive(item);
              const isOpen = openSections[item.title] ?? false;

              // Standalone item (e.g. Setting)
              if (item.href) {
                const active = pathname.startsWith(item.href);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-black text-xs font-black uppercase tracking-wider transition ${
                      active
                        ? "bg-[#FFE600] shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]"
                    }`}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-black"
                      style={{ backgroundColor: item.color }}
                    >
                      <IconComponent className="h-4 w-4 text-black stroke-[2.5]" />
                    </div>
                    <span>{item.title}</span>
                  </Link>
                );
              }

              // Menu with sub-items
              const IconComponent = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] overflow-hidden"
                >
                  {/* Menu Main Button */}
                  <button
                    onClick={() => toggleSection(item.title)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                      isSectionActive ? "bg-[#FFF385]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-black"
                        style={{ backgroundColor: item.color }}
                      >
                        <IconComponent className="h-4 w-4 text-black stroke-[2.5]" />
                      </div>
                      <span className="text-black font-black">{item.title}</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-black stroke-[2.5] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Sub-menu items */}
                  {isOpen && item.subMenus && (
                    <div className="border-t-2 border-black bg-[#FBF8F3] p-1.5 space-y-1">
                      {item.subMenus.map((sub) => {
                        const active = isSubActive(sub.href);
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.title}
                            href={sub.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition border-2 ${
                              active
                                ? "bg-[#FFE600] border-black text-black font-black shadow-[2px_2px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                                : "border-transparent text-slate-800 hover:border-black hover:bg-white"
                            }`}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                            <span className="truncate">{sub.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer Info Box */}
          <div className="p-3.5 border-t-[3px] border-black bg-[#F4F0EA]">
            <div className="rounded-xl border-2 border-black bg-[#E9D5FF] p-2.5 text-xs font-black shadow-[3px_3px_0px_0px_#000] space-y-2">
              <div className="flex items-center justify-between uppercase text-black border-b border-black/15 pb-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-black" />
                  Status Sistem
                </div>
                <span className="bg-[#86EFAC] border border-black px-1.5 py-0.5 rounded text-[9px] font-black text-black tracking-wider">
                  {statusData?.database || "CONNECTED"}
                </span>
              </div>

              {/* Ombrometer (CH) Card */}
              <div className="bg-white/80 rounded-lg p-2 border border-black/30 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-slate-800 font-bold">
                    <CloudRain className="h-3 w-3 text-sky-700" />
                    Ombrometer:
                  </span>
                  <span className="font-mono font-black text-black">
                    {statusData?.ombrometer?.activeStations ?? 34} Aktif
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold pt-0.5 border-t border-black/10">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-2.5 w-2.5" />
                    Last Sync:
                  </span>
                  <span
                    className="font-mono text-black font-bold"
                    title={`Data terbaru: ${statusData?.ombrometer?.latestDataDate || "-"}`}
                  >
                    {formatSyncTime(statusData?.ombrometer?.lastSyncAt)}
                  </span>
                </div>
              </div>

              {/* TMAT (Sensor) Card */}
              <div className="bg-white/80 rounded-lg p-2 border border-black/30 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-slate-800 font-bold">
                    <Radio className="h-3 w-3 text-emerald-700" />
                    TMAT (Sensor):
                  </span>
                  <span className="font-mono font-black text-black">
                    {statusData?.tmat?.activeDevices ?? 94} Aktif
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold pt-0.5 border-t border-black/10">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-2.5 w-2.5" />
                    Last Sync:
                  </span>
                  <span
                    className="font-mono text-black font-bold"
                    title={`Data terbaru: ${statusData?.tmat?.latestDataDate || "-"} Jam ${statusData?.tmat?.latestDataHour ?? 0}:00`}
                  >
                    {formatSyncTime(statusData?.tmat?.lastSyncAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
