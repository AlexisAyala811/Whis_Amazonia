import { FlaskConical, Store } from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';

/** Primera apertura en un equipo: elegir entre datos reales (vacío) o la demo. */
export function Bienvenida() {
  const { primeraVez, empezarVacio, cargarDemo } = useWhisStore();
  if (!primeraVez) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-canvas/95 p-4 backdrop-blur sm:items-center">
      <div className="card w-full max-w-md animate-fade-in space-y-4 p-5">
        <img src="/logo-whis.png" alt="Whis" className="h-9 w-auto dark:invert" />
        <div>
          <h1 className="text-xl font-bold">¿Cómo quieres empezar?</h1>
          <p className="mt-1 text-sm text-muted">
            Tus datos se guardan solo en este equipo. Puedes cambiar de opción luego en Ajustes.
          </p>
        </div>
        <button className="btn-primary w-full justify-start gap-3 py-4 text-left" onClick={empezarVacio}>
          <Store size={22} />
          <span>
            <span className="block font-semibold">Usar con mis datos</span>
            <span className="block text-xs opacity-80">Empieza vacío: registra tus lotes y compradores reales</span>
          </span>
        </button>
        <button className="btn-ghost w-full justify-start gap-3 py-4 text-left" onClick={cargarDemo}>
          <FlaskConical size={22} />
          <span>
            <span className="block font-semibold">Ver la demo</span>
            <span className="block text-xs text-muted">Lotes, apagones y compradores de ejemplo (teléfonos ficticios)</span>
          </span>
        </button>
      </div>
    </div>
  );
}
