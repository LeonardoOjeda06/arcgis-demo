import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Scope } from 'map-embed-sdk/protocol';
import { isEmbedded, onHostMessage, postToHost, setHostOrigin } from '../bridge/bridge';
import { api } from '../api/client';

type Session = { scopes: Scope[]; expiresAt: number };
export type SessionState =
  | { status: 'waiting' }
  | { status: 'ready'; session: Session }
  | { status: 'error'; message: string };

const Ctx = createContext<SessionState>({ status: 'waiting' });
export const useSession = () => useContext(Ctx);

const HANDSHAKE_TIMEOUT_MS = 15_000;

// Una sola vez por carga de página (StrictMode monta los efectos dos veces en desarrollo).
let readySent = false;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() =>
    isEmbedded()
      ? { status: 'waiting' }
      : { status: 'error', message: 'Este mapa solo funciona incrustado en una aplicación autorizada.' },
  );
  const refreshTimer = useRef<number | undefined>(undefined);
  const ready = useRef(false);

  useEffect(() => {
    if (!isEmbedded()) return;

    const scheduleRefresh = (expiresAt: number) => {
      // Pedir token nuevo 60 s antes de que expire.
      window.clearTimeout(refreshTimer.current);
      const ms = expiresAt * 1000 - Date.now() - 60_000;
      refreshTimer.current = window.setTimeout(() => postToHost({ type: 'map:token-request' }), Math.max(ms, 5_000));
    };

    const off = onHostMessage(async (token, origin, type) => {
      try {
        const info = await api.getSession(token); // Nest valida firma, expiración y estado de la app
        if (info.origin !== origin) throw new Error('Origen no coincide');
        setHostOrigin(origin);
        api.setToken(token);
        scheduleRefresh(info.expiresAt);
        const firstTime = !ready.current;
        ready.current = true;
        setState({ status: 'ready', session: { scopes: info.scopes, expiresAt: info.expiresAt } });
        if (firstTime) postToHost({ type: 'map:session-ready', payload: { scopes: info.scopes } });
      } catch {
        // Si falla una renovación seguimos con el token vigente hasta que expire.
        if (ready.current && type === 'map:token') return;
        setState({ status: 'error', message: 'No se pudo iniciar el mapa. Recarga la página.' });
      }
    });

    // Si la API responde 401 (token vencido o app desactivada), pedimos uno nuevo al host.
    // Como mucho una petición cada 10 s para no entrar en bucle si el host entrega tokens inválidos.
    let lastRequest = 0;
    api.setUnauthorizedHandler(() => {
      if (Date.now() - lastRequest < 10_000) return;
      lastRequest = Date.now();
      postToHost({ type: 'map:token-request' });
    });

    const timeout = window.setTimeout(() => {
      if (!ready.current) setState({ status: 'error', message: 'La aplicación anfitriona no respondió. Recarga la página.' });
    }, HANDSHAKE_TIMEOUT_MS);

    if (!readySent) {
      readySent = true;
      postToHost({ type: 'map:ready' });
    }
    return () => {
      off();
      window.clearTimeout(refreshTimer.current);
      window.clearTimeout(timeout);
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useCan() {
  const s = useSession();
  return (scope: Scope) => s.status === 'ready' && s.session.scopes.includes(scope);
}
