import { useState } from 'react';
import { ALL_PERMISSIONS, adminApi, errorText, type ClientApp, type Scope } from '../../api/admin';
import { Button, StatusText } from '../../components/ui';

export function PermissionsEditor({ app, onSaved }: { app: ClientApp; onSaved: (a: ClientApp) => void }) {
  const [selected, setSelected] = useState(new Set<Scope>(app.permissions));
  const [status, setStatus] = useState<{ tone: 'ok' | 'error' | 'info'; text: string }>();
  const [busy, setBusy] = useState(false);

  const dirty = selected.size !== app.permissions.length || app.permissions.some((p) => !selected.has(p));

  const toggle = (c: Scope) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  async function save() {
    setBusy(true);
    setStatus({ tone: 'info', text: 'Guardando…' });
    try {
      const updated = await adminApi.setPermissions(app.id, [...selected]);
      setStatus({ tone: 'ok', text: 'Permisos actualizados. Aplican de inmediato (máx. 60 s).' });
      onSaved(updated);
    } catch (e) {
      setStatus({ tone: 'error', text: errorText(e, 'No se pudieron guardar los permisos. Intenta de nuevo.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Permisos</legend>
      <div className="space-y-2">
        {ALL_PERMISSIONS.map((p) => (
          <label key={p.code} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.has(p.code)} onChange={() => toggle(p.code)} />
            <span>{p.label}</span>
            <code className="text-xs text-slate-500">{p.code}</code>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || busy}>
          Guardar permisos
        </Button>
        {status && <StatusText tone={status.tone}>{status.text}</StatusText>}
      </div>
    </fieldset>
  );
}
