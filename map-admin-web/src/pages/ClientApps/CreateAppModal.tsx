import { useState, type FormEvent } from 'react';
import { ALL_PERMISSIONS, adminApi, errorText, originProblem, type ClientApp, type Scope } from '../../api/admin';
import { Button, Modal, StatusText, inputClass, labelClass } from '../../components/ui';

type Props = {
  onCancel: () => void;
  onCreated: (app: ClientApp, secret: string) => void;
};

export function CreateAppModal({ onCancel, onCreated }: Props) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [origins, setOrigins] = useState('');
  const [perms, setPerms] = useState<Set<Scope>>(new Set(['location:read', 'location:write']));
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const list = origins.split(/[\s,]+/).map((o) => o.trim()).filter(Boolean);
    for (const o of list) {
      const p = originProblem(o);
      if (p) return setError(`"${o}" ${p}.`);
    }
    if (name.trim().length < 3) return setError('El nombre debe tener al menos 3 caracteres.');
    setBusy(true);
    try {
      const r = await adminApi.create({
        name: name.trim(),
        clientId: clientId.trim() || undefined,
        origins: [...new Set(list)],
        permissions: [...perms],
      });
      onCreated(r.app, r.clientSecret);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Nueva aplicación cliente" onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="app-name" className={labelClass}>
            Nombre
          </label>
          <input id="app-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={150} required />
        </div>
        <div>
          <label htmlFor="app-client-id" className={labelClass}>
            client_id (opcional; se genera si lo dejas vacío)
          </label>
          <input
            id="app-client-id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value.toLowerCase())}
            className={inputClass}
            placeholder="portal-ciudadano"
            pattern="[a-z0-9][a-z0-9\-]{2,63}"
            maxLength={64}
          />
        </div>
        <div>
          <label htmlFor="app-origins" className={labelClass}>
            Orígenes permitidos (uno por línea)
          </label>
          <textarea
            id="app-origins"
            value={origins}
            onChange={(e) => setOrigins(e.target.value)}
            className={`${inputClass} font-mono`}
            rows={3}
            placeholder={'https://portal.cliente.gov.co\nhttp://localhost:5175'}
          />
        </div>
        <fieldset>
          <legend className={labelClass}>Permisos</legend>
          <div className="space-y-1.5">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={perms.has(p.code)}
                  onChange={() =>
                    setPerms((s) => {
                      const n = new Set(s);
                      if (n.has(p.code)) n.delete(p.code);
                      else n.add(p.code);
                      return n;
                    })
                  }
                />
                {p.label} <code className="text-xs text-slate-500">{p.code}</code>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <StatusText tone="error">{error}</StatusText>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear aplicación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
