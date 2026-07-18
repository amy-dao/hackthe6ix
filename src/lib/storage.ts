import type { FarmState, PersistedSession } from '../types';

const STORAGE_KEY = 'field-intelligence-farm-v1';

export const EMPTY_FARM: FarmState = {
  farmPolygon: null,
  farmAreaAcres: 0,
  subplots: [],
};

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
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

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
