import type { Field, FieldStatus, PlantingRecord } from '../types';
import { statusLabels, type Palette } from '../palette';

export function statusMeta(status: FieldStatus, palette: Palette) {
  const colors = { rotate: palette.rotate, marginal: palette.marginal, safe: palette.safe, empty: palette.empty }[status];
  return { bg: colors.bg, text: colors.text, label: statusLabels[status] };
}

function withOutgoingCropLogged(f: Field, endLabel: string): PlantingRecord[] {
  if (f.status === 'empty') return f.history;
  const entry: PlantingRecord = { crop: f.crop, period: `Through ${endLabel}` };
  return [entry, ...f.history];
}

export function emptyField(f: Field): Field {
  return {
    ...f,
    crop: 'No crop planted',
    status: 'empty',
    risk: 0,
    confidence: '—',
    reason: 'This field is currently empty. Rotation guidance resumes once a new crop is planted.',
    suggestedCrops: [],
    durationLabel: 'Status',
    durationRange: 'Awaiting new planting',
    history: withOutgoingCropLogged(f, formatToday()),
  };
}

export function plantedField(f: Field, cropName: string, dateLabel?: string): Field {
  const changedCrop = f.status === 'empty' || f.crop !== cropName;
  return {
    ...f,
    crop: cropName,
    status: 'safe',
    risk: 8,
    confidence: 'High',
    reason: dateLabel
      ? `${cropName} was planted on ${dateLabel}. Rotation history will build as data accumulates.`
      : `${cropName} was just planted here — rotation history will build as data accumulates over the season.`,
    suggestedCrops: [],
    durationLabel: 'Next rotation decision',
    durationRange: 'Reassess in ~90 days',
    lastScan: dateLabel ? 'Just added' : f.lastScan,
    history: changedCrop ? withOutgoingCropLogged(f, dateLabel ?? formatToday()) : f.history,
  };
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return 'today';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatToday(): string {
  return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
