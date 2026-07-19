import type { Palette } from '../palette';
import cultivaLogo from '../assets/cultiva-logo.png';

interface HeaderProps {
  palette: Palette;
  title: string;
  showBack: boolean;
  onBack: () => void;
}

export default function Header({ palette, title, showBack, onBack }: HeaderProps) {
  return (
    <div
      style={{
        background: palette.card,
        color: palette.dark,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
        borderBottom: '1.5px solid rgba(15,45,38,0.08)',
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
            background: 'rgba(15,45,38,0.06)',
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
              borderLeft: `2px solid ${palette.dark}`,
              borderBottom: `2px solid ${palette.dark}`,
              transform: 'rotate(45deg) translate(1px,-1px)',
            }}
          />
        </div>
      )}
      <img
        src={cultivaLogo}
        alt="Cultiva"
        style={{
          height: 28,
          width: 'auto',
          display: 'block',
          flexShrink: 0,
          objectFit: 'contain',
        }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 17,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: palette.dark,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </div>
    </div>
  );
}
