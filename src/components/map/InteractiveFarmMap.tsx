import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { Palette } from '../../palette';
import type { DrawMode, FarmState, LngLat, Subplot } from '../../types';
import {
  areaAcres,
  isFullyContained,
  isNearStart,
  isPointInside,
  polygonCenter,
  polygonsOverlap,
  toLatLng,
} from '../../lib/geo';
import { emptySubplotData, nextSubplotColor } from '../../lib/farmConstants';
import LocationSearchBar from './LocationSearchBar';

interface InteractiveFarmMapProps {
  palette: Palette;
  farm: FarmState;
  drawMode: DrawMode;
  selectedSubplotId: string | null;
  onFarmComplete: (coords: LngLat[], acres: number) => void;
  onSubplotComplete: (subplot: Subplot) => void;
  onSelectSubplot: (id: string | null) => void;
  onDraftAreaChange: (acres: number) => void;
  onDrawError: (message: string | null) => void;
}

function FitBounds({ coords }: { coords: LngLat[] | null }) {
  const map = useMap();
  const keyRef = useRef<string>('');

  useEffect(() => {
    if (!coords || coords.length < 3) return;
    const key = coords.map((c) => c.join(',')).join('|');
    if (key === keyRef.current) return;
    keyRef.current = key;
    const latLngs = toLatLng(coords);
    map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });
  }, [coords, map]);

  return null;
}

interface FlyToTarget {
  lat: number;
  lng: number;
  token: number;
}

function FlyToSearchResult({ target }: { target: FlyToTarget | null }) {
  const map = useMap();
  const tokenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target || target.token === tokenRef.current) return;
    tokenRef.current = target.token;
    map.flyTo([target.lat, target.lng], 14);
  }, [target, map]);

  return null;
}

