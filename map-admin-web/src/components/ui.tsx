import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-sky-800 text-white hover:bg-sky-900',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

export function Card({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5">
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatusText({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'error'; children: ReactNode }) {
  const styles = { info: 'text-slate-600', ok: 'text-emerald-700', error: 'text-red-700' }[tone];
  return (
    <p role="status" className={`text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'gray' | 'blue'; children: ReactNode }) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    blue: 'bg-sky-50 text-sky-800 ring-sky-700/20',
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}>{children}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600';

export const labelClass = 'mb-1 block text-xs font-medium text-slate-600';
