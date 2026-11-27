import { getProducto } from '../../data/catalog';
import type { Semaforo } from '../../types';
import { SEMAFORO_INFO } from '../../utils/fefoEngine';
import { fotoDeProducto } from '../../utils/fotosReales';
import { emojiProducto } from '../../utils/puesto';

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

/** Ícono del producto (se mantiene por compatibilidad: ahora es el emoji) */
export function ProductoIcono({ productoId, size = 18 }: { productoId: string; size?: number }) {
  const p = getProducto(productoId);
  const foto = fotoDeProducto(p);
  if (foto) return <img src={foto} alt="" loading="lazy" className="rounded-lg object-cover" style={{ width: size + 6, height: size + 6 }} />;
  return (
    <span aria-hidden style={{ fontSize: size, lineHeight: 1 }}>
      {emojiProducto(getProducto(productoId))}
    </span>
  );
}

const TAMANOS = { sm: 'h-10 w-10 text-xl rounded-2xl', md: 'h-12 w-12 text-2xl rounded-2xl', lg: 'h-14 w-14 text-[28px] rounded-[18px]' };

/** Avatar cuadrado del producto, al estilo de una foto de góndola */
export function ProductoAvatar({ productoId, tamano = 'md', className = '' }: { productoId: string; tamano?: keyof typeof TAMANOS; className?: string }) {
  const p = getProducto(productoId);
  const foto = fotoDeProducto(p);
  if (foto)
    return <img src={foto} alt="" loading="lazy" className={`shrink-0 object-cover shadow-sm ${TAMANOS[tamano]} ${className}`} />;
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#FBF3DC] to-[#EADFC2] leading-none shadow-inner dark:from-surface2 dark:to-surface2 ${TAMANOS[tamano]} ${className}`}
    >
      {emojiProducto(getProducto(productoId))}
    </span>
  );
}
