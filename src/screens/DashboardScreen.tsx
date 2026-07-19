import type { Palette } from '../palette';
import type { DashboardView, FarmState, Field, StatusFilter } from '../types';
import { statusMeta } from '../lib/fieldHelpers';
import FieldThumb from '../components/FieldThumb';

interface DashboardScreenProps {
  palette: Palette;
  fields: Field[];
  allFieldsCount: number;
  rotateNowCount: number;
  view: DashboardView;
  onSetView: (view: DashboardView) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onSetStatusFilter: (filter: StatusFilter) => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClearSelected: () => void;
  onSelectField: (id: string) => void;
  onShowMapPopup: (id: string) => void;
  onAddField: () => void;
  onOpenFarmMap: () => void;
  farm: FarmState;
}

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rotate', label: 'Rotate now' },
  { id: 'marginal', label: 'Marginal' },
  { id: 'safe', label: 'Safe' },
  { id: 'unknown', label: 'Needs history' },
  { id: 'empty', label: 'Empty' },
];

export default function DashboardScreen({
  palette,
  fields,
  rotateNowCount,
  view,
  onSetView,
  searchQuery,
  onSearchChange,
  statusFilter,
  onSetStatusFilter,
  editMode,
  onToggleEditMode,
  selectedIds,
  onToggleSelect,
  onClearSelected,
  onSelectField,
  onShowMapPopup,
  onAddField,
  onOpenFarmMap,
  farm,
}: DashboardScreenProps) {
  const mapLegend = (['rotate', 'marginal', 'safe', 'unknown', 'empty'] as const).map((s) => ({
    color: statusMeta(s, palette).bg,
    label: statusMeta(s, palette).label,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: palette.muted }}>Fields needing attention</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: palette.dark }}>{rotateNowCount}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: palette.rotate.bg, flexShrink: 0 }} />
      </div>

      <div
        onClick={onOpenFarmMap}
        style={{
          background: palette.card,
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: palette.muted }}>Your farm map</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: palette.dark }}>
            {farm.farmPolygon
              ? `${farm.farmAreaAcres.toFixed(1)} ac · ${farm.subplots.length} subplot${farm.subplots.length === 1 ? '' : 's'}`
              : 'Draw your farm boundary'}
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.accent }}>Open →</div>
      </div>

      <div
        onClick={onAddField}
        style={{ textAlign: 'center', padding: '13px 0', borderRadius: 12, background: palette.dark, color: palette.offwhite, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
      >
        + Add field
      </div>

      <div style={{ display: 'flex', gap: 6, background: palette.card, borderRadius: 12, padding: 4 }}>
        <div
          onClick={() => onSetView('cards')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '9px 0',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: view === 'cards' ? palette.dark : 'transparent',
            color: view === 'cards' ? palette.offwhite : palette.muted,
          }}
        >
          Cards
        </div>
        <div
          onClick={() => onSetView('map')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '9px 0',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: view === 'map' ? palette.dark : 'transparent',
            color: view === 'map' ? palette.offwhite : palette.muted,
          }}
        >
          Map
        </div>
      </div>

      {view === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search fields or crops"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1.5px solid rgba(15,45,38,0.15)',
              borderRadius: 12,
              padding: '11px 14px',
              fontSize: 14,
              fontFamily: 'inherit',
              color: palette.dark,
              background: palette.card,
            }}
          />

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {FILTERS.map((opt) => {
              const active = statusFilter === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => onSetStatusFilter(opt.id)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px',
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: active ? palette.dark : palette.card,
                    color: active ? palette.offwhite : palette.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={onToggleEditMode} style={{ fontSize: 13, fontWeight: 700, color: palette.accent, cursor: 'pointer', padding: 2 }}>
              {editMode ? 'Done' : 'Select fields'}
            </div>
          </div>

          {fields.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13.5, color: palette.muted }}>
              No fields match your search or filter.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fields.map((f) => {
              const meta = statusMeta(f.status, palette);
              const selected = selectedIds.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => (editMode ? onToggleSelect(f.id) : onSelectField(f.id))}
                  style={{ background: palette.card, borderRadius: 16, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <FieldThumb crop={f.crop} statusColor={meta.bg} palette={palette} checkbox={editMode ? (selected ? 'checked' : 'unchecked') : null} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: palette.dark }}>{f.name}</div>
                    <div style={{ fontSize: 11.5, color: palette.muted }}>
                      {f.crop} · {f.acres} ac
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 8px', borderRadius: 20, background: meta.bg, color: meta.text }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 11, color: palette.muted, fontWeight: 600 }}>{f.risk}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {editMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: palette.card, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: palette.muted }}>{selectedIds.length} selected</div>
                <div style={{ fontSize: 11, color: palette.muted, marginTop: 1 }}>Deletes the selected field cards</div>
              </div>
              <div
                onClick={onClearSelected}
                style={{
                  opacity: selectedIds.length ? 1 : 0.4,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: palette.rotate.bg,
                  color: palette.rotate.text,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Delete field
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12.5, color: palette.muted, lineHeight: 1.4 }}>
            Birdseye view of crop fields. Use Farm Map for interactive boundaries.
          </div>
          <div
            onClick={onOpenFarmMap}
            style={{
              textAlign: 'center',
              padding: '12px 0',
              borderRadius: 12,
              background: palette.safe.bg,
              color: palette.safe.text,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            {farm.farmPolygon ? 'Edit interactive farm map' : 'Draw farm on interactive map'}
          </div>
          <div style={{ background: 'linear-gradient(135deg,#2E4A38,#173026)', borderRadius: 18, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gridAutoRows: 64, gap: 5 }}>
              {fields.map((f) => {
                const meta = statusMeta(f.status, palette);
                const colSpan = (parseFloat(String(f.acres)) || 0) >= 55 ? 2 : 1;
                return (
                  <div
                    key={f.id}
                    onClick={() => onShowMapPopup(f.id)}
                    style={{
                      gridColumn: `span ${colSpan}`,
                      borderRadius: 8,
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 4,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: palette.offwhite, lineHeight: 1.2 }}>{f.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mapLegend.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: item.color, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: palette.dark }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
