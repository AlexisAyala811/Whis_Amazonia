import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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

/** Hojas abiertas, de la más antigua a la más reciente: Escape cierra solo la de arriba */
const pila: string[] = [];

/** Hoja deslizable inferior en móvil; tarjeta centrada en escritorio. */
export function BottomSheet({ open, onClose, title, subtitle, children, footer, elevated }: Props) {
  const [montado, setMontado] = useState(open);
  const [cerrando, setCerrando] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const inicioY = useRef<number | null>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const id = useId();

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pila[pila.length - 1] === id) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, id]);

  // Al abrir: bloquea el scroll de fondo y lleva el foco a la hoja (lectores de
  // pantalla y teclado). Al cerrar: devuelve el foco a donde estaba.
  useEffect(() => {
    if (!open) return;
    pila.push(id);
    const previo = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => dialogoRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      window.clearTimeout(t);
      const i = pila.lastIndexOf(id);
      if (i >= 0) pila.splice(i, 1);
      document.body.style.overflow = pila.length > 0 ? 'hidden' : prev === 'hidden' ? '' : prev;
      if (previo && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, [open, id]);

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
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-titulo` : undefined}
        tabIndex={-1}
        className={`relative flex outline-none max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-surface shadow-soft transition-transform duration-200 ease-out sm:mb-0 sm:rounded-3xl ${
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
              {title && (
                <h2 id={`${id}-titulo`} className="text-lg font-bold leading-tight">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface2 text-muted transition-all duration-200 hover:text-ink active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto px-5 ${footer ? 'pb-5' : 'pb-[calc(1.25rem+var(--insignia,0px))]'}`}>{children}</div>
        {footer && <div className="border-t border-line px-5 pb-safe pt-3 [&>*]:mb-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
