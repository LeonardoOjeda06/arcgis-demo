import type { Scope } from 'map-embed-sdk/protocol';
import { config } from '../config';

export interface SessionInfo {
  scopes: Scope[];
  origin: string;
  expiresAt: number; // segundos epoch
}

export interface SavedLocation {
  id: number;
  label: string | null;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface GeocodeCandidate {
  address: string;
  latitude: number;
  longitude: number;
  score: number;
}

export interface RouteResult {
  distanceKm: number;
  minutes: number;
  path: number[][][];
  directions: string[];
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let token: string | null = null; // en memoria, NUNCA en localStorage
let onUnauthorized: (() => void) | null = null;

async function request<T>(path: string, init: RequestInit = {}, explicitToken?: string): Promise<T> {
  const auth = explicitToken ?? token;
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        ...init.headers,
      },
      credentials: 'omit', // no enviar cookies: usamos Bearer
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new ApiError(0, 'Sin conexión con el servicio de mapas');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    if (res.status === 401 && !explicitToken) onUnauthorized?.();
    const msg = Array.isArray(body.message) ? body.message.join('. ') : String(body.message ?? 'Error');
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  setToken: (t: string) => {
    token = t;
  },
  setUnauthorizedHandler: (fn: () => void) => {
    onUnauthorized = fn;
  },
  getSession: (t: string) => request<SessionInfo>('/embed/session', {}, t),
  saveLocation: (b: LatLng & { address: string; label?: string }) =>
    request<{ id: number; createdAt: string }>('/locations', { method: 'POST', body: JSON.stringify(b) }),
  myLocations: () => request<SavedLocation[]>('/locations/mine'),
  deleteLocation: (id: number) => request<void>(`/locations/${id}`, { method: 'DELETE' }),
  geocode: (q: string) => request<GeocodeCandidate[]>(`/geocode?q=${encodeURIComponent(q)}`),
  reverseGeocode: (p: LatLng) =>
    request<{ address: string | null }>(`/geocode/reverse?lat=${p.latitude}&lng=${p.longitude}`),
  route: (stops: LatLng[]) => request<RouteResult>('/routes', { method: 'POST', body: JSON.stringify({ stops }) }),
};

/** Mensaje amigable según el código HTTP. */
export function friendlyError(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  if (e.status === 403) return 'Esta aplicación no tiene permiso para esta acción.';
  if (e.status === 401) return 'La sesión expiró. Reintentando…';
  if (e.status === 429) return 'Demasiadas solicitudes. Espera un momento.';
  if (e.status === 502 || e.status === 0) return 'El servicio de mapas no está disponible. Intenta más tarde.';
  return fallback;
}
