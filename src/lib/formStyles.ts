import type { CSSProperties } from 'react';
import type { Palette } from '../palette';

export function fieldLabelStyle(palette: Palette): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  };
}

export function fieldInputStyle(palette: Palette): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    border: '1.5px solid rgba(15,45,38,0.15)',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    fontFamily: 'inherit',
    color: palette.dark,
    background: palette.bg,
  };
}
