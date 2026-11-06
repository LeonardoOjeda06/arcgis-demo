import { PROTOCOL, isEmbedMessage, type EmbedMessage, type HostMessage } from './protocol';

export * from './protocol';

export interface MountOptions {
  /** Elemento donde se insertará el iframe. */
  container: HTMLElement;
  /** URL de la página del iframe, p. ej. https://mapas.tuorg.com/embed */
  embedUrl: string;
  /** client_id de la app. Es público; NO es el secreto. */
  clientId: string;
  /** Debe llamar al BACKEND de la app cliente, que pide el token a map-api con su secreto. */
  getToken: () => Promise<string>;
  /** Eventos del mapa: residencia guardada, ruta calculada, errores… */
  onEvent?: (msg: EmbedMessage) => void;
  /** Alto del iframe (CSS). Por defecto 480px. */
  height?: string;
  /** Título accesible del iframe. */
  title?: string;
}

export interface MapEmbedHandle {
  /** El elemento iframe creado. */
  readonly iframe: HTMLIFrameElement;
  /** Quita el iframe y deja de escuchar mensajes. */
  destroy(): void;
}

export function mountMapEmbed(opts: MountOptions): MapEmbedHandle {
  if (!opts.container) throw new Error('mountMapEmbed: falta "container"');
  if (typeof opts.getToken !== 'function') throw new Error('mountMapEmbed: falta "getToken"');

  const url = new URL(opts.embedUrl, window.location.href);
  url.searchParams.set('client', opts.clientId);
  const embedOrigin = url.origin;

  const iframe = document.createElement('iframe');
  iframe.src = url.toString();
  iframe.title = opts.title ?? 'Mapa';
  iframe.style.cssText = `display:block;width:100%;height:${opts.height ?? '480px'};border:0`;
  iframe.allow = 'geolocation'; // por si se usa "mi ubicación"
  iframe.referrerPolicy = 'no-referrer';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');

  let destroyed = false;

  async function sendToken(type: HostMessage['type']) {
    try {
      const token = await opts.getToken();
      if (destroyed) return;
      if (typeof token !== 'string' || token.length < 20) throw new Error('token vacío');
      const msg: HostMessage = { protocol: PROTOCOL, type, payload: { token } };
      // targetOrigin exacto: el token solo puede llegar a NUESTRO iframe.
      iframe.contentWindow?.postMessage(msg, embedOrigin);
    } catch {
      opts.onEvent?.({
        protocol: PROTOCOL,
        type: 'map:error',
        payload: { code: 'UNAVAILABLE', message: 'No se obtuvo token' },
      });
    }
  }

  const onMessage = (ev: MessageEvent) => {
    if (ev.origin !== embedOrigin || ev.source !== iframe.contentWindow) return; // solo NUESTRO iframe
    if (!isEmbedMessage(ev.data)) return;
    const msg = ev.data;
    if (msg.type === 'map:ready') return void sendToken('map:init');
    if (msg.type === 'map:token-request') return void sendToken('map:token');
    opts.onEvent?.(msg);
  };

  window.addEventListener('message', onMessage);
  opts.container.appendChild(iframe);

  return {
    iframe,
    destroy() {
      destroyed = true;
      window.removeEventListener('message', onMessage);
      iframe.remove();
    },
  };
}
