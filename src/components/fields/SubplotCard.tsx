import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Palette } from '../../palette';
import type { LngLat, Subplot } from '../../types';
import SubplotMiniMap from './SubplotMiniMap';

interface SubplotCardProps {
  palette: Palette;
  subplot: Subplot;
  farmPolygon?: LngLat[] | null;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

function currentCropLabel(subplot: Subplot): string {
  const current = subplot.data.cropEntries.find((e) => e.isCurrent && e.crop.trim());
  if (current) return current.crop.trim();
  const any = subplot.data.cropEntries.find((e) => e.crop.trim());
  return any?.crop.trim() || 'No crop set';
}

export default function SubplotCard({
  palette,
  subplot,
  farmPolygon,
  selected = false,
  onSelect,
}: SubplotCardProps) {
  const [hovered, setHovered] = useState(false);

  const card: CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    background: palette.card,
    borderRadius: 14,
    overflow: 'hidden',
    border: selected
      ? `2px solid ${palette.dark}`
      : `1.5px solid ${hovered ? 'rgba(15,45,38,0.18)' : 'rgba(15,45,38,0.08)'}`,
    boxShadow: selected
      ? '0 8px 22px rgba(15,45,38,0.14)'
      : hovered
        ? '0 6px 18px rgba(15,45,38,0.1)'
        : 'none',
    transform: hovered || selected ? 'translateY(-1px)' : 'none',
    transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
    position: 'relative',
    cursor: onSelect ? 'pointer' : 'default',
    outline: selected ? `2px solid ${subplot.color}` : 'none',
    outlineOffset: 1,
  };

  function handleActivate() {
    onSelect?.(subplot.id);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      style={card}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: 112,
          minWidth: 112,
          alignSelf: 'stretch',
          minHeight: 96,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <SubplotMiniMap
          coordinates={subplot.coordinates}
          color={subplot.color}
          farmPolygon={farmPolygon}
        />
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 10,
            height: 10,
            borderRadius: 3,
            background: subplot.color,
            border: '1.5px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: palette.dark,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subplot.data.name || 'Subplot'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: palette.dark, letterSpacing: '-0.02em' }}>
          {subplot.areaAcres.toFixed(2)} acres
        </div>
        <div style={{ fontSize: 12.5, color: palette.muted, fontWeight: 600 }}>{currentCropLabel(subplot)}</div>
      </div>
    </article>
  );
}
