import { useState } from 'react';
import { Button, Modal } from './ui';

/** Muestra el client_secret una sola vez, con botón Copiar. */
export function SecretModal({ clientId, secret, onClose }: { clientId: string; secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal title="Secreto de la aplicación">
      <div className="space-y-3 text-sm">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-600/20">
          <strong>No se volverá a mostrar.</strong> Entrégalo por un canal seguro al equipo de la app. Debe guardarse
          solo en su <em>backend</em> (variable de entorno o vault), nunca en el frontend ni en Git.
        </p>
        <dl className="space-y-2">
          <div>
            <dt className="text-xs font-medium text-slate-600">client_id</dt>
            <dd className="font-mono text-sm break-all">{clientId}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">client_secret</dt>
            <dd className="rounded-md bg-slate-100 px-2 py-1.5 font-mono text-sm break-all">{secret}</dd>
          </div>
        </dl>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={copy}>
            {copied ? 'Copiado ✓' : 'Copiar secreto'}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          Ya guardé el secreto en un lugar seguro
        </label>
        <div className="flex justify-end">
          <Button disabled={!ack} onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
