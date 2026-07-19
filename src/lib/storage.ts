import type { FarmState, PersistedSession } from '../types';

const STORAGE_KEY = 'field-intelligence-farm-v1';

export const EMPTY_FARM: FarmState = {
  farmPolygon: null,
  farmAreaAcres: 0,
  subplots: [],
};

function isValidSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.userName !== 'string' || typeof v.token !== 'string') return false;
  const farm = v.farm as Record<string, unknown> | undefined;
  return (
    !!farm &&
    typeof farm === 'object' &&
    (farm.farmPolygon === null || Array.isArray(farm.farmPolygon)) &&
    typeof farm.farmAreaAcres === 'number' &&
    Array.isArray(farm.subplots)
  );
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode errors
  }
}

