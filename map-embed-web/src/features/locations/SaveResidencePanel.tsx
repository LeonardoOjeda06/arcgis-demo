import { useEffect, useState } from 'react';
import { api, friendlyError } from '../../api/client';
import { postToHost } from '../../bridge/bridge';
import { formatCoord, round6 } from '../../map/graphics';
import { AddressSearch } from '../AddressSearch';
import { Button, Status, inputClass } from '../../ui/ui';

export type Picked = { lat: number; lng: number; address?: string | null };

type Props = {
  picked?: Picked;
  onPick: (p: Picked) => void;
  canSearch: boolean;
  onSaved: () => void;
};

export function SaveResidencePanel({ picked, onPick, canSearch, onSaved }: Props) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('Residencia');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string }>();
  const [busy, setBusy] = useState(false);

  // Si el punto trae una dirección (búsqueda o geocodificación inversa), la proponemos.
  useEffect(() => {
    if (picked?.address) setAddress(picked.address.slice(0, 250));
  }, [picked?.address]);

  async function save() {
    if (!picked || !address.trim()) return;
    setBusy(true);
    setMsg(undefined);
    const body = {
      latitude: round6(picked.lat),
      longitude: round6(picked.lng),
      address: address.trim(),
      label: label.trim() || undefined,
    };
    try {
      const { id } = await api.saveLocation(body);
      setMsg({ tone: 'ok', text: 'Residencia guardada.' });
      postToHost({
        type: 'map:location-saved',
        payload: { id, address: body.address, latitude: body.latitude, longitude: body.longitude },
      });
      onSaved();
    } catch (e) {
      setMsg({ tone: 'error', text: friendlyError(e, 'No se pudo guardar.') });
      if ((e as { status?: number }).status === 403) {
        postToHost({ type: 'map:error', payload: { code: 'FORBIDDEN', message: 'Sin permiso para guardar' } });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      {canSearch && (
        <AddressSearch
          id="residence-search"
          label="Buscar dirección"
          onSelect={(c) => onPick({ lat: c.latitude, lng: c.longitude, address: c.address })}
        />
      )}

      <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
        {picked ? (
          <>
            Punto marcado: <span className="font-mono">{formatCoord(picked.lat, picked.lng)}</span>
          </>
        ) : (
          'Haz clic en el mapa para marcar el punto de la residencia.'
        )}
      </p>

      <div className="space-y-1.5">
        <label htmlFor="residence-address" className="block text-xs font-medium text-slate-600">
          Dirección
        </label>
        <input
          id="residence-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={250}
          className={`${inputClass} w-full`}
          placeholder="Calle 10 # 20-30, Bogotá"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="residence-label" className="block text-xs font-medium text-slate-600">
          Etiqueta (opcional)
        </label>
        <input
          id="residence-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          className={`${inputClass} w-full`}
        />
      </div>

      <Button className="w-full" disabled={!picked || !address.trim() || busy} onClick={save}>
        {busy ? 'Guardando…' : 'Guardar como residencia'}
      </Button>
      {msg && <Status tone={msg.tone}>{msg.text}</Status>}
    </section>
  );
}
