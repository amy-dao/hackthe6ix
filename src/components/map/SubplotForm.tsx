import type { CSSProperties } from 'react';
import type { Palette } from '../../palette';
import type { SubplotData } from '../../types';
import { fieldLabelStyle, fieldInputStyle } from '../../lib/formStyles';
import { titleCase } from '../../lib/fieldHelpers';
import { resolveSoilTypeOptions } from '../../lib/cropMetrics';
import CropEntryEditor, { emptyCropEntry } from '../CropEntryEditor';

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
}: SubplotFormProps) {
  const panel: CSSProperties = {
    background: palette.card,
    borderRadius: '16px 16px 0 0',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 -8px 28px rgba(15,45,38,0.12)',
  };

  const soils = resolveSoilTypeOptions(soilTypeOptions);
  const phValue = typeof data.soilPh === 'number' ? data.soilPh : Number(data.soilPh);
  const phValid = data.soilPh === '' || (Number.isFinite(phValue) && phValue >= PH_MIN && phValue <= PH_MAX);
  const canSave = data.name.trim().length > 0 && phValid && !saving;

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: palette.dark }}>{data.name || 'Field'}</div>
            <div style={{ fontSize: 12.5, color: palette.muted }}>{areaAcres.toFixed(2)} acres</div>
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
          }}
        >
          Close
        </button>
      </div>

      <div>
        <div style={fieldLabelStyle(palette)}>Field name</div>
        <input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="North pasture"
          style={fieldInputStyle(palette)}
        />
      </div>

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
        {!phValid && (
          <div style={{ fontSize: 11.5, color: palette.rotate.bg, marginTop: 4 }}>
            Enter a pH between {PH_MIN} and {PH_MAX}, or leave it blank.
          </div>
        )}
      </div>

      <div>
        <div style={fieldLabelStyle(palette)}>Soil type</div>
        <select
          value={data.soilType === 'slit' ? 'silt' : data.soilType}
          onChange={(e) => onChange({ ...data, soilType: e.target.value })}
          style={{ ...fieldInputStyle(palette), appearance: 'auto' as const, cursor: 'pointer' }}
        >
          <option value="">Select soil type…</option>
          {soils.map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </select>
      </div>

      <CropEntryEditor
        palette={palette}
        title="Crops on this field"
        helperText="A rotation recommendation needs both a current crop and at least one earlier one."
        cropOptions={cropOptions}
        entries={data.cropEntries}
        onAddCropEntry={() =>
          onChange({ ...data, cropEntries: [...data.cropEntries, emptyCropEntry()] })
        }
        onRemoveCropEntry={(i) =>
          onChange({ ...data, cropEntries: data.cropEntries.filter((_, idx) => idx !== i) })
        }
        onChangeCropEntryCrop={(i, crop, meta) =>
          onChange({
            ...data,
            cropEntries: data.cropEntries.map((e, idx) => (idx === i ? { ...e, crop, meta } : e)),
          })
        }
        onChangeCropEntryDates={(i, dates) =>
          onChange({
            ...data,
            cropEntries: data.cropEntries.map((e, idx) => (idx === i ? { ...e, ...dates } : e)),
          })
        }
        onSetCurrentEntry={(i) =>
          onChange({
            ...data,
            cropEntries: data.cropEntries.map((e, idx) => ({
              ...e,
              isCurrent: idx === i ? !e.isCurrent : false,
            })),
          })
        }
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
  );
}
