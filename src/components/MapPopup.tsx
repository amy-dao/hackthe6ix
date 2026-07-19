import type { Palette } from '../palette';
import type { Subplot } from '../types';
import { currentCropLabel } from '../lib/fieldHelpers';

interface MapPopupProps {
  palette: Palette;
  subplot: Subplot;
  onClose: () => void;
  onViewDetails: () => void;
}

export default function MapPopup({ palette, subplot, onClose, onViewDetails }: MapPopupProps) {
  const data = subplot.data;
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
        borderRadius: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: palette.card,
          borderRadius: '20px 20px 0 0',
          padding: 18,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: subplot.color, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: palette.dark,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {data.name || 'Field'}
              </div>
              <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2 }}>
                {subplot.areaAcres.toFixed(2)} acres · {currentCropLabel(subplot)}
              </div>
            </div>
          </div>
          <div onClick={onClose} style={{ fontSize: 13, fontWeight: 700, color: palette.muted, cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            Close
          </div>
        </div>

        {(data.soilType || data.soilPh !== '') && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.soilType && (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '5px 10px',
                  borderRadius: 20,
                  background: 'rgba(15,45,38,0.06)',
                  color: palette.dark,
                  textTransform: 'capitalize',
                }}
              >
                {data.soilType}
              </div>
            )}
            {data.soilPh !== '' && (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '5px 10px',
                  borderRadius: 20,
                  background: 'rgba(15,45,38,0.06)',
                  color: palette.dark,
                }}
              >
                pH {data.soilPh}
              </div>
            )}
          </div>
        )}

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
          View / edit field
        </div>
      </div>
    </div>
  );
}
