"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";

type PlaceholderPageProps = {
  category: string;
  title: string;
  description: string;
  badgeColor?: string;
};

export default function PlaceholderPage({
  category,
  title,
  description,
  badgeColor = "#FFE600",
}: PlaceholderPageProps) {
  return (
    <div className="max-w-4xl mx-auto pt-10 pb-16 px-4">
      <div className="rounded-2xl bg-[#FFFDF5] border-[3px] border-black p-8 sm:p-12 shadow-[8px_8px_0px_0px_#000] text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000]" style={{ backgroundColor: badgeColor }}>
          <Sparkles className="h-4 w-4" />
          {category}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
            {title}
          </h1>
          <p className="text-sm sm:text-base font-bold text-slate-700 max-w-md mx-auto">
            {description}
          </p>
        </div>

        <div className="py-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FFE600] border-[3px] border-black shadow-[5px_5px_0px_0px_#000] animate-bounce">
            <Construction className="h-10 w-10 text-black stroke-[2.5]" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-black bg-white p-4 max-w-md mx-auto shadow-[3px_3px_0px_0px_#000] text-xs font-bold text-slate-800">
          <span className="font-black uppercase text-black">Status:</span> Modul ini disiapkan untuk fase integrasi berikutnya dan saat ini belum memiliki data aktif.
        </div>

        <div className="pt-2">
          <Link
            href="/rainfall/data"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00E599] border-2 border-black px-6 py-3 text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            Kembali ke Rainfall Data
          </Link>
        </div>
      </div>
    </div>
  );
}
