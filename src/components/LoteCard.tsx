import type { ReactNode } from 'react';
import { MapPin, QrCode, Timer } from 'lucide-react';
import { getCamara, getProducto } from '../data/catalog';
import { formatoHoras, kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { LifeBar, ProductoIcono, SemaforoBadge } from './ui/LoteBits';

interface Props {
  lote: LoteFefo;
  acciones?: ReactNode;
  compacto?: boolean;
  onClick?: () => void;
  seleccionado?: boolean;
}

export function LoteCard({ lote, acciones, compacto, onClick, seleccionado }: Props) {
  const p = getProducto(lote.productoId);
  const { fefo } = lote;
  return (
    <article
      onClick={onClick}
      className={`card p-4 transition-all duration-200 ease-out ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${
        seleccionado ? 'ring-2 ring-brand' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            fefo.semaforo === 'rojo' ? 'bg-danger/15 text-danger' : fefo.semaforo === 'amarillo' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'
          }`}
        >
          <ProductoIcono productoId={lote.productoId} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight">{p.nombreCorto}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
            <SemaforoBadge semaforo={fefo.semaforo} />
            <span className="inline-flex items-center gap-1">
              <QrCode size={12} />
              {lote.codigoQR}
            </span>
            <span>{kg(lote.pesoKg)}</span>
          </div>
          {!compacto && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} />
              {getCamara(lote.camaraId).nombre}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-bold tabular-nums">{soles(fefo.valorComercial)}</p>
          <p className="text-[11px] text-muted">valor</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted">
            <Timer size={12} />
            Quedan <b className="font-semibold text-ink">{formatoHoras(fefo.horasRestantes)}</b>
          </span>
          <span className="font-semibold tabular-nums">{fefo.porcentajeVidaUtil}% vida útil</span>
        </div>
        <LifeBar porcentaje={fefo.porcentajeVidaUtil} semaforo={fefo.semaforo} />
      </div>

      {acciones && <div className="mt-3 flex gap-2">{acciones}</div>}
    </article>
  );
}
