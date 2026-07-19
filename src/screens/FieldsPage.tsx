import { useMemo, useState } from 'react';
import type { Palette } from '../palette';
import type { FarmState } from '../types';
import ViewToggle, { type FieldsViewMode } from '../components/fields/ViewToggle';
import MainFieldMap from '../components/fields/MainFieldMap';
import SubplotList from '../components/fields/SubplotList';

interface FieldsPageProps {
  palette: Palette;
  farm: FarmState;
  onOpenFarmMap: () => void;
}

function aggregateCrops(farm: FarmState): string {
  const current = new Set<string>();
  const all = new Set<string>();
  for (const sp of farm.subplots) {
    for (const entry of sp.data.cropEntries) {
      const crop = entry.crop.trim();
      if (!crop) continue;
      all.add(crop);
      if (entry.isCurrent) current.add(crop);
    }
  }
  const names = current.size > 0 ? [...current] : [...all];
  if (names.length === 0) return 'No crops recorded';
  return names.join(', ');
}

export default function FieldsPage({ palette, farm, onOpenFarmMap }: FieldsPageProps) {
  const [view, setView] = useState<FieldsViewMode>('main');
  const cropSummary = useMemo(() => aggregateCrops(farm), [farm]);

  if (!farm.farmPolygon) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '48px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: palette.dark }}>Map your farm</div>
        <div style={{ fontSize: 13.5, color: palette.muted, lineHeight: 1.5, maxWidth: 300 }}>
          Draw your main farm boundary and subplots to see them organized here.
        </div>
        <button
          type="button"
          onClick={onOpenFarmMap}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '13px 22px',
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Open farm map
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>
      <ViewToggle palette={palette} value={view} onChange={setView} />

      <div
        key={view}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          animation: 'fieldsFadeIn 200ms ease',
        }}
      >
        {view === 'main' ? (
          <>
            <div
              style={{
                background: palette.card,
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: palette.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Total farm area
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: palette.dark, letterSpacing: '-0.02em' }}>
                    {farm.farmAreaAcres.toFixed(2)} ac
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted }}>Subplots</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: palette.dark }}>{farm.subplots.length}</div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: palette.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 2,
                  }}
                >
                  Crops growing
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: palette.dark, lineHeight: 1.35 }}>{cropSummary}</div>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 280 }}>
              <MainFieldMap farm={farm} height="100%" />
            </div>

            <button
              type="button"
              onClick={onOpenFarmMap}
              style={{
                flexShrink: 0,
                border: '1.5px solid rgba(15,45,38,0.15)',
                borderRadius: 12,
                padding: '12px 0',
                background: palette.card,
                color: palette.dark,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Edit farm map
            </button>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginRight: -4, paddingRight: 4 }}>
            <SubplotList palette={palette} farm={farm} onDrawSubplots={onOpenFarmMap} />
          </div>
        )}
      </div>
    </div>
  );
}
