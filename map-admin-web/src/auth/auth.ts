import { InMemoryWebStorage, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { config } from '../config';

/**
 * Autenticación del panel.
 * - oidc: Authorization Code + PKCE con el SSO corporativo. El access token vive en memoria
 *   (solo el "state" del redirect usa sessionStorage) y la librería lo renueva sola.
 * - dev: se pega el ADMIN_DEV_TOKEN de map-api. Prohibido en producción (map-api no arranca así).
 */

export interface AuthUser {
  name: string;
  accessToken: string;
}

const CALLBACK_PATH = '/callback';
const DEV_KEY = 'map-admin-dev-token';

let manager: UserManager | null = null;
function getManager(): UserManager {
  manager ??= new UserManager({
    authority: config.oidc.authority,
    client_id: config.oidc.clientId,
    redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code', // con PKCE automático
    scope: config.oidc.scope,
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    automaticSilentRenew: true,
  });
  return manager;
}

let current: AuthUser | null = null;
const listeners = new Set<(u: AuthUser | null) => void>();
const emit = (u: AuthUser | null) => {
  current = u;
  listeners.forEach((l) => l(u));
};

export const auth = {
  mode: config.authMode,

  get user() {
    return current;
  },

  subscribe(fn: (u: AuthUser | null) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Al cargar la app: completa el redirect del SSO o recupera la sesión. */
  async init(): Promise<AuthUser | null> {
    if (config.authMode === 'dev') {
      const t = sessionStorage.getItem(DEV_KEY);
      if (t) emit({ name: 'Administrador (desarrollo)', accessToken: t });
      return current;
    }
    const m = getManager();
    m.events.addUserLoaded((u) => emit({ name: u.profile.name ?? u.profile.preferred_username ?? 'Administrador', accessToken: u.access_token }));
    m.events.addUserUnloaded(() => emit(null));
    if (window.location.pathname === CALLBACK_PATH) {
      const u = await m.signinRedirectCallback();
      window.history.replaceState({}, '', '/');
      emit({ name: u.profile.name ?? u.profile.preferred_username ?? 'Administrador', accessToken: u.access_token });
      return current;
    }
    // Sin usuario en memoria: intentamos un login silencioso con la sesión del SSO.
    try {
      const u = await m.signinSilent();
      if (u) emit({ name: u.profile.name ?? 'Administrador', accessToken: u.access_token });
    } catch {
      /* requiere login interactivo */
    }
    return current;
  },

  async login(devToken?: string) {
    if (config.authMode === 'dev') {
      if (!devToken) return;
      // Validar ANTES de entrar, para poder mostrar el error en la pantalla de login.
      const r = await fetch(`${config.apiUrl}/admin/me`, { headers: { Authorization: `Bearer ${devToken}` } }).catch(() => null);
      if (!r) throw new Error('No hay conexión con map-api.');
      if (!r.ok) throw new Error('Token incorrecto.');
      sessionStorage.setItem(DEV_KEY, devToken); // solo desarrollo
      emit({ name: 'Administrador (desarrollo)', accessToken: devToken });
      return;
    }
    await getManager().signinRedirect();
  },

  async logout() {
    if (config.authMode === 'dev') {
      sessionStorage.removeItem(DEV_KEY);
      emit(null);
      return;
    }
    emit(null);
    await getManager().signoutRedirect().catch(() => undefined);
  },
};
