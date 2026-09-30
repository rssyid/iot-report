"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  X,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  ExternalLink,
  Trash2,
  Save,
  Building2,
  Compass,
} from "lucide-react";

export type StationItem = {
  id: string;
  stationId: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  estateId: string;
  estCode: string;
  estAlias: string | null;
  estComplete: string;
  displayOrder: number;
  location: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  active: boolean;
  lastSeenAt: string | null;
};

type EditStationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedStation: StationItem) => void;
  station: StationItem | null;
};

export default function EditStationModal({
  isOpen,
  onClose,
  onSuccess,
  station,
}: EditStationModalProps) {
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (station) {
      setLatitude(
        station.latitude !== null && station.latitude !== undefined
          ? String(station.latitude)
          : ""
      );
      setLongitude(
        station.longitude !== null && station.longitude !== undefined
          ? String(station.longitude)
          : ""
      );
      setLocation(station.location || "");
      setError(null);
      setSuccessMsg(null);
    }
  }, [station, isOpen]);

  if (!isOpen || !station) return null;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung geolokasi GPS");
      return;
    }

    setIsDetectingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        setError(`Gagal mendeteksi lokasi GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClearCoordinates = () => {
    setLatitude("");
    setLongitude("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Validation
    let parsedLat: number | null = null;
    let parsedLng: number | null = null;

    if (latitude.trim() !== "") {
      parsedLat = Number(latitude);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        setError("Latitude harus berupa angka antara -90 dan 90");
        setIsLoading(false);
        return;
      }
    }

    if (longitude.trim() !== "") {
      parsedLng = Number(longitude);
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        setError("Longitude harus berupa angka antara -180 dan 180");
        setIsLoading(false);
        return;
      }
    }

    // Both or neither
    if ((parsedLat !== null && parsedLng === null) || (parsedLat === null && parsedLng !== null)) {
      setError("Harap isi kedua nilai Latitude dan Longitude secara lengkap, atau kosongkan keduanya");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/stations/${station.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parsedLat !== null ? parsedLat : null,
          longitude: parsedLng !== null ? parsedLng : null,
          location: location.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal menyimpan koordinat stasiun");
      }

      setSuccessMsg("Koordinat stasiun berhasil disimpan!");

      const updated: StationItem = {
        ...station,
        latitude: parsedLat !== null ? parsedLat : null,
        longitude: parsedLng !== null ? parsedLng : null,
        location: location.trim() || null,
      };

      setTimeout(() => {
        onSuccess(updated);
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const hasCoordinates =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#FFFDF5] border-[3px] border-black shadow-[10px_10px_0px_0px_#000] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-[3px] border-black px-6 py-3.5 bg-[#FFE600]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[#FFE600] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-black tracking-tight uppercase">
                Edit Koordinat GPS Stasiun
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

          {/* Station Metadata Card */}
          <div className="rounded-lg bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-black uppercase text-slate-500">ID Stasiun:</span>
              <span className="font-mono font-black text-black bg-[#FFE600] border border-black px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_0px_#000]">
                {station.stationId}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-500">Perusahaan / Estate:</span>
              <span className="font-black text-black">
                {station.companyCode} &bull; #{station.displayOrder} {station.estComplete} ({station.estAlias || station.estCode})
              </span>
            </div>
          </div>

          {/* Latitude & Longitude Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  Latitude (Lintang)
                </span>
                <span className="text-[10px] font-normal text-slate-600">-90 s/d 90</span>
              </label>
              <input
                type="text"
                value={latitude}
                placeholder="cth: -0.3128456"
                disabled={isLoading}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold font-mono text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  Longitude (Bujur)
                </span>
                <span className="text-[10px] font-normal text-slate-600">-180 s/d 180</span>
              </label>
              <input
                type="text"
                value={longitude}
                placeholder="cth: 103.1458921"
                disabled={isLoading}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold font-mono text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* Location Description Input */}
          <div>
            <label className="block text-xs font-black uppercase text-black mb-1.5">
              Lokasi / Deskripsi Sensor (Opsional)
            </label>
            <input
              type="text"
              value={location}
              placeholder="cth: Afdeling 02 / Lapangan Kantor Estate"
              disabled={isLoading}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition disabled:opacity-50"
            />
          </div>

          {/* Helper Tools Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isLoading || isDetectingGps}
              onClick={handleGetCurrentLocation}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#93C5FD] px-3 py-1.5 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition active:shadow-none disabled:opacity-50"
            >
              <Navigation className={`h-3.5 w-3.5 ${isDetectingGps ? "animate-spin" : ""}`} />
              {isDetectingGps ? "Mencari GPS..." : "Deteksi Lokasi GPS"}
            </button>

            {hasCoordinates && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#FED7AA] px-3 py-1.5 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition active:shadow-none"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Cek di Google Maps
              </a>
            )}

            {(latitude || longitude) && (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleClearCoordinates}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-white text-red-600 px-3 py-1.5 text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFD1D1] transition active:shadow-none disabled:opacity-50 ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Kosongkan
              </button>
            )}
          </div>

          {/* Modal Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t-2 border-black pt-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition active:shadow-none disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-[#00E599] px-5 py-2 text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Menyimpan..." : "Simpan Koordinat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
