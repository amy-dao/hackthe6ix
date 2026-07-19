import type { Palette } from '../../palette';
import type { FarmState } from '../../types';
import SubplotCard from './SubplotCard';

interface SubplotListProps {
  palette: Palette;
  farm: FarmState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrawSubplots?: () => void;
}

export default function SubplotList({
  palette,
  farm,
  selectedId,
  onSelect,
  onDrawSubplots,
}: SubplotListProps) {
  if (farm.subplots.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '40px 16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: palette.dark }}>No fields yet</div>
        <div style={{ fontSize: 13, color: palette.muted, lineHeight: 1.45, maxWidth: 280 }}>
          Divide your farm into smaller fields on the map to see them listed here.
        </div>
        {onDrawSubplots && (
          <button
            type="button"
            onClick={onDrawSubplots}
            style={{
              marginTop: 4,
              border: 'none',
              borderRadius: 10,
              padding: '11px 18px',
              background: palette.dark,
              color: palette.offwhite,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Draw fields
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'fieldsFadeIn 180ms ease',
      }}
    >
      {farm.subplots.map((sp) => (
        <SubplotCard
          key={sp.id}
          palette={palette}
          subplot={sp}
          farmPolygon={farm.farmPolygon}
          selected={selectedId === sp.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
