import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type Tipo = 'exito' | 'error' | 'aviso' | 'info';
interface ToastItem {
  id: number;
  tipo: Tipo;
  titulo: string;
  detalle?: string;
}

type Notificar = (tipo: Tipo, titulo: string, detalle?: string) => void;
const Ctx = createContext<Notificar>(() => undefined);

const ICONOS: Record<Tipo, ReactNode> = {
  exito: <CheckCircle2 size={20} className="text-ok" />,
  error: <XCircle size={20} className="text-danger" />,
  aviso: <AlertTriangle size={20} className="text-warn" />,
  info: <Info size={20} className="text-brand" />,
};

let contador = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notificar = useCallback<Notificar>((tipo, titulo, detalle) => {
    const id = ++contador;
    setItems((xs) => [...xs.slice(-2), { id, tipo, titulo, detalle }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3800);
    if ('vibrate' in navigator) navigator.vibrate?.(tipo === 'error' || tipo === 'aviso' ? [30, 40, 30] : 25);
  }, []);

  return (
    <Ctx.Provider value={notificar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] mx-auto flex max-w-md flex-col gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
            className="glass pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl border border-line px-4 py-3 shadow-soft"
          >
            <span className="mt-0.5 shrink-0">{ICONOS[t.tipo]}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.titulo}</p>
              {t.detalle && <p className="mt-0.5 text-xs text-muted">{t.detalle}</p>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
