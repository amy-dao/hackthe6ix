import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LngLat } from '../../types';
import { polygonCenter, toLatLng } from '../../lib/geo';

interface SubplotMiniMapProps {
  coordinates: LngLat[];
  color: string;
  /** Optional outer farm boundary shown faintly for context. */
  farmPolygon?: LngLat[] | null;
}

function FitPoly({ coords }: { coords: LngLat[] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length < 2) return;
    map.fitBounds(L.latLngBounds(toLatLng(coords)), { padding: [12, 12], maxZoom: 18 });
  }, [coords, map]);
  return null;
}

export default function SubplotMiniMap({ coordinates, color, farmPolygon }: SubplotMiniMapProps) {
  if (coordinates.length < 3) {
    return <div style={{ width: '100%', height: '100%', background: '#D8E2D4' }} />;
  }

  const center = polygonCenter(coordinates);

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
      touchZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitPoly coords={coordinates} />
      {farmPolygon && farmPolygon.length >= 3 && (
        <Polygon
          positions={toLatLng(farmPolygon)}
          pathOptions={{ color: '#0F2D26', weight: 1, fillOpacity: 0.04, opacity: 0.35 }}
        />
      )}
      <Polygon
        positions={toLatLng(coordinates)}
        pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.5 }}
      />
    </MapContainer>
  );
}
