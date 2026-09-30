export type MapStation = {
  stationId: string;
  companyCode: string;
  estComplete: string;
  estAlias?: string | null;
  location?: string | null;
  latitude: number;
  longitude: number;
  rainfallMm: number;
};

// BMKG Rainfall Classification & Color Mapping
export const BMKG_LEVELS = [
  { min: 0, max: 0.5, label: "Berawan / 0 mm", color: "#E2E8F0", text: "#475569", desc: "Tidak Ada Hujan" },
  { min: 0.5, max: 20, label: "0.5 – 20 mm", color: "#22C55E", text: "#000000", desc: "Hujan Ringan" },
  { min: 20, max: 50, label: "20 – 50 mm", color: "#FACC15", text: "#000000", desc: "Hujan Sedang" },
  { min: 50, max: 100, label: "50 – 100 mm", color: "#FB923C", text: "#000000", desc: "Hujan Lebat" },
  { min: 100, max: 150, label: "100 – 150 mm", color: "#EF4444", text: "#FFFFFF", desc: "Hujan Sangat Lebat" },
  { min: 150, max: 9999, label: "> 150 mm", color: "#A855F7", text: "#FFFFFF", desc: "Hujan Ekstrem" },
];

export function getBmkgCategory(rainfallMm: number) {
  if (rainfallMm < 0.5) return BMKG_LEVELS[0];
  if (rainfallMm < 20) return BMKG_LEVELS[1];
  if (rainfallMm < 50) return BMKG_LEVELS[2];
  if (rainfallMm < 100) return BMKG_LEVELS[3];
  if (rainfallMm < 150) return BMKG_LEVELS[4];
  return BMKG_LEVELS[5];
}
