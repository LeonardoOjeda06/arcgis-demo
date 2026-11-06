const env = import.meta.env;

export const config = {
  apiUrl: (env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000/api/v1',
  authMode: (env.VITE_ADMIN_AUTH_MODE as string | undefined) === 'oidc' ? ('oidc' as const) : ('dev' as const),
  oidc: {
    authority: (env.VITE_OIDC_AUTHORITY as string | undefined) ?? '',
    clientId: (env.VITE_OIDC_CLIENT_ID as string | undefined) ?? '',
    scope: (env.VITE_OIDC_SCOPE as string | undefined) || 'openid profile email',
  },
  embedUrl: (env.VITE_EMBED_URL as string | undefined) ?? 'http://localhost:5173/embed',
};
