export const SCOPES = ['location:read', 'location:write', 'geocode:search', 'route:calculate'] as const;
export type Scope = (typeof SCOPES)[number];

export const isScope = (v: string): v is Scope => (SCOPES as readonly string[]).includes(v);
