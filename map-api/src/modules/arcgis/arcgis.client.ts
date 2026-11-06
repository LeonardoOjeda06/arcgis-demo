import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';

const ROUTE_URL = 'https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve';
const GEOCODE_URL = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const REVERSE_URL = 'https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/* Formas mínimas de las respuestas de ArcGIS que usamos. */
export interface ArcgisRouteResponse {
  routes?: { features?: { attributes: Record<string, number>; geometry?: { paths: number[][][] } }[] };
  directions?: { features?: { attributes: { text: string } }[] }[];
}
export interface ArcgisGeocodeResponse {
  candidates?: { address: string; location: { x: number; y: number }; score: number }[];
}
export interface ArcgisReverseResponse {
  address?: { Match_addr?: string; LongLabel?: string };
}

@Injectable()
export class ArcgisClient {
  private readonly log = new Logger(ArcgisClient.name);

  constructor(private readonly cfg: ConfigService<Env, true>) {}

  private async post<T>(url: string, params: Record<string, string>, attempt = 1): Promise<T> {
    const body = new URLSearchParams({ f: 'json', token: this.cfg.get('ARCGIS_SERVER_API_KEY', { infer: true }), ...params });
    let res: Response;
    try {
      // POST: así la llave no queda en la URL ni en logs intermedios.
      res = await fetch(url, { method: 'POST', body, signal: AbortSignal.timeout(15_000) });
    } catch (e) {
      if (attempt < 2) return this.post<T>(url, params, attempt + 1); // un reintento ante fallo de red
      this.log.warn(`ArcGIS sin respuesta: ${(e as Error).name}`);
      throw new BadGatewayException('Servicio de mapas no disponible');
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: number } };
    if (!res.ok || data.error) {
      if (attempt < 2 && (res.status >= 500 || (data.error?.code ?? 0) >= 500)) return this.post<T>(url, params, attempt + 1);
      this.log.warn(`ArcGIS error ${data.error?.code ?? res.status}`); // nunca loguear el token
      throw new BadGatewayException('Servicio de mapas no disponible');
    }
    return data;
  }

  solveRoute(stops: LatLng[]) {
    return this.post<ArcgisRouteResponse>(ROUTE_URL, {
      stops: stops.map((s) => `${s.longitude},${s.latitude}`).join(';'), // ArcGIS usa x,y = lng,lat
      returnDirections: 'true',
      directionsLanguage: 'es',
      directionsLengthUnits: 'esriNAUKilometers',
      outSR: '4326',
    });
  }

  geocode(singleLine: string) {
    return this.post<ArcgisGeocodeResponse>(GEOCODE_URL, {
      singleLine,
      countryCode: this.cfg.get('ARCGIS_COUNTRY_CODE', { infer: true }),
      maxLocations: '5',
      outFields: 'Match_addr',
      outSR: '4326',
      langCode: 'ES',
      // Requerido por los términos de ArcGIS si el resultado se guarda en BD (ver P0 de la guía).
      forStorage: String(this.cfg.get('ARCGIS_GEOCODE_FOR_STORAGE', { infer: true })),
    });
  }

  reverseGeocode(p: LatLng) {
    return this.post<ArcgisReverseResponse>(REVERSE_URL, {
      location: `${p.longitude},${p.latitude}`,
      outSR: '4326',
      langCode: 'ES',
      forStorage: String(this.cfg.get('ARCGIS_GEOCODE_FOR_STORAGE', { infer: true })),
    });
  }
}
