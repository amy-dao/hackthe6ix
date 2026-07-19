import type { FarmLocation } from './farmLocation';

export interface MonthlyClimate {
  month: number; // 1–12
  label: string;
  avg: number;
  high: number;
  low: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Fetch ~10 years of daily temps from Open-Meteo archive and aggregate to
 * monthly average / high / low (°C). No API key required.
 */
export async function fetchMonthlyClimate(loc: FarmLocation): Promise<MonthlyClimate[]> {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(end.getFullYear() - 10);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', String(loc.latitude));
  url.searchParams.set('longitude', String(loc.longitude));
  url.searchParams.set('start_date', fmt(start));
  url.searchParams.set('end_date', fmt(end));
  url.searchParams.set('daily', 'temperature_2m_mean,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
  const data = (await res.json()) as {
    daily?: {
      time: string[];
      temperature_2m_mean: (number | null)[];
      temperature_2m_max: (number | null)[];
      temperature_2m_min: (number | null)[];
    };
  };
  const daily = data.daily;
  if (!daily?.time?.length) throw new Error('No climate data returned.');

  const buckets: { avg: number[]; high: number[]; low: number[] }[] = Array.from(
    { length: 12 },
    () => ({ avg: [], high: [], low: [] }),
  );

  for (let i = 0; i < daily.time.length; i++) {
    const monthIdx = Number(daily.time[i].slice(5, 7)) - 1;
    const mean = daily.temperature_2m_mean[i];
    const max = daily.temperature_2m_max[i];
    const min = daily.temperature_2m_min[i];
    if (mean != null) buckets[monthIdx].avg.push(mean);
    if (max != null) buckets[monthIdx].high.push(max);
    if (min != null) buckets[monthIdx].low.push(min);
  }

  const mean = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return buckets.map((b, i) => ({
    month: i + 1,
    label: MONTH_LABELS[i],
    avg: Math.round(mean(b.avg) * 10) / 10,
    high: Math.round(mean(b.high) * 10) / 10,
    low: Math.round(mean(b.low) * 10) / 10,
  }));
}
