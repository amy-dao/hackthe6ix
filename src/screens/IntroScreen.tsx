import type { Palette } from '../palette';
import cultivaLogo from '../assets/cultiva-logo.png';

interface IntroScreenProps {
  palette: Palette;
  userName: string;
  onContinue: () => void;
}

export default function IntroScreen({ palette, userName, onContinue }: IntroScreenProps) {
  const firstName = userName.trim().split(/\s+/)[0] || 'there';

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '36px 28px',
        gap: 20,
        background: `linear-gradient(165deg, ${palette.bg} 0%, #D8E2D4 48%, ${palette.bg} 100%)`,
        boxSizing: 'border-box',
      }}
    >
      <img
        src={cultivaLogo}
        alt="Cultiva"
        style={{ height: 36, width: 'auto', alignSelf: 'flex-start', objectFit: 'contain' }}
      />
      <div style={{ fontSize: 28, fontWeight: 800, color: palette.dark, lineHeight: 1.2 }}>
        Welcome, {firstName}
      </div>
      <div style={{ fontSize: 15, color: palette.muted, lineHeight: 1.55, maxWidth: 360 }}>
        Map your farm, carve out subplots, and capture soil details so every field decision starts from real ground truth.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        {[
          { step: '1', title: 'Outline your farm', body: 'Click to place vertices and close the boundary when you return to the start.' },
          { step: '2', title: 'Draw subplots', body: 'Carve smaller plots inside the farm — they stay locked within the boundary.' },
          { step: '3', title: 'Add soil & history', body: 'Select a subplot to record pH, texture, and previous crops. Areas calculate automatically.' },
        ].map((item) => (
          <div
            key={item.step}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              background: palette.card,
              borderRadius: 14,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: palette.dark,
                color: palette.offwhite,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {item.step}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.dark }}>{item.title}</div>
              <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2, lineHeight: 1.4 }}>{item.body}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 12,
          border: 'none',
          borderRadius: 12,
          padding: '15px 0',
          background: palette.dark,
          color: palette.offwhite,
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        Open farm map
      </button>
    </div>
  );
}
