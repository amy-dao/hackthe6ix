import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FarmState, LngLat, Subplot } from '../../types';
import { polygonCenter, toLatLng } from '../../lib/geo';

interface MainFieldMapProps {
  farm: FarmState;
  height?: number | string;
}

function FitFarm({ coords, subplots }: { coords: LngLat[]; subplots: Subplot[] }) {
  const map = useMap();

  useEffect(() => {
    const all = [...coords, ...subplots.flatMap((s) => s.coordinates)];
    if (all.length < 2) return;
    const bounds = L.latLngBounds(toLatLng(all));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }, [coords, subplots, map]);

  return null;
}

export default function MainFieldMap({ farm, height = '100%' }: MainFieldMapProps) {
  const center = useMemo(() => {
    if (farm.farmPolygon?.length) return polygonCenter(farm.farmPolygon);
    return [41.5868, -93.625] as [number, number];
  }, [farm.farmPolygon]);

  if (!farm.farmPolygon || farm.farmPolygon.length < 3) {
    return (
      <div
        style={{
          height,
          minHeight: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#2E4A38,#173026)',
          borderRadius: 16,
          color: 'rgba(245,243,236,0.75)',
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        No farm boundary yet
      </div>
    );
  }

  return (
    <div style={{ height, minHeight: 240, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitFarm coords={farm.farmPolygon} subplots={farm.subplots} />
        <Polygon
          positions={toLatLng(farm.farmPolygon)}
          pathOptions={{
            color: '#0F2D26',
            weight: 3,
            fillColor: '#0F2D26',
            fillOpacity: 0.1,
          }}
        />
        {farm.subplots.map((sp) => (
          <Polygon
            key={sp.id}
            positions={toLatLng(sp.coordinates)}
            pathOptions={{
              color: sp.color,
              weight: 2,
              fillColor: sp.color,
              fillOpacity: 0.4,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
