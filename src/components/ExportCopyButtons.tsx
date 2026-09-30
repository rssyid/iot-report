"use client";

import React, { useState } from "react";
import { Copy, Download, Check, RefreshCw } from "lucide-react";

type ExportCopyButtonsProps = {
  onExportExcel: () => Promise<void> | void;
  onCopyTable: () => Promise<boolean> | boolean;
  disabled?: boolean;
};

export default function ExportCopyButtons({
  onExportExcel,
  onCopyTable,
  disabled = false,
}: ExportCopyButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (disabled || isCopied) return;
    const success = await onCopyTable();
    if (success) {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const handleExport = async () => {
    if (disabled || isExporting) return;
    try {
      setIsExporting(true);
      await onExportExcel();
    } catch (err) {
      console.error("Export Excel error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black uppercase transition shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${
          isCopied
            ? "bg-[#86EFAC] text-black"
            : "bg-white text-black hover:bg-slate-100"
        }`}
        title="Salin tabel ke clipboard (bisa langsung Ctrl+V di Excel)"
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 stroke-[3] text-black" />
            <span>Tersalin!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-black" />
            <span>Copy Tabel</span>
          </>
        )}
      </button>

      {/* Export Excel Button */}
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || isExporting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black bg-[#00E599] text-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50 disabled:cursor-not-allowed"
        title="Unduh file Microsoft Excel (.xlsx) dengan format rapi"
      >
        {isExporting ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        <span>{isExporting ? "Mengunduh..." : "Export Excel"}</span>
      </button>
    </div>
  );
}
