import { useState } from 'react';
import { api, friendlyError, type SavedLocation } from '../../api/client';
import { postToHost } from '../../bridge/bridge';
import { Button, Status } from '../../ui/ui';

type Props = {
  items: SavedLocation[] | undefined;
  error?: string;
  canDelete: boolean;
  onFocus: (l: SavedLocation) => void;
  onChanged: () => void;
};

export function MyLocationsPanel({ items, error, canDelete, onFocus, onChanged }: Props) {
  const [msg, setMsg] = useState<string>();
  const [busyId, setBusyId] = useState<number>();

  async function remove(l: SavedLocation) {
    if (!window.confirm(`¿Eliminar "${l.label ?? l.address}"?`)) return;
    setBusyId(l.id);
    setMsg(undefined);
    try {
      await api.deleteLocation(l.id);
      postToHost({ type: 'map:location-deleted', payload: { id: l.id } });
      onChanged();
    } catch (e) {
      setMsg(friendlyError(e, 'No se pudo eliminar.'));
    } finally {
      setBusyId(undefined);
    }
  }

  if (error) return <Status tone="error">{error}</Status>;
  if (!items) return <Status>Cargando ubicaciones…</Status>;
  if (!items.length) return <Status>Aún no tienes ubicaciones guardadas.</Status>;

  return (
    <section className="space-y-2">
      <ul className="max-h-64 space-y-1.5 overflow-auto">
        {items.map((l) => (
          <li key={l.id} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2">
            <button type="button" onClick={() => onFocus(l)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium">{l.label ?? 'Ubicación'}</span>
              <span className="block truncate text-xs text-slate-600">{l.address}</span>
            </button>
            {canDelete && (
              <Button variant="ghost" className="px-2 text-xs" disabled={busyId === l.id} onClick={() => remove(l)}>
                Eliminar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {msg && <Status tone="error">{msg}</Status>}
    </section>
  );
}
