import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import esriConfig from '@arcgis/core/config.js';
import { config } from './config';
import './index.css';
import App from './App';

// Llave pública restringida (solo mapa base, referrer = dominio del iframe).
// Debe fijarse antes de la primera petición a ArcGIS.
esriConfig.apiKey = config.basemapKey;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
