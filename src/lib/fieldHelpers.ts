import type { FieldStatus } from '../types';
import { statusLabels, type Palette } from '../palette';

export function statusMeta(status: FieldStatus, palette: Palette) {
  const colors = {
    rotate: palette.rotate,
    marginal: palette.marginal,
    safe: palette.safe,
    empty: palette.empty,
    unknown: palette.unknown,
  }[status];
  return { bg: colors.bg, text: colors.text, label: statusLabels[status] };
}

const CROP_ICONS: Record<string, string> = {
  corn: '🌽',
  wheat: '🌾',
  rice: '🌾',
  soybean: '🌱',
  beans: '🫘',
  peas: '🟢',
  tomato: '🍅',
  potato: '🥔',
  pepper: '🌶️',
  cabbage: '🥬',
  broccoli: '🥦',
  carrot: '🥕',
  onion: '🧅',
  lettuce: '🥬',
  clover: '🍀',
};

export function cropIcon(crop: string): string {
  return CROP_ICONS[crop.trim().toLowerCase()] ?? '🌿';
}

export function titleCase(word: string): string {
  return word.length ? word[0].toUpperCase() + word.slice(1) : word;
}
