import { useEffect, useMemo, useState } from 'react';
import type { Palette } from '../palette';
import type { FarmState, Subplot, SubplotRecommendations } from '../types';
import { titleCase } from '../lib/fieldHelpers';
import {
  exhaustionBand,
  exhaustionColor,
  getRotationAdvice,
  type RotationAdvice,
} from '../lib/cropMetrics';
import { predictRecommendationsBatch } from '../lib/api';
import { subplotToPredictPayload } from '../lib/mlPredict';
import { resolveCropSuggestion } from '../lib/cropSuggestions';
import CropSuggestionPanel from '../components/fields/CropSuggestionPanel';

interface RecommendationScreenProps {
  palette: Palette;
  farm: FarmState;
  onOpenFarmMap?: () => void;
  onOpenSubplot?: (id: string) => void;
  onRecommendationsUpdate?: (id: string, rec: SubplotRecommendations | null) => void;
}

function adviceFromRecommendations(rec: SubplotRecommendations): RotationAdvice & { unknown?: boolean } {
  if (
    rec.rotation_recommendation === 'Unknown' ||
    rec.soil_exhaustion_score === 'Unknown'
  ) {
    return {
      shouldRotate: false,
      label: 'Do Not Rotate',
      exhaustionScore: 0,
      exhaustionLabel: 'Low',
      reason: 'Unknown — fill soil pH, soil type, and crop history to unlock model advice.',
      unknown: true,
    };
  }
  const score100 = Math.round(Math.max(0, Math.min(1, Number(rec.soil_exhaustion_score))) * 100);
  const shouldRotate = rec.rotation_recommendation === 1;
  return {
    shouldRotate,
    label: shouldRotate ? 'Rotate' : 'Do Not Rotate',
    exhaustionScore: score100,
    exhaustionLabel: exhaustionBand(score100),
    reason: shouldRotate
      ? `Model recommends rotating (confidence ${((rec.rotation_probability ?? 0) * 100).toFixed(0)}%).`
      : `Model suggests continuing (confidence ${((1 - (rec.rotation_probability ?? 0)) * 100).toFixed(0)}%).`,
  };
}

function SubplotRecommendationCard({
  palette,
  subplot,
  advice,
  onOpen,
  source,
}: {
  palette: Palette;
  subplot: Subplot;
  advice: RotationAdvice & { unknown?: boolean };
  onOpen?: () => void;
  source?: 'model' | 'heuristic' | 'unknown';
}) {
  const currentCrop =
    subplot.data.cropEntries.find((e) => e.isCurrent && e.crop.trim())?.crop ||
    subplot.data.cropEntries.find((e) => e.crop.trim())?.crop ||
    '';
  const unknown = Boolean(advice.unknown || source === 'unknown');

  return (
    <article
      onClick={onOpen}
      style={{
        background: palette.card,
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: onOpen ? 'pointer' : 'default',
        border: '1.5px solid rgba(15,45,38,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: subplot.color, flexShrink: 0 }} />
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
              {subplot.data.name || 'Subplot'}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 4, fontWeight: 600 }}>
            {subplot.areaAcres.toFixed(2)} acres
            {currentCrop ? ` · ${titleCase(currentCrop)}` : ' · No crop set'}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '6px 10px',
            borderRadius: 8,
            background: unknown ? 'rgba(15,45,38,0.06)' : advice.shouldRotate ? palette.rotate.bg : palette.safe.bg,
            color: unknown ? '#8A8F8A' : advice.shouldRotate ? palette.rotate.text : palette.safe.text,
            fontStyle: unknown ? 'italic' : 'normal',
          }}
        >
          {unknown ? 'Unknown' : advice.label}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: palette.bg, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Soil exhaustion
          </div>
          {unknown ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: '#8A8F8A', fontStyle: 'italic', marginTop: 4 }}>Unknown</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: exhaustionColor(advice.exhaustionScore) }}>
                  {(advice.exhaustionScore / 100).toFixed(2)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: exhaustionColor(advice.exhaustionScore) }}>
                  {advice.exhaustionLabel}
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(15,45,38,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${advice.exhaustionScore}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: exhaustionColor(advice.exhaustionScore),
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ background: palette.bg, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rotation
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: unknown ? '#8A8F8A' : advice.shouldRotate ? palette.rotate.bg : palette.safe.bg,
              marginTop: 6,
              fontStyle: unknown ? 'italic' : 'normal',
            }}
          >
            {unknown ? 'Unknown' : advice.shouldRotate ? 'Yes — rotate' : 'No — keep planting'}
          </div>
          <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 6, lineHeight: 1.35, fontStyle: unknown ? 'italic' : 'normal' }}>
            {advice.reason}
          </div>
        </div>
      </div>

      {!unknown && advice.shouldRotate && (
        <CropSuggestionPanel
          palette={palette}
          suggestion={resolveCropSuggestion(
            subplot.data.cropEntries,
            subplot.data.recommendations,
            { shouldRotate: true },
          )}
        />
      )}
    </article>
  );
}

