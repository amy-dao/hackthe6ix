import type { Palette } from '../palette';
import { cropIcon } from '../lib/fieldHelpers';

interface FieldThumbProps {
  crop: string;
  statusColor: string;
  palette: Palette;
  checkbox?: 'checked' | 'unchecked' | null;
}

export default function FieldThumb({ crop, statusColor, palette, checkbox }: FieldThumbProps) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16/10',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(135deg, ${palette.dark}, #1B3A2B)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 28, opacity: 0.9 }}>{cropIcon(crop)}</span>
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: statusColor,
          border: `2px solid ${palette.offwhite}`,
          pointerEvents: 'none',
        }}
      />
      {checkbox && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: checkbox === 'checked' ? palette.accent : 'transparent',
            border: `2px solid ${palette.offwhite}`,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
