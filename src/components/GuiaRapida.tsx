import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Plus, TrafficCone, Zap } from 'lucide-react';

const GUIA_KEY = 'whis-guia-vista';

/** La guía sale una sola vez por equipo; luego se puede volver a ver desde Ajustes. */
export function guiaVista(): boolean {
  try {
    return localStorage.getItem(GUIA_KEY) === '1';
  } catch {
    return true; // sin almacenamiento: no insistir en cada apertura
  }
}

function marcarGuiaVista() {
  try {
    localStorage.setItem(GUIA_KEY, '1');
  } catch {
    /* sin almacenamiento */
  }
}

interface Paso {
  icono: ReactNode;
  titulo: string;
  texto: string;
  extra?: ReactNode;
}

const PASOS: Paso[] = [
  {
    icono: <Plus size={30} strokeWidth={2.6} />,
    titulo: 'Registra cada ingreso',
    texto:
      'Toca el botón verde Registrar cuando llegue mercadería. Elige el producto, los kilos o jabas y cómo llegó. También puedes dictarlo por voz.',
  },
  {
    icono: <TrafficCone size={28} />,
    titulo: 'Mira el semáforo',
    texto: 'Whis calcula cuánto le queda a cada lote. En Inventario, lo que vence antes sale primero.',
    extra: (
      <div className="mt-4 space-y-2 text-left text-sm">
        <Semaforo color="bg-ok" titulo="Verde" detalle="Venta normal" />
        <Semaforo color="bg-warn" titulo="Amarillo" detalle="Véndelo primero hoy" />
        <Semaforo color="bg-danger" titulo="Rojo" detalle="Remátalo antes de perderlo" />
      </div>
    ),
  },
  {
    icono: <Zap size={28} />,
    titulo: 'Remata por WhatsApp',
    texto:
      'En Remate eliges un lote en rojo y a tus compradores. Whis arma la oferta con descuento y la abre en WhatsApp. Cada remate suma a tu meta del día.',
  },
  {
    icono: <ClipboardCheck size={28} />,
    titulo: 'Cierra el día',
    texto:
      'Al terminar, toca Cierre del día en Inicio: verás ventas, remates y merma, y lo envías por WhatsApp con un toque. Una vez por semana, guarda un respaldo desde Ajustes.',
  },
];

function Semaforo({ color, titulo, detalle }: { color: string; titulo: string; detalle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface2/70 px-3 py-2">
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${color}`} />
      <span>
        <b className="font-semibold">{titulo}</b> <span className="text-muted">· {detalle}</span>
      </span>
    </div>
  );
}

/** Guía de 4 pasos para usar Whis sin ayuda. */
export function GuiaRapida({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (open) setPaso(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowRight') setPaso((p) => Math.min(PASOS.length - 1, p + 1));
      if (e.key === 'ArrowLeft') setPaso((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const cerrar = () => {
    marcarGuiaVista();
    onClose();
  };
  const ultimo = paso === PASOS.length - 1;
  const p = PASOS[paso];

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-end justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom)+var(--insignia,0px))] sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-[2px]" onClick={cerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-titulo"
        className="relative w-full max-w-sm animate-sheet-in rounded-3xl border border-line bg-surface p-5 shadow-soft sm:animate-pop-in"
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
            Guía rápida · {paso + 1} de {PASOS.length}
          </p>
          {!ultimo && (
            <button onClick={cerrar} className="-mr-2 min-h-[44px] px-2 text-sm font-semibold text-muted hover:text-ink">
              Saltar
            </button>
          )}
        </div>

        <div key={paso} className="animate-fade-in pt-2 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white dark:text-[#0D331F]">
            {p.icono}
          </span>
          <h2 id="guia-titulo" className="mt-4 text-xl font-extrabold">
            {p.titulo}
          </h2>
          <p className="mt-1.5 text-sm text-muted">{p.texto}</p>
          {p.extra}
        </div>

        {/* Puntos de avance */}
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
          {PASOS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === paso ? 'w-6 bg-brand' : 'w-2 bg-muted/30'}`}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <button
            className="btn-ghost px-3"
            onClick={() => setPaso((n) => Math.max(0, n - 1))}
            disabled={paso === 0}
            aria-label="Paso anterior"
          >
            <ArrowLeft size={18} />
          </button>
          <button className="btn-primary w-full" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}>
            {ultimo ? (
              <>
                <Check size={18} /> Empezar
              </>
            ) : (
              <>
                Siguiente <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
