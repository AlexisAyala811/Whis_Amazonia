import { useEffect, useState } from 'react';
import { Banknote, Check, CreditCard, HardDriveDownload, Minus, Plus, ShoppingCart, Smartphone, TriangleAlert, Zap } from 'lucide-react';
import { getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CanalVenta, MedioPago } from '../types';
import { formatoHora, kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { CANALES, MEDIOS_PAGO, envasesDisponibles, nombreEnvase, salidasDeHoy } from '../utils/puesto';
import { BottomSheet } from './ui/BottomSheet';
import { ProductoAvatar } from './ui/LoteBits';
import { useToast } from './ui/Toast';

const ICONO_PAGO: Record<MedioPago, typeof Banknote> = { efectivo: Banknote, yape: Smartphone, credito: CreditCard };

interface Props {
  lote: LoteFefo | null;
  onClose: () => void;
  onMerma: (l: LoteFefo) => void;
  onRemate: (l: LoteFefo) => void;
}

/** Venta o salida de un lote: cantidad, tipo de cliente, precio y medio de cobro. */
export function SalidaSheet({ lote, onClose, onMerma, onRemate }: Props) {
  const { despachar, data, ahora } = useWhisStore();
  const toast = useToast();
  const [cantidad, setCantidad] = useState(0);
  const [canal, setCanal] = useState<CanalVenta>('mayorista');
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [precio, setPrecio] = useState('');

  const porEnvase = lote?.envase?.kgPorEnvase ?? 0;
  const enEnvases = !!lote && envasesDisponibles(lote) !== null && porEnvase > 0;
  const maximo = lote ? (enEnvases ? envasesDisponibles(lote)! : Math.floor(lote.pesoKg * 10) / 10) : 0;

  useEffect(() => {
    if (!lote) return;
    setCantidad(Math.min(enEnvases ? 1 : 10, maximo));
    setPrecio(String(enEnvases ? +(lote.precioVentaKg * porEnvase).toFixed(2) : lote.precioVentaKg));
    setCanal('mayorista');
    setMedio('efectivo');
    // Solo al abrir otro lote
  }, [lote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lote) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;

  const p = getProducto(lote.productoId);
  const unidad = enEnvases && lote.envase ? nombreEnvase(lote.envase.tipo, 2) : 'kg';
  const unidadUna = enEnvases && lote.envase ? nombreEnvase(lote.envase.tipo, 1) : 'kg';
  // Si se vende todo, se descuenta el peso exacto que queda (sin redondeos de envases)
  const todo = cantidad >= maximo;
  const kgSalida = todo && cantidad > 0 ? lote.pesoKg : enEnvases ? cantidad * porEnvase : Math.min(cantidad, lote.pesoKg);
  const precioUnidad = Number(precio) || 0;
  const precioKg = enEnvases ? precioUnidad / porEnvase : precioUnidad;
  const total = +(kgSalida * precioKg).toFixed(2);
  const valido = kgSalida > 0 && precioKg > 0;
  const sumar = (n: number) => setCantidad((c) => Math.max(0, Math.min(maximo, +(c + n).toFixed(1))));
  const salidas = salidasDeHoy(data, ahora).slice(0, 4);

  const confirmar = () => {
    if (!valido) return;
    despachar(lote.id, kgSalida, { precioKg: +precioKg.toFixed(2), canal, medioPago: medio });
    toast(
      'exito',
      `Venta registrada · ${soles(total)}`,
      `${p.nombreCorto} ${lote.codigoQR} · ${enEnvases ? `${cantidad} ${nombreEnvase(lote.envase!.tipo, cantidad)}` : kg(kgSalida)} · ${MEDIOS_PAGO.find((m) => m.id === medio)?.nombre}`,
    );
    onClose();
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Venta / salida"
      subtitle={`Lote #${lote.codigoQR} · ${p.nombreCorto}`}
      footer={
        <div>
          <button className="btn-primary w-full py-3 text-base" disabled={!valido} onClick={confirmar}>
            <Check size={20} /> Confirmar venta · {soles(total)}
          </button>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <HardDriveDownload size={12} /> Se guarda al instante en este equipo
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Venta o merma */}
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface2 p-1">
          <span className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-bold text-white dark:text-[#0D0F12]">
            <ShoppingCart size={16} /> Venta / Salida
          </span>
          <button
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-muted transition-all active:scale-95"
            onClick={() => onMerma(lote)}
          >
            <TriangleAlert size={16} /> Merma / Pérdida
          </button>
        </div>

        {/* Lote */}
        <div className="flex items-center gap-3 rounded-3xl border border-line p-3">
          <ProductoAvatar productoId={lote.productoId} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              Lote #{lote.codigoQR} <span className="font-medium text-muted">· {p.nombreCorto}</span>
            </p>
            <p className="truncate text-xs text-muted">
              Disponible:{' '}
              <b className="text-ink">
                {enEnvases ? `${maximo} ${unidad} · ${kg(lote.pesoKg)}` : kg(lote.pesoKg)}
              </b>
            </p>
          </div>
          {lote.fefo.semaforo !== 'verde' && <span className="pill shrink-0 bg-ok/15 px-2 text-ok">FEFO</span>}
        </div>
        {lote.fefo.semaforo === 'rojo' && (
          <button
            onClick={() => onRemate(lote)}
            className="flex w-full items-center gap-2 rounded-2xl bg-danger/10 px-3 py-2.5 text-left text-xs text-danger"
          >
            <Zap size={15} className="shrink-0" /> Lote crítico: también puedes ofrecerlo en remate por WhatsApp.
          </button>
        )}

        {/* Cantidad */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="label mb-0">Cantidad a descargar</span>
            {enEnvases && <span className="text-xs text-muted">1 {unidadUna} ≈ {kg(porEnvase)}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => sumar(-1)}
              aria-label="Restar"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-line bg-surface transition-all active:scale-90"
            >
              <Minus size={22} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <input
                className="w-full bg-transparent text-center text-4xl font-extrabold tabular-nums outline-none"
                type="number"
                inputMode="decimal"
                min={0}
                max={maximo}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(0, Math.min(maximo, Number(e.target.value) || 0)))}
                aria-label={`Cantidad en ${unidad}`}
              />
              <p className="text-xs text-muted">{enEnvases ? `${unidad} · ≈ ${kg(kgSalida)}` : 'kilos'}</p>
            </div>
            <button
              onClick={() => sumar(1)}
              aria-label="Sumar"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white transition-all active:scale-90 dark:text-[#0D0F12]"
            >
              <Plus size={22} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[1, 5, 10].map((n) => (
              <button key={n} className="chip px-2" onClick={() => sumar(n)}>
                +{n}
              </button>
            ))}
            <button className={`chip px-2 ${todo ? 'chip-on' : ''}`} onClick={() => setCantidad(maximo)}>
              Todo
            </button>
          </div>
        </section>

        {/* Tipo de salida */}
        <section>
          <span className="label">Tipo de salida</span>
          <div className="grid grid-cols-3 gap-2">
            {CANALES.map((c) => (
              <button key={c.id} className={`chip px-2 ${canal === c.id ? 'chip-on' : ''}`} onClick={() => setCanal(c.id)}>
                {c.nombre}
              </button>
            ))}
          </div>
        </section>

        {/* Precio */}
        <section className="flex items-end gap-3 rounded-3xl bg-surface2/60 p-3.5">
          <label className="min-w-0 flex-1">
            <span className="label">Precio x {unidadUna} (S/)</span>
            <input
              className="field bg-surface"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </label>
          <div className="shrink-0 pb-1 text-right">
            <p className="text-xs text-muted">Total cobro</p>
            <p className="text-2xl font-extrabold tabular-nums text-brand">{soles(total)}</p>
          </div>
        </section>

        {/* Medio de cobro */}
        <section>
          <span className="label">Medio de cobro</span>
          <div className="grid grid-cols-3 gap-2">
            {MEDIOS_PAGO.map((m) => {
              const Icono = ICONO_PAGO[m.id];
              const on = medio === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMedio(m.id)}
                  aria-pressed={on}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-3xl border text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    on ? 'border-transparent bg-brand text-white dark:text-[#0D0F12]' : 'border-line bg-surface'
                  }`}
                >
                  <Icono size={20} />
                  {m.nombre}
                </button>
              );
            })}
          </div>
        </section>

        {/* Últimas salidas */}
        {salidas.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-bold">Últimas salidas de hoy</span>
              <span className="text-[11px] text-muted">Registro local</span>
            </div>
            <div className="space-y-2">
              {salidas.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface2/60 px-3 py-2.5">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      s.tipo === 'merma' ? 'bg-danger/15 text-danger' : 'bg-ok/15 text-ok'
                    }`}
                  >
                    {s.tipo === 'merma' ? <TriangleAlert size={16} /> : s.tipo === 'remate' ? <Zap size={16} /> : <ShoppingCart size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      −{kg(s.kg)} · {s.codigo}
                    </p>
                    <p className="truncate text-[11px] text-muted">{s.detalle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${s.monto < 0 ? 'text-danger' : 'text-ok'}`}>
                      {s.monto < 0 ? '−' : '+'}
                      {soles(Math.abs(s.monto))}
                    </p>
                    <p className="text-[11px] text-muted">{formatoHora(new Date(s.fecha))}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
