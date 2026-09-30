"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Search,
  Filter,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  Clock,
  Layers,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import SettingNavTabs from "@/components/SettingNavTabs";

interface TmatDeviceItem {
  id: string;
  companyCode: string;
  deviceId: string;
  deviceName: string;
  estate: string;
  block: string;
  latitude: string | null;
  longitude: string | null;
  active: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  latestDate: string | null;
  latestHour: number | null;
  latestTmat: string | null;
  latestBattery: string | null;
  latestSignal: string | null;
}

export default function SettingTmatDevicesPage() {
  const [devices, setDevices] = useState<TmatDeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal states
  const [editingDevice, setEditingDevice] = useState<TmatDeviceItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formCompanyCode, setFormCompanyCode] = useState("");
  const [formDeviceId, setFormDeviceId] = useState("");
  const [formDeviceName, setFormDeviceName] = useState("");
  const [formEstate, setFormEstate] = useState("");
  const [formBlock, setFormBlock] = useState("");
  const [formLatitude, setFormLatitude] = useState("");
  const [formLongitude, setFormLongitude] = useState("");
  const [formActive, setFormActive] = useState(true);

  const loadDevices = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tmat/devices?_t=${Date.now()}`);
      const json = await res.json();
      if (json.data) {
        setDevices(json.data);
      } else if (json.error) {
        setErrorMsg(json.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const companiesList = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => set.add(d.companyCode));
    return Array.from(set).sort();
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (companyFilter !== "ALL" && d.companyCode !== companyFilter) return false;
      if (statusFilter === "ACTIVE" && !d.active) return false;
      if (statusFilter === "INACTIVE" && d.active) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          d.deviceName.toLowerCase().includes(q) ||
          d.deviceId.toLowerCase().includes(q) ||
          d.estate.toLowerCase().includes(q) ||
          d.block.toLowerCase().includes(q) ||
          d.companyCode.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [devices, companyFilter, statusFilter, searchQuery]);

  const activeCount = useMemo(() => devices.filter((d) => d.active).length, [devices]);
  const mappedCount = useMemo(
    () => devices.filter((d) => d.latitude && d.longitude).length,
    [devices]
  );

  // Toggle active/inactive
  const handleToggleActive = async (device: TmatDeviceItem) => {
    const nextState = !device.active;
    // Optimistic update
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, active: nextState } : d))
    );

    try {
      const res = await fetch(`/api/tmat/devices/${device.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextState }),
      });
      if (!res.ok) {
        // Revert on error
        setDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, active: device.active } : d))
        );
        alert("Gagal mengubah status aktif device");
      }
    } catch (err) {
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, active: device.active } : d))
      );
      alert("Terjadi kesalahan jaringan saat mengubah status");
    }
  };

  // Open Edit Modal
  const openEditModal = (device: TmatDeviceItem) => {
    setEditingDevice(device);
    setFormCompanyCode(device.companyCode);
    setFormDeviceId(device.deviceId);
    setFormDeviceName(device.deviceName);
    setFormEstate(device.estate);
    setFormBlock(device.block);
    setFormLatitude(device.latitude || "");
    setFormLongitude(device.longitude || "");
    setFormActive(device.active);
    setIsEditModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingDevice(null);
    setFormCompanyCode("PT.BAS");
    setFormDeviceId("");
    setFormDeviceName("");
    setFormEstate("");
    setFormBlock("");
    setFormLatitude("");
    setFormLongitude("");
    setFormActive(true);
    setIsAddModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/tmat/devices/${editingDevice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode: formCompanyCode,
          deviceId: formDeviceId,
          deviceName: formDeviceName,
          estate: formEstate,
          block: formBlock,
          latitude: formLatitude || null,
          longitude: formLongitude || null,
          active: formActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan perubahan");

      setDevices((prev) =>
        prev.map((d) => (d.id === editingDevice.id ? { ...d, ...json.data } : d))
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Add
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/tmat/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode: formCompanyCode,
          deviceId: formDeviceId,
          deviceName: formDeviceName,
          estate: formEstate,
          block: formBlock,
          latitude: formLatitude || null,
          longitude: formLongitude || null,
          active: formActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambah device");

      setDevices((prev) => [json.data, ...prev]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
          <div className="p-2 bg-[#86EFAC] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <Radio className="h-6 w-6 text-black" />
          </div>
          Pengaturan Master Device TMAT
        </h1>
        <p className="text-sm font-bold text-slate-600 mt-1">
          Kelola 94 sensor Tinggi Muka Air Tanah (Holykell), atur status aktif/nonaktif, koordinat, dan metadata kebun.
        </p>
      </div>

      {/* Tabs */}
      <SettingNavTabs />

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#000]">
          <p className="text-xs font-black uppercase text-slate-500">Total Sensor Terdaftar</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black">{devices.length}</span>
            <span className="text-xs font-bold text-slate-500">Unit Terpasang</span>
          </div>
        </div>

        <div className="bg-[#86EFAC] border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#000]">
          <p className="text-xs font-black uppercase text-emerald-900">Sensor Aktif</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-emerald-950">{activeCount}</span>
            <span className="text-xs font-black text-emerald-800">
              {devices.length > 0 ? Math.round((activeCount / devices.length) * 100) : 0}% Aktif
            </span>
          </div>
        </div>

        <div className="bg-[#FFE600] border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#000]">
          <p className="text-xs font-black uppercase text-amber-900">Koordinat Terpetakan</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-amber-950">{mappedCount}</span>
            <span className="text-xs font-black text-amber-800">
              {devices.length - mappedCount} Perlu Koordinat
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#000] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari device name, ID, estate, atau blok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="border-2 border-black rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none shadow-[2px_2px_0px_0px_#000]"
            >
              <option value="ALL">Semua Company</option>
              {companiesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border-2 border-black rounded-xl px-3 py-2 text-xs font-black uppercase focus:outline-none shadow-[2px_2px_0px_0px_#000]"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif Saja</option>
            <option value="INACTIVE">Nonaktif Saja</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadDevices}
            disabled={isLoading}
            className="p-2 border-2 border-black rounded-xl bg-white hover:bg-slate-100 font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-3.5 py-2 border-2 border-black rounded-xl bg-[#FFE600] text-black font-black text-xs uppercase shadow-[2.5px_2.5px_0px_0px_#000] hover:bg-yellow-300 active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Tambah Device
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-100 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-xs font-bold text-red-800">{errorMsg}</p>
        </div>
      )}

      {/* Devices Table */}
      <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b-2 border-black font-black uppercase tracking-tight text-slate-700">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Status</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Device ID</th>
                <th className="py-3 px-4">Nama Perangkat</th>
                <th className="py-3 px-3">Estate</th>
                <th className="py-3 px-3">Blok</th>
                <th className="py-3 px-3">Koordinat</th>
                <th className="py-3 px-4">Telemetri Terakhir</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-bold">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-black" />
                    Memuat daftar sensor TMAT...
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Tidak ada device yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr
                    key={dev.id}
                    className={`hover:bg-amber-50/50 transition ${
                      !dev.active ? "bg-slate-50/70 text-slate-400" : ""
                    }`}
                  >
                    {/* Active Toggle Switch */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(dev)}
                        title={dev.active ? "Klik untuk Nonaktifkan" : "Klik untuk Aktifkan"}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-black transition-colors duration-200 ease-in-out focus:outline-none ${
                          dev.active ? "bg-[#86EFAC]" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition duration-200 ease-in-out ${
                            dev.active ? "translate-x-4" : "translate-x-0.5"
                          } mt-[1px]`}
                        />
                      </button>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded border border-black bg-white font-black text-[10px] shadow-[1px_1px_0px_0px_#000]">
                        {dev.companyCode}
                      </span>
                    </td>

                    {/* Device ID */}
                    <td className="py-3 px-3 font-mono font-black text-black">
                      {dev.deviceId}
                    </td>

                    {/* Device Name */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {dev.deviceName}
                    </td>

                    {/* Estate */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-bold text-blue-900 text-[11px]">
                        {dev.estate}
                      </span>
                    </td>

                    {/* Block */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 font-bold text-amber-900 text-[11px]">
                        {dev.block}
                      </span>
                    </td>

                    {/* Koordinat */}
                    <td className="py-3 px-3">
                      {dev.latitude && dev.longitude ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {Number(dev.latitude).toFixed(4)}, {Number(dev.longitude).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Belum diisi</span>
                      )}
                    </td>

                    {/* Telemetri Terakhir */}
                    <td className="py-3 px-4">
                      {dev.latestDate ? (
                        <div className="text-[11px]">
                          <span className="font-black text-black">
                            {Number(dev.latestTmat).toFixed(1)} cm
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1.5">
                            ({dev.latestDate} {String(dev.latestHour).padStart(2, "0")}:00)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Belum ada data</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => openEditModal(dev)}
                        className="p-1.5 border border-black rounded-lg bg-white hover:bg-[#FFE600] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px]"
                        title="Edit Metadata Device"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-black" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t-2 border-black flex justify-between items-center text-xs font-bold text-slate-600">
          <span>Menampilkan {filteredDevices.length} dari {devices.length} sensor</span>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {(isEditModalOpen || isAddModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-3 border-black rounded-2xl w-full max-w-lg shadow-[8px_8px_0px_0px_#000] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#FFE600] border-b-2 border-black p-4 flex items-center justify-between">
              <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                <Radio className="h-5 w-5" />
                {isEditModalOpen ? "Edit Metadata Device TMAT" : "Tambah Sensor TMAT Baru"}
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsAddModalOpen(false);
                }}
                className="p-1 border-2 border-black rounded-lg bg-white hover:bg-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={isEditModalOpen ? handleSaveEdit : handleSaveAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Company Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCompanyCode}
                    onChange={(e) => setFormCompanyCode(e.target.value.toUpperCase())}
                    placeholder="PT.BAS"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Device ID (Holykell) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDeviceId}
                    onChange={(e) => setFormDeviceId(e.target.value)}
                    placeholder="441"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Nama Perangkat / Label Sensor *
                </label>
                <input
                  type="text"
                  required
                  value={formDeviceName}
                  onChange={(e) => setFormDeviceName(e.target.value)}
                  placeholder="BS-KSU-A07-T-HK105-AWL-BT"
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Estate *
                  </label>
                  <input
                    type="text"
                    required
                    value={formEstate}
                    onChange={(e) => setFormEstate(e.target.value.toUpperCase())}
                    placeholder="KSU"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Blok Kebun *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBlock}
                    onChange={(e) => setFormBlock(e.target.value.toUpperCase())}
                    placeholder="A07"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Latitude (Opsional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formLatitude}
                    onChange={(e) => setFormLatitude(e.target.value)}
                    placeholder="-0.123456"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Longitude (Opsional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formLongitude}
                    onChange={(e) => setFormLongitude(e.target.value)}
                    placeholder="109.123456"
                    className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-black text-black focus:ring-black cursor-pointer"
                />
                <label htmlFor="formActive" className="text-xs font-black uppercase cursor-pointer">
                  Perangkat Aktif (Ikut Sinkronisasi Otomatis)
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 border-2 border-black rounded-xl font-bold text-xs hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 border-2 border-black rounded-xl bg-[#FFE600] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-300 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perangkat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
