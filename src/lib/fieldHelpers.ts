import type { FieldStatus } from '../types';
import { statusLabels, type Palette } from '../palette';

export function statusMeta(status: FieldStatus, palette: Palette) {
  const colors = { rotate: palette.rotate, marginal: palette.marginal, safe: palette.safe, empty: palette.empty }[status];
  return { bg: colors.bg, text: colors.text, label: statusLabels[status] };
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return 'today';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const CROP_ICONS: Record<string, string> = {
  Corn: '🌽',
  Soybeans: '🌱',
  Wheat: '🌾',
  Alfalfa: '🍀',
  Oats: '🌾',
};

export function cropIcon(crop: string): string {
  return CROP_ICONS[crop] ?? '🌿';
}
