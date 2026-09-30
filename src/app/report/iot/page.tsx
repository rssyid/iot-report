"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Save,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  Radio,
  CloudRain,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Info,
  Building2,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Columns,
} from "lucide-react";
import ExcelJS from "exceljs";

interface WeekColumn {
  id: number;
  month: number;
  year: number;
  week: number;
  startDate: string;
  endDate: string;
  weekName: string;
  formattedName: string;
  tuesdayDate: string;
}

interface BlockWeeklyData {
  weekId: number;
  weekNum: number;
  month: number;
  year: number;
  weekLabel: string;
  monthName: string;
  ch: number | null;
  tmat: number | null;
}

interface SelisihMingguan {
  diffVal: number | null;
  diffSymbol: string;
  diffLabel: string;
  category: "cepat" | "lambat" | "normal" | "nodata";
}

interface ReportBlockItem {
  id: string;
  no: number;
  companyCode: string;
  displayOrder: number;
  wilayah: number;
  estate: string;
  block: string;
  statusTanam: string;
  idl: string;
  tglSurvey: string | null;
  rainStationId: string | null;
  tmatDeviceId: string | null;
  pic: string;
  rekomendasi: string;
  targetPlan: string;
  progressLastWeek: string;
  progressThisWeek: string;
  weeklyData: BlockWeeklyData[];
  selisihMingguan: SelisihMingguan;
}

// Color classification for TMAT (Gambar 3)
function getTmatColor(val: number | null): { bg: string; text: string; label: string } {
  if (val === null || isNaN(val)) {
    return { bg: "#94A3B8", text: "#000000", label: "no data" };
  }
  if (val < 0) {
    return { bg: "#000000", text: "#FFFFFF", label: "Banjir (<0)" };
  }
  if (val >= 0 && val <= 40) {
    return { bg: "#2563EB", text: "#FFFFFF", label: "Tergenang (0-40)" };
  }
  if (val > 40 && val <= 45) {
    return { bg: "#06B6D4", text: "#000000", label: "A Tergenang (41-45)" };
  }
  if (val > 45 && val <= 60) {
    return { bg: "#4D7C0F", text: "#FFFFFF", label: "Normal (46-60)" };
  }
  if (val > 60 && val <= 65) {
    return { bg: "#FFE600", text: "#000000", label: "A Kering (61-65)" };
  }
  // val > 65
  return { bg: "#DC2626", text: "#FFFFFF", label: "Kering (>65)" };
}

// Color classification for Selisih Mingguan (Gambar 2)
function getDiffColor(category: string): { bg: string; text: string } {
  if (category === "cepat") {
    // Merah: Terlalu Cepat
    return { bg: "#DC2626", text: "#FFFFFF" };
  }
  if (category === "lambat") {
    // Kuning: Terlalu Lambat
    return { bg: "#FFE600", text: "#000000" };
  }
  if (category === "normal") {
    // Hijau: Normal
    return { bg: "#22C55E", text: "#000000" };
  }
  return { bg: "#CBD5E1", text: "#475569" };
}

