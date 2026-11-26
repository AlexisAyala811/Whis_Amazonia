import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Capa superior (para hojas abiertas sobre otra hoja) */
  elevated?: boolean;
}

/** Hoja deslizable inferior en móvil; tarjeta centrada en escritorio. */
export function BottomSheet({ open, onClose, title, subtitle, children, footer, elevated }: Props) {
  const [montado, setMontado] = useState(open);
  const [cerrando, setCerrando] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const inicioY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMontado(true);
      setCerrando(false);
      setArrastre(0);
    } else if (montado) {
      setCerrando(true);
      const t = window.setTimeout(() => {
        setMontado(false);
        setCerrando(false);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open, montado]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!montado) return null;

  return createPortal(
    <div className={`fixed inset-0 flex items-end justify-center sm:items-center ${elevated ? 'z-[70]' : 'z-50'}`}>
      <div
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${
          cerrando ? 'opacity-0' : 'animate-fade-in opacity-100'
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-surface shadow-soft transition-transform duration-200 ease-out sm:mb-0 sm:rounded-3xl ${
          cerrando ? 'translate-y-full sm:translate-y-8 sm:opacity-0' : 'animate-sheet-in'
        }`}
        style={arrastre ? { transform: `translateY(${arrastre}px)`, transition: 'none' } : undefined}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-1 pt-3 sm:hidden"
          onPointerDown={(e) => {
            inicioY.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (inicioY.current !== null) setArrastre(Math.max(0, e.clientY - inicioY.current));
          }}
          onPointerUp={() => {
            if (arrastre > 90) onClose();
            setArrastre(0);
            inicioY.current = null;
          }}
        >
          <div className="h-1.5 w-10 rounded-full bg-muted/40" />
        </div>
        {(title || subtitle) && (
          <div className="flex items-start gap-3 px-5 pb-3 pt-2 sm:pt-5">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-lg font-bold leading-tight">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface2 text-muted transition-all duration-200 hover:text-ink active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 pb-safe pt-3 [&>*]:mb-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
