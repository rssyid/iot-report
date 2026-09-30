"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
};

type SearchableSelectProps = {
  label: string;
  icon?: React.ElementType;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allOptionLabel?: string;
};

export default function SearchableSelect({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  allOptionLabel = "Semua",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === "ALL") return null;
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Label */}
      <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </span>
        {value !== "ALL" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("ALL");
            }}
            className="text-[10px] font-bold text-slate-500 hover:text-black underline"
          >
            Reset
          </button>
        )}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between gap-2 transition hover:bg-slate-50 focus:outline-none focus:bg-[#FFF385] text-left ${
          isOpen ? "ring-2 ring-black bg-[#FFF385]" : ""
        }`}
      >
        <span className="truncate">
          {value === "ALL" ? (
            <span className="text-slate-700">{allOptionLabel}</span>
          ) : selectedOption ? (
            <span>
              {selectedOption.badge && (
                <span className="mr-1.5 px-1.5 py-0.5 rounded border border-black bg-[#93C5FD] text-[10px] font-black">
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.label}
              {selectedOption.subLabel && (
                <span className="text-slate-500 text-[11px] ml-1 font-medium">
                  - {selectedOption.subLabel}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 stroke-[2.5] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border-[3px] border-black bg-[#FFFDF5] shadow-[6px_6px_0px_0px_#000] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Header */}
          <div className="p-2 border-b-2 border-black bg-[#F4F0EA]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-black/60" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className="w-full rounded-md border-2 border-black bg-white pl-8 pr-7 py-1.5 text-xs font-bold text-black placeholder-slate-400 shadow-[2px_2px_0px_0px_#000] focus:outline-none focus:bg-[#FFF385]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {/* All option */}
            {!search && (
              <button
                type="button"
                onClick={() => handleSelect("ALL")}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition text-left ${
                  value === "ALL"
                    ? "bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                    : "hover:bg-[#FFF385]/60"
                }`}
              >
                <span>{allOptionLabel}</span>
                {value === "ALL" && <Check className="h-4 w-4 stroke-[3]" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs font-bold text-slate-400">
                Tidak ada hasil yang cocok dengan &quot;{search}&quot;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition text-left border ${
                      isSelected
                        ? "bg-[#FFE600] border-black shadow-[2px_2px_0px_0px_#000] font-black"
                        : "border-transparent hover:border-black/50 hover:bg-[#FFF385]/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {opt.badge && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded border border-black bg-[#93C5FD] text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                          {opt.badge}
                        </span>
                      )}
                      <span className="truncate">
                        <span className="font-black">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-slate-600 font-medium ml-1.5">
                            ({opt.subLabel})
                          </span>
                        )}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 stroke-[3] text-black" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
