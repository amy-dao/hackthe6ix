import type { CropEntryForm, Field, FarmState } from '../types';

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? `http://${window.location.hostname}:8000`;

let authToken: string | null = null;

/** Sets the bearer token attached to every request below — call with the
 * token returned by signup/login, or null on sign-out. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

let onUnauthorized: (() => void) | null = null;

/** Registered once by App on mount. Fires whenever an authenticated request
 * comes back 401 (the session token no longer matches — e.g. another login
 * on the same account issued a fresh one) so the app can silently
 * re-authenticate instead of getting stuck with a dead token. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
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
    if (res.status === 401 && path !== '/login' && path !== '/signup') {
      onUnauthorized?.();
    }
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

/** Cloud mirror of the whole farm-map drawing (boundary + subplot outlines +
 * their form data) — lets a farmer pick up on a new device without redrawing.
 * Returns null when nothing has been synced for this account yet. */
export function fetchFarmState(): Promise<FarmState | null> {
  return request<FarmState | null>('/farm');
}

/** Autosave call — fire this (debounced) whenever `farm` changes. */
export function saveFarmState(farm: FarmState): Promise<FarmState> {
  return request<FarmState>('/farm', { method: 'PUT', body: JSON.stringify(farm) });
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
  farmerName?: string | null;
  farmName?: string | null;
  location?: string | null;
}

export function signup(username: string, password: string): Promise<User> {
  return request<User>('/signup', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function login(username: string, password: string): Promise<User> {
  return request<User>('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function updateAccount(updates: {
  username?: string;
  password?: string;
  farmerName?: string;
  farmName?: string;
  location?: string;
}): Promise<User> {
  return request<User>('/account', { method: 'PATCH', body: JSON.stringify(updates) });
}

export interface PredictRequestBody {
  soil_type?: string;
  crop_history?: string[];
  next_crop?: string;
  planned_crop?: string;
  current_crop?: string;
  previous_crops?: string[];
  plot_size_hectares?: number;
  acres?: number;
  soil_ph?: number;
  other_features?: Record<string, unknown>;
  subplot_id?: string;
}

export interface SubplotRecommendationsDto {
  rotation_recommendation: number | 'Unknown';
  rotation_probability?: number | null;
  rotation_label?: string | null;
  soil_exhaustion_score: number | 'Unknown';
  npk_deficiency?: 'N' | 'P' | 'K' | null;
  suggested_crops?: string[];
  suggestion_reason?: string | null;
}

export interface PredictResponse {
  subplot_id?: string | null;
  ready: boolean;
  missing_fields: string[];
  rotation_recommendation?: number | null;
  soil_exhaustion_score?: number | null;
  rotation_probability?: number | null;
  rotation_label?: string | null;
  recommendations?: SubplotRecommendationsDto | null;
}

export interface PredictBatchItemResult {
  subplot_id?: string | null;
  ready: boolean;
  missing_fields: string[];
  recommendations?: SubplotRecommendationsDto | null;
}

export function predictRecommendation(payload: PredictRequestBody): Promise<PredictResponse> {
  return request<PredictResponse>('/predict', { method: 'POST', body: JSON.stringify(payload) });
}

export function predictRecommendationsBatch(
  items: PredictRequestBody[],
): Promise<{ predictions: PredictBatchItemResult[] }> {
  return request<{ predictions: PredictBatchItemResult[] }>('/predict/batch', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}
