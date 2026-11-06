import { useEffect, useState } from 'react';

/** Enrutado mínimo por hash (#/apps, #/apps/12, #/audit?target=12). */
export type Route =
  | { name: 'apps' }
  | { name: 'app'; id: number }
  | { name: 'audit'; target?: string };

export function parseRoute(hash: string): Route {
  const [path, qs = ''] = hash.replace(/^#/, '').split('?');
  const m = path.match(/^\/apps\/(\d+)$/);
  if (m) return { name: 'app', id: Number(m[1]) };
  if (path === '/audit') return { name: 'audit', target: new URLSearchParams(qs).get('target') ?? undefined };
  return { name: 'apps' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
