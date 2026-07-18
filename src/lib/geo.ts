import {
  area,
  booleanContains,
  booleanOverlap,
  booleanPointInPolygon,
  distance,
  polygon as turfPolygon,
  point as turfPoint,
  lineString,
} from '@turf/turf';
import type { Position } from 'geojson';

/** [lng, lat] pairs — Leaflet uses [lat, lng], so convert at the boundary. */
export type LngLat = [number, number];
export type LatLng = [number, number];

const CLOSE_THRESHOLD_METERS = 25;

export function toLatLng(coords: LngLat[]): LatLng[] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

export function toLngLat(latLngs: LatLng[]): LngLat[] {
  return latLngs.map(([lat, lng]) => [lng, lat]);
}

export function ringClosed(coords: LngLat[]): Position[] {
  if (coords.length === 0) return [];
  const ring: Position[] = coords.map(([lng, lat]) => [lng, lat]);
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) ring.push([fx, fy]);
  return ring;
}

export function makePolygon(coords: LngLat[]) {
  return turfPolygon([ringClosed(coords)]);
}

/** Area in acres (1 m² = 0.000247105 acres). */
export function areaAcres(coords: LngLat[]): number {
  if (coords.length < 3) return 0;
  try {
    const m2 = area(makePolygon(coords));
    return Math.round(m2 * 0.000247105 * 100) / 100;
  } catch {
    return 0;
  }
}

export function isNearStart(draft: LngLat[], candidate: LngLat): boolean {
  if (draft.length < 3) return false;
  const meters = distance(turfPoint(draft[0]), turfPoint(candidate), { units: 'meters' });
  return meters <= CLOSE_THRESHOLD_METERS;
}

export function isPointInside(coords: LngLat[], pt: LngLat): boolean {
  if (coords.length < 3) return false;
  try {
    return booleanPointInPolygon(turfPoint(pt), makePolygon(coords));
  } catch {
    return false;
  }
}

/** True if every vertex and the polygon itself sit inside the outer ring. */
export function isFullyContained(outer: LngLat[], inner: LngLat[]): boolean {
  if (outer.length < 3 || inner.length < 3) return false;
  try {
    const outerPoly = makePolygon(outer);
    const innerPoly = makePolygon(inner);
    if (!inner.every((pt) => booleanPointInPolygon(turfPoint(pt), outerPoly))) return false;
    return booleanContains(outerPoly, innerPoly);
  } catch {
    return false;
  }
}

export function polygonsOverlap(a: LngLat[], b: LngLat[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  try {
    const pa = makePolygon(a);
    const pb = makePolygon(b);
    if (booleanOverlap(pa, pb)) return true;
    if (booleanContains(pa, pb) || booleanContains(pb, pa)) return true;
    const mid = a[Math.floor(a.length / 2)];
    return booleanPointInPolygon(turfPoint(mid), pb);
  } catch {
    return false;
  }
}

export function polygonCenter(coords: LngLat[]): LatLng {
  if (!coords.length) return [41.5868, -93.625];
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}

export function segmentPreviewFeature(draft: LngLat[], cursor: LngLat | null) {
  const pts = cursor && draft.length ? [...draft, cursor] : draft;
  if (pts.length < 2) return null;
  return lineString(pts);
}
