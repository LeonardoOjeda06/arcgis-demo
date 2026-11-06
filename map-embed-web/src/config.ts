// Las variables VITE_ quedan visibles en el navegador. Solo valores públicos.
const env = import.meta.env;

function parseCenter(raw: string | undefined): [number, number] {
  const [lng, lat] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : [-74.0721, 4.711]; // Bogotá
}

export const config = {
  apiUrl: (env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000/api/v1',
  basemapKey: (env.VITE_ARCGIS_BASEMAP_KEY as string | undefined) ?? '',
  // Sin llave, MapCanvas usa teselas de OpenStreetMap (no requieren credencial) para poder desarrollar.
  basemap: (env.VITE_ARCGIS_BASEMAP as string | undefined) || 'arcgis/streets',
  center: parseCenter(env.VITE_MAP_CENTER as string | undefined), // [longitud, latitud]
  zoom: Number(env.VITE_MAP_ZOOM ?? 12) || 12,
};
