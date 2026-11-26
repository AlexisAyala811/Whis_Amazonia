import { useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';
import { useToast } from './ui/Toast';

const DURACION_MS = 8000;

/** Barra "Deshacer" sobre la navegación: aparece unos segundos tras cada acción. */
export function UndoBar() {
  const { deshacer, deshacerUltimo, olvidarDeshacer } = useWhisStore();
  const toast = useToast();

  useEffect(() => {
    if (!deshacer) return;
    const t = window.setTimeout(olvidarDeshacer, DURACION_MS);
    return () => window.clearTimeout(t);
  }, [deshacer, olvidarDeshacer]);

  if (!deshacer) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[45] mx-auto max-w-md px-4">
      <div
        key={deshacer.id}
        role="status"
        className="pointer-events-auto flex animate-toast-in items-center gap-2 rounded-2xl bg-ink py-1.5 pl-4 pr-1 text-canvas shadow-soft"
      >
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{deshacer.texto}</p>
        <button
          onClick={() => {
            const texto = deshacerUltimo();
            if (texto) toast('info', 'Acción deshecha', texto);
          }}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-brand transition-all dark:text-[#15803d] duration-200 active:scale-95"
        >
          <Undo2 size={16} /> Deshacer
        </button>
      </div>
    </div>
  );
}
