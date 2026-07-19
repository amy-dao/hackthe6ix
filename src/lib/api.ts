import type { CropEntryForm, Field } from '../types';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? `http://${window.location.hostname}:8000`;

let authToken: string | null = null;

/** Sets the bearer token attached to every request below — call with the
 * token returned by signup/login, or null on sign-out. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = (() => {
      try {
        const parsed = (JSON.parse(body) as { detail?: unknown }).detail;
        if (typeof parsed === 'string') return parsed;
        if (Array.isArray(parsed)) {
          return parsed.map((e) => (e && typeof e === 'object' && 'msg' in e ? String(e.msg) : String(e))).join('; ');
        }
        return undefined;
      } catch {
        return undefined;
      }
    })();
    throw new Error(detail ?? `Request to ${path} failed (${res.status})${body ? `: ${body}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchFields(): Promise<Field[]> {
  return request<Field[]>('/fields');
}

export interface ReferenceData {
  soilTypes: string[];
  crops: string[];
}

export function fetchReference(): Promise<ReferenceData> {
  return request<ReferenceData>('/reference');
}

export function addField(payload: {
  name: string;
  acres?: number | string;
  soilPh?: number;
  soilType?: string;
  cropEntries: CropEntryForm[];
}): Promise<Field> {
  return request<Field>('/fields', { method: 'POST', body: JSON.stringify(payload) });
}

export function syncField(payload: {
  name: string;
  acres: number;
  soilPh?: number;
  soilType?: string;
  cropEntries: CropEntryForm[];
}): Promise<Field> {
  return request<Field>('/fields/sync', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateField(
  id: string,
  payload: { name?: string; acres?: number | string; soilPh?: number; soilType?: string; history?: Field['history'] },
): Promise<Field> {
  return request<Field>(`/fields/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function setFieldCrop(id: string, cropName: string): Promise<Field> {
  return request<Field>(`/fields/${id}/crop`, { method: 'PATCH', body: JSON.stringify({ cropName }) });
}

export function clearFieldCrop(id: string): Promise<Field> {
  return request<Field>(`/fields/${id}/crop`, { method: 'DELETE' });
}

export function deleteField(id: string): Promise<void> {
  return request<void>(`/fields/${id}`, { method: 'DELETE' });
}

export type ActionTier = 'monitor' | 'spot_treat' | 'broader_concern';

export interface IdentifyResult {
  isPlant: boolean;
  species: string | null;
  isWeed: boolean | null;
  actionTier: ActionTier | null;
  reason: string;
}

export function identify(payload: { imageBase64?: string; description?: string }): Promise<IdentifyResult> {
  return request<IdentifyResult>('/identify', { method: 'POST', body: JSON.stringify(payload) });
}

export interface User {
  id: string;
  username: string;
  token: string;
}

export function signup(username: string, password: string): Promise<User> {
  return request<User>('/signup', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function login(username: string, password: string): Promise<User> {
  return request<User>('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function updateAccount(updates: { username?: string; password?: string }): Promise<User> {
  return request<User>('/account', { method: 'PATCH', body: JSON.stringify(updates) });
}
