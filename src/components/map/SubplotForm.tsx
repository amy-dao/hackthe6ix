import type { CSSProperties } from 'react';
import type { Palette } from '../../palette';
import type { SubplotData } from '../../types';
import { fieldLabelStyle, fieldInputStyle } from '../../lib/formStyles';
import { titleCase } from '../../lib/fieldHelpers';
import { resolveSoilTypeOptions } from '../../lib/cropMetrics';
import CropHistoryTimeline from '../fields/CropHistoryTimeline';

const PH_MIN = 3.5;
const PH_MAX = 9;

interface SubplotFormProps {
  palette: Palette;
  data: SubplotData;
  areaAcres: number;
  color: string;
  cropOptions?: string[];
  soilTypeOptions?: string[];
  saving?: boolean;
  syncError?: string | null;
  onChange: (next: SubplotData) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onViewField?: (fieldId: string) => void;
  onEditPoints?: () => void;
}

export default function SubplotForm({
  palette,
  data,
  areaAcres,
  color,
  cropOptions = [],
  soilTypeOptions = [],
  saving = false,
  syncError = null,
  onChange,
  onSave,
  onDelete,
  onClose,
  onViewField,
  onEditPoints,
}: SubplotFormProps) {
  const panel: CSSProperties = {
    background: palette.card,
    borderRadius: '16px 16px 0 0',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100%',
    boxShadow: '0 -8px 28px rgba(15,45,38,0.12)',
    overflow: 'hidden',
  };

  const soils = resolveSoilTypeOptions(soilTypeOptions);
  const phValue = typeof data.soilPh === 'number' ? data.soilPh : Number(data.soilPh);
  const phValid = data.soilPh === '' || (Number.isFinite(phValue) && phValue >= PH_MIN && phValue <= PH_MAX);
  const canSave = data.name.trim().length > 0 && phValid && !saving;

  return (
    <div style={panel}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 18px 10px',
          borderBottom: '1px solid rgba(15,45,38,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: palette.dark,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.name || 'New field'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12.5, color: palette.muted }}>{areaAcres.toFixed(2)} acres</div>
              {onEditPoints && (
                <button
                  type="button"
                  onClick={onEditPoints}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: palette.accent,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Edit shape
                </button>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            color: palette.muted,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            padding: 4,
            flexShrink: 0,
          }}
        >
          Close
        </button>
      </div>

      {/* Scrollable body — name, soil, crops all reachable without leaving Map */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 18px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div style={fieldLabelStyle(palette)}>Field name</div>
          <input
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="North pasture"
            style={fieldInputStyle(palette)}
            autoFocus={!data.name.trim()}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={fieldLabelStyle(palette)}>Soil pH</div>
            <input
              type="number"
              min={PH_MIN}
              max={PH_MAX}
              step={0.1}
              value={data.soilPh}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ ...data, soilPh: v === '' ? '' : Number(v) });
              }}
              placeholder="6.5"
              style={fieldInputStyle(palette)}
            />
          </div>
          <div>
            <div style={fieldLabelStyle(palette)}>Soil type</div>
            <select
              value={data.soilType === 'slit' ? 'silt' : data.soilType}
              onChange={(e) => onChange({ ...data, soilType: e.target.value })}
              style={{ ...fieldInputStyle(palette), appearance: 'auto' as const, cursor: 'pointer' }}
            >
              <option value="">Select…</option>
              {soils.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!phValid && (
          <div style={{ fontSize: 11.5, color: palette.rotate.bg, marginTop: -6 }}>
            Enter a pH between {PH_MIN} and {PH_MAX}, or leave it blank.
          </div>
        )}

        <CropHistoryTimeline
          palette={palette}
          entries={data.cropEntries}
          cropOptions={cropOptions}
          onChange={(cropEntries) => onChange({ ...data, cropEntries })}
        />

        {syncError && (
          <div
            style={{
              fontSize: 12.5,
              color: palette.rotate.text,
              background: palette.rotate.bg,
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {syncError}
          </div>
        )}

        {data.linkedFieldId && !syncError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12, color: palette.muted }}>Saved as a field ✓</div>
            {onViewField && (
              <div
                onClick={() => onViewField(data.linkedFieldId!)}
                style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, cursor: 'pointer' }}
              >
                View field →
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={canSave ? onSave : undefined}
          disabled={!canSave}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '13px 0',
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 14,
            cursor: canSave ? 'pointer' : 'default',
            opacity: canSave ? 1 : 0.45,
          }}
        >
          {saving ? 'Saving…' : data.linkedFieldId ? 'Save changes' : 'Save field'}
        </button>

        <button
          type="button"
          onClick={onDelete}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '12px 0',
            background: palette.rotate.bg,
            color: palette.rotate.text,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Remove field
        </button>
      </div>
    </div>
  );
}
