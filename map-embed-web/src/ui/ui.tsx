import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-sky-800 text-white hover:bg-sky-900',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
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

export function Status({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'error'; children: ReactNode }) {
  const styles = { info: 'text-slate-600', ok: 'text-emerald-700', error: 'text-red-700' }[tone];
  return (
    <p role="status" className={`text-xs ${styles}`}>
      {children}
    </p>
  );
}

export const inputClass =
  'min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600';
