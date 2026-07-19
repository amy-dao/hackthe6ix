export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/** Free-text place search via OpenStreetMap's Nominatim — pairs with the OSM tiles already used for the map. */
export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Location search failed.');

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), displayName: d.display_name }));
}
