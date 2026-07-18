import type { ColorMode, FieldStatus } from './types';

interface StatusColor {
  bg: string;
  text: string;
}

export interface Palette {
  bg: string;
  card: string;
  dark: string;
  offwhite: string;
  muted: string;
  accent: string;
  rotate: StatusColor;
  marginal: StatusColor;
  safe: StatusColor;
  empty: StatusColor;
  unknown: StatusColor;
}

export const palettes: Record<ColorMode, Palette> = {
  'traffic-light': {
    bg: '#F5F3EC',
    card: '#FFFFFF',
    dark: '#0F2D26',
    offwhite: '#F5F3EC',
    muted: '#6B7A72',
    accent: '#5FA8D3',
    rotate: { bg: '#C0392B', text: '#FFFFFF' },
    marginal: { bg: '#E0A030', text: '#2A2410' },
    safe: { bg: '#3E7B4F', text: '#FFFFFF' },
    empty: { bg: '#C9C6BC', text: '#2A2410' },
    unknown: { bg: '#5FA8D3', text: '#FFFFFF' },
  },
  'earth-tone': {
    bg: '#F5F3EC',
    card: '#FFFFFF',
    dark: '#0F2D26',
    offwhite: '#F5F3EC',
    muted: '#6B7A72',
    accent: '#5FA8D3',
    rotate: { bg: '#A5502E', text: '#FFFFFF' },
    marginal: { bg: '#B8935A', text: '#2A2410' },
    safe: { bg: '#4F6B4A', text: '#FFFFFF' },
    empty: { bg: '#C9C6BC', text: '#2A2410' },
    unknown: { bg: '#5FA8D3', text: '#FFFFFF' },
  },
};

export const statusLabels: Record<FieldStatus, string> = {
  rotate: 'Rotate now',
  marginal: 'Marginal',
  safe: 'Safe to repeat',
  empty: 'No crop planted',
  unknown: 'Needs history',
};

export function statusColorsFor(palette: Palette): Record<FieldStatus, StatusColor> {
  return {
    rotate: palette.rotate,
    marginal: palette.marginal,
    safe: palette.safe,
    empty: palette.empty,
    unknown: palette.unknown,
  };
}