export default function ReportIotPage() {
  const [companyCode, setCompanyCode] = useState("PT.THIP");
  const [weeksCount, setWeeksCount] = useState<number>(4);
  const [companies, setCompanies] = useState<Array<{ code: string; name: string }>>([]);
  const [weeks, setWeeks] = useState<WeekColumn[]>([]);
  const [blocks, setBlocks] = useState<ReportBlockItem[]>([]);
  const [availableStations, setAvailableStations] = useState<Array<{ id: string; stationId: string; estate: string; location: string | null }>>([]);
  const [availableDevices, setAvailableDevices] = useState<Array<{ id: string; deviceId: string; deviceName: string; estate: string; block: string }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Column Visibility States for Screenshot & Custom View (WIL, STATUS TANAM, IDL)
  const [showWil, setShowWil] = useState(true);
  const [showStatusTanam, setShowStatusTanam] = useState(true);
  const [showIdl, setShowIdl] = useState(true);

  // Modal Add Block
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWilayah, setNewWilayah] = useState(1);
  const [newEstate, setNewEstate] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newStatusTanam, setNewStatusTanam] = useState("Muda");
  const [newIdl, setNewIdl] = useState("Sudah");
  const [newTglSurvey, setNewTglSurvey] = useState("");
  const [newRainStationId, setNewRainStationId] = useState("");
  const [newTmatDeviceId, setNewTmatDeviceId] = useState("");
  const [newPic, setNewPic] = useState("Joni Pambudi");
  const [newRekomendasi, setNewRekomendasi] = useState("");
  const [newTargetPlan, setNewTargetPlan] = useState("");
  const [newProgressLast, setNewProgressLast] = useState("0");
  const [newProgressThis, setNewProgressThis] = useState("0");

  // Modal Edit Block & Sensors
  const [editingBlock, setEditingBlock] = useState<ReportBlockItem | null>(null);
  const [editWilayah, setEditWilayah] = useState(1);
  const [editEstate, setEditEstate] = useState("");
  const [editBlock, setEditBlock] = useState("");
  const [editStatusTanam, setEditStatusTanam] = useState("Muda");
  const [editIdl, setEditIdl] = useState("Sudah");
  const [editTglSurvey, setEditTglSurvey] = useState("");
  const [editRainStationId, setEditRainStationId] = useState("");
  const [editTmatDeviceId, setEditTmatDeviceId] = useState("");
  const [editPic, setEditPic] = useState("");
  const [isUpdatingBlock, setIsUpdatingBlock] = useState(false);

  // Group stations and devices by estate
  const groupedStations = useMemo(() => {
    const groups: Record<string, Array<{ id: string; stationId: string; estate: string; location: string | null }>> = {};
    for (const s of availableStations) {
      const est = s.estate || "Lainnya";
      if (!groups[est]) groups[est] = [];
      groups[est].push(s);
    }
    return groups;
  }, [availableStations]);

  const groupedDevices = useMemo(() => {
    const groups: Record<string, Array<{ id: string; deviceId: string; deviceName: string; estate: string; block: string }>> = {};
    for (const d of availableDevices) {
      const est = d.estate || "Lainnya";
      if (!groups[est]) groups[est] = [];
      groups[est].push(d);
    }
    return groups;
  }, [availableDevices]);

  const handleOpenEditModal = (b: ReportBlockItem) => {
    setEditingBlock(b);
    setEditWilayah(b.wilayah);
    setEditEstate(b.estate);
    setEditBlock(b.block);
    setEditStatusTanam(b.statusTanam);
    setEditIdl(b.idl);
    setEditTglSurvey(b.tglSurvey ? b.tglSurvey.split("T")[0] : "");
    setEditRainStationId(b.rainStationId || "");
    setEditTmatDeviceId(b.tmatDeviceId || "");
    setEditPic(b.pic || "");
  };

  const handleSaveEditBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;
    setIsUpdatingBlock(true);

    try {
      const res = await fetch("/api/report/iot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: [
            {
              id: editingBlock.id,
              wilayah: editWilayah,
              estate: editEstate,
              block: editBlock,
              statusTanam: editStatusTanam,
              idl: editIdl,
              tglSurvey: editTglSurvey || null,
              rainStationId: editRainStationId || null,
              tmatDeviceId: editTmatDeviceId || null,
              pic: editPic,
              rekomendasi: editingBlock.rekomendasi,
              targetPlan: editingBlock.targetPlan,
              progressLastWeek: editingBlock.progressLastWeek,
              progressThisWeek: editingBlock.progressThisWeek,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengupdate konfigurasi blok");

      setEditingBlock(null);
      await loadReportData();
      setSaveSuccessMsg(`Konfigurasi blok ${editEstate} ${editBlock} berhasil diperbarui. Nilai telemetri mingguan telah dihitung ulang!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat mengupdate blok");
    } finally {
      setIsUpdatingBlock(false);
    }
  };

  // Fetch report data
  const loadReportData = async () => {
    setIsLoading(true);
    setSaveSuccessMsg(null);
    try {
      const url = `/api/report/iot?companyCode=${companyCode}&weeksCount=${weeksCount}&_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.weeks) setWeeks(json.weeks);
      if (json.blocks) setBlocks(json.blocks);
      if (json.companies) setCompanies(json.companies);
      if (json.availableStations) setAvailableStations(json.availableStations);
      if (json.availableDevices) setAvailableDevices(json.availableDevices);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [companyCode, weeksCount]);

  // Handle inline changes in table
  const handleBlockFieldChange = (blockId: string, field: keyof ReportBlockItem, value: any) => {
    let finalVal = value;
    if (field === "progressLastWeek" || field === "progressThisWeek") {
      if (String(value).trim() === "100") finalVal = "Done";
    }

    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, [field]: finalVal } : b))
    );
    setHasUnsavedChanges(true);
  };

  // Save inline changes to database
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch("/api/report/iot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: blocks.map((b) => ({
            id: b.id,
            wilayah: b.wilayah,
            estate: b.estate,
            block: b.block,
            statusTanam: b.statusTanam,
            idl: b.idl,
            tglSurvey: b.tglSurvey,
            rainStationId: b.rainStationId,
            tmatDeviceId: b.tmatDeviceId,
            pic: b.pic,
            rekomendasi: b.rekomendasi,
            targetPlan: b.targetPlan,
            progressLastWeek: b.progressLastWeek,
            progressThisWeek: b.progressThisWeek,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan laporan");

      setHasUnsavedChanges(false);
      setSaveSuccessMsg("Perubahan laporan berhasil disimpan!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Block
  const handleAddBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/report/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode,
          wilayah: newWilayah,
          estate: newEstate,
          block: newBlock,
          statusTanam: newStatusTanam,
          idl: newIdl,
          tglSurvey: newTglSurvey || null,
          rainStationId: newRainStationId || null,
          tmatDeviceId: newTmatDeviceId || null,
          pic: newPic,
          rekomendasi: newRekomendasi,
          targetPlan: newTargetPlan,
          progressLastWeek: newProgressLast === "100" ? "Done" : newProgressLast,
          progressThisWeek: newProgressThis === "100" ? "Done" : newProgressThis,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambah blok");

      setIsAddModalOpen(false);
      loadReportData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Block
  const handleDeleteBlock = async (id: string, blockName: string) => {
    if (!confirm(`Hapus blok ${blockName} dari laporan pemantauan ${companyCode}?`)) return;

    try {
      const res = await fetch(`/api/report/iot?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus blok");
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Group weeks by Month for table header (e.g. Sep: [W1, W2, W3, W4])
  const groupedMonths = useMemo(() => {
    const groups: Array<{ monthName: string; year: number; weeks: WeekColumn[] }> = [];

    weeks.forEach((w) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const mName = monthNames[w.month - 1];

      const existing = groups.find((g) => g.monthName === mName && g.year === w.year);
      if (existing) {
        existing.weeks.push(w);
      } else {
        groups.push({
          monthName: mName,
          year: w.year,
          weeks: [w],
        });
      }
    });

    return groups;
  }, [weeks]);

  // Export Excel
  const handleExportExcel = async () => {
    if (blocks.length === 0) return;
    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "IoT Plantation Dashboard";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet(`Laporan IoT ${companyCode}`, {
        views: [{ showGridLines: true }],
      });

      // Title rows
      sheet.addRow([`LAPORAN MONITORING MUKA AIR TANAH (TMAT) & CURAH HUJAN`]);
      sheet.addRow([`Company: ${companyCode} | Periode: ${weeksCount} Minggu Terakhir`]);
      sheet.addRow([]);

      // Row 4: Top Level Header
      const headerRow1 = [
        "No",
        "Wil",
        "Estate",
        "Block",
        "Status Tanam",
        "IDL",
        "Tgl survey",
      ];

      // Add months headers
      groupedMonths.forEach((gm) => {
        headerRow1.push(`${gm.monthName} ${gm.year}`);
        // Add blanks for colspan
        for (let i = 1; i < gm.weeks.length * 2; i++) {
          headerRow1.push("");
        }
      });

      headerRow1.push("Selisih Mingguan (cm)", "PIC", "Rekomendasi", "Target Plan", "Progress Perbaikan", "");
      const r1 = sheet.addRow(headerRow1);

      // Row 5: Subheader
      const headerRow2 = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ];

      weeks.forEach((w) => {
        headerRow2.push(`W${w.week} CH`, `W${w.week} TMAT`);
      });

      headerRow2.push("", "", "", "", "Last Week", "This Week");
      const r2 = sheet.addRow(headerRow2);

      // Styling headers (Dark Red #990000 matching Image 1)
      [r1, r2].forEach((row) => {
        row.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFB91C1C" }, // Red header
          };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });
      });

      // Add Data Rows
      blocks.forEach((b, idx) => {
        const rowData = [
          idx + 1,
          b.wilayah,
          b.estate,
          b.block,
          b.statusTanam,
          b.idl,
          b.tglSurvey || "-",
        ];

        b.weeklyData.forEach((w) => {
          rowData.push(w.ch !== null ? w.ch : "-");
          rowData.push(w.tmat !== null ? w.tmat : "no data");
        });

        rowData.push(
          b.selisihMingguan.diffLabel,
          b.pic,
          b.rekomendasi,
          b.targetPlan,
          b.progressLastWeek,
          b.progressThisWeek
        );

        const row = sheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 9 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD1D5DB" } },
            left: { style: "thin", color: { argb: "FFD1D5DB" } },
            bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
            right: { style: "thin", color: { argb: "FFD1D5DB" } },
          };
          cell.alignment = { vertical: "middle" };

          // Alignment rules
          if (colNumber <= 7) cell.alignment = { horizontal: "center", vertical: "middle" };
          if (colNumber > 7 && colNumber <= 7 + weeks.length * 2) {
            cell.alignment = { horizontal: "center", vertical: "middle" };

            // Check if this is a TMAT column (even offset)
            const weekOffset = colNumber - 8;
            if (weekOffset % 2 === 1) {
              const weekIdx = Math.floor(weekOffset / 2);
              const tVal = b.weeklyData[weekIdx]?.tmat;
              const col = getTmatColor(tVal);
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + col.bg.replace("#", "") },
              };
              cell.font = {
                color: { argb: col.text === "#FFFFFF" ? "FFFFFFFF" : "FF000000" },
                bold: true,
                size: 9,
              };
            }
          }

          // Selisih Mingguan color
          const selisihColIndex = 8 + weeks.length * 2;
          if (colNumber === selisihColIndex) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            const diffCol = getDiffColor(b.selisihMingguan.category);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + diffCol.bg.replace("#", "") },
            };
            cell.font = {
              color: { argb: diffCol.text === "#FFFFFF" ? "FFFFFFFF" : "FF000000" },
              bold: true,
              size: 9,
            };
          }

          // PIC & Recommendation & Plan formatting
          if (colNumber === selisihColIndex + 1) cell.alignment = { horizontal: "left", vertical: "middle" };
          if (colNumber === selisihColIndex + 2 || colNumber === selisihColIndex + 3) {
            cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
          }
          if (colNumber >= selisihColIndex + 4) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      // Auto fit columns width
      sheet.columns.forEach((col) => {
        col.width = 12;
      });
      if (sheet.columns[2]) sheet.columns[2].width = 8;
      if (sheet.columns[3]) sheet.columns[3].width = 10;
      const selIdx = 7 + weeks.length * 2;
      if (sheet.columns[selIdx + 1]) sheet.columns[selIdx + 1].width = 18; // PIC
      if (sheet.columns[selIdx + 2]) sheet.columns[selIdx + 2].width = 25; // Rekomendasi
      if (sheet.columns[selIdx + 3]) sheet.columns[selIdx + 3].width = 25; // Target Plan

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_IoT_${companyCode}_${weeksCount}Minggu.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Gagal mengunduh Excel");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[100vw] overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-[#FBCFE8] rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <FileText className="h-6 w-6 text-black" />
            </div>
            Laporan Evaluasi Telemetri IoT (CH & TMAT)
          </h1>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Monitoring mingguan water management per blok, evaluasi dinamika fluktuasi air, dan tracking progress perbaikan.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadReportData}
            disabled={isLoading}
            className="p-2.5 border-2 border-black rounded-xl bg-white hover:bg-slate-100 font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
            title="Refresh Data Dari Database"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting || blocks.length === 0}
            className="px-3.5 py-2.5 border-2 border-black rounded-xl bg-white hover:bg-slate-100 font-black text-xs uppercase shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 border-2 border-black rounded-xl bg-[#86EFAC] text-black font-black text-xs uppercase shadow-[2.5px_2.5px_0px_0px_#000] hover:bg-emerald-300 active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Tambah Blok Pantauan
          </button>

          <button
            onClick={handleSaveChanges}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-5 py-2.5 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 transition ${
              hasUnsavedChanges
                ? "bg-[#FFE600] text-black hover:bg-yellow-300 animate-pulse"
                : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-400 shadow-none"
            }`}
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="max-w-7xl mx-auto p-3.5 bg-emerald-100 border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex items-center gap-2 text-xs font-black text-emerald-950">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filter & Control Bar */}
      <div className="max-w-7xl mx-auto bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#000] flex flex-wrap items-center justify-between gap-4">
        {/* Company Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-500" />
            Company:
          </label>
          <select
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
            className="border-2 border-black rounded-xl px-3.5 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] focus:ring-2 focus:ring-black"
          >
            {companies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Weeks Count Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-600 mr-1 flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5" />
            Rentang Mingguan:
          </span>
          {[4, 8, 12].map((num) => (
            <button
              key={num}
              onClick={() => setWeeksCount(num)}
              className={`px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black uppercase transition ${
                weeksCount === num
                  ? "bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000]"
                  : "bg-white text-slate-700 hover:bg-slate-100 shadow-[1px_1px_0px_0px_#000]"
              }`}
            >
              {num} Minggu
            </button>
          ))}
        </div>

        {/* Column Visibility Selector (Hide / Show WIL, STATUS TANAM, IDL) */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 border-2 border-black rounded-xl p-1.5 px-3 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1 mr-1">
            <Columns className="h-3.5 w-3.5 text-black" />
            Kolom:
          </span>
          <button
            type="button"
            onClick={() => setShowWil((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border-2 border-black text-[11px] font-black uppercase transition flex items-center gap-1 ${
              showWil
                ? "bg-[#00E599] text-black shadow-[1.5px_1.5px_0px_0px_#000]"
                : "bg-slate-200 text-slate-400 border-slate-400 line-through opacity-75 shadow-none"
            }`}
            title={showWil ? "Klik untuk sembunyikan kolom WIL" : "Klik untuk tampilkan kolom WIL"}
          >
            {showWil ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-slate-500" />}
            WIL
          </button>

          <button
            type="button"
            onClick={() => setShowStatusTanam((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border-2 border-black text-[11px] font-black uppercase transition flex items-center gap-1 ${
              showStatusTanam
                ? "bg-[#00E599] text-black shadow-[1.5px_1.5px_0px_0px_#000]"
                : "bg-slate-200 text-slate-400 border-slate-400 line-through opacity-75 shadow-none"
            }`}
            title={showStatusTanam ? "Klik untuk sembunyikan kolom STATUS TANAM" : "Klik untuk tampilkan kolom STATUS TANAM"}
          >
            {showStatusTanam ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-slate-500" />}
            STATUS TANAM
          </button>

          <button
            type="button"
            onClick={() => setShowIdl((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border-2 border-black text-[11px] font-black uppercase transition flex items-center gap-1 ${
              showIdl
                ? "bg-[#00E599] text-black shadow-[1.5px_1.5px_0px_0px_#000]"
                : "bg-slate-200 text-slate-400 border-slate-400 line-through opacity-75 shadow-none"
            }`}
            title={showIdl ? "Klik untuk sembunyikan kolom IDL" : "Klik untuk tampilkan kolom IDL"}
          >
            {showIdl ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-slate-500" />}
            IDL
          </button>
        </div>

        {/* Unsaved status badge */}
        <div>
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black bg-amber-100 text-amber-900 text-[11px] font-black animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              Ada perubahan belum disimpan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black bg-emerald-100 text-emerald-900 text-[11px] font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Data tersimpan
            </span>
          )}
        </div>
      </div>

      {/* Legends Cards (Gambar 2 & Gambar 3) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Legend 1: Range Warna TMAT (Gambar 3) */}
        <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0px_0px_#000] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-black" />
              Klasifikasi Warna TMAT (Kedalaman Air Tanah):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className="px-2 py-0.5 rounded border border-black bg-[#000000] text-white font-mono">
              Banjir (&lt;0)
            </span>
            <span className="px-2 py-0.5 rounded border border-black bg-[#2563EB] text-white font-mono">
              Tergenang (0-40)
            </span>
            <span className="px-2 py-0.5 rounded border border-black bg-[#06B6D4] text-black font-mono">
              A Tergenang (41-45)
            </span>
            <span className="px-2 py-0.5 rounded border border-black bg-[#4D7C0F] text-white font-mono">
              Normal (46-60)
            </span>
            <span className="px-2 py-0.5 rounded border border-black bg-[#FFE600] text-black font-mono">
              A Kering (61-65)
            </span>
            <span className="px-2 py-0.5 rounded border border-black bg-[#DC2626] text-white font-mono">
              Kering (&gt;65)
            </span>
            <span className="px-2 py-0.5 rounded border border-black bg-[#94A3B8] text-black font-mono">
              no data
            </span>
          </div>
        </div>

        {/* Legend 2: Kriteria Penurunan / Selisih Mingguan (Gambar 2) */}
        <div className="bg-white border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0px_0px_#000] space-y-2">
          <span className="text-xs font-black uppercase tracking-tight text-slate-800 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-black" />
            Kriteria Dinamika Selisih Mingguan (Minggu Ini vs Lalu):
          </span>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
            <div className="p-1.5 rounded border border-black bg-[#DC2626] text-white text-center">
              <span className="block font-black">Terlalu Cepat (Merah)</span>
              <span>TMAT &gt; 45 & Turun &gt; 7cm</span>
            </div>
            <div className="p-1.5 rounded border border-black bg-[#FFE600] text-black text-center">
              <span className="block font-black">Terlalu Lambat (Kuning)</span>
              <span>TMAT &le; 45 & Turun lambat (-7 s.d 0)</span>
            </div>
            <div className="p-1.5 rounded border border-black bg-[#22C55E] text-black text-center">
              <span className="block font-black">Normal (Hijau)</span>
              <span>Dinamika seimbang</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Table (Gambar 1 style) */}
      <div className="w-full bg-white border-3 border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] overflow-hidden">
        <div className="overflow-x-auto max-h-[750px]">
          <table className="w-full text-left text-xs border-collapse border-spacing-0">
            {/* Table Header with 2 Levels (Merah Marun #990000 / Red header) */}
            <thead className="sticky top-0 z-20 bg-[#990000] text-white font-black text-[11px] uppercase tracking-tight select-none">
              {/* Level 1 Header */}
              <tr className="border-b border-black/40">
                <th rowSpan={2} className="py-2.5 px-2 text-center border-r border-black/40 w-10">
                  No
                </th>
                {showWil && (
                  <th rowSpan={2} className="py-2.5 px-2 text-center border-r border-black/40 w-12">
                    Wil
                  </th>
                )}
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-black/40 w-16">
                  Estate
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-black/40 w-16">
                  Block
                </th>
                {showStatusTanam && (
                  <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-black/40 w-20">
                    Status Tanam
                  </th>
                )}
                {showIdl && (
                  <th rowSpan={2} className="py-2.5 px-2 text-center border-r border-black/40 w-14">
                    IDL
                  </th>
                )}
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r-2 border-black w-24">
                  Tgl survey
                </th>

                {/* Grouped Month Headers */}
                {groupedMonths.map((gm, i) => (
                  <th
                    key={i}
                    colSpan={gm.weeks.length * 2}
                    className="py-1.5 px-2 text-center border-r-2 border-black bg-[#800000]"
                  >
                    {gm.monthName} {gm.year}
                  </th>
                ))}

                <th rowSpan={2} className="py-2.5 px-3 text-center border-r-2 border-black w-24 bg-[#800000]">
                  Selisih Mingguan (cm)
                </th>

                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-black/40 w-28">
                  PIC
                </th>
                <th rowSpan={2} className="py-2.5 px-4 text-center border-r border-black/40 min-w-[200px]">
                  Rekomendasi
                </th>
                <th rowSpan={2} className="py-2.5 px-4 text-center border-r border-black/40 min-w-[200px]">
                  Target Plan
                </th>
                <th colSpan={2} className="py-1.5 px-3 text-center border-r border-black/40 bg-[#800000]">
                  Progress Perbaikan
                </th>
                <th rowSpan={2} className="py-2.5 px-2 text-center w-16">
                  Aksi
                </th>
              </tr>

              {/* Level 2 Header: Weeks & Subheaders */}
              <tr className="border-b-2 border-black">
                {weeks.map((w) => (
                  <React.Fragment key={w.id}>
                    <th className="py-1.5 px-2 text-center border-r border-black/30 font-mono text-[10px] w-12 bg-[#8B0000]">
                      W{w.week} <br />
                      <span className="text-[9px] font-normal text-amber-200">CH</span>
                    </th>
                    <th className="py-1.5 px-2 text-center border-r border-black/40 font-mono text-[10px] w-14 bg-[#7A0000]">
                      W{w.week} <br />
                      <span className="text-[9px] font-normal text-sky-200">TMAT</span>
                    </th>
                  </React.Fragment>
                ))}

                <th className="py-1.5 px-2 text-center border-r border-black/30 text-[10px] w-16 bg-[#8B0000]">
                  Last Week
                </th>
                <th className="py-1.5 px-2 text-center border-r border-black/40 text-[10px] w-16 bg-[#7A0000]">
                  This Week
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-black/20 font-bold text-slate-900">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={12 + (showWil ? 1 : 0) + (showStatusTanam ? 1 : 0) + (showIdl ? 1 : 0) + weeks.length * 2}
                    className="py-16 text-center text-slate-500"
                  >
                    <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 text-black" />
                    <span className="text-xs font-black">Menghitung dan memuat data telemetri laporan...</span>
                  </td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td
                    colSpan={12 + (showWil ? 1 : 0) + (showStatusTanam ? 1 : 0) + (showIdl ? 1 : 0) + weeks.length * 2}
                    className="py-16 text-center text-slate-400"
                  >
                    Belum ada blok pantauan untuk {companyCode}. Klik tombol <strong>"Tambah Blok Pantauan"</strong> di atas.
                  </td>
                </tr>
              ) : (
                blocks.map((b) => {
                  const selColor = getDiffColor(b.selisihMingguan.category);

                  return (
                    <tr key={b.id} className="hover:bg-amber-50/30 transition">
                      {/* No */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-500 text-[11px]">
                        {b.no}
                      </td>

                      {/* Wilayah */}
                      {showWil && (
                        <td className="py-2.5 px-2 text-center border-r border-slate-200">
                          <input
                            type="number"
                            value={b.wilayah}
                            onChange={(e) => handleBlockFieldChange(b.id, "wilayah", Number(e.target.value))}
                            className="w-8 text-center bg-transparent border-b border-transparent hover:border-black focus:border-black focus:outline-none"
                          />
                        </td>
                      )}

                      {/* Estate */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-black text-blue-900">
                        {b.estate}
                      </td>

                      {/* Block */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono font-black text-black">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(b)}
                          className="group mx-auto flex flex-col items-center hover:opacity-80 transition cursor-pointer"
                          title="Klik untuk ubah Stasiun CH & Sensor TMAT"
                        >
                          <span className="font-mono font-black group-hover:underline">{b.block}</span>
                          <span className="text-[9px] font-sans font-medium text-slate-400 group-hover:text-blue-600 transition flex items-center gap-1 mt-0.5">
                            <span title={b.rainStationId ? "Stasiun Curah Hujan terhubung" : "Belum ada stasiun CH"}>
                              {b.rainStationId ? "🌧️" : "⚪"}
                            </span>
                            <span title={b.tmatDeviceId ? "Sensor TMAT terhubung" : "Belum ada sensor TMAT"}>
                              {b.tmatDeviceId ? "💧" : "⚪"}
                            </span>
                          </span>
                        </button>
                      </td>

                      {/* Status Tanam */}
                      {showStatusTanam && (
                        <td className="py-2.5 px-2 border-r border-slate-200 text-center">
                          <select
                            value={b.statusTanam}
                            onChange={(e) => handleBlockFieldChange(b.id, "statusTanam", e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-center border-b border-transparent hover:border-black focus:outline-none cursor-pointer"
                          >
                            <option value="Muda">Muda</option>
                            <option value="Rehab">Rehab</option>
                            <option value="TM">TM</option>
                            <option value="TBM">TBM</option>
                            <option value="Tua">Tua</option>
                          </select>
                        </td>
                      )}

                      {/* IDL */}
                      {showIdl && (
                        <td className="py-2.5 px-2 border-r border-slate-200 text-center">
                          <select
                            value={b.idl}
                            onChange={(e) => handleBlockFieldChange(b.id, "idl", e.target.value)}
                            className={`text-[11px] font-black text-center border-b border-transparent hover:border-black focus:outline-none cursor-pointer ${
                              b.idl === "Sudah" ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            <option value="Sudah">Sudah</option>
                            <option value="Belum">Belum</option>
                          </select>
                        </td>
                      )}

                      {/* Tgl Survey */}
                      <td className="py-2.5 px-2 border-r-2 border-black text-center font-mono text-[11px] text-slate-700">
                        <input
                          type="date"
                          value={b.tglSurvey ? b.tglSurvey.split("T")[0] : ""}
                          onChange={(e) => handleBlockFieldChange(b.id, "tglSurvey", e.target.value)}
                          className="w-24 text-[10px] font-mono text-center bg-transparent border-b border-transparent hover:border-black focus:outline-none"
                        />
                      </td>

                      {/* Dynamic Weekly CH and TMAT columns */}
                      {b.weeklyData.map((w, wIdx) => {
                        const tColor = getTmatColor(w.tmat);
                        return (
                          <React.Fragment key={wIdx}>
                            {/* CH (Rainfall) */}
                            <td className="py-2.5 px-2 text-center border-r border-slate-200 font-mono text-[11px] bg-slate-50/50">
                              {w.ch !== null ? w.ch : "-"}
                            </td>

                            {/* TMAT (Colored according to Gambar 3) */}
                            <td
                              className="py-2.5 px-2 text-center border-r border-slate-300 font-mono text-[11px] font-black transition-colors"
                              style={{
                                backgroundColor: tColor.bg,
                                color: tColor.text,
                              }}
                              title={`TMAT: ${w.tmat !== null ? `${w.tmat} cm` : "no data"} (${tColor.label})`}
                            >
                              {w.tmat !== null ? w.tmat : "no data"}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Selisih Mingguan (Gambar 2 color & arrow) */}
                      <td
                        className="py-2.5 px-3 text-center border-r-2 border-black font-black font-mono text-[11px]"
                        style={{
                          backgroundColor: selColor.bg,
                          color: selColor.text,
                        }}
                        title={`Selisih: ${b.selisihMingguan.diffLabel} (${b.selisihMingguan.category})`}
                      >
                        {b.selisihMingguan.diffLabel}
                      </td>

                      {/* PIC (Inline Edit) */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={b.pic}
                          onChange={(e) => handleBlockFieldChange(b.id, "pic", e.target.value)}
                          placeholder="Nama PIC..."
                          className="w-full text-xs font-bold bg-transparent border-b border-transparent hover:border-black focus:border-black focus:outline-none"
                        />
                      </td>

                      {/* Rekomendasi (Inline Edit Multi-line) */}
                      <td className="py-2 px-3 border-r border-slate-200 align-top">
                        <textarea
                          rows={2}
                          value={b.rekomendasi}
                          onChange={(e) => handleBlockFieldChange(b.id, "rekomendasi", e.target.value)}
                          placeholder="1. Tindakan..."
                          className="w-full text-[11px] font-bold bg-transparent border border-transparent hover:border-slate-300 focus:border-black rounded p-1 focus:outline-none resize-y"
                        />
                      </td>

                      {/* Target Plan (Inline Edit Multi-line) */}
                      <td className="py-2 px-3 border-r border-slate-200 align-top">
                        <textarea
                          rows={2}
                          value={b.targetPlan}
                          onChange={(e) => handleBlockFieldChange(b.id, "targetPlan", e.target.value)}
                          placeholder="1. Target..."
                          className="w-full text-[11px] font-bold bg-transparent border border-transparent hover:border-slate-300 focus:border-black rounded p-1 focus:outline-none resize-y"
                        />
                      </td>

                      {/* Progress Last Week */}
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center">
                        <input
                          type="text"
                          value={b.progressLastWeek}
                          onChange={(e) => handleBlockFieldChange(b.id, "progressLastWeek", e.target.value)}
                          className="w-12 text-center text-xs font-black bg-transparent border-b border-transparent hover:border-black focus:outline-none"
                        />
                      </td>

                      {/* Progress This Week */}
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center">
                        <input
                          type="text"
                          value={b.progressThisWeek}
                          onChange={(e) => handleBlockFieldChange(b.id, "progressThisWeek", e.target.value)}
                          className="w-12 text-center text-xs font-black bg-transparent border-b border-transparent hover:border-black focus:outline-none"
                        />
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(b)}
                            className="p-1 rounded hover:bg-amber-100 text-slate-600 hover:text-amber-900 transition"
                            title="Edit Blok, Stasiun CH & Sensor TMAT"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(b.id, `${b.estate} - ${b.block}`)}
                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-700 transition"
                            title="Hapus baris blok ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t-2 border-black flex flex-wrap items-center justify-between text-xs font-bold text-slate-600">
          <span>Menampilkan {blocks.length} blok pantauan ({companyCode})</span>
          <span className="text-[11px] text-slate-500">
            * Nilai TMAT dibaca setiap hari Selasa jam 07:00 WIB (atau terdekat). Nilai CH adalah total mm mingguan.
          </span>
        </div>
      </div>

      {/* Modal Add Block */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-3 border-black rounded-2xl w-full max-w-xl shadow-[8px_8px_0px_0px_#000] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-[#86EFAC] border-b-2 border-black p-4 flex items-center justify-between">
              <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Tambah Blok Pantauan Baru ({companyCode})
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 border-2 border-black rounded-lg bg-white hover:bg-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddBlockSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Wilayah *
                  </label>
                  <input
                    type="number"
                    required
                    value={newWilayah}
                    onChange={(e) => setNewWilayah(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Estate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MER / KEP"
                    value={newEstate}
                    onChange={(e) => setNewEstate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Blok *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="7103"
                    value={newBlock}
                    onChange={(e) => setNewBlock(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Status Tanam
                  </label>
                  <select
                    value={newStatusTanam}
                    onChange={(e) => setNewStatusTanam(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  >
                    <option value="Muda">Muda</option>
                    <option value="Rehab">Rehab</option>
                    <option value="TM">TM</option>
                    <option value="TBM">TBM</option>
                    <option value="Tua">Tua</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    IDL
                  </label>
                  <select
                    value={newIdl}
                    onChange={(e) => setNewIdl(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  >
                    <option value="Sudah">Sudah</option>
                    <option value="Belum">Belum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Tgl Survey
                  </label>
                  <input
                    type="date"
                    value={newTglSurvey}
                    onChange={(e) => setNewTglSurvey(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Station & Device Selection */}
              <div className="p-3 bg-slate-50 border-2 border-black rounded-xl space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-700 block">
                  Penghubung Sensor IoT (Curah Hujan & TMAT)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Stasiun Ombrometer (CH)
                    </label>
                    <select
                      value={newRainStationId}
                      onChange={(e) => setNewRainStationId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold bg-white"
                    >
                      <option value="">-- Tanpa Stasiun Curah Hujan --</option>
                      {Object.entries(groupedStations).map(([estateName, sList]) => (
                        <optgroup key={estateName} label={`ESTATE / WILAYAH: ${estateName}`}>
                          {sList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.stationId} {s.location ? `(${s.location})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Sensor Piezometer (TMAT)
                    </label>
                    <select
                      value={newTmatDeviceId}
                      onChange={(e) => setNewTmatDeviceId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg text-xs font-bold bg-white"
                    >
                      <option value="">-- Tanpa Sensor TMAT --</option>
                      {Object.entries(groupedDevices).map(([estateName, dList]) => (
                        <optgroup key={estateName} label={`ESTATE: ${estateName}`}>
                          {dList.map((d) => (
                            <option key={d.id} value={d.id}>
                              ID: {d.deviceId} | {d.estate}-{d.block} ({d.deviceName.slice(0, 18)}...)
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    PIC *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPic}
                    onChange={(e) => setNewPic(e.target.value)}
                    placeholder="Nama PIC"
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Last Week
                    </label>
                    <input
                      type="text"
                      value={newProgressLast}
                      onChange={(e) => setNewProgressLast(e.target.value)}
                      placeholder="0 / Done"
                      className="w-full px-2 py-1.5 border-2 border-black rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      This Week
                    </label>
                    <input
                      type="text"
                      value={newProgressThis}
                      onChange={(e) => setNewProgressThis(e.target.value)}
                      placeholder="0 / Done"
                      className="w-full px-2 py-1.5 border-2 border-black rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Rekomendasi
                </label>
                <textarea
                  rows={2}
                  value={newRekomendasi}
                  onChange={(e) => setNewRekomendasi(e.target.value)}
                  placeholder="1. Tundung Weir&#10;2. Reverse pumping"
                  className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Target Plan
                </label>
                <textarea
                  rows={2}
                  value={newTargetPlan}
                  onChange={(e) => setNewTargetPlan(e.target.value)}
                  placeholder="1. [Done] W1 Feb 26&#10;2. WIP"
                  className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl font-bold text-xs hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 border-2 border-black rounded-xl bg-[#86EFAC] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-emerald-300 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Tambahkan Blok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Block & Sensors */}
      {editingBlock && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-[3px] border-black rounded-2xl max-w-2xl w-full shadow-[8px_8px_0px_0px_#000] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b-2 border-black bg-[#990000] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-amber-300" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-white">
                    Edit Pengaturan Blok &amp; Sensor IoT
                  </h3>
                  <p className="text-[11px] text-amber-200 font-medium">
                    Blok: {editingBlock.estate} {editingBlock.block} (Wilayah {editingBlock.wilayah})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBlock(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditBlock} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Recalculation notice */}
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Mengubah stasiun curah hujan atau sensor TMAT akan langsung menghitung ulang seluruh nilai telemetri mingguan (W1 s.d {weeks.length > 0 ? `W${weeks[weeks.length - 1].week}` : "akhir"}) di baris ini.
                </span>
              </div>

              {/* Basic Block Info */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Wilayah *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={9}
                    value={editWilayah}
                    onChange={(e) => setEditWilayah(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Estate *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEstate}
                    onChange={(e) => setEditEstate(e.target.value)}
                    placeholder="Contoh: MERANTI"
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Blok *
                  </label>
                  <input
                    type="text"
                    required
                    value={editBlock}
                    onChange={(e) => setEditBlock(e.target.value)}
                    placeholder="Contoh: 7103"
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold uppercase"
                  />
                </div>
              </div>

              {/* Status Tanam, IDL, Survey */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Status Tanam
                  </label>
                  <select
                    value={editStatusTanam}
                    onChange={(e) => setEditStatusTanam(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="Muda">Muda</option>
                    <option value="Rehab">Rehab</option>
                    <option value="TM">TM</option>
                    <option value="TBM">TBM</option>
                    <option value="Tua">Tua</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    IDL
                  </label>
                  <select
                    value={editIdl}
                    onChange={(e) => setEditIdl(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="Sudah">Sudah</option>
                    <option value="Belum">Belum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Tgl Survey
                  </label>
                  <input
                    type="date"
                    value={editTglSurvey}
                    onChange={(e) => setEditTglSurvey(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Station & Device Selection (Grouped by Estate) */}
              <div className="p-3.5 bg-slate-50 border-2 border-black rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <Radio className="h-4 w-4 text-blue-600" />
                    Penghubung Stasiun &amp; Sensor IoT
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    Dikelompokkan per Estate
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Curah Hujan Station */}
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                      <CloudRain className="h-3.5 w-3.5 text-sky-600" />
                      Stasiun Ombrometer (Curah Hujan Mingguan):
                    </label>
                    <select
                      value={editRainStationId}
                      onChange={(e) => setEditRainStationId(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-black"
                    >
                      <option value="">-- Tanpa Stasiun Curah Hujan --</option>
                      {Object.entries(groupedStations).map(([estateName, sList]) => (
                        <optgroup key={estateName} label={`ESTATE / WILAYAH: ${estateName}`}>
                          {sList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.stationId} {s.location ? `(${s.location})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">
                      Data CH mingguan akan otomatis dijumlahkan (sum mm) dari stasiun ini.
                    </p>
                  </div>

                  {/* TMAT Sensor Device */}
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-emerald-600" />
                      Sensor Piezometer (TMAT Tiap Selasa 07:00):
                    </label>
                    <select
                      value={editTmatDeviceId}
                      onChange={(e) => setEditTmatDeviceId(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-black rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-black"
                    >
                      <option value="">-- Tanpa Sensor TMAT --</option>
                      {Object.entries(groupedDevices).map(([estateName, dList]) => (
                        <optgroup key={estateName} label={`ESTATE: ${estateName}`}>
                          {dList.map((d) => (
                            <option key={d.id} value={d.id}>
                              ID: {d.deviceId} | {d.estate}-{d.block} ({d.deviceName})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">
                      Data TMAT akan ditarik dari sensor ini tiap hari Selasa jam 07:00 (atau jam terdekat) dan laju selisih mingguan dihitung otomatis.
                    </p>
                  </div>
                </div>
              </div>

              {/* PIC */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  PIC *
                </label>
                <input
                  type="text"
                  required
                  value={editPic}
                  onChange={(e) => setEditPic(e.target.value)}
                  placeholder="Nama PIC"
                  className="w-full px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBlock(null)}
                  className="px-4 py-2 border-2 border-black rounded-xl font-bold text-xs hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBlock}
                  className="px-5 py-2 border-2 border-black rounded-xl bg-[#FFE600] text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-300 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdatingBlock ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Menghitung Ulang...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Simpan &amp; Hitung Ulang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
