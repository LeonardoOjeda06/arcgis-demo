import { defineConfig } from 'tsup';

export default defineConfig([
  // Para proyectos con bundler (React, Angular, Vue…): ESM + tipos.
  {
    entry: { index: 'src/index.ts', protocol: 'src/protocol.ts' },
    format: ['esm'],
    dts: true,
    clean: true,
    minify: true,
    target: 'es2020',
  },
  // Para páginas sin bundler: <script src=".../map-embed-sdk.iife.js"> expone window.MapEmbed.
  {
    entry: { 'map-embed-sdk': 'src/index.ts' },
    format: ['iife'],
    globalName: 'MapEmbed',
    minify: true,
    target: 'es2020',
    outExtension: () => ({ js: '.iife.js' }),
  },
]);
