export const SUBPLOT_COLORS = [
  '#3E7B4F',
  '#5FA8D3',
  '#E0A030',
  '#A5502E',
  '#6B5B95',
  '#2E8B8B',
  '#C0392B',
  '#4F6B4A',
];

export const SOIL_TEXTURE_OPTIONS: { value: import('../types').SoilTexture; label: string }[] = [
  { value: 'sandy', label: 'Sandy' },
  { value: 'sandy-loam', label: 'Sandy loam' },
  { value: 'loam', label: 'Loam' },
  { value: 'silt-loam', label: 'Silt loam' },
  { value: 'clay-loam', label: 'Clay loam' },
  { value: 'clay', label: 'Clay' },
  { value: 'silty-clay', label: 'Silty clay' },
];

export const PREVIOUS_CROP_SUGGESTIONS = [
  'Corn',
  'Soybeans',
  'Wheat',
  'Alfalfa',
  'Oats',
  'Barley',
  'Cover crop',
  'Fallow',
];

export function nextSubplotColor(index: number): string {
  return SUBPLOT_COLORS[index % SUBPLOT_COLORS.length];
}

export function emptySubplotData(name = ''): import('../types').SubplotData {
  return {
    name,
    soilPh: '',
    soilTexture: '',
    previousCrops: '',
  };
}
