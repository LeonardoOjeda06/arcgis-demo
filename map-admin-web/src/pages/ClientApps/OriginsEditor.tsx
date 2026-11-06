import { useState, type FormEvent } from 'react';
import { adminApi, errorText, originProblem, type ClientApp } from '../../api/admin';
import { Button, StatusText, inputClass } from '../../components/ui';

export function OriginsEditor({ app, onSaved }: { app: ClientApp; onSaved: (a: ClientApp) => void }) {
  const [origins, setOrigins] = useState<string[]>(app.origins);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<{ tone: 'ok' | 'error' | 'info'; text: string }>();
  const [busy, setBusy] = useState(false);

  const dirty = origins.length !== app.origins.length || origins.some((o) => !app.origins.includes(o));

  function add(e: FormEvent) {
    e.preventDefault();
    const o = draft.trim();
    const problem = originProblem(o);
    if (problem) return setStatus({ tone: 'error', text: `El origen ${problem}.` });
    if (origins.includes(o)) return setStatus({ tone: 'error', text: 'Ese origen ya está en la lista.' });
    setOrigins([...origins, o]);
    setDraft('');
    setStatus(undefined);
  }

  async function save() {
    setBusy(true);
    setStatus({ tone: 'info', text: 'Guardando…' });
    try {
      const updated = await adminApi.setOrigins(app.id, origins);
      setStatus({ tone: 'ok', text: 'Orígenes actualizados.' });
      onSaved(updated);
    } catch (e) {
      setStatus({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Sitios que pueden incrustar el mapa y pedir tokens. Origen exacto: <code>https://dominio[:puerto]</code>, sin ruta ni / final.
      </p>
      {origins.length === 0 ? (
        <StatusText>Sin orígenes: ningún sitio puede usar esta aplicación.</StatusText>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {origins.map((o) => (
            <li key={o} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <code className="text-sm break-all">{o}</code>
              <Button variant="ghost" className="text-xs" onClick={() => setOrigins(origins.filter((x) => x !== o))}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-origin" className="sr-only">
          Nuevo origen
        </label>
        <input
          id="new-origin"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
          placeholder="https://portal.cliente.gov.co"
          maxLength={255}
        />
        <Button type="submit" variant="secondary">
          Agregar
        </Button>
      </form>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || busy}>
          Guardar orígenes
        </Button>
        {status && <StatusText tone={status.tone}>{status.text}</StatusText>}
      </div>
    </div>
  );
}
