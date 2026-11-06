import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SessionProvider, useCan, useSession } from './session/SessionProvider';
import { MapCanvas, type MapLayers } from './map/MapCanvas';
import { COLORS, pointGraphic, routeGraphic } from './map/graphics';
import { api, friendlyError, type RouteResult, type SavedLocation } from './api/client';
import { SaveResidencePanel, type Picked } from './features/locations/SaveResidencePanel';
import { MyLocationsPanel } from './features/locations/MyLocationsPanel';
import { RoutePanel, type Stop, type StopTarget } from './features/routing/RoutePanel';

type Tool = 'residence' | 'mine' | 'route';

function Shell() {
  const session = useSession();
  const can = useCan();
  const [map, setMap] = useState<MapLayers>();
  const [selectedTool, setTool] = useState<Tool>();
  const [collapsed, setCollapsed] = useState(false);

  // Estado de cada herramienta
  const [picked, setPicked] = useState<Picked>();
  const [saved, setSaved] = useState<SavedLocation[]>();
  const [savedError, setSavedError] = useState<string>();
  const [origin, setOrigin] = useState<Stop>();
  const [destination, setDestination] = useState<Stop>();
  const [stopTarget, setStopTarget] = useState<StopTarget>('origin');

  const canRead = can('location:read');
  const canWrite = can('location:write');
  const canSearch = can('geocode:search');
  const canRoute = can('route:calculate');

  const tools = useMemo(() => {
    const t: { id: Tool; label: string }[] = [];
    if (canWrite) t.push({ id: 'residence', label: 'Guardar residencia' });
    if (canRead) t.push({ id: 'mine', label: 'Mis ubicaciones' });
    if (canRoute) t.push({ id: 'route', label: 'Ruta' });
    return t;
  }, [canWrite, canRead, canRoute]);

  // Si la herramienta elegida deja de estar permitida, se usa la primera disponible.
  const tool = tools.some((t) => t.id === selectedTool) ? selectedTool : tools[0]?.id;

  const loadSaved = useCallback(async () => {
    if (!canRead) return setSaved(undefined);
    setSavedError(undefined);
    try {
      setSaved(await api.myLocations());
    } catch (e) {
      setSavedError(friendlyError(e, 'No se pudieron cargar tus ubicaciones.'));
    }
  }, [canRead]);

  useEffect(() => {
    if (session.status === 'ready') void loadSaved();
  }, [session.status, loadSaved]);

  // Dibujar ubicaciones guardadas
  useEffect(() => {
    if (!map) return;
    map.saved.removeAll();
    (saved ?? []).forEach((l) => map.saved.add(pointGraphic(l.latitude, l.longitude, COLORS.saved, 10)));
  }, [map, saved]);

  // Dibujar selección según la herramienta activa
  useEffect(() => {
    if (!map) return;
    map.pick.removeAll();
    if (tool === 'residence' && picked) map.pick.add(pointGraphic(picked.lat, picked.lng, COLORS.pick));
    if (tool === 'route') {
      if (origin) map.pick.add(pointGraphic(origin.lat, origin.lng, COLORS.origin));
      if (destination) map.pick.add(pointGraphic(destination.lat, destination.lng, COLORS.destination));
    }
    if (tool !== 'route') map.route.removeAll();
  }, [map, tool, picked, origin, destination]);

  const goTo = useCallback(
    (lat: number, lng: number) => void map?.view.goTo({ center: [lng, lat], zoom: Math.max(map.view.zoom, 16) }).catch(() => undefined),
    [map],
  );

  const pickResidence = useCallback(
    async (p: Picked, fromMap: boolean) => {
      setPicked(p);
      if (!fromMap) goTo(p.lat, p.lng);
      if (fromMap && canSearch) {
        // Proponer la dirección del punto marcado (geocodificación inversa).
        try {
          const r = await api.reverseGeocode({ latitude: p.lat, longitude: p.lng });
          if (r.address) setPicked((cur) => (cur && cur.lat === p.lat && cur.lng === p.lng ? { ...cur, address: r.address } : cur));
        } catch {
          /* el usuario puede escribir la dirección a mano */
        }
      }
    },
    [canSearch, goTo],
  );

  const setStop = useCallback(
    (t: StopTarget, s: Stop | undefined) => {
      (t === 'origin' ? setOrigin : setDestination)(s);
      if (s && t === 'origin') setStopTarget('destination');
      if (s) goTo(s.lat, s.lng);
    },
    [goTo],
  );

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (tool === 'residence') void pickResidence({ lat, lng }, true);
      if (tool === 'route') {
        (stopTarget === 'origin' ? setOrigin : setDestination)({ lat, lng });
        if (stopTarget === 'origin') setStopTarget('destination');
      }
    },
    [tool, stopTarget, pickResidence],
  );

  const showRoute = useCallback(
    (r: RouteResult | undefined) => {
      if (!map) return;
      map.route.removeAll();
      if (!r) return;
      const g = routeGraphic(r.path);
      map.route.add(g);
      if (g.geometry) void map.view.goTo(g.geometry, { animate: true }).catch(() => undefined);
    },
    [map],
  );

  if (session.status === 'waiting') return <Center>Cargando mapa…</Center>;
  if (session.status === 'error') return <Center>{session.message}</Center>;

  return (
    <div className="relative h-full">
      <MapCanvas onReady={setMap} onPick={onMapClick} />

      <aside className="absolute left-3 top-3 w-80 max-w-[calc(100%-1.5rem)] rounded-lg bg-white/95 shadow-lg ring-1 ring-slate-900/5 backdrop-blur">
        {tools.length === 0 ? (
          <p className="p-3 text-sm text-slate-600">Esta aplicación solo tiene acceso de consulta al mapa.</p>
        ) : (
          <>
            <div className="flex items-center gap-1 border-b border-slate-200 p-1.5">
              <nav className="flex min-w-0 flex-1 gap-1" aria-label="Herramientas">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTool(t.id);
                      setCollapsed(false);
                    }}
                    aria-current={tool === t.id}
                    className={`truncate rounded-md px-2 py-1 text-xs font-medium ${
                      tool === t.id ? 'bg-sky-800 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Mostrar panel' : 'Ocultar panel'}
              >
                {collapsed ? '▾' : '▴'}
              </button>
            </div>

            {!collapsed && (
              <div className="max-h-[calc(100vh-6rem)] overflow-auto p-3">
                {tool === 'residence' && (
                  <SaveResidencePanel
                    picked={picked}
                    onPick={(p) => void pickResidence(p, false)}
                    canSearch={canSearch}
                    onSaved={() => void loadSaved()}
                  />
                )}
                {tool === 'mine' && (
                  <MyLocationsPanel
                    items={saved}
                    error={savedError}
                    canDelete={canWrite}
                    onFocus={(l) => goTo(l.latitude, l.longitude)}
                    onChanged={() => void loadSaved()}
                  />
                )}
                {tool === 'route' && (
                  <RoutePanel
                    origin={origin}
                    destination={destination}
                    target={stopTarget}
                    setTarget={setStopTarget}
                    setStop={setStop}
                    canSearch={canSearch}
                    savedLocations={canRead ? saved : undefined}
                    onRoute={showRoute}
                  />
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

const Center = ({ children }: { children: ReactNode }) => (
  <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-600">{children}</div>
);

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
