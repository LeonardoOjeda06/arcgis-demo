// App cliente de DEMOSTRACIÓN (etapa 3 de la guía): hace de "backend del cliente".
// - Sirve una página que incrusta el mapa con el SDK.
// - Expone POST /api/map-token: pide el token a map-api con client_id + client_secret.
//   El secreto vive SOLO aquí (variables de entorno), nunca en el navegador.
//
// Uso:  node --env-file=.env server.mjs   (o: pnpm dev)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 5175);
const ORIGIN = process.env.HOST_ORIGIN ?? `http://localhost:${PORT}`; // debe estar registrado en el panel
const API = (process.env.MAP_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
const EMBED_URL = process.env.MAP_EMBED_URL ?? 'http://localhost:5173/embed';
const { MAP_CLIENT_ID, MAP_CLIENT_SECRET } = process.env;

if (!MAP_CLIENT_ID || !MAP_CLIENT_SECRET) {
  console.error('Faltan MAP_CLIENT_ID y MAP_CLIENT_SECRET en demo-host/.env (genéralos con "pnpm new-app" en map-api o desde el panel).');
  process.exit(1);
}

const here = fileURLToPath(new URL('.', import.meta.url));
const files = {
  '/': join(here, 'public', 'index.html'),
  '/sdk/map-embed-sdk.iife.js': join(here, '..', 'map-embed-sdk', 'dist', 'map-embed-sdk.iife.js'),
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

// Usuarios "logueados" de mentira. Lo que se envía a map-api es un seudónimo opaco, NUNCA la cédula.
const USERS = { ana: 'usr_7f3a9c21d4', luis: 'usr_b81e44f0a2' };

async function mapToken(user) {
  const basic = Buffer.from(`${MAP_CLIENT_ID}:${MAP_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${API}/embed/sessions`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: ORIGIN, externalUserId: USERS[user] ?? USERS.ana }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`map-api respondió ${r.status}: ${await r.text()}`);
  return (await r.json()).token;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', ORIGIN);
  try {
    if (req.method === 'POST' && url.pathname === '/api/map-token') {
      // En una app real aquí se exige que el usuario haya iniciado sesión.
      const token = await mapToken(url.searchParams.get('user') ?? 'ana');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ token }));
    }
    if (req.method === 'GET' && url.pathname === '/config.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ embedUrl: EMBED_URL, clientId: MAP_CLIENT_ID }));
    }
    const file = files[normalize(url.pathname).replace(/\\/g, '/')];
    if (req.method === 'GET' && file) {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
      return res.end(body);
    }
    res.writeHead(404).end('No encontrado');
  } catch (e) {
    console.error(e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Mapa no disponible' }));
  }
}).listen(PORT, () => console.log(`Demo de app cliente en ${ORIGIN}`));
