import type { CSSProperties } from 'react';
import type { Palette } from '../../palette';
import type { SubplotData, SoilTexture } from '../../types';
import { fieldLabelStyle, fieldInputStyle } from '../../lib/formStyles';
import { SOIL_TEXTURE_OPTIONS, PREVIOUS_CROP_SUGGESTIONS } from '../../lib/farmConstants';

interface SubplotFormProps {
  palette: Palette;
  data: SubplotData;
  areaAcres: number;
  color: string;
  onChange: (next: SubplotData) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function SubplotForm({
  palette,
  data,
  areaAcres,
  color,
  onChange,
  onDelete,
  onClose,
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

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: palette.dark }}>
              {data.name || 'Subplot'}
            </div>
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
        <div style={fieldLabelStyle(palette)}>Plot name</div>
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
          min={0}
          max={14}
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
        <div style={fieldLabelStyle(palette)}>Soil texture</div>
        <select
          value={data.soilTexture}
          onChange={(e) => onChange({ ...data, soilTexture: e.target.value as SoilTexture | '' })}
          style={{ ...fieldInputStyle(palette), cursor: 'pointer' }}
        >
          <option value="">Select texture…</option>
          {SOIL_TEXTURE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div style={fieldLabelStyle(palette)}>Previous crop history</div>
        <textarea
          value={data.previousCrops}
          onChange={(e) => onChange({ ...data, previousCrops: e.target.value })}
          placeholder="e.g. Corn → Soybeans → Wheat"
          rows={2}
          style={{ ...fieldInputStyle(palette), resize: 'vertical' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {PREVIOUS_CROP_SUGGESTIONS.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => {
                const next = data.previousCrops
                  ? data.previousCrops.includes(crop)
                    ? data.previousCrops
                    : `${data.previousCrops}, ${crop}`
                  : crop;
                onChange({ ...data, previousCrops: next });
              }}
              style={{
                border: '1.5px solid rgba(15,45,38,0.12)',
                background: palette.bg,
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: palette.dark,
                cursor: 'pointer',
              }}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        style={{
          marginTop: 4,
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
        Remove subplot
      </button>
    </div>
  );
}
