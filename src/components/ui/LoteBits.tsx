import { Beef, Cherry, Fish, Milk, Package } from 'lucide-react';
import { getProducto } from '../../data/catalog';
import type { Semaforo } from '../../types';
import { SEMAFORO_INFO } from '../../utils/fefoEngine';

export function SemaforoBadge({ semaforo }: { semaforo: Semaforo }) {
  const s = SEMAFORO_INFO[semaforo];
  return (
    <span className={`pill ${s.fondo} ${s.texto}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.barra}`} />
      {s.etiqueta}
    </span>
  );
}

export function LifeBar({ porcentaje, semaforo }: { porcentaje: number; semaforo: Semaforo }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2" aria-label={`Vida útil ${porcentaje}%`}>
      <div
        className={`h-full origin-left animate-grow rounded-full transition-all duration-500 ease-out ${SEMAFORO_INFO[semaforo].barra}`}
        style={{ width: `${Math.max(2, porcentaje)}%` }}
      />
    </div>
  );
}

export function ProductoIcono({ productoId, size = 18 }: { productoId: string; size?: number }) {
  const cat = getProducto(productoId).categoria;
  if (cat === 'pescados') return <Fish size={size} />;
  if (cat === 'carnes') return <Beef size={size} />;
  if (cat === 'lacteos') return <Milk size={size} />;
  if (cat === 'frutas') return <Cherry size={size} />;
  return <Package size={size} />;
}
