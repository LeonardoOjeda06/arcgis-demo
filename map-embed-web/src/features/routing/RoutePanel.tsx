import { useState } from 'react';
import { api, friendlyError, type RouteResult, type SavedLocation } from '../../api/client';
import { postToHost } from '../../bridge/bridge';
import { formatCoord } from '../../map/graphics';
import { AddressSearch } from '../AddressSearch';
import { Button, Status } from '../../ui/ui';

export type Stop = { lat: number; lng: number; label?: string };
export type StopTarget = 'origin' | 'destination';

type Props = {
  origin?: Stop;
  destination?: Stop;
  target: StopTarget;
  setTarget: (t: StopTarget) => void;
  setStop: (t: StopTarget, s: Stop | undefined) => void;
  canSearch: boolean;
  savedLocations?: SavedLocation[];
  onRoute: (r: RouteResult | undefined) => void;
};

const formatMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

export function RoutePanel({ origin, destination, target, setTarget, setStop, canSearch, savedLocations, onRoute }: Props) {
  const [result, setResult] = useState<RouteResult>();
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function calculate() {
    if (!origin || !destination) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const r = await api.route([
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng },
      ]);
      setResult(r);
      onRoute(r);
      postToHost({ type: 'map:route-calculated', payload: { distanceKm: r.distanceKm, minutes: r.minutes } });
    } catch (e) {
      setResult(undefined);
      onRoute(undefined);
      setMsg(friendlyError(e, 'No se pudo calcular la ruta.'));
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setStop('origin', undefined);
    setStop('destination', undefined);
    setTarget('origin');
    setResult(undefined);
    setMsg(undefined);
    onRoute(undefined);
  }

  const stopRow = (t: StopTarget, s: Stop | undefined, title: string, color: string) => (
    <button
      type="button"
      onClick={() => setTarget(t)}
      aria-pressed={target === t}
      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${
        target === t ? 'border-sky-600 bg-sky-50' : 'border-slate-200 bg-white'
      }`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="font-medium">{title}:</span>
      <span className="truncate text-slate-600">
        {s ? (s.label ?? formatCoord(s.lat, s.lng)) : target === t ? 'haz clic en el mapa' : 'sin definir'}
      </span>
    </button>
  );

  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        {stopRow('origin', origin, 'Origen', '#15803D')}
        {stopRow('destination', destination, 'Destino', '#B91C1C')}
      </div>

      {canSearch && (
        <AddressSearch
          id="route-search"
          label={`Buscar ${target === 'origin' ? 'origen' : 'destino'}`}
          onSelect={(c) => setStop(target, { lat: c.latitude, lng: c.longitude, label: c.address })}
        />
      )}

      {savedLocations && savedLocations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Usar una ubicación guardada como {target === 'origin' ? 'origen' : 'destino'}</p>
          <div className="flex flex-wrap gap-1">
            {savedLocations.slice(0, 5).map((l) => (
              <Button
                key={l.id}
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => setStop(target, { lat: l.latitude, lng: l.longitude, label: l.label ?? l.address })}
              >
                {l.label ?? l.address}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" disabled={!origin || !destination || busy} onClick={calculate}>
          {busy ? 'Calculando…' : 'Calcular ruta'}
        </Button>
        <Button variant="secondary" onClick={clear}>
          Limpiar
        </Button>
      </div>

      {msg && <Status tone="error">{msg}</Status>}

      {result && (
        <div className="space-y-2 rounded-md bg-slate-50 p-2">
          <p className="text-sm">
            <strong>{result.distanceKm.toLocaleString('es-CO')} km</strong> · {formatMinutes(result.minutes)}
          </p>
          {result.directions.length > 0 && (
            <ol className="max-h-40 list-decimal space-y-0.5 overflow-auto pl-5 text-xs text-slate-700">
              {result.directions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
