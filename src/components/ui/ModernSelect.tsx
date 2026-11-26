import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface Props<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  /** Título de la hoja; por defecto el label */
  sheetTitle?: string;
  compact?: boolean;
  className?: string;
}

/** Desplegable moderno (reemplaza al <select> nativo): se abre como bottom sheet. */
export function ModernSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleccionar…',
  searchable = false,
  sheetTitle,
  compact = false,
  className = '',
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const actual = options.find((o) => o.value === value);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(t));
  }, [q, options]);

  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 rounded-2xl border border-line bg-surface2/60 text-left transition-all duration-200 ease-out hover:border-brand/50 active:scale-[0.99] ${
          compact ? 'min-h-[44px] px-3' : 'min-h-[48px] px-4'
        }`}
      >
        {actual?.icon && <span className="shrink-0 text-muted">{actual.icon}</span>}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] ${actual ? 'font-medium text-ink' : 'text-muted'}`}>
            {actual?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <BottomSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setQ('');
        }}
        title={sheetTitle ?? label ?? 'Seleccionar'}
        elevated
      >
        {searchable && (
          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="field pl-10"
            />
          </div>
        )}
        <ul className="space-y-1.5">
          {filtradas.map((o) => {
            const sel = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-all duration-200 ease-out active:scale-[0.99] ${
                    sel ? 'bg-brand/[0.12] ring-1 ring-brand/40' : 'hover:bg-surface2'
                  }`}
                >
                  {o.icon && (
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        sel ? 'bg-brand/20 text-brand' : 'bg-surface2 text-muted'
                      }`}
                    >
                      {o.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{o.label}</span>
                    {o.description && <span className="block truncate text-xs text-muted">{o.description}</span>}
                  </span>
                  {o.badge}
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-white transition-all duration-200 dark:text-[#0D0F12] ${
                      sel ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              </li>
            );
          })}
          {filtradas.length === 0 && <li className="py-6 text-center text-sm text-muted">Sin resultados</li>}
        </ul>
      </BottomSheet>
    </div>
  );
}