export default function RecommendationScreen({
  palette,
  farm,
  onOpenFarmMap,
  onOpenSubplot,
  onRecommendationsUpdate,
}: RecommendationScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!farm.subplots.length) {
      setError(null);
      return;
    }
    // Prefer cached subplot.recommendations; only batch-fetch missing ones.
    const needing = farm.subplots.filter((s) => !s.data.recommendations);
    if (needing.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    predictRecommendationsBatch(needing.map(subplotToPredictPayload))
      .then((res) => {
        if (cancelled) return;
        for (const p of res.predictions) {
          if (p.subplot_id && p.recommendations) {
            onRecommendationsUpdate?.(p.subplot_id, p.recommendations);
          }
        }
        setTick((t) => t + 1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Model prediction unavailable.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [farm.subplots, onRecommendationsUpdate]);

  const cards = useMemo(() => {
    void tick;
    return farm.subplots.map((sp) => {
      const rec = sp.data.recommendations;
      if (rec) {
        const advice = adviceFromRecommendations(rec);
        return {
          subplot: sp,
          advice,
          source: (advice.unknown ? 'unknown' : 'model') as 'model' | 'unknown',
        };
      }
      return {
        subplot: sp,
        advice: {
          ...getRotationAdvice(sp.data.cropEntries),
          unknown: true,
          reason: 'Unknown — complete soil pH, soil type, and crops for model advice.',
        },
        source: 'unknown' as const,
      };
    });
  }, [farm.subplots, tick]);

  const rotateCount = cards.filter((c) => !c.advice.unknown && c.advice.shouldRotate).length;

  if (!farm.farmPolygon) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: palette.dark }}>Map your farm first</div>
        <div style={{ fontSize: 13, color: palette.muted, maxWidth: 280, lineHeight: 1.45 }}>
          Draw a farm boundary and subplots to see rotation recommendations here.
        </div>
        {onOpenFarmMap && (
          <button type="button" onClick={onOpenFarmMap} style={{ border: 'none', borderRadius: 10, padding: '11px 18px', background: palette.dark, color: palette.offwhite, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Open farm map
          </button>
        )}
      </div>
    );
  }

  if (farm.subplots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: palette.dark }}>No subplots yet</div>
        <div style={{ fontSize: 13, color: palette.muted, maxWidth: 280, lineHeight: 1.45 }}>
          Add subplots on the map, then return here for per-plot rotation advice.
        </div>
        {onOpenFarmMap && (
          <button type="button" onClick={onOpenFarmMap} style={{ border: 'none', borderRadius: 10, padding: '11px 18px', background: palette.dark, color: palette.offwhite, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Draw subplots
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: palette.card, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: palette.muted }}>Subplots to rotate</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: palette.dark }}>{rotateCount}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12.5, color: palette.muted, fontWeight: 600 }}>
          of {farm.subplots.length} subplot{farm.subplots.length === 1 ? '' : 's'}
          {loading ? ' · scoring…' : ''}
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: palette.muted, lineHeight: 1.4 }}>
        Recommendations update automatically when subplot soil, crop, and area data are complete — no predict button needed.
      </div>
      {error && (
        <div style={{ fontSize: 12, color: palette.rotate?.text ?? '#8B3A2A', lineHeight: 1.4 }}>
          Model API unavailable — showing local heuristic where needed. ({error})
        </div>
      )}

      {cards.map(({ subplot, advice, source }) => (
        <SubplotRecommendationCard
          key={subplot.id}
          palette={palette}
          subplot={subplot}
          advice={advice}
          source={source}
          onOpen={onOpenSubplot ? () => onOpenSubplot(subplot.id) : undefined}
        />
      ))}
    </div>
  );
}
