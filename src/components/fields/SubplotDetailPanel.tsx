import { useEffect, useMemo, useState } from 'react';
import type { Palette } from '../../palette';
import type { LngLat, Subplot, SubplotData } from '../../types';
import { titleCase } from '../../lib/fieldHelpers';
import { fieldLabelStyle, fieldInputStyle } from '../../lib/formStyles';
import {
  computeNutrientLevelsFromHistory,
  NUTRIENT_LABELS,
  resolveSoilTypeOptions,
  type NutrientKey,
} from '../../lib/cropMetrics';
import { predictRecommendation } from '../../lib/api';
import { isUnknownRecommendation, subplotToPredictPayload } from '../../lib/mlPredict';
import CropHistoryTimeline from './CropHistoryTimeline';
import CropSuggestionPanel from './CropSuggestionPanel';
import SubplotMiniMap from './SubplotMiniMap';
import NutrientIndicator from './NutrientIndicator';
import SoilExhaustionGauge from './SoilExhaustionGauge';
import { resolveCropSuggestion } from '../../lib/cropSuggestions';

interface SubplotDetailPanelProps {
  palette: Palette;
  subplot: Subplot;
  farmPolygon?: LngLat[] | null;
  onChange: (data: SubplotData) => void;
  onClose: () => void;
}

const unknownStyle = {
  fontStyle: 'italic' as const,
  color: '#8A8F8A',
  fontWeight: 700,
};

export default function SubplotDetailPanel({
  palette,
  subplot,
  farmPolygon,
  onChange,
  onClose,
}: SubplotDetailPanelProps) {
  const data = subplot.data;
  const soils = useMemo(() => resolveSoilTypeOptions(), []);
  const nutrients = useMemo(() => {
    // NPK is Unknown until a current (or named timeline) crop exists.
    const withFlags = data.cropEntries.filter((e) => e.crop.trim());
    return computeNutrientLevelsFromHistory(withFlags);
  }, [data.cropEntries]);

  const [status, setStatus] = useState<'unknown' | 'ready'>('unknown');
  const [rotateLabel, setRotateLabel] = useState('Unknown');
  const [exhaustion01, setExhaustion01] = useState<number | null>(null);
  const [reason, setReason] = useState('Add soil pH, soil type, and crops to unlock recommendations.');

  useEffect(() => {
    const cached = data.recommendations;
    if (cached) {
      if (
        isUnknownRecommendation(cached.rotation_recommendation) ||
        isUnknownRecommendation(cached.soil_exhaustion_score)
      ) {
        setStatus('unknown');
        setRotateLabel('Unknown');
        setExhaustion01(null);
        setReason('Missing required features — recommendations stay Unknown until complete.');
        return;
      }
      setStatus('ready');
      setRotateLabel(
        cached.rotation_recommendation === 1
          ? 'Rotate Crops'
          : cached.rotation_label || 'Do Not Rotate',
      );
      setExhaustion01(Number(cached.soil_exhaustion_score));
      const p = cached.rotation_probability;
      setReason(
        p != null
          ? `Model confidence ${(p * 100).toFixed(0)}% · updates automatically as you edit.`
          : 'Model recommendation · updates automatically as you edit.',
      );
      return;
    }

    let cancelled = false;
    predictRecommendation(subplotToPredictPayload(subplot))
      .then((pred) => {
        if (cancelled) return;
        const rec = pred.recommendations;
        if (
          !pred.ready ||
          !rec ||
          isUnknownRecommendation(rec.rotation_recommendation) ||
          isUnknownRecommendation(rec.soil_exhaustion_score)
        ) {
          setStatus('unknown');
          setRotateLabel('Unknown');
          setExhaustion01(null);
          setReason(
            pred.missing_fields?.length
              ? `Waiting for: ${pred.missing_fields.join(', ')}`
              : 'Recommendations Unknown until all required fields are set.',
          );
          return;
        }
        setStatus('ready');
        setRotateLabel(
          rec.rotation_recommendation === 1 ? 'Rotate Crops' : rec.rotation_label || 'Do Not Rotate',
        );
        setExhaustion01(Number(rec.soil_exhaustion_score));
        setReason(
          rec.rotation_probability != null
            ? `Model confidence ${(rec.rotation_probability * 100).toFixed(0)}%.`
            : 'Model recommendation.',
        );
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('unknown');
        setRotateLabel('Unknown');
        setExhaustion01(null);
        setReason('Model unavailable — recommendations Unknown.');
      });
    return () => {
      cancelled = true;
    };
  }, [subplot, data.recommendations]);

  function patch(partial: Partial<SubplotData>) {
    onChange({ ...data, ...partial });
  }

  const soilPhDisplay =
    data.soilPh === '' || data.soilPh == null ? '' : String(data.soilPh);

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
            borderLeft: `3px solid ${status === 'unknown' ? '#B0B5B0' : rotateLabel.includes('Rotate') && !rotateLabel.includes('Do Not') ? palette.rotate.bg : palette.safe.bg}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Advice
          </div>
          <div
            style={{
              fontSize: 14,
              marginTop: 4,
              ...(status === 'unknown'
                ? unknownStyle
                : {
                    fontWeight: 800,
                    color: rotateLabel.includes('Do Not') ? palette.safe.bg : palette.rotate.bg,
                  }),
            }}
          >
            {rotateLabel}
          </div>
        </div>
      </div>

      {status === 'ready' &&
        (rotateLabel.includes('Rotate') && !rotateLabel.includes('Do Not')) && (
          <CropSuggestionPanel
            palette={palette}
            suggestion={resolveCropSuggestion(data.cropEntries, data.recommendations, {
              shouldRotate: true,
            })}
          />
        )}

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          <div>
            <div style={fieldLabelStyle(palette)}>Soil pH</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={3.5}
              max={9}
              placeholder="e.g. 6.5"
              value={soilPhDisplay}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  patch({ soilPh: '' });
                  return;
                }
                const n = Number(v);
                if (!Number.isNaN(n)) patch({ soilPh: n });
              }}
              style={fieldInputStyle(palette)}
              aria-label="Soil pH"
            />
          </div>
        </div>
      </div>

      <CropHistoryTimeline
        palette={palette}
        entries={data.cropEntries}
        onChange={(cropEntries) => patch({ cropEntries })}
      />

      {status === 'unknown' || exhaustion01 == null ? (
        <div
          style={{
            background: palette.card,
            borderRadius: 14,
            padding: '16px',
            ...unknownStyle,
            fontSize: 15,
          }}
        >
          Soil exhaustion: Unknown
        </div>
      ) : (
        <SoilExhaustionGauge palette={palette} score={Math.round(exhaustion01 * 100)} />
      )}

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
        <div
          style={{
            fontSize: 12.5,
            ...(status === 'unknown'
              ? unknownStyle
              : { fontWeight: 800, color: palette.dark }),
          }}
        >
          Rotation: {rotateLabel}
          {status === 'ready' && exhaustion01 != null
            ? ` · exhaustion ${exhaustion01.toFixed(2)}`
            : ''}
        </div>
        <div style={{ fontSize: 11.5, color: palette.muted, lineHeight: 1.4, fontStyle: status === 'unknown' ? 'italic' : 'normal' }}>
          {reason}
        </div>
      </div>
    </div>
  );
}
