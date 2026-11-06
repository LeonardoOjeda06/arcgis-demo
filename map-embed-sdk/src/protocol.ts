export const PROTOCOL = 'map-embed/v1';

export type Scope = 'location:read' | 'location:write' | 'geocode:search' | 'route:calculate';

export interface SavedLocationPayload {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
}

export interface RouteCalculatedPayload {
  distanceKm: number;
  minutes: number;
}

export type EmbedErrorCode = 'FORBIDDEN' | 'EXPIRED' | 'UNAVAILABLE';

// host → iframe
export type HostMessage =
  | { protocol: typeof PROTOCOL; type: 'map:init'; payload: { token: string } }
  | { protocol: typeof PROTOCOL; type: 'map:token'; payload: { token: string } };

// iframe → host
export type EmbedMessage =
  | { protocol: typeof PROTOCOL; type: 'map:ready' }
  | { protocol: typeof PROTOCOL; type: 'map:session-ready'; payload: { scopes: Scope[] } }
  | { protocol: typeof PROTOCOL; type: 'map:token-request' }
  | { protocol: typeof PROTOCOL; type: 'map:location-saved'; payload: SavedLocationPayload }
  | { protocol: typeof PROTOCOL; type: 'map:location-deleted'; payload: { id: number } }
  | { protocol: typeof PROTOCOL; type: 'map:route-calculated'; payload: RouteCalculatedPayload }
  | { protocol: typeof PROTOCOL; type: 'map:error'; payload: { code: EmbedErrorCode; message: string } };

export type EmbedMessageType = EmbedMessage['type'];

const EMBED_TYPES: ReadonlySet<string> = new Set<EmbedMessageType>([
  'map:ready',
  'map:session-ready',
  'map:token-request',
  'map:location-saved',
  'map:location-deleted',
  'map:route-calculated',
  'map:error',
]);

/** Comprobación de forma mínima para mensajes que llegan del iframe. */
export function isEmbedMessage(data: unknown): data is EmbedMessage {
  if (!data || typeof data !== 'object') return false;
  const m = data as { protocol?: unknown; type?: unknown };
  return m.protocol === PROTOCOL && typeof m.type === 'string' && EMBED_TYPES.has(m.type);
}
