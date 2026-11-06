import { useEffect, useState } from 'react';
import { adminApi, errorText, type ClientApp } from '../../api/admin';
import { Badge, Button, Card, StatusText } from '../../components/ui';
import { SecretModal } from '../../components/SecretModal';
import { PermissionsEditor } from './PermissionsEditor';
import { OriginsEditor } from './OriginsEditor';
import { config } from '../../config';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('es-CO') : '—');

export function ClientAppDetailPage({ id }: { id: number }) {
  const [app, setApp] = useState<ClientApp>();
  const [error, setError] = useState<string>();
  const [actionMsg, setActionMsg] = useState<{ tone: 'ok' | 'error'; text: string }>();
  const [secret, setSecret] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.get(id).then(setApp, (e) => setError(errorText(e)));
  }, [id]);

  if (error) return <StatusText tone="error">{error}</StatusText>;
  if (!app) return <StatusText>Cargando…</StatusText>;

  async function rotate() {
    if (!app) return;
    if (!window.confirm('El secreto actual dejará de funcionar de inmediato y la app no podrá pedir tokens hasta que actualice el suyo. ¿Continuar?')) return;
    setBusy(true);
    try {
      const r = await adminApi.rotateSecret(app.id);
      setSecret(r.clientSecret);
      setApp(await adminApi.get(app.id));
    } catch (e) {
      setActionMsg({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    if (!app) return;
    const next = app.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (next === 'DISABLED' && !window.confirm(`¿Desactivar "${app.name}"? Su mapa dejará de funcionar de inmediato.`)) return;
    setBusy(true);
    try {
      setApp(await adminApi.setStatus(app.id, next));
      setActionMsg({ tone: 'ok', text: next === 'ACTIVE' ? 'Aplicación activada.' : 'Aplicación desactivada.' });
    } catch (e) {
      setActionMsg({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  const snippet = `<div id="mapa"></div>
<script src="${new URL(config.embedUrl).origin}/sdk/map-embed-sdk.iife.js"></script>
<script>
  MapEmbed.mountMapEmbed({
    container: document.getElementById('mapa'),
    embedUrl: '${config.embedUrl}',
    clientId: '${app.clientId}',
    // Tu BACKEND pide el token a map-api con el client_secret
    getToken: () => fetch('/api/map-token', { method: 'POST' }).then(r => r.json()).then(d => d.token),
    onEvent: (m) => console.log(m.type, m.payload),
  });
</script>`;

  return (
    <div className="space-y-4">
      <a href="#/apps" className="text-sm text-sky-800 hover:underline">
        ← Aplicaciones
      </a>

      <Card
        title={
          <span className="flex items-center gap-2">
            {app.name}
            <Badge tone={app.status === 'ACTIVE' ? 'green' : 'gray'}>{app.status === 'ACTIVE' ? 'Activa' : 'Desactivada'}</Badge>
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={rotate} disabled={busy}>
              Rotar secreto
            </Button>
            <Button variant={app.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={toggleStatus} disabled={busy}>
              {app.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">client_id</dt>
            <dd className="font-mono">{app.clientId}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Secreto rotado</dt>
            <dd>{fmt(app.secretRotatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Creada</dt>
            <dd>{fmt(app.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Actualizada</dt>
            <dd>{fmt(app.updatedAt)}</dd>
          </div>
        </dl>
        {actionMsg && (
          <div className="mt-3">
            <StatusText tone={actionMsg.tone}>{actionMsg.text}</StatusText>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Permisos">
          <PermissionsEditor app={app} onSaved={setApp} />
        </Card>
        <Card title="Orígenes permitidos">
          <OriginsEditor app={app} onSaved={setApp} />
        </Card>
      </div>

      <Card title="Integración (para el equipo de la app)">
        <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{snippet}</pre>
        <p className="mt-2 text-xs text-slate-600">
          <a href={`#/audit?target=${app.id}`} className="text-sky-800 hover:underline">
            Ver auditoría de esta aplicación
          </a>
        </p>
      </Card>

      {secret && <SecretModal clientId={app.clientId} secret={secret} onClose={() => setSecret(undefined)} />}
    </div>
  );
}
