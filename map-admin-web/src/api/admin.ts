import { config } from '../config';
import { auth } from '../auth/auth';

export type Scope = 'location:read' | 'location:write' | 'geocode:search' | 'route:calculate';

export const ALL_PERMISSIONS: { code: Scope; label: string }[] = [
  { code: 'location:read', label: 'Ver ubicaciones guardadas' },
  { code: 'location:write', label: 'Guardar residencia' },
  { code: 'geocode:search', label: 'Buscar direcciones' },
  { code: 'route:calculate', label: 'Calcular rutas' },
];

export interface ClientApp {
  id: number;
  clientId: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED';
  origins: string[];
  permissions: Scope[];
  secretRotatedAt: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface AuditEntry {
  id: number;
  actorType: 'ADMIN' | 'CLIENT' | 'SYSTEM';
  actorId: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditQuery {
  action?: string;
  actorType?: string;
  target?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.user?.accessToken;
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con map-api.');
  }
  if (res.status === 401) {
    void auth.logout();
    throw new ApiError(401, 'La sesión expiró. Inicia sesión de nuevo.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown; requestId?: string };
    const msg = Array.isArray(body.message) ? body.message.join('. ') : String(body.message ?? `Error ${res.status}`);
    throw new ApiError(res.status, res.status === 403 ? 'Tu usuario no tiene el rol de administrador.' : msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });

export const adminApi = {
  me: () => request<{ id: string; name?: string }>('/admin/me'),
  list: () => request<ClientApp[]>('/admin/client-apps'),
  get: (id: number) => request<ClientApp>(`/admin/client-apps/${id}`),
  create: (b: { name: string; clientId?: string; origins: string[]; permissions: Scope[] }) =>
    request<{ app: ClientApp; clientSecret: string }>('/admin/client-apps', { method: 'POST', body: JSON.stringify(b) }),
  setPermissions: (id: number, permissions: Scope[]) => request<ClientApp>(`/admin/client-apps/${id}/permissions`, put({ permissions })),
  setOrigins: (id: number, origins: string[]) => request<ClientApp>(`/admin/client-apps/${id}/origins`, put({ origins })),
  rotateSecret: (id: number) => request<{ clientSecret: string }>(`/admin/client-apps/${id}/rotate-secret`, { method: 'POST' }),
  setStatus: (id: number, status: 'ACTIVE' | 'DISABLED') =>
    request<ClientApp>(`/admin/client-apps/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  audit: (q: AuditQuery) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && p.set(k, String(v)));
    return request<{ items: AuditEntry[]; total: number; page: number; pageSize: number }>(`/admin/audit?${p}`);
  },
};

export const errorText = (e: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.') =>
  e instanceof ApiError ? e.message : fallback;

/** Valida un origen exacto como lo hace el backend. */
export function originProblem(o: string): string | null {
  let u: URL;
  try {
    u = new URL(o);
  } catch {
    return 'no es una URL válida';
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return 'debe usar https (http solo para localhost)';
  if (u.origin !== o) return `debe ser exacto, sin ruta ni / final: ${u.origin}`;
  return null;
}
