import { z } from 'zod';
import { PROTOCOL, type EmbedMessage } from 'map-embed-sdk/protocol';

const hostMessage = z.object({
  protocol: z.literal(PROTOCOL),
  type: z.enum(['map:init', 'map:token']),
  payload: z.object({ token: z.string().min(20).max(4000) }),
});

export type HostMessageType = z.infer<typeof hostMessage>['type'];

// Distribuye Omit sobre cada variante de la unión (Omit directo la aplanaría).
type WithoutProtocol<T> = T extends unknown ? Omit<T, 'protocol'> : never;
export type OutgoingMessage = WithoutProtocol<EmbedMessage>;

let hostOrigin: string | null = null; // se fija después de validar el token

export function setHostOrigin(o: string) {
  hostOrigin = o;
}

export function getHostOrigin() {
  return hostOrigin;
}

export function isEmbedded() {
  return window.parent !== window;
}

export function postToHost(msg: OutgoingMessage) {
  if (!isEmbedded()) return;
  if (msg.type === 'map:ready') {
    // Único mensaje con '*': aún no sabemos quién es el host y no lleva datos.
    window.parent.postMessage({ protocol: PROTOCOL, ...msg }, '*');
    return;
  }
  if (!hostOrigin) return; // nunca enviar datos a un origen desconocido
  window.parent.postMessage({ protocol: PROTOCOL, ...msg }, hostOrigin);
}

export function onHostMessage(handler: (token: string, origin: string, type: HostMessageType) => void) {
  const listener = (ev: MessageEvent) => {
    if (ev.source !== window.parent || !isEmbedded()) return; // solo la ventana padre
    if (hostOrigin && ev.origin !== hostOrigin) return; // ya conocemos al host
    const parsed = hostMessage.safeParse(ev.data);
    if (!parsed.success) return; // formato inesperado: se ignora
    handler(parsed.data.payload.token, ev.origin, parsed.data.type);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
