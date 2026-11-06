import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText, type ClientApp } from '../../api/admin';
import { Badge, Button, Card, StatusText } from '../../components/ui';
import { SecretModal } from '../../components/SecretModal';
import { CreateAppModal } from './CreateAppModal';
import { navigate } from '../../router';

export function ClientAppsPage() {
  const [apps, setApps] = useState<ClientApp[]>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<{ app: ClientApp; secret: string }>();

  const load = useCallback(async () => {
    try {
      setApps(await adminApi.list());
      setError(undefined);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Card title="Aplicaciones cliente" actions={<Button onClick={() => setCreating(true)}>Nueva aplicación</Button>}>
        {error && <StatusText tone="error">{error}</StatusText>}
        {!apps && !error && <StatusText>Cargando…</StatusText>}
        {apps && apps.length === 0 && <StatusText>Aún no hay aplicaciones registradas.</StatusText>}
        {apps && apps.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Nombre</th>
                  <th className="py-2 pr-3 font-medium">client_id</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 pr-3 font-medium">Orígenes</th>
                  <th className="py-2 font-medium">Permisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((a) => (
                  <tr key={a.id} className="cursor-pointer align-top hover:bg-slate-50" onClick={() => navigate(`/apps/${a.id}`)}>
                    <td className="py-2 pr-3">
                      <a href={`#/apps/${a.id}`} className="font-medium text-sky-800 hover:underline">
                        {a.name}
                      </a>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{a.clientId}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={a.status === 'ACTIVE' ? 'green' : 'gray'}>{a.status === 'ACTIVE' ? 'Activa' : 'Desactivada'}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs">{a.origins.length ? a.origins.join(', ') : '—'}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.permissions.length ? a.permissions.map((p) => <Badge key={p} tone="blue">{p}</Badge>) : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <CreateAppModal
          onCancel={() => setCreating(false)}
          onCreated={(app, s) => {
            setCreating(false);
            setSecret({ app, secret: s });
            void load();
          }}
        />
      )}
      {secret && (
        <SecretModal
          clientId={secret.app.clientId}
          secret={secret.secret}
          onClose={() => {
            const id = secret.app.id;
            setSecret(undefined);
            navigate(`/apps/${id}`);
          }}
        />
      )}
    </>
  );
}
