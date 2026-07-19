import { useMemo } from 'react';
import type { Palette } from '../palette';
import type { FarmState, Subplot } from '../types';
import { titleCase } from '../lib/fieldHelpers';
import {
  exhaustionColor,
  getRotationAdvice,
  type RotationAdvice,
} from '../lib/cropMetrics';

interface RecommendationScreenProps {
  palette: Palette;
  farm: FarmState;
  onOpenFarmMap?: () => void;
  onOpenSubplot?: (id: string) => void;
}

function SubplotRecommendationCard({
  palette,
  subplot,
  advice,
  onOpen,
}: {
  palette: Palette;
  subplot: Subplot;
  advice: RotationAdvice;
  onOpen?: () => void;
}) {
  const currentCrop =
    subplot.data.cropEntries.find((e) => e.isCurrent && e.crop.trim())?.crop ||
    subplot.data.cropEntries.find((e) => e.crop.trim())?.crop ||
    '';

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
            background: advice.shouldRotate ? palette.rotate.bg : palette.safe.bg,
            color: advice.shouldRotate ? palette.rotate.text : palette.safe.text,
          }}
        >
          {advice.label}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <div style={{ background: palette.bg, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Soil exhaustion
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: exhaustionColor(advice.exhaustionScore) }}>
              {advice.exhaustionScore}
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
        </div>

        <div style={{ background: palette.bg, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rotation
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: advice.shouldRotate ? palette.rotate.bg : palette.safe.bg,
              marginTop: 6,
            }}
          >
            {advice.shouldRotate ? 'Rotate crops' : 'Keep planting'}
          </div>
          <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 6, lineHeight: 1.35 }}>{advice.reason}</div>
        </div>
      </div>
    </article>
  );
}

export default function RecommendationScreen({
  palette,
  farm,
  onOpenFarmMap,
  onOpenSubplot,
}: RecommendationScreenProps) {
  const cards = useMemo(
    () =>
      farm.subplots.map((sp) => ({
        subplot: sp,
        advice: getRotationAdvice(sp.data.cropEntries),
      })),
    [farm.subplots],
  );

  const rotateCount = cards.filter((c) => c.advice.shouldRotate).length;

  if (!farm.farmPolygon) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: palette.dark }}>Map your farm first</div>
        <div style={{ fontSize: 13, color: palette.muted, maxWidth: 280, lineHeight: 1.45 }}>
          Draw a farm boundary and subplots to see rotation recommendations here.
        </div>
        {onOpenFarmMap && (
          <button
            type="button"
            onClick={onOpenFarmMap}
            style={{
              border: 'none',
              borderRadius: 10,
              padding: '11px 18px',
              background: palette.dark,
              color: palette.offwhite,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
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
          <button
            type="button"
            onClick={onOpenFarmMap}
            style={{
              border: 'none',
              borderRadius: 10,
              padding: '11px 18px',
              background: palette.dark,
              color: palette.offwhite,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Draw subplots
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          background: palette.card,
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: palette.muted }}>Subplots to rotate</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: palette.dark }}>{rotateCount}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12.5, color: palette.muted, fontWeight: 600 }}>
          of {farm.subplots.length} subplot{farm.subplots.length === 1 ? '' : 's'}
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: palette.muted, lineHeight: 1.4 }}>
        Advice is derived from crop history and soil exhaustion on each subplot. Tap a card to review details in Fields.
      </div>

      {cards.map(({ subplot, advice }) => (
        <SubplotRecommendationCard
          key={subplot.id}
          palette={palette}
          subplot={subplot}
          advice={advice}
          onOpen={onOpenSubplot ? () => onOpenSubplot(subplot.id) : undefined}
        />
      ))}
    </div>
  );
}
