import type { Palette } from '../palette';
import type { Field } from '../types';
import { statusMeta } from '../lib/fieldHelpers';

interface MapPopupProps {
  palette: Palette;
  field: Field;
  onClose: () => void;
  onViewDetails: () => void;
}

export default function MapPopup({ palette, field, onClose, onViewDetails }: MapPopupProps) {
  const meta = statusMeta(field.status, palette);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15,45,38,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 30,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: palette.card,
          borderRadius: '20px 20px 0 0',
          padding: 20,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: palette.dark }}>{field.name}</div>
            <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2 }}>
              {field.crop} · {field.acres} ac
            </div>
          </div>
          <div onClick={onClose} style={{ fontSize: 13, fontWeight: 700, color: palette.muted, cursor: 'pointer', padding: 2 }}>
            Close
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: 20,
              background: meta.bg,
              color: meta.text,
            }}
          >
            {meta.label}
          </div>
          <div style={{ fontSize: 12.5, color: palette.muted, fontWeight: 600 }}>Risk {field.risk}</div>
        </div>
        <div
          onClick={onViewDetails}
          style={{
            textAlign: 'center',
            padding: '13px 0',
            borderRadius: 12,
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          View full details
        </div>
      </div>
    </div>
  );
}
