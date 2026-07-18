import type { Palette } from '../palette';

interface HeaderProps {
  palette: Palette;
  eyebrow: string;
  title: string;
  showBack: boolean;
  onBack: () => void;
}

export default function Header({ palette, eyebrow, title, showBack, onBack }: HeaderProps) {
  return (
    <div
      style={{
        background: palette.dark,
        color: palette.offwhite,
        padding: '18px 18px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}
    >
      {showBack && (
        <div
          onClick={onBack}
          data-testid="back-button"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(245,243,236,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderLeft: `2px solid ${palette.offwhite}`,
              borderBottom: `2px solid ${palette.offwhite}`,
              transform: 'rotate(45deg) translate(1px,-1px)',
            }}
          />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>
          {eyebrow}
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
      </div>
    </div>
  );
}
