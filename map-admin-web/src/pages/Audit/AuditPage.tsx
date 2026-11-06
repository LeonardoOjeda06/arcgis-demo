import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminApi, errorText, type AuditEntry, type AuditQuery } from '../../api/admin';
import { Badge, Button, Card, StatusText, inputClass, labelClass } from '../../components/ui';

const ACTIONS = [
  'CLIENT_APP_CREATED',
  'PERMISSIONS_UPDATED',
  'ORIGINS_UPDATED',
  'SECRET_ROTATED',
  'APP_ENABLED',
  'APP_DISABLED',
  'EMBED_SESSION_CREATED',
  'EMBED_SESSION_DENIED',
  'EMBED_ORIGIN_DENIED',
  'LOCATION_SAVED',
  'LOCATION_DELETED',
];

const PAGE_SIZE = 50;

export function AuditPage({ initialTarget }: { initialTarget?: string }) {
  const [filters, setFilters] = useState<AuditQuery>({ target: initialTarget });
  const [query, setQuery] = useState<AuditQuery>({ target: initialTarget, page: 1, pageSize: PAGE_SIZE });
  const [data, setData] = useState<{ items: AuditEntry[]; total: number; page: number }>();
  const [error, setError] = useState<string>();

  const load = useCallback(async (q: AuditQuery) => {
    try {
      // Las fechas del formulario son locales (datetime-local); el backend espera ISO.
      const iso = (v?: string) => (v ? new Date(v).toISOString() : undefined);
      setData(await adminApi.audit({ ...q, from: iso(q.from), to: iso(q.to) }));
      setError(undefined);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  function apply(e: FormEvent) {
    e.preventDefault();
    setQuery({ ...filters, page: 1, pageSize: PAGE_SIZE });
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const set = (k: keyof AuditQuery) => (e: { target: { value: string } }) => setFilters((f) => ({ ...f, [k]: e.target.value || undefined }));

  return (
    <Card title="Auditoría">
      <form onSubmit={apply} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="f-action" className={labelClass}>Acción</label>
          <select id="f-action" className={inputClass} value={filters.action ?? ''} onChange={set('action')}>
            <option value="">Todas</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-actor" className={labelClass}>Actor</label>
          <select id="f-actor" className={inputClass} value={filters.actorType ?? ''} onChange={set('actorType')}>
            <option value="">Todos</option>
            <option value="ADMIN">ADMIN</option>
            <option value="CLIENT">CLIENT</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-target" className={labelClass}>Objetivo (id)</label>
          <input id="f-target" className={inputClass} value={filters.target ?? ''} onChange={set('target')} maxLength={100} />
        </div>
        <div>
          <label htmlFor="f-from" className={labelClass}>Desde</label>
          <input id="f-from" type="datetime-local" className={inputClass} value={filters.from ?? ''} onChange={set('from')} />
        </div>
        <div>
          <label htmlFor="f-to" className={labelClass}>Hasta</label>
          <input id="f-to" type="datetime-local" className={inputClass} value={filters.to ?? ''} onChange={set('to')} />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Filtrar</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFilters({});
              setQuery({ page: 1, pageSize: PAGE_SIZE });
            }}
          >
            Limpiar
          </Button>
        </div>
      </form>

      {error && <StatusText tone="error">{error}</StatusText>}
      {!data && !error && <StatusText>Cargando…</StatusText>}
      {data && data.items.length === 0 && <StatusText>No hay registros con esos filtros.</StatusText>}
      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Acción</th>
                  <th className="py-2 pr-3 font-medium">Objetivo</th>
                  <th className="py-2 pr-3 font-medium">Detalle</th>
                  <th className="py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-xs">{new Date(r.createdAt).toLocaleString('es-CO')}</td>
                    <td className="py-1.5 pr-3 text-xs">
                      <Badge tone={r.actorType === 'ADMIN' ? 'blue' : 'gray'}>{r.actorType}</Badge> {r.actorId}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.action}</td>
                    <td className="py-1.5 pr-3 text-xs">{r.target ?? '—'}</td>
                    <td className="max-w-xs py-1.5 pr-3 font-mono text-xs break-all text-slate-600">{r.detail ?? ''}</td>
                    <td className="py-1.5 font-mono text-xs">{r.ip ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {data.total} registros · página {data.page} de {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={data.page <= 1} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}>
                Anterior
              </Button>
              <Button variant="secondary" disabled={data.page >= pages} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
