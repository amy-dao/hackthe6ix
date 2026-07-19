import type { CSSProperties } from 'react';
import type { Palette } from '../../palette';
import type { NutrientStatus } from '../../lib/cropMetrics';
import { nutrientStatusColor } from '../../lib/cropMetrics';

interface NutrientIndicatorProps {
  palette: Palette;
  label: string;
  status: NutrientStatus;
}

export default function NutrientIndicator({ palette, label, status }: NutrientIndicatorProps) {
  const unknown = status === 'UNKNOWN';
  const color = nutrientStatusColor(status);

  const shell: CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: palette.bg,
    borderRadius: 12,
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    border: '1px solid rgba(15,45,38,0.06)',
  };

  return (
    <div style={shell}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: palette.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: color,
          opacity: unknown ? 0.45 : 0.95,
          boxShadow: unknown ? 'none' : `0 0 0 4px ${color}22`,
        }}
      />
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color,
          letterSpacing: '0.04em',
          fontStyle: unknown ? 'italic' : 'normal',
          textTransform: unknown ? 'none' : 'uppercase',
        }}
      >
        {unknown ? 'Unknown' : status}
      </div>
    </div>
  );
}
