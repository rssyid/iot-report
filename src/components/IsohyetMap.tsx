"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import {
  Layers,
  MapPin,
  Eye,
  EyeOff,
  Maximize2,
  RefreshCw,
  Info,
  Compass,
} from "lucide-react";

import {
  MapStation,
  BMKG_LEVELS,
  getBmkgCategory,
} from "@/lib/isohyet";

export type { MapStation };
export { BMKG_LEVELS, getBmkgCategory };

type IsohyetMapProps = {
  stations: MapStation[];
  boundaryGeojson: any | null;
  companyCode: string;
  companyName: string;
  selectedDate: string;
  basemap: "osm" | "satellite" | "positron";
  showStations: boolean;
  showIsohyet: boolean;
  showBoundary: boolean;
};

export default function IsohyetMap({
  stations,
  boundaryGeojson,
  companyCode,
  companyName,
  selectedDate,
  basemap,
  showStations,
  showIsohyet,
  showBoundary,
}: IsohyetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const isohyetLayerRef = useRef<L.GeoJSON | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);

  const [isComputingIsohyet, setIsComputingIsohyet] = useState(false);
  const [isohyetStats, setIsohyetStats] = useState<{
    bandsCount: number;
    interpolatedPoints: number;
  } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-0.2, 109.7],
        zoom: 11,
        zoomControl: false,
      });

      // Position Zoom Control at top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Attribution control Neobrutalism
      map.attributionControl.setPosition("bottomleft");

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    if (basemap === "satellite") {
      tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      attribution = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
    } else if (basemap === "positron") {
      tileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      attribution = '&copy; <a href="https://carto.com/">CARTO</a>';
    }

    const newTile = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution,
    }).addTo(map);

    tileLayerRef.current = newTile;
  }, [basemap]);

  // Update Boundary and Isohyet Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing layers
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }
    if (isohyetLayerRef.current) {
      map.removeLayer(isohyetLayerRef.current);
      isohyetLayerRef.current = null;
    }

    let boundaryPoly: any = null;
    let boundsToFit: L.LatLngBounds | null = null;

    // 1. Process Boundary GeoJSON
    if (boundaryGeojson) {
      try {
        // Extract polygon / multipolygon feature
        if (boundaryGeojson.type === "FeatureCollection" && boundaryGeojson.features.length > 0) {
          const polys = boundaryGeojson.features.filter(
            (f: any) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
          );
          if (polys.length === 1) {
            boundaryPoly = polys[0];
          } else if (polys.length > 1) {
            boundaryPoly = turf.union(turf.featureCollection(polys)) as any;
          }
        } else if (boundaryGeojson.type === "Feature") {
          boundaryPoly = boundaryGeojson;
        } else if (boundaryGeojson.type === "Polygon" || boundaryGeojson.type === "MultiPolygon") {
          boundaryPoly = turf.feature(boundaryGeojson);
        }

        if (showBoundary) {
          const boundaryLayer = L.geoJSON(boundaryGeojson, {
            style: {
              color: "#000000",
              weight: 3.5,
              dashArray: "6, 6",
              fillColor: "transparent",
              fillOpacity: 0,
            },
          }).addTo(map);

          boundaryLayer.bindTooltip(`Batas Wilayah: ${companyCode}`, {
            sticky: true,
            className: "neobrutalism-tooltip",
          });

          boundaryLayerRef.current = boundaryLayer;
          boundsToFit = boundaryLayer.getBounds();
        }
      } catch (err) {
        console.error("Error rendering boundary geojson:", err);
      }
    }

    // 2. Compute Isohyet Contours (Turf.js IDW & Isobands)
    const validStations = stations.filter(
      (s) => s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)
    );

    if (showIsohyet && validStations.length > 0) {
      setIsComputingIsohyet(true);
      try {
        // Determine area Bounding Box: either from boundary or stations
        let bbox: any;
        if (boundaryPoly) {
          bbox = turf.bbox(boundaryPoly);
        } else {
          const pointsFC = turf.featureCollection(
            validStations.map((s) => turf.point([s.longitude, s.latitude]))
          );
          bbox = turf.bbox(pointsFC);
          // Expand bbox slightly if single or close points
          const pad = 0.05;
          bbox = [bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad];
        }

        // Generate IDW Grid points over bbox
        // Calculate cell side based on bbox span to balance performance and smoothness
        const lngSpan = Math.abs(bbox[2] - bbox[0]);
        const latSpan = Math.abs(bbox[3] - bbox[1]);
        const maxSpanKm = Math.max(lngSpan, latSpan) * 111;
        const cellSizeKm = Math.max(0.5, Math.min(2.5, maxSpanKm / 45)); // ~30-50 cells per axis

        const pointGrid = turf.pointGrid(bbox, cellSizeKm, { units: "kilometers" });

        // Calculate Inverse Distance Weighting (IDW) for each grid point
        for (const pt of pointGrid.features) {
          const [lng, lat] = pt.geometry.coordinates;
          let num = 0;
          let den = 0;

          for (const st of validStations) {
            const distKm = turf.distance([lng, lat], [st.longitude, st.latitude], {
              units: "kilometers",
            });
            if (distKm < 0.05) {
              num = st.rainfallMm;
              den = 1;
              break;
            }
            const weight = 1 / Math.pow(distKm, 2);
            num += weight * st.rainfallMm;
            den += weight;
          }

          pt.properties = { rainfallMm: den > 0 ? num / den : 0 };
        }

        // Compute Isobands using BMKG standard thresholds
        const breaks = [0, 0.5, 20, 50, 100, 150, 300];
        const isobandsFC = turf.isobands(pointGrid, breaks, { zProperty: "rainfallMm" });

        // Clip Isobands to Boundary if boundary polygon exists
        const processedFeatures: any[] = [];
        for (const band of isobandsFC.features) {
          if (boundaryPoly) {
            try {
              const clipped = turf.intersect(turf.featureCollection([band as any, boundaryPoly]));
              if (clipped) {
                clipped.properties = band.properties;
                processedFeatures.push(clipped);
              }
            } catch {
              // If intersection fails due to topology, fallback to unclipped
              processedFeatures.push(band);
            }
          } else {
            processedFeatures.push(band);
          }
        }

        const finalGeojson = turf.featureCollection(processedFeatures);

        // Render Isoband Polygons on Leaflet
        const isohyetLayer = L.geoJSON(finalGeojson as any, {
          style: (feature) => {
            const zVal = feature?.properties?.rainfallMm ?? "";
            // turf.isobands stores interval as string e.g. "20-50" or "0.5-20"
            let low = 0;
            if (typeof zVal === "string" && zVal.includes("-")) {
              low = parseFloat(zVal.split("-")[0]);
            } else if (typeof zVal === "number") {
              low = zVal;
            }

            const cat = getBmkgCategory(low);
            return {
              fillColor: cat.color,
              fillOpacity: low < 0.5 ? 0.2 : 0.65,
              color: "#000000",
              weight: 1.5,
              opacity: 0.6,
            };
          },
          onEachFeature: (feature, layer) => {
            const zVal = feature.properties?.rainfallMm || "";
            let low = 0;
            if (typeof zVal === "string" && zVal.includes("-")) {
              low = parseFloat(zVal.split("-")[0]);
            }
            const cat = getBmkgCategory(low);
            layer.bindTooltip(
              `<strong>Isohyet:</strong> ${zVal} mm<br><span style="font-size:11px;">Kategori: ${cat.desc}</span>`,
              { sticky: true, className: "neobrutalism-tooltip" }
            );
          },
        }).addTo(map);

        isohyetLayerRef.current = isohyetLayer;
        setIsohyetStats({
          bandsCount: processedFeatures.length,
          interpolatedPoints: pointGrid.features.length,
        });

        if (!boundsToFit && isohyetLayer.getBounds().isValid()) {
          boundsToFit = isohyetLayer.getBounds();
        }
      } catch (err) {
        console.error("Error computing isohyet interpolation:", err);
      } finally {
        setIsComputingIsohyet(false);
      }
    }

    // Fit Map view to layers
    if (boundsToFit && boundsToFit.isValid()) {
      map.fitBounds(boundsToFit, { padding: [35, 35], maxZoom: 14 });
    } else if (validStations.length > 0) {
      const latLngs = validStations.map((s) => L.latLng(s.latitude, s.longitude));
      const groupBounds = L.latLngBounds(latLngs);
      if (groupBounds.isValid()) {
        map.fitBounds(groupBounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [stations, boundaryGeojson, showIsohyet, showBoundary, companyCode]);

  // Update Station Markers Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (stationsLayerRef.current) {
      map.removeLayer(stationsLayerRef.current);
      stationsLayerRef.current = null;
    }

    if (!showStations) return;

    const markersGroup = L.layerGroup();
    const validStations = stations.filter(
      (s) => s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)
    );

    validStations.forEach((st) => {
      const cat = getBmkgCategory(st.rainfallMm);
      const isDry = st.rainfallMm === 0;

      // Custom Neobrutalism DivIcon Marker
      const markerHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-black font-black text-[11px] shadow-[3px_3px_0px_0px_#000] hover:scale-110 transition duration-150"
               style="background-color: ${cat.color}; color: ${cat.text};">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>${st.rainfallMm.toFixed(1)} mm</span>
          </div>
          <div class="w-1.5 h-2 bg-black"></div>
          <div class="w-2.5 h-1 bg-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)]"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-station-icon",
        html: markerHtml,
        iconSize: [80, 40],
        iconAnchor: [40, 36],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([st.latitude, st.longitude], { icon: customIcon });

      // Popup Neobrutalism
      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; color: #000; min-width: 200px; padding: 2px;">
          <div style="font-weight: 900; text-transform: uppercase; font-size: 13px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span>${st.stationId}</span>
            <span style="background: ${cat.color}; color: ${cat.text}; padding: 1px 6px; border: 1.5px solid #000; border-radius: 4px; font-size: 10px;">${st.rainfallMm.toFixed(1)} mm</span>
          </div>
          <div style="margin-bottom: 4px;"><strong>Estate:</strong> ${st.estComplete} ${st.estAlias ? `(${st.estAlias})` : ""}</div>
          <div style="margin-bottom: 4px;"><strong>Kategori:</strong> ${cat.desc}</div>
          ${st.location ? `<div style="margin-bottom: 4px;"><strong>Lokasi:</strong> ${st.location}</div>` : ""}
          <div style="margin-bottom: 4px; font-size: 11px; color: #475569;"><strong>Koordinat:</strong> ${st.latitude.toFixed(6)}, ${st.longitude.toFixed(6)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">Tanggal: ${selectedDate}</div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "neobrutalism-popup" });
      markersGroup.addLayer(marker);
    });

    markersGroup.addTo(map);
    stationsLayerRef.current = markersGroup;
  }, [stations, showStations, selectedDate]);

  const handleResetZoom = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (boundaryLayerRef.current && boundaryLayerRef.current.getBounds().isValid()) {
      map.fitBounds(boundaryLayerRef.current.getBounds(), { padding: [35, 35] });
    } else if (stationsLayerRef.current) {
      const validStations = stations.filter((s) => s.latitude && s.longitude);
      if (validStations.length > 0) {
        const bounds = L.latLngBounds(validStations.map((s) => L.latLng(s.latitude, s.longitude)));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-xl border-[3px] border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden bg-slate-100">
      {/* Map Target Div */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Status & Calculation Loader */}
      {isComputingIsohyet && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#FFE600] border-2 border-black px-3.5 py-1.5 rounded-lg shadow-[3px_3px_0px_0px_#000] text-xs font-black uppercase text-black">
          <RefreshCw className="h-4 w-4 animate-spin text-black" />
          Menghitung Interpolasi Isohyet (IDW)...
        </div>
      )}

      {/* Floating Quick Map Controls (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleResetZoom}
          title="Fokuskan Peta ke Wilayah Kebun"
          className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5 rounded-lg shadow-[3px_3px_0px_0px_#000] text-xs font-black uppercase text-black hover:bg-[#FFE600] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
        >
          <Compass className="h-3.5 w-3.5" />
          Fokus Wilayah
        </button>
      </div>

      {/* Floating Neobrutalism BMKG Isohyet Legend (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 w-64 bg-[#FFFDF5] border-2 border-black rounded-xl p-3.5 shadow-[4px_4px_0px_0px_#000] space-y-2 text-xs">
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <span className="font-black uppercase tracking-tight text-black flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Legenda Curah Hujan (BMKG)
          </span>
        </div>

        <div className="space-y-1.5">
          {BMKG_LEVELS.map((lvl, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded border border-black shrink-0 shadow-[1px_1px_0px_0px_#000]"
                  style={{ backgroundColor: lvl.color }}
                />
                <span className="text-black font-black">{lvl.label}</span>
              </div>
              <span className="text-[10px] text-slate-600 font-bold">{lvl.desc}</span>
            </div>
          ))}
        </div>

        {boundaryGeojson && (
          <div className="pt-2 border-t border-slate-300 flex items-center gap-2 text-[10px] font-bold text-slate-700">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-black"></span>
            <span>Batas Wilayah Perusahaan</span>
          </div>
        )}
      </div>

      {/* CSS overrides for Leaflet Popups and Tooltips in Neobrutalism theme */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: #fffdf5 !important;
          border: 3px solid #000 !important;
          border-radius: 12px !important;
          box-shadow: 4px 4px 0px 0px #000 !important;
          padding: 8px !important;
        }
        .leaflet-popup-tip {
          background: #000 !important;
        }
        .neobrutalism-tooltip {
          background: #fffdf5 !important;
          border: 2px solid #000 !important;
          border-radius: 8px !important;
          box-shadow: 2px 2px 0px 0px #000 !important;
          color: #000 !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          padding: 4px 8px !important;
        }
        .leaflet-control-zoom a {
          background-color: #fffdf5 !important;
          color: #000 !important;
          border: 2px solid #000 !important;
          border-radius: 8px !important;
          box-shadow: 2px 2px 0px 0px #000 !important;
          font-weight: 900 !important;
          margin-bottom: 4px !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #ffe600 !important;
        }
      `}</style>
    </div>
  );
}
