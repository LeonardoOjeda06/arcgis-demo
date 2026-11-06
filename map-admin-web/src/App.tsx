import { useEffect, useState, type FormEvent } from 'react';
import { auth, type AuthUser } from './auth/auth';
import { useRoute } from './router';
import { Button, StatusText, inputClass, labelClass } from './components/ui';
import { ClientAppsPage } from './pages/ClientApps/ClientAppsPage';
import { ClientAppDetailPage } from './pages/ClientApps/ClientAppDetailPage';
import { AuditPage } from './pages/Audit/AuditPage';

function Login() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await auth.login(auth.mode === 'dev' ? token.trim() : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
        <div>
          <h1 className="text-lg font-semibold">Administración de mapas</h1>
          <p className="text-sm text-slate-600">Aplicaciones, permisos y auditoría del mapa embebible.</p>
        </div>
        {auth.mode === 'dev' ? (
          <>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-600/20">
              Modo desarrollo: pega el valor de <code>ADMIN_DEV_TOKEN</code> de <code>map-api/.env</code>. En producción se usa el SSO corporativo.
            </p>
            <div>
              <label htmlFor="dev-token" className={labelClass}>
                Token de desarrollo
              </label>
              <input id="dev-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} className={inputClass} autoComplete="off" required />
            </div>
          </>
        ) : null}
        {error && <StatusText tone="error">{error}</StatusText>}
        <Button type="submit" className="w-full" disabled={busy}>
          {auth.mode === 'dev' ? 'Entrar' : 'Iniciar sesión con la cuenta corporativa'}
        </Button>
      </form>
    </div>
  );
}

function Layout({ user }: { user: AuthUser }) {
  const route = useRoute();
  const link = (href: string, label: string, active: boolean) => (
    <a href={href} aria-current={active ? 'page' : undefined} className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-sky-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
      {label}
    </a>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2">
          <span className="font-semibold">Mapas · Admin</span>
          <nav className="flex gap-1">
            {link('#/apps', 'Aplicaciones', route.name !== 'audit')}
            {link('#/audit', 'Auditoría', route.name === 'audit')}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            <span>{user.name}</span>
            <Button variant="ghost" onClick={() => void auth.logout()}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {route.name === 'apps' && <ClientAppsPage />}
        {route.name === 'app' && <ClientAppDetailPage key={route.id} id={route.id} />}
        {route.name === 'audit' && <AuditPage key={route.target ?? ''} initialTarget={route.target} />}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(auth.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const off = auth.subscribe(setUser);
    auth
      .init()
      .catch(() => null)
      .finally(() => setReady(true));
    return () => {
      off();
    };
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-slate-600">Cargando…</div>;
  return user ? <Layout user={user} /> : <Login />;
}
