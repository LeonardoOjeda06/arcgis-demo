import { useEffect, useRef } from 'react';
import ArcGISMap from '@arcgis/core/Map.js';
import MapView from '@arcgis/core/views/MapView.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import Basemap from '@arcgis/core/Basemap.js';
import OpenStreetMapLayer from '@arcgis/core/layers/OpenStreetMapLayer.js';
import { config } from '../config';

export interface MapLayers {
  view: MapView;
  /** Puntos guardados del usuario. */
  saved: GraphicsLayer;
  /** Línea de la ruta calculada. */
  route: GraphicsLayer;
  /** Punto(s) que el usuario está marcando. */
  pick: GraphicsLayer;
}

type Props = {
  onReady: (layers: MapLayers) => void;
  onPick: (lat: number, lng: number) => void;
};

export function MapCanvas({ onReady, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Guardamos los callbacks en refs para no recrear el mapa en cada render.
  const pickRef = useRef(onPick);
  const readyRef = useRef(onReady);
  useEffect(() => {
    pickRef.current = onPick;
    readyRef.current = onReady;
  });

  useEffect(() => {
    const saved = new GraphicsLayer({ title: 'Mis ubicaciones' });
    const route = new GraphicsLayer({ title: 'Ruta' });
    const pick = new GraphicsLayer({ title: 'Selección' });
    // Con llave: mapa base de ArcGIS. Sin llave (desarrollo): teselas de OpenStreetMap.
    // Nunca usar un id de portal sin llave: ArcGIS mostraría un diálogo de usuario/contraseña.
    const basemap = config.basemapKey
      ? config.basemap
      : new Basemap({ baseLayers: [new OpenStreetMapLayer()], title: 'OpenStreetMap' });
    const view = new MapView({
      container: ref.current!,
      map: new ArcGISMap({ basemap, layers: [saved, route, pick] }),
      center: config.center, // [longitud, latitud]
      zoom: config.zoom,
      constraints: { snapToZoom: false },
    });
    view.ui.move('zoom', 'bottom-right');

    const handle = view.on('click', (e) => {
      const p = e.mapPoint;
      if (p?.latitude != null && p.longitude != null) pickRef.current(p.latitude, p.longitude);
    });

    const state = { alive: true };
    view.when(() => state.alive && readyRef.current({ view, saved, route, pick })).catch(() => undefined);

    return () => {
      state.alive = false;
      handle.remove();
      view.destroy(); // evita fugas de memoria
    };
  }, []);

  return <div ref={ref} className="h-full w-full" aria-label="Mapa interactivo" />;
}