function DrawingController({
  drawMode,
  farmPolygon,
  subplots,
  draft,
  setDraft,
  cursor,
  setCursor,
  onFarmComplete,
  onSubplotComplete,
  onDraftAreaChange,
  onDrawError,
  onSelectSubplot,
}: {
  drawMode: DrawMode;
  farmPolygon: LngLat[] | null;
  subplots: Subplot[];
  draft: LngLat[];
  setDraft: (pts: LngLat[]) => void;
  cursor: LngLat | null;
  setCursor: (pt: LngLat | null) => void;
  onFarmComplete: (coords: LngLat[], acres: number) => void;
  onSubplotComplete: (subplot: Subplot) => void;
  onDraftAreaChange: (acres: number) => void;
  onDrawError: (message: string | null) => void;
  onSelectSubplot: (id: string | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const drawing = drawMode === 'farm' || drawMode === 'subplot';
    map.dragging.enable();
    if (drawing) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [drawMode, map]);

  useEffect(() => {
    const preview = cursor && draft.length ? [...draft, cursor] : draft;
    onDraftAreaChange(preview.length >= 3 ? areaAcres(preview) : 0);
  }, [draft, cursor, onDraftAreaChange]);

  useMapEvents({
    click(e) {
      if (drawMode !== 'farm' && drawMode !== 'subplot') return;

      const pt: LngLat = [e.latlng.lng, e.latlng.lat];

      if (drawMode === 'subplot') {
        if (!farmPolygon) {
          onDrawError('Draw the farm boundary first.');
          return;
        }
        if (!isPointInside(farmPolygon, pt) && !(draft.length >= 3 && isNearStart(draft, pt))) {
          onDrawError('Subplots must stay inside the farm boundary.');
          return;
        }
      }

      onDrawError(null);

      if (draft.length >= 3 && isNearStart(draft, pt)) {
        finishPolygon(draft);
        return;
      }

      setDraft([...draft, pt]);
    },
    mousemove(e) {
      if (drawMode !== 'farm' && drawMode !== 'subplot') {
        setCursor(null);
        return;
      }
      setCursor([e.latlng.lng, e.latlng.lat]);
    },
    dblclick(e) {
      if (drawMode !== 'farm' && drawMode !== 'subplot') return;
      L.DomEvent.stop(e);
      if (draft.length >= 3) finishPolygon(draft);
    },
  });

  function finishPolygon(coords: LngLat[]) {
    if (coords.length < 3) {
      onDrawError('Need at least 3 points to close a polygon.');
      return;
    }

    if (drawMode === 'farm') {
      const acres = areaAcres(coords);
      onFarmComplete(coords, acres);
      setDraft([]);
      setCursor(null);
      onDrawError(null);
      return;
    }

    if (!farmPolygon) {
      onDrawError('Draw the farm boundary first.');
      return;
    }

    if (!isFullyContained(farmPolygon, coords)) {
      onDrawError('Field must be fully inside the farm boundary.');
      setDraft([]);
      setCursor(null);
      return;
    }

    for (const existing of subplots) {
      if (polygonsOverlap(existing.coordinates, coords)) {
        onDrawError('Fields cannot overlap each other.');
        setDraft([]);
        setCursor(null);
        return;
      }
    }

    const acres = areaAcres(coords);
    const subplot: Subplot = {
      id: `subplot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      coordinates: coords,
      areaAcres: acres,
      color: nextSubplotColor(subplots.length),
      data: emptySubplotData(`Field ${subplots.length + 1}`),
    };
    onSubplotComplete(subplot);
    setDraft([]);
    setCursor(null);
    onDrawError(null);
    onSelectSubplot(subplot.id);
  }

  return null;
}

export default function InteractiveFarmMap({
  palette,
  farm,
  drawMode,
  selectedSubplotId,
  onFarmComplete,
  onSubplotComplete,
  onSelectSubplot,
  onDraftAreaChange,
  onDrawError,
}: InteractiveFarmMapProps) {
  const [draft, setDraft] = useState<LngLat[]>([]);
  const [cursor, setCursor] = useState<LngLat | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTarget, setSearchTarget] = useState<FlyToTarget | null>(null);

  // Clear the in-progress draft when drawMode changes away from a drawing
  // mode. Adjusted during render (not in an effect) per React's guidance for
  // reacting to prop changes — avoids an extra cascading render.
  const [prevDrawMode, setPrevDrawMode] = useState(drawMode);
  if (drawMode !== prevDrawMode) {
    setPrevDrawMode(drawMode);
    if (drawMode !== 'farm' && drawMode !== 'subplot') {
      setDraft([]);
      setCursor(null);
    }
  }

  const center = useMemo(() => {
    if (farm.farmPolygon?.length) return polygonCenter(farm.farmPolygon);
    return [41.5868, -93.625] as [number, number];
  }, [farm.farmPolygon]);

  const previewCoords = useMemo(() => {
    if (!draft.length) return [];
    if (cursor) return [...draft, cursor];
    return draft;
  }, [draft, cursor]);

  const canClose = draft.length >= 3 && cursor && isNearStart(draft, cursor);

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%', borderRadius: 0 }}
      doubleClickZoom={false}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds coords={farm.farmPolygon} />
      <FlyToSearchResult target={searchTarget} />

      <DrawingController
        drawMode={drawMode}
        farmPolygon={farm.farmPolygon}
        subplots={farm.subplots}
        draft={draft}
        setDraft={setDraft}
        cursor={cursor}
        setCursor={setCursor}
        onFarmComplete={onFarmComplete}
        onSubplotComplete={onSubplotComplete}
        onDraftAreaChange={onDraftAreaChange}
        onDrawError={onDrawError}
        onSelectSubplot={onSelectSubplot}
      />

      {farm.farmPolygon && farm.farmPolygon.length >= 3 && (
        <Polygon
          positions={toLatLng(farm.farmPolygon)}
          pathOptions={{
            color: '#0F2D26',
            weight: 3,
            fillColor: '#0F2D26',
            fillOpacity: 0.08,
          }}
          eventHandlers={{
            click: () => {
              if (drawMode === 'idle' || drawMode === 'edit') onSelectSubplot(null);
            },
          }}
        />
      )}

      {farm.subplots.map((sp) => {
        const selected = sp.id === selectedSubplotId;
        const hovered = sp.id === hoveredId;
        return (
          <Polygon
            key={sp.id}
            positions={toLatLng(sp.coordinates)}
            pathOptions={{
              color: sp.color,
              weight: selected || hovered ? 3.5 : 2,
              fillColor: sp.color,
              fillOpacity: selected ? 0.55 : hovered ? 0.45 : 0.35,
            }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                if (drawMode === 'farm' || drawMode === 'subplot') return;
                onSelectSubplot(sp.id);
              },
              mouseover: () => setHoveredId(sp.id),
              mouseout: () => setHoveredId((id) => (id === sp.id ? null : id)),
            }}
          />
        );
      })}

      {previewCoords.length >= 2 && (
        <Polyline
          positions={toLatLng(previewCoords)}
          pathOptions={{
            color: drawMode === 'farm' ? '#0F2D26' : '#3E7B4F',
            weight: 2.5,
            dashArray: canClose ? undefined : '6 6',
            opacity: 0.9,
          }}
        />
      )}

      {draft.map((pt, i) => (
        <CircleMarker
          key={`v-${i}`}
          center={[pt[1], pt[0]]}
          radius={i === 0 ? 7 : 5}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: i === 0 ? '#C0392B' : drawMode === 'farm' ? '#0F2D26' : '#3E7B4F',
            fillOpacity: 1,
          }}
        />
      ))}

      {canClose && draft[0] && (
        <CircleMarker
          center={[draft[0][1], draft[0][0]]}
          radius={12}
          pathOptions={{
            color: '#C0392B',
            weight: 2,
            fillColor: '#C0392B',
            fillOpacity: 0.25,
          }}
        />
      )}

      <LocationSearchBar
        palette={palette}
        onLocate={(lat, lng) => setSearchTarget({ lat, lng, token: Date.now() })}
      />
    </MapContainer>
  );
}
