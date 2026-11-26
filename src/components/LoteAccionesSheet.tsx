import type { ReactNode } from 'react';
import { Activity, Pencil, ShoppingBasket, TriangleAlert, Warehouse, Zap } from 'lucide-react';
import { getCamara, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import { SEMAFORO_INFO, formatoFecha, formatoHoras, kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { consejoLote, envasesDisponibles, nombreEnvase, porcentajeSalido } from '../utils/puesto';
import { BottomSheet } from './ui/BottomSheet';
import { LifeBar, ProductoAvatar, SemaforoBadge } from './ui/LoteBits';

interface Props {
  lote: LoteFefo | null;
  onClose: () => void;
  onSalida: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
  onCurva: (l: LoteFefo) => void;
  onEditar: (l: LoteFefo) => void;
  onBaja: (l: LoteFefo) => void;
}

/** Detalle de un lote con todas sus acciones en un solo lugar. */
export function LoteAccionesSheet({ lote, onClose, onSalida, onLiquidar, onCurva, onEditar, onBaja }: Props) {
  const { ahora } = useWhisStore();
  if (!lote) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;
  const p = getProducto(lote.productoId);
  const { fefo } = lote;
  const s = SEMAFORO_INFO[fefo.semaforo];
  const env = envasesDisponibles(lote);
  const rojo = fefo.semaforo === 'rojo';

  return (
    <BottomSheet open onClose={onClose} title="Detalle de lote" subtitle={`Lote #${lote.codigoQR}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductoAvatar productoId={lote.productoId} tamano="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-extrabold leading-tight">{p.nombreCorto}</h3>
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              <Warehouse size={12} /> {getCamara(lote.camaraId).nombre}
            </p>
          </div>
          <SemaforoBadge semaforo={fefo.semaforo} />
        </div>

        <div className="rounded-3xl bg-surface2/60 p-3.5">
          <p className="text-sm">
            Quedan <b className={s.texto}>{formatoHoras(fefo.horasRestantes)}</b> · {fefo.porcentajeVidaUtil}% de vida útil
          </p>
          <div className="mt-2">
            <LifeBar porcentaje={fefo.porcentajeVidaUtil} semaforo={fefo.semaforo} />
          </div>
          <p className="mt-2 text-xs text-muted">{consejoLote(lote, ahora)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
            <Dato
              t="Disponible"
              v={env !== null && lote.envase ? `${env} ${nombreEnvase(lote.envase.tipo, env)} · ${kg(lote.pesoKg)}` : kg(lote.pesoKg)}
            />
            <Dato t="Comercializado" v={`${porcentajeSalido(lote)}% de ${kg(lote.pesoInicialKg)}`} />
            <Dato t="Valor actual" v={soles(fefo.valorComercial)} />
            <Dato t="Precio venta" v={`${soles(lote.precioVentaKg)}/kg`} />
            <Dato t="Ingresó" v={formatoFecha(lote.fechaIngreso)} />
            <Dato t="Costo" v={`${soles(lote.costoKg)}/kg`} />
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary min-h-[52px]" onClick={() => onSalida(lote)}>
            <ShoppingBasket size={18} /> Venta / Salida
          </button>
          <button className={`${rojo ? 'btn-danger' : 'btn-ghost'} min-h-[52px]`} onClick={() => onLiquidar(lote)}>
            <Zap size={18} /> Remate
          </button>
          <Accion icono={<Activity size={18} />} texto="Curva térmica" onClick={() => onCurva(lote)} />
          <Accion icono={<Pencil size={18} />} texto="Corregir datos" onClick={() => onEditar(lote)} />
        </div>
        <button className="btn w-full bg-danger/10 text-danger" onClick={() => onBaja(lote)}>
          <TriangleAlert size={16} /> Registrar merma / pérdida
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

function Accion({ icono, texto, onClick }: { icono: ReactNode; texto: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm font-semibold text-ink transition-all duration-200 ease-out hover:bg-surface2 active:scale-[0.97]"
    >
      {icono}
      {texto}
    </button>
  );
}
