import type { Palette } from '../../palette';
import { exhaustionColor } from '../../lib/cropMetrics';

interface SoilExhaustionGaugeProps {
  palette: Palette;
  score: number;
}

export default function SoilExhaustionGauge({ palette, score }: SoilExhaustionGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = exhaustionColor(clamped);

  return (
    <div
      style={{
        background: palette.bg,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        border: '1px solid rgba(15,45,38,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: palette.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Soil Exhaustion Score
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{clamped}</div>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: 'rgba(15,45,38,0.08)',
          overflow: 'hidden',
        }}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Soil exhaustion score"
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: 999,
            background: color,
            transition: 'width 280ms ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 600, color: palette.muted }}>
        <span style={{ color: '#3E7B4F' }}>Healthy</span>
        <span style={{ color: '#E0A030' }}>Moderate</span>
        <span style={{ color: '#C0392B' }}>Stressed</span>
      </div>
    </div>
  );
}
