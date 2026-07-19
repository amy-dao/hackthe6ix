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

export function nextSubplotColor(index: number): string {
  return SUBPLOT_COLORS[index % SUBPLOT_COLORS.length];
}

export function emptySubplotData(name = ''): import('../types').SubplotData {
  return {
    name,
    soilPh: '',
    soilType: '',
    cropEntries: [],
  };
}
