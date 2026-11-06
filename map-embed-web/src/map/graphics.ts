import Graphic from '@arcgis/core/Graphic.js';
import Point from '@arcgis/core/geometry/Point.js';
import Polyline from '@arcgis/core/geometry/Polyline.js';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol.js';

export const COLORS = {
  pick: '#A8510A',
  saved: '#0C4A6E',
  origin: '#15803D',
  destination: '#B91C1C',
  route: '#0369A1',
};

export function pointGraphic(lat: number, lng: number, color: string, size = 12) {
  return new Graphic({
    geometry: new Point({ latitude: lat, longitude: lng }),
    symbol: new SimpleMarkerSymbol({ color, size, outline: { color: 'white', width: 2 } }),
  });
}

export function routeGraphic(paths: number[][][]) {
  return new Graphic({
    geometry: new Polyline({ paths, spatialReference: { wkid: 4326 } }),
    symbol: new SimpleLineSymbol({ color: COLORS.route, width: 5 }),
  });
}

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
export const formatCoord = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
