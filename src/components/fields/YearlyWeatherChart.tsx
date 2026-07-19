import { useMemo, useState } from 'react';
import type { Palette } from '../../palette';
import type { MonthlyClimate } from '../../lib/weather';

interface YearlyWeatherChartProps {
  palette: Palette;
  months: MonthlyClimate[];
  locationLabel?: string;
}

function linePath(
  values: number[],
  xAt: (i: number) => number,
  yAt: (v: number) => number,
): string {
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(' ');
}

export default function YearlyWeatherChart({ palette, months, locationLabel }: YearlyWeatherChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const { minT, maxT, nowXFrac } = useMemo(() => {
    const all = months.flatMap((m) => [m.low, m.avg, m.high]);
    const minT = Math.floor(Math.min(...all) - 2);
    const maxT = Math.ceil(Math.max(...all) + 2);
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const nowXFrac = Math.min(1, Math.max(0, day / 365));
    return { minT, maxT, nowXFrac };
  }, [months]);

  const W = 640;
  const H = 220;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xAt = (i: number) => padL + (i / 11) * innerW;
  const yAt = (v: number) => padT + ((maxT - v) / (maxT - minT || 1)) * innerH;
  const nowX = padL + nowXFrac * innerW;

  const avgs = months.map((m) => m.avg);
  const highs = months.map((m) => m.high);
  const lows = months.map((m) => m.low);

  const hi = hover != null ? months[hover] : null;

  return (
    <div
      style={{
        background: palette.card,
        borderRadius: 16,
        padding: '14px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: '1.5px solid rgba(15,45,38,0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
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
            Yearly climate
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: palette.dark, marginTop: 2 }}>
            Monthly temperature pattern
          </div>
        </div>
        {locationLabel && (
          <div style={{ fontSize: 11.5, color: palette.muted, textAlign: 'right', fontWeight: 600 }}>
            {locationLabel}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', maxHeight: 240 }}
        role="img"
        aria-label="Yearly temperature chart"
      >
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + t * innerH;
          const val = maxT - t * (maxT - minT);
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(15,45,38,0.08)" strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill={palette.muted}>
                {Math.round(val)}°
              </text>
            </g>
          );
        })}

        <path d={linePath(highs, xAt, yAt)} fill="none" stroke="#C0392B" strokeWidth={2} strokeLinecap="round" />
        <path d={linePath(avgs, xAt, yAt)} fill="none" stroke="#5F7A3D" strokeWidth={2.5} strokeLinecap="round" />
        <path d={linePath(lows, xAt, yAt)} fill="none" stroke="#3B6EA5" strokeWidth={2} strokeLinecap="round" />

        {/* Current day marker */}
        <line
          x1={nowX}
          x2={nowX}
          y1={padT}
          y2={H - padB}
          stroke={palette.dark}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.85}
        />
        <circle cx={nowX} cy={padT + 4} r={3.5} fill={palette.dark} />

        {months.map((m, i) => (
          <g key={m.month}>
            <rect
              x={xAt(i) - innerW / 24}
              y={padT}
              width={innerW / 12}
              height={innerH}
              fill={hover === i ? 'rgba(95,122,61,0.08)' : 'transparent'}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            <text
              x={xAt(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight={hover === i ? 800 : 600}
              fill={hover === i ? palette.dark : palette.muted}
            >
              {m.label}
            </text>
          </g>
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 11.5,
          fontWeight: 700,
          color: palette.muted,
          padding: '0 2px 4px',
        }}
      >
        <span style={{ color: '#C0392B' }}>— High</span>
        <span style={{ color: '#5F7A3D' }}>— Average</span>
        <span style={{ color: '#3B6EA5' }}>— Low</span>
        <span style={{ color: palette.dark }}>┊ Today</span>
        {hi && (
          <span style={{ marginLeft: 'auto', color: palette.dark }}>
            {hi.label}: avg {hi.avg}° · high {hi.high}° · low {hi.low}°
          </span>
        )}
      </div>
    </div>
  );
}
