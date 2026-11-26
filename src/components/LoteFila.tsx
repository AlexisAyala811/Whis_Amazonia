import type { ReactNode } from 'react';
import { ChevronRight, Truck, Zap } from 'lucide-react';
import { getCamara, getProducto } from '../data/catalog';
import { SEMAFORO_INFO, formatoHoras, kg, type LoteFefo } from '../utils/fefoEngine';
import { LifeBar, ProductoIcono } from './ui/LoteBits';

interface Props {
  lote: LoteFefo;
  /** Abre la hoja con todas las acciones del lote */
  onAbrir: () => void;
  /** Botón de acción rápida a la derecha (la acción recomendada) */
  accion?: ReactNode;
  mostrarCamara?: boolean;
}

/** Fila compacta de un lote: se ve más lotes por pantalla y al tocarla salen sus acciones. */
export function LoteFila({ lote, onAbrir, accion, mostrarCamara }: Props) {
  const p = getProducto(lote.productoId);
  const { fefo } = lote;
  const s = SEMAFORO_INFO[fefo.semaforo];
  return (
    <article className="card flex items-stretch gap-1 overflow-hidden">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Ver acciones de ${p.nombreCorto} ${lote.codigoQR}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left transition-all duration-200 ease-out active:scale-[0.99]"
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${s.fondo} ${s.texto}`}>
          <ProductoIcono productoId={lote.productoId} size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-semibold leading-tight">{p.nombreCorto}</span>
            <span className={`shrink-0 text-[13px] font-bold tabular-nums ${s.texto}`}>{formatoHoras(fefo.horasRestantes)}</span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
            <span className="truncate">
              {lote.codigoQR} · {kg(lote.pesoKg)}
              {mostrarCamara && ` · ${getCamara(lote.camaraId).nombre.split(' - ')[0]}`}
            </span>
            <span className="shrink-0 tabular-nums">{fefo.porcentajeVidaUtil}%</span>
          </span>
          <span className="mt-1.5 block">
            <LifeBar porcentaje={fefo.porcentajeVidaUtil} semaforo={fefo.semaforo} />
          </span>
        </span>
        {!accion && <ChevronRight size={18} className="shrink-0 text-muted" />}
      </button>
      {accion && <div className="flex shrink-0 items-center pr-2">{accion}</div>}
    </article>
  );
}

/** Botón de la acción recomendada según el semáforo: rojo → Liquidar; resto → Despachar. */
export function AccionRapida({
  lote,
  onDespachar,
  onLiquidar,
}: {
  lote: LoteFefo;
  onDespachar: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
}) {
  const liquidar = lote.fefo.semaforo === 'rojo';
  return (
    <button
      type="button"
      onClick={() => (liquidar ? onLiquidar(lote) : onDespachar(lote))}
      className={`flex h-[52px] w-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition-all duration-200 ease-out active:scale-95 ${
        liquidar ? 'bg-danger/15 text-danger' : 'bg-surface2 text-ink'
      }`}
    >
      {liquidar ? <Zap size={18} /> : <Truck size={18} />}
      {liquidar ? 'Liquidar' : 'Despachar'}
    </button>
  );
}
