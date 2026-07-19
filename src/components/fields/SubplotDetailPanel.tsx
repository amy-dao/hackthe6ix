import { useMemo } from 'react';
import type { Palette } from '../../palette';
import type { LngLat, Subplot, SubplotData } from '../../types';
import { titleCase } from '../../lib/fieldHelpers';
import { fieldLabelStyle, fieldInputStyle } from '../../lib/formStyles';
import {
  computeNutrientLevelsFromHistory,
  computeSoilExhaustionFromHistory,
  getRotationAdvice,
  NUTRIENT_LABELS,
  resolveSoilTypeOptions,
  type NutrientKey,
} from '../../lib/cropMetrics';
import CropEntryEditor, { emptyCropEntry } from '../CropEntryEditor';
import SubplotMiniMap from './SubplotMiniMap';
import NutrientIndicator from './NutrientIndicator';
import SoilExhaustionGauge from './SoilExhaustionGauge';

interface SubplotDetailPanelProps {
  palette: Palette;
  subplot: Subplot;
  farmPolygon?: LngLat[] | null;
  onChange: (data: SubplotData) => void;
  onClose: () => void;
}

export default function SubplotDetailPanel({
  palette,
  subplot,
  farmPolygon,
  onChange,
  onClose,
}: SubplotDetailPanelProps) {
  const data = subplot.data;
  const soils = useMemo(() => resolveSoilTypeOptions(), []);
  const historyEntries = useMemo(
    () => data.cropEntries.filter((e) => e.crop.trim()),
    [data.cropEntries],
  );
  const nutrients = useMemo(() => computeNutrientLevelsFromHistory(historyEntries), [historyEntries]);
  const exhaustion = useMemo(() => computeSoilExhaustionFromHistory(historyEntries), [historyEntries]);
  const advice = useMemo(() => getRotationAdvice(data.cropEntries), [data.cropEntries]);

  function patch(partial: Partial<SubplotData>) {
    onChange({ ...data, ...partial });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        animation: 'fieldsFadeIn 220ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Edit subplot
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: palette.dark,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 2,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 3, background: subplot.color, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name || 'Subplot'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: palette.card,
            color: palette.muted,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            padding: '8px 10px',
            borderRadius: 8,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          Back
        </button>
      </div>

      <div
        style={{
          height: 140,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1.5px solid rgba(15,45,38,0.08)',
          position: 'relative',
        }}
      >
        <SubplotMiniMap coordinates={subplot.coordinates} color={subplot.color} farmPolygon={farmPolygon} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: palette.card, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Area
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: palette.dark, marginTop: 2 }}>
            {subplot.areaAcres.toFixed(2)} acres
          </div>
        </div>
        <div
          style={{
            background: palette.card,
            borderRadius: 12,
            padding: '12px 14px',
            borderLeft: `3px solid ${advice.shouldRotate ? palette.rotate.bg : palette.safe.bg}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Advice
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: advice.shouldRotate ? palette.rotate.bg : palette.safe.bg,
              marginTop: 4,
            }}
          >
            {advice.label}
          </div>
        </div>
      </div>

      <div style={{ background: palette.card, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={fieldLabelStyle(palette)}>Plot name</div>
          <input
            value={data.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="North pasture"
            style={fieldInputStyle(palette)}
          />
        </div>

        <div>
          <div style={fieldLabelStyle(palette)}>Soil type</div>
          <select
            value={data.soilType === 'slit' ? 'silt' : data.soilType}
            onChange={(e) => patch({ soilType: e.target.value })}
            style={{ ...fieldInputStyle(palette), appearance: 'auto', cursor: 'pointer' }}
          >
            <option value="">Select soil type…</option>
            {soils.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CropEntryEditor
        palette={palette}
        title="Crop history"
        helperText="Update past and current crops. Changes save automatically to this subplot."
        entries={data.cropEntries}
        onAddCropEntry={() =>
          patch({ cropEntries: [...data.cropEntries, emptyCropEntry()] })
        }
        onRemoveCropEntry={(i) =>
          patch({ cropEntries: data.cropEntries.filter((_, idx) => idx !== i) })
        }
        onChangeCropEntryCrop={(i, crop, meta) =>
          patch({
            cropEntries: data.cropEntries.map((e, idx) => (idx === i ? { ...e, crop, meta } : e)),
          })
        }
        onChangeCropEntryDates={(i, dates) =>
          patch({
            cropEntries: data.cropEntries.map((e, idx) => (idx === i ? { ...e, ...dates } : e)),
          })
        }
        onSetCurrentEntry={(i) =>
          patch({
            cropEntries: data.cropEntries.map((e, idx) => ({
              ...e,
              isCurrent: idx === i ? !e.isCurrent : false,
            })),
          })
        }
      />

      <SoilExhaustionGauge palette={palette} score={exhaustion} />

      <div style={{ background: palette.card, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: palette.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Remaining nutrient levels
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(NUTRIENT_LABELS) as NutrientKey[]).map((key) => (
            <NutrientIndicator key={key} palette={palette} label={NUTRIENT_LABELS[key]} status={nutrients[key]} />
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: palette.muted, lineHeight: 1.4 }}>{advice.reason}</div>
      </div>
    </div>
  );
}
