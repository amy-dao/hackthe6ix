import type { LngLat } from '../types';
import { polygonCenter } from './geo';

export interface FarmLocation {
  latitude: number;
  longitude: number;
}

/** Prefer farm polygon centroid; fall back to subplot average if needed. */
export function farmLocationFromGeometry(
  farmPolygon: LngLat[] | null,
  subplotCoords?: LngLat[][],
): FarmLocation | null {
  if (farmPolygon && farmPolygon.length >= 3) {
    const [lat, lng] = polygonCenter(farmPolygon);
    return { latitude: lat, longitude: lng };
  }
  const all = (subplotCoords ?? []).flat();
  if (all.length === 0) return null;
  const [lat, lng] = polygonCenter(all);
  return { latitude: lat, longitude: lng };
}
