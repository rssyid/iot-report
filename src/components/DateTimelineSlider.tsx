"use client";

import React, { useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { id } from "date-fns/locale";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Calendar,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";

type DateTimelineSliderProps = {
  dateList: string[]; // List of 30 dates in window
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  isLoadingData: boolean;
  latestAvailableDate?: string;
  dataCountForActiveDate?: number;
};

export default function DateTimelineSlider({
  dateList,
  currentIndex,
  onChangeIndex,
  selectedDate,
  onSelectDate,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  isLooping,
  onToggleLoop,
  isLoadingData,
  latestAvailableDate,
  dataCountForActiveDate = 0,
}: DateTimelineSliderProps) {
  // Format formatted date label in Indonesian
  const activeDateFormatted = useMemo(() => {
    try {
      if (!selectedDate) return "-";
      const d = parseISO(selectedDate);
      if (!isValid(d)) return selectedDate;
      return format(d, "EEEE, dd MMMM yyyy", { locale: id });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const startDateFormatted = useMemo(() => {
    if (dateList.length === 0) return "";
    try {
      const d = parseISO(dateList[0]);
      return format(d, "dd MMM", { locale: id });
    } catch {
      return dateList[0];
    }
  }, [dateList]);

  const endDateFormatted = useMemo(() => {
    if (dateList.length === 0) return "";
    try {
      const d = parseISO(dateList[dateList.length - 1]);
      return format(d, "dd MMM yyyy", { locale: id });
    } catch {
      return dateList[dateList.length - 1];
    }
  }, [dateList]);

  const handleStepBack = () => {
    if (currentIndex > 0) {
      onChangeIndex(currentIndex - 1);
    } else if (isLooping && dateList.length > 0) {
      onChangeIndex(dateList.length - 1);
    }
  };

  const handleStepForward = () => {
    if (currentIndex < dateList.length - 1) {
      onChangeIndex(currentIndex + 1);
    } else if (isLooping && dateList.length > 0) {
      onChangeIndex(0);
    }
  };

  const handleJumpToLatest = () => {
    if (latestAvailableDate) {
      onSelectDate(latestAvailableDate);
    } else if (dateList.length > 0) {
      onChangeIndex(dateList.length - 1);
    }
  };

  return (
    <div className="rounded-xl bg-[#FFFDF5] p-5 sm:p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] space-y-4">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Playback Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLoadingData || dateList.length <= 1}
            title={isPlaying ? "Jeda Animasi (Pause)" : "Jalankan Animasi Harian (Play)"}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black text-xs font-black uppercase tracking-wider transition shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${
              isPlaying
                ? "bg-[#FFE600] text-black hover:bg-[#FACC15]"
                : "bg-[#00E599] text-black hover:bg-[#10B981]"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-current stroke-[2.5]" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current stroke-[2.5]" />
                <span>Auto Play</span>
              </>
            )}
          </button>

          {/* Step Back (H-1) */}
          <button
            type="button"
            onClick={handleStepBack}
            disabled={currentIndex <= 0 && !isLooping}
            title="Mundur 1 Hari (H-1)"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white text-black font-black shadow-[2px_2px_0px_0px_#000] hover:bg-slate-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition disabled:opacity-40"
          >
            <SkipBack className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Step Forward (H+1) */}
          <button
            type="button"
            onClick={handleStepForward}
            disabled={currentIndex >= dateList.length - 1 && !isLooping}
            title="Maju 1 Hari (H+1)"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white text-black font-black shadow-[2px_2px_0px_0px_#000] hover:bg-slate-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Speed Selector Buttons */}
          <div className="flex items-center rounded-xl border-2 border-black bg-white p-1 shadow-[2px_2px_0px_0px_#000]">
            {[
              { label: "1x", val: 1500 },
              { label: "1.5x", val: 1000 },
              { label: "2x", val: 600 },
            ].map((spd) => (
              <button
                key={spd.label}
                type="button"
                onClick={() => onChangeSpeed(spd.val)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase transition ${
                  speed === spd.val
                    ? "bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]"
                    : "text-slate-700 hover:text-black hover:bg-slate-100"
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          {/* Loop Toggle Button */}
          <button
            type="button"
            onClick={onToggleLoop}
            title={isLooping ? "Ulang otomatis aktif" : "Ulang otomatis non-aktif"}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 border-black text-[11px] font-black uppercase transition shadow-[2px_2px_0px_0px_#000] ${
              isLooping
                ? "bg-[#E9D5FF] text-black"
                : "bg-white text-slate-400 hover:text-black"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Loop</span>
          </button>
        </div>

        {/* Date Display and Direct Picker */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Date Banner */}
          <div className="flex items-center gap-2 bg-white border-2 border-black rounded-xl px-3.5 py-1.5 shadow-[3px_3px_0px_0px_#000]">
            <Calendar className="h-4 w-4 text-black shrink-0" />
            <div>
              <div className="text-xs font-black text-black capitalize">
                {activeDateFormatted}
              </div>
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                <span>
                  Hari {currentIndex + 1} dari {dateList.length}
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-black">
                  {dataCountForActiveDate} Stasiun
                </span>
              </div>
            </div>
          </div>

          {/* Integrated Date Picker Input */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={selectedDate}
              min="2025-01-01"
              max={latestAvailableDate || `${new Date().getFullYear() + 1}-12-31`}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value);
                }
              }}
              title="Pilih tanggal langsung dari kalender"
              className="rounded-xl border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385] transition cursor-pointer"
            />

            {/* Quick jump to Latest Date */}
            <button
              type="button"
              onClick={handleJumpToLatest}
              title="Lompat ke tanggal pengamatan terbaru"
              className="px-2.5 py-2 rounded-xl border-2 border-black bg-[#93C5FD] text-black text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-[#60A5FA] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none transition whitespace-nowrap"
            >
              Terbaru
            </button>
          </div>
        </div>
      </div>

      {/* Date Slider Track & Scrubber */}
      <div className="pt-2 pb-1 space-y-2">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(0, dateList.length - 1)}
            value={currentIndex}
            onChange={(e) => onChangeIndex(Number(e.target.value))}
            className="w-full h-3 rounded-lg border-2 border-black bg-white appearance-none cursor-pointer focus:outline-none shadow-[2px_2px_0px_0px_#000] accent-[#FFE600]"
            style={{
              background: `linear-gradient(to right, #00E599 0%, #FFE600 ${
                dateList.length > 1
                  ? (currentIndex / (dateList.length - 1)) * 100
                  : 100
              }%, #FFFFFF ${
                dateList.length > 1
                  ? (currentIndex / (dateList.length - 1)) * 100
                  : 100
              }%, #FFFFFF 100%)`,
            }}
          />
        </div>

        {/* Ticks & Date Range Extents */}
        <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-700 px-1">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-black"></span>
            {startDateFormatted}
          </span>

          {isPlaying && (
            <span className="inline-flex items-center gap-1.5 bg-[#FFE600] border border-black px-2 py-0.5 rounded text-[10px] font-black animate-pulse shadow-[1px_1px_0px_0px_#000]">
              <Sparkles className="h-3 w-3" /> Auto-Play ({speed / 1000}s/hari)
            </span>
          )}

          <span className="flex items-center gap-1">
            {endDateFormatted}
            <span className="h-2 w-2 rounded-full bg-black"></span>
          </span>
        </div>
      </div>
    </div>
  );
}
