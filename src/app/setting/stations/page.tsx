"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Search,
  Filter,
  ExternalLink,
  Edit3,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import EditStationModal, { StationItem } from "@/components/EditStationModal";
import SettingNavTabs from "@/components/SettingNavTabs";

type CompanyOption = {
  company_code: string;
  company_name: string;
};

export default function SettingStationsPage() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [stations, setStations] = useState<StationItem[]>([]);
  const [isStationsLoading, setIsStationsLoading] = useState(true);
  const [editingStation, setEditingStation] = useState<StationItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "MAPPED" | "UNMAPPED">("ALL");

  const loadData = async () => {
    setIsStationsLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/companies?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/stations?_t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();

      if (cJson.data) setCompanies(cJson.data);
      if (sJson.data) setStations(sJson.data);
    } catch (err) {
      console.error("Error loading station data:", err);
    } finally {
      setIsStationsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      if (selectedCompanyFilter !== "ALL" && st.companyCode !== selectedCompanyFilter) {
        return false;
      }

      const hasCoords =
        st.latitude !== null &&
        st.longitude !== null &&
        st.latitude !== "" &&
        st.longitude !== "";

      if (statusFilter === "MAPPED" && !hasCoords) return false;
      if (statusFilter === "UNMAPPED" && hasCoords) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchId = st.stationId.toLowerCase().includes(q);
        const matchCompany = st.companyCode.toLowerCase().includes(q);
        const matchEstate =
          st.estComplete.toLowerCase().includes(q) ||
          (st.estAlias && st.estAlias.toLowerCase().includes(q));
        const matchLocation = st.location ? st.location.toLowerCase().includes(q) : false;
        return matchId || matchCompany || matchEstate || matchLocation;
      }

      return true;
    });
  }, [stations, selectedCompanyFilter, statusFilter, searchQuery]);

  const mappedCount = useMemo(() => {
    return stations.filter(
      (s) => s.latitude !== null && s.longitude !== null && s.latitude !== "" && s.longitude !== ""
    ).length;
  }, [stations]);

  const handleEditClick = (station: StationItem) => {
    setEditingStation(station);
    setIsEditModalOpen(true);
  };

  const handleStationUpdated = (updatedStation: StationItem) => {
    setStations((prev) =>
      prev.map((s) => (s.id === updatedStation.id ? updatedStation : s))
    );
  };

  return (
    <div className="min-h-screen pb-16 text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF5] border-b-[3px] border-black shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000]">
              <MapPin className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">
                Koordinat Stasiun Curah Hujan
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Input Latitude, Longitude & Lokasi Sensor untuk Visualisasi Spasial
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <SettingNavTabs />

        {/* Station GPS Coordinates Management Section */}
        <div className="rounded-xl bg-[#FFFDF5] p-6 sm:p-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-5">
            <div>
              <span className="inline-block bg-[#E9D5FF] border-2 border-black text-black text-[11px] font-black uppercase px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_#000] mb-2">
                Geolokasi Sensor
              </span>
              <h2 className="text-2xl font-black uppercase text-black tracking-tight flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                Manajemen Koordinat Stasiun
              </h2>
              <p className="text-xs font-bold text-slate-700 max-w-xl mt-1">
                Atur koordinat Latitude & Longitude tiap stasiun curah hujan untuk kesiapan visualisasi peta spasial pada menu <strong>Rainfall Map</strong>.
              </p>
            </div>

            {/* Quick GPS Status Counter */}
            <div className="flex items-center gap-2">
              <div className="rounded-xl border-2 border-black bg-[#99F6D5] px-4 py-2 text-center shadow-[3px_3px_0px_0px_#000]">
                <div className="text-[10px] font-black uppercase">Sudah Berkoordinat</div>
                <div className="text-lg font-black text-black">
                  {mappedCount} / {stations.length}
                </div>
              </div>
              <div className="rounded-xl border-2 border-black bg-[#FFD1D1] px-4 py-2 text-center shadow-[3px_3px_0px_0px_#000]">
                <div className="text-[10px] font-black uppercase">Belum Diatur</div>
                <div className="text-lg font-black text-black">
                  {stations.length - mappedCount}
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cari ID stasiun, estate, perusahaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white pl-9 pr-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition"
              />
            </div>

            {/* Company Filter Dropdown */}
            <div>
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition cursor-pointer"
              >
                <option value="ALL">Semua Perusahaan ({companies.length})</option>
                {companies.map((c) => (
                  <option key={c.company_code} value={c.company_code}>
                    {c.company_code} - {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition cursor-pointer"
              >
                <option value="ALL">Semua Status Koordinat ({stations.length})</option>
                <option value="MAPPED">Hanya Yang Berkoordinat ({mappedCount})</option>
                <option value="UNMAPPED">Belum Ada Koordinat ({stations.length - mappedCount})</option>
              </select>
            </div>
          </div>

          {/* Stations Table */}
          <div className="rounded-xl border-[3px] border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_#000]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-[3px] border-black bg-[#FFE600] font-black uppercase text-black">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Stasiun ID</th>
                    <th className="py-3 px-4">Perusahaan</th>
                    <th className="py-3 px-4">Estate</th>
                    <th className="py-3 px-4">Lokasi Sensor</th>
                    <th className="py-3 px-4">Koordinat GPS (Lat, Long)</th>
                    <th className="py-3 px-4 text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold">
                  {isStationsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-600">
                        <div className="inline-flex items-center gap-2 font-black uppercase text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin text-black" />
                          Memuat data stasiun curah hujan...
                        </div>
                      </td>
                    </tr>
                  ) : filteredStations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-600 font-bold">
                        Tidak ada stasiun yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStations.map((st, index) => {
                      const hasCoords =
                        st.latitude !== null &&
                        st.longitude !== null &&
                        st.latitude !== "" &&
                        st.longitude !== "";

                      return (
                        <tr
                          key={st.id}
                          className="hover:bg-[#FFFDF5] transition duration-150"
                        >
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-black text-black bg-[#F4F0EA] border border-black px-2 py-0.5 rounded text-[11px] shadow-[1px_1px_0px_0px_#000]">
                              {st.stationId}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-black">
                            {st.companyCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block text-[10px] font-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                                #{st.displayOrder}
                              </span>
                              <span className="font-black text-black">
                                {st.estComplete}
                              </span>
                              <span className="text-[11px] text-slate-500 font-bold">
                                ({st.estAlias || st.estCode})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {st.location ? (
                              <span className="text-black font-bold">{st.location}</span>
                            ) : (
                              <span className="text-slate-400 italic font-normal text-[11px]">Belum diisi</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {hasCoords ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#99F6D5] border-2 border-black px-2 py-0.5 text-[11px] font-mono font-black text-black shadow-[1.5px_1.5px_0px_0px_#000]">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {Number(st.latitude).toFixed(5)}, {Number(st.longitude).toFixed(5)}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${st.latitude},${st.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Lihat di Google Maps"
                                  className="p-1 rounded border border-black bg-white hover:bg-[#FFE600] transition shadow-[1px_1px_0px_0px_#000]"
                                >
                                  <ExternalLink className="h-3 w-3 text-black" />
                                </a>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FED7AA] border-2 border-black px-2 py-0.5 text-[10px] font-black text-black uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
                                <AlertCircle className="h-3 w-3" />
                                Belum Diatur
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleEditClick(st)}
                              className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer Summary */}
            <div className="flex items-center justify-between border-t-2 border-black bg-[#F4F0EA] px-4 py-2.5 text-[11px] font-black uppercase text-slate-700">
              <div>
                Menampilkan {filteredStations.length} dari {stations.length} stasiun
              </div>
              <div>
                {mappedCount} berkoordinat ({stations.length > 0 ? Math.round((mappedCount / stations.length) * 100) : 0}%)
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Station GPS Modal */}
      <EditStationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStation(null);
        }}
        onSuccess={handleStationUpdated}
        station={editingStation}
      />
    </div>
  );
}
