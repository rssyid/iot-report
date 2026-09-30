/**
 * Utility functions for validating, sanitizing, and reprojecting GeoJSON files.
 * Handles automatic EPSG:3857 (Web Mercator in meters) to EPSG:4326 (WGS84 in degrees) conversion.
 */

export function mercatorToWgs84(x: number, y: number): [number, number] {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [Number(lng.toFixed(7)), Number(lat.toFixed(7))];
}

export function hasMercatorCoordinates(coords: any): boolean {
  if (!Array.isArray(coords) || coords.length === 0) return false;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    return Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90;
  }
  return hasMercatorCoordinates(coords[0]);
}

export function transformCoordinates(coords: any): any {
  if (!Array.isArray(coords) || coords.length === 0) return coords;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    // If coordinate values are in meters (> 180 or > 90), convert from Web Mercator to WGS84
    if (Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) {
      return mercatorToWgs84(coords[0], coords[1]);
    }
    return [Number(coords[0].toFixed(7)), Number(coords[1].toFixed(7))];
  }
  return coords.map((sub) => transformCoordinates(sub));
}

export type SanitizeResult = {
  geojson: any;
  isReprojected: boolean;
  featureCount: number;
  geometryTypes: string[];
  sampleCoordinate: [number, number] | null;
};

export function sanitizeAndValidateGeoJson(input: any): SanitizeResult {
  let data = input;
  if (typeof input === "string") {
    data = JSON.parse(input);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Data GeoJSON bukan objek yang valid");
  }

  let isReprojected = false;
  const geomTypes = new Set<string>();
  let sampleCoordinate: [number, number] | null = null;

  // Check CRS declaration
  const crsName = data.crs?.properties?.name || "";
  const isDeclared3857 = crsName.includes("3857") || crsName.includes("900913");

  function processGeometry(geom: any): any {
    if (!geom || !geom.type || !geom.coordinates) return null;
    geomTypes.add(geom.type);

    const needsConversion = isDeclared3857 || hasMercatorCoordinates(geom.coordinates);
    if (needsConversion) {
      isReprojected = true;
      geom.coordinates = transformCoordinates(geom.coordinates);
    }

    if (!sampleCoordinate) {
      let curr = geom.coordinates;
      while (Array.isArray(curr) && curr.length > 0 && Array.isArray(curr[0])) {
        curr = curr[0];
      }
      if (Array.isArray(curr) && typeof curr[0] === "number" && typeof curr[1] === "number") {
        sampleCoordinate = [curr[0], curr[1]];
      }
    }

    return geom;
  }

  let finalFeatures: any[] = [];

  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    for (const f of data.features) {
      if (f && f.geometry) {
        const cleanGeom = processGeometry(f.geometry);
        if (cleanGeom) {
          finalFeatures.push({
            ...f,
            geometry: cleanGeom,
          });
        }
      }
    }
    data.features = finalFeatures;
  } else if (data.type === "Feature") {
    if (data.geometry) {
      data.geometry = processGeometry(data.geometry);
    }
    finalFeatures = [data];
  } else if (data.type === "Polygon" || data.type === "MultiPolygon") {
    const cleanGeom = processGeometry(data);
    data = {
      type: "Feature",
      properties: {},
      geometry: cleanGeom,
    };
    finalFeatures = [data];
  } else {
    throw new Error(`Tipe GeoJSON '${data.type}' tidak didukung sebagai poligon batas`);
  }

  // Remove old CRS to conform to RFC 7946 (WGS84 standard)
  if (data.crs) {
    delete data.crs;
  }

  return {
    geojson: data,
    isReprojected,
    featureCount: finalFeatures.length,
    geometryTypes: Array.from(geomTypes),
    sampleCoordinate,
  };
}
