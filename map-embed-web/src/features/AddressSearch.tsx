import { useState, type FormEvent } from 'react';
import { api, friendlyError, type GeocodeCandidate } from '../api/client';
import { Button, Status, inputClass } from '../ui/ui';

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  onSelect: (c: GeocodeCandidate) => void;
};

/** Buscador de direcciones (requiere geocode:search). */
export function AddressSearch({ id, label, placeholder = 'Calle 10 # 20-30', onSelect }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeocodeCandidate[]>([]);
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 3) return setMsg('Escribe al menos 3 caracteres.');
    setBusy(true);
    setMsg(undefined);
    try {
      const r = await api.geocode(q.trim());
      setResults(r);
      if (!r.length) setMsg('No se encontraron direcciones.');
    } catch (err) {
      setMsg(friendlyError(err, 'No se pudo buscar la dirección.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={search} className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={200}
          className={inputClass}
          placeholder={placeholder}
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? '…' : 'Buscar'}
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="max-h-36 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 bg-white">
          {results.map((r) => (
            <li key={`${r.latitude},${r.longitude},${r.address}`}>
              <button
                type="button"
                className="block w-full px-2 py-1.5 text-left text-xs hover:bg-sky-50"
                onClick={() => {
                  onSelect(r);
                  setResults([]);
                  setQ(r.address);
                }}
              >
                {r.address}
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <Status tone="error">{msg}</Status>}
    </form>
  );
}
