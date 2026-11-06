// Publica el SDK (versión <script>) en /sdk/ del dominio del iframe, como indica la guía (P6).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const src = require.resolve('map-embed-sdk/iife');
mkdirSync('public/sdk', { recursive: true });
copyFileSync(src, 'public/sdk/map-embed-sdk.iife.js');
const sri = createHash('sha384').update(readFileSync(src)).digest('base64');
console.log(`SDK copiado a public/sdk/. integrity="sha384-${sri}"`);
