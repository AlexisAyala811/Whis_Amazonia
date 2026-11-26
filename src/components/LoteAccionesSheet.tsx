import type { ReactNode } from 'react';
import { Activity, Pencil, Trash2, Truck, Zap } from 'lucide-react';
import { getCamara, getProducto } from '../data/catalog';
import { SEMAFORO_INFO, formatoFecha, formatoHoras, kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { BottomSheet } from './ui/BottomSheet';
import { LifeBar, SemaforoBadge } from './ui/LoteBits';

interface Props {
  lote: LoteFefo | null;
  onClose: () => void;
  onDespachar: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
  onCurva: (l: LoteFefo) => void;
  onEditar: (l: LoteFefo) => void;
  onBaja: (l: LoteFefo) => void;
}

/** Detalle de un lote con todas sus acciones en un solo lugar. */
export function LoteAccionesSheet({ lote, onClose, onDespachar, onLiquidar, onCurva, onEditar, onBaja }: Props) {
  if (!lote) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;
  const p = getProducto(lote.productoId);
  const { fefo } = lote;
  const urgente = fefo.semaforo !== 'verde';

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={p.nombreCorto}
      subtitle={`Jaba ${lote.codigoQR} · ${getCamara(lote.camaraId).nombre}`}
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface2/60 p-3.5">
          <div className="flex items-center justify-between">
            <SemaforoBadge semaforo={fefo.semaforo} />
            <span className="text-xs font-semibold text-muted">{SEMAFORO_INFO[fefo.semaforo].accion}</span>
          </div>
          <p className="mt-2 text-sm">
            Quedan <b className={SEMAFORO_INFO[fefo.semaforo].texto}>{formatoHoras(fefo.horasRestantes)}</b> ·{' '}
            {fefo.porcentajeVidaUtil}% de vida útil
          </p>
          <div className="mt-2">
            <LifeBar porcentaje={fefo.porcentajeVidaUtil} semaforo={fefo.semaforo} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <Dato t="Peso" v={lote.pesoKg === lote.pesoInicialKg ? kg(lote.pesoKg) : `${kg(lote.pesoKg)} de ${kg(lote.pesoInicialKg)}`} />
            <Dato t="Valor" v={soles(fefo.valorComercial)} />
            <Dato t="Ingresó" v={formatoFecha(lote.fechaIngreso)} />
            <Dato t="Precio venta" v={`${soles(lote.precioVentaKg)}/kg`} />
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Accion icono={<Truck size={18} />} texto="Despachar" onClick={() => onDespachar(lote)} />
          <Accion
            icono={<Zap size={18} />}
            texto="Liquidar"
            clase={urgente ? 'border-transparent bg-danger/15 text-danger' : undefined}
            onClick={() => onLiquidar(lote)}
          />
          <Accion icono={<Activity size={18} />} texto="Curva térmica" onClick={() => onCurva(lote)} />
          <Accion icono={<Pencil size={18} />} texto="Corregir datos" onClick={() => onEditar(lote)} />
        </div>
        <button className="btn w-full bg-danger/10 text-danger" onClick={() => onBaja(lote)}>
          <Trash2 size={16} /> Dar de baja (merma)
        </button>
      </div>
    </BottomSheet>
  );
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{t}</dt>
      <dd className="truncate font-semibold">{v}</dd>
    </div>
  );
}

function Accion({ icono, texto, onClick, clase }: { icono: ReactNode; texto: string; onClick: () => void; clase?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.97] ${
        clase ?? 'border-line bg-surface text-ink hover:bg-surface2'
      }`}
    >
      {icono}
      {texto}
    </button>
  );
}
