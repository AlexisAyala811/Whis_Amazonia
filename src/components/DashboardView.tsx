import { useMemo, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardCheck,
  CircleCheck,
  HardDriveDownload,
  Hourglass,
  Lightbulb,
  Plus,
  ShoppingBasket,
  Snowflake,
  Sun,
  Warehouse,
  Wallet,
  Zap,
} from 'lucide-react';
import { CAMARAS, getCamara, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CamaraId } from '../types';
import { SEMAFORO_INFO, kg, soles, solesCorto, type LoteFefo } from '../utils/fefoEngine';
import { consejoLote, envasesDisponibles, nombreEnvase, resumenDelDia } from '../utils/puesto';
import { MetaDelDiaCard } from './Progreso';
import { ProductoAvatar } from './ui/LoteBits';

interface Props {
  online: boolean;
  onAbrir: (l: LoteFefo) => void;
  onSalida: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
  onVerLotes: () => void;
  onProgreso: () => void;
  onRegistrar: () => void;
  onRemates: () => void;
  onAlertas: () => void;
  onCierre: () => void;
}

const SEMANA_MS = 7 * 24 * 3_600_000;

/** Etiquetas compactas del eje Y: 2600 → "2.6k" */
const ejeSoles = (v: number): string =>
  v >= 1000 ? `${(v / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k` : String(v);

const ICONO_CAMARA: Record<CamaraId, typeof Snowflake> = { camara1: Snowflake, camara2: Snowflake, almacen: Sun };

export function DashboardView(props: Props) {
  const { online, onAbrir, onSalida, onLiquidar, onVerLotes, onProgreso, onRegistrar, onRemates, onAlertas, onCierre } = props;
  const { data, activos, ahora } = useWhisStore();

  const kpi = useMemo(() => {
    const kgTotal = activos.reduce((s, l) => s + l.pesoKg, 0);
    const verdes = activos.filter((l) => l.fefo.semaforo === 'verde');
    const rojos = activos.filter((l) => l.fefo.semaforo === 'rojo').length;
    const amarillos = activos.filter((l) => l.fefo.semaforo === 'amarillo').length;
    return {
      lotes: activos.length,
      kgTotal,
      paraVenta: verdes.length,
      kgParaVenta: verdes.reduce((s, l) => s + l.pesoKg, 0),
      rojos,
      amarillos,
      dineroRiesgo: activos.filter((l) => l.fefo.semaforo !== 'verde').reduce((s, l) => s + l.fefo.valorComercial, 0),
      hoy: resumenDelDia(data, ahora),
    };
  }, [activos, data, ahora]);

  const ambientes = useMemo(
    () =>
      CAMARAS.map((c) => {
        const ls = activos.filter((l) => l.camaraId === c.id);
        return {
          ...c,
          lotes: ls.length,
          kg: ls.reduce((s, l) => s + l.pesoKg, 0),
          enRiesgo: ls.filter((l) => l.fefo.semaforo !== 'verde').length,
        };
      }),
    [activos],
  );

  const semanal = useMemo(() => {
    const desde = ahora - SEMANA_MS;
    const actual = {
      semana: 'Esta sem.',
      recuperado: Math.round(
        data.liquidaciones.filter((l) => new Date(l.fecha).getTime() >= desde).reduce((s, l) => s + l.total, 0),
      ),
      perdido: Math.round(
        data.bajas.filter((b) => new Date(b.fecha).getTime() >= desde).reduce((s, b) => s + b.valorPerdido, 0),
      ),
    };
    return [...data.historialSemanal, actual];
  }, [data, ahora]);

  const urgentes = activos.filter((l) => l.fefo.semaforo !== 'verde');
  const atencion = (urgentes.length > 0 ? urgentes : activos).slice(0, 3);
  const graficoVacio = semanal.every((w) => w.recuperado === 0 && w.perdido === 0);
  const recomendacion = useMemo(() => {
    const r = activos.find((l) => l.fefo.semaforo === 'rojo');
    if (r) {
      const p = getProducto(r.productoId).nombreCorto;
      return `El lote ${r.codigoQR} de ${p.toLowerCase()} es el que vence primero. Ofrécelo hoy a tus compradores por WhatsApp desde Remate antes de que pierda más valor.`;
    }
    const a = activos.find((l) => l.fefo.semaforo === 'amarillo');
    if (a) return `Despacha primero el lote ${a.codigoQR}: así sigues la regla FEFO y evitas merma por sobremaduración.`;
    if (activos.length === 0) return 'Registra cada ingreso como un lote propio: así sabrás siempre qué sacar primero.';
    return 'Todo tu inventario está en buen estado. Mantén separadas las frutas maduras de las verdes para que no se aceleren entre sí.';
  }, [activos]);

  return (
    <div className="space-y-5">
      {/* Estado del puesto */}
      <div className="card flex items-center gap-2.5 px-3.5 py-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-ok' : 'bg-warn'}`} />
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          {online ? 'Modo local activo · guardado en este equipo' : 'Sin internet · todo sigue funcionando'}
        </p>
        <HardDriveDownload size={15} className="shrink-0 text-muted" />
      </div>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador
          titulo="Lotes activos"
          valor={String(kpi.lotes)}
          detalle={`${kg(kpi.kgTotal)} en stock`}
          icono={<Boxes size={16} />}
          tono="bg-surface2 text-muted"
          onClick={onVerLotes}
        />
        <Indicador
          titulo="Para venta"
          valor={String(kpi.paraVenta)}
          detalle={`Óptimo estado · ${kg(kpi.kgParaVenta)}`}
          icono={<CircleCheck size={16} />}
          tono="bg-ok/15 text-ok"
          onClick={onVerLotes}
        />
        <Indicador
          titulo="Prioridad FEFO"
          valor={String(kpi.rojos + kpi.amarillos)}
          unidad="lotes"
          detalle={kpi.rojos > 0 ? `${kpi.rojos} críticos · ${solesCorto(kpi.dineroRiesgo)}` : 'Requieren salida hoy'}
          detalleClase={kpi.rojos > 0 ? 'text-danger' : undefined}
          icono={<Hourglass size={16} />}
          tono="bg-warn/15 text-warn"
          onClick={onRemates}
        />
        <Indicador
          titulo="Ventas del día"
          valor={solesCorto(kpi.hoy.ventas)}
          detalle={
            kpi.hoy.merma > 0
              ? `${kg(kpi.hoy.kgVendidos)} · −${solesCorto(kpi.hoy.merma)} merma`
              : `${kpi.hoy.operaciones} ${kpi.hoy.operaciones === 1 ? 'venta' : 'ventas'} · ${kg(kpi.hoy.kgVendidos)}`
          }
          icono={<Wallet size={16} />}
          tono="bg-brand/10 text-brand"
        />
      </section>

      {/* Acciones de puesto */}
      <section>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Acciones de puesto</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          <button className="chip chip-on" onClick={onRegistrar}>
            <Plus size={17} strokeWidth={2.6} /> Registrar lote
          </button>
          <button className="chip" onClick={onVerLotes}>
            <ShoppingBasket size={17} /> Venta / Salida
          </button>
          <button className="chip" onClick={onRemates}>
            <Zap size={17} className="text-danger" /> Remate
          </button>
          <button className="chip" onClick={onCierre}>
            <ClipboardCheck size={17} /> Cierre del día
          </button>
          <button className="chip" onClick={onAlertas}>
            <Snowflake size={17} /> Apagón
          </button>
        </div>
      </section>

      {/* Gamificación: meta, racha y logros */}
      <MetaDelDiaCard onAbrir={onProgreso} />

      {/* Cierre del día */}
      <button
        type="button"
        onClick={onCierre}
        className="card flex w-full items-center gap-3 p-3.5 text-left transition-all duration-200 ease-out active:scale-[0.99]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <ClipboardCheck size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Cierre del día</span>
          <span className="block truncate text-xs text-muted">
            {kpi.hoy.operaciones > 0 || kpi.hoy.merma > 0
              ? `${solesCorto(kpi.hoy.ventas)} vendidos hoy · envíalo`
              : 'Ventas, merma y meta, listo para WhatsApp'}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted" />
      </button>

      {/* Atención hoy */}
      <section>
        <div className="seccion">
          <h2 className="seccion-titulo">
            <Hourglass size={18} className="text-warn" /> Atención hoy · FEFO
          </h2>
          {urgentes.length > 0 ? (
            <span className="pill bg-warn/15 text-warn">
              {urgentes.length} {urgentes.length === 1 ? 'urgente' : 'urgentes'}
            </span>
          ) : (
            <button onClick={onVerLotes} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand">
              Ver todo <ArrowRight size={15} />
            </button>
          )}
        </div>
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {atencion.length === 0 && (
            <div className="card p-6 text-center text-sm text-muted">
              No hay lotes activos. Toca <b className="text-ink">Registrar</b> para ingresar tu mercadería.
            </div>
          )}
          {atencion.map((l) => (
            <TarjetaAtencion
              key={l.id}
              lote={l}
              ahora={ahora}
              onAbrir={() => onAbrir(l)}
              onAccion={() => (l.fefo.semaforo === 'rojo' ? onLiquidar(l) : onSalida(l))}
            />
          ))}
          {urgentes.length > 3 && (
            <button onClick={onVerLotes} className="btn-ghost w-full md:col-span-2">
              Ver los {urgentes.length} lotes urgentes <ChevronRight size={16} />
            </button>
          )}
        </div>
      </section>

      {/* Ambientes */}
      <section>
        <div className="seccion">
          <h2 className="seccion-titulo">
            <Warehouse size={18} className="text-brand" /> Ambientes de conservación
          </h2>
          <button onClick={onAlertas} className="min-h-[44px] text-xs font-semibold text-muted">
            Frío y alertas
          </button>
        </div>
        <div className="card divide-y divide-line">
          {ambientes.map((a) => {
            const Icono = ICONO_CAMARA[a.id];
            return (
              <div key={a.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <Icono size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.nombre.replace(' - ', ' · ')}</p>
                  <p className="truncate text-xs text-muted">
                    {a.lotes} {a.lotes === 1 ? 'lote' : 'lotes'} · {kg(a.kg)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{a.tempObjetivo}</p>
                  <p className={`text-[11px] font-semibold ${a.enRiesgo > 0 ? 'text-warn' : 'text-ok'}`}>
                    {a.enRiesgo > 0 ? `● ${a.enRiesgo} en riesgo` : '● Condición estable'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recomendación */}
      <section className="flex gap-3 rounded-3xl border border-ok/20 bg-ok/10 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ok">
          <Lightbulb size={18} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ok">Recomendación amazónica</p>
          <p className="mt-0.5 text-sm">{recomendacion}</p>
        </div>
      </section>

      {/* Gráfico semanal */}
      <section className="card p-4">
        <h2 className="text-base font-bold">Recuperado vs. perdido por merma</h2>
        <p className="mb-3 text-xs text-muted">Soles por semana</p>
        {graficoVacio ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface2/50 px-4 py-8 text-center">
            <BarChart3 size={22} className="text-muted" />
            <p className="text-sm text-muted">
              Aún no hay remates ni bajas. Cuando liquides o registres mermas, aquí verás cada semana cuánto recuperaste y cuánto
              perdiste.
            </p>
          </div>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semanal} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="rgb(var(--muted) / 0.15)" />
                <XAxis dataKey="semana" interval={0} tick={{ fontSize: 9, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} width={40} tickFormatter={ejeSoles} />
                <Tooltip
                  cursor={{ fill: 'rgb(var(--muted) / 0.08)' }}
                  contentStyle={{
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--muted) / 0.2)',
                    borderRadius: 16,
                    fontSize: 12,
                    color: 'rgb(var(--ink))',
                  }}
                  formatter={(v: number, n: string) => [soles(v), n === 'recuperado' ? 'Recuperado' : 'Perdido']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v: string) => (v === 'recuperado' ? 'Recuperado' : 'Perdido por merma')}
                />
                <Bar dataKey="recuperado" fill="rgb(var(--ok))" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="perdido" fill="rgb(var(--danger))" radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  unidad,
  detalle,
  detalleClase,
  icono,
  tono,
  onClick,
}: {
  titulo: string;
  valor: string;
  unidad?: string;
  detalle: string;
  detalleClase?: string;
  icono: ReactNode;
  tono: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className="card min-w-0 p-3.5 text-left transition-all duration-200 active:scale-[0.98]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-muted">{titulo}</p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tono}`}>{icono}</span>
      </div>
      <p className="mt-1 truncate text-2xl font-extrabold tabular-nums tracking-tight">
        {valor}
        {unidad && <span className="ml-1 text-xs font-semibold text-muted">{unidad}</span>}
      </p>
      <p className={`truncate text-[11px] ${detalleClase ?? 'text-muted'}`}>{detalle}</p>
    </Tag>
  );
}

function TarjetaAtencion({
  lote: l,
  ahora,
  onAbrir,
  onAccion,
}: {
  lote: LoteFefo;
  ahora: number;
  onAbrir: () => void;
  onAccion: () => void;
}) {
  const p = getProducto(l.productoId);
  const s = SEMAFORO_INFO[l.fefo.semaforo];
  const env = envasesDisponibles(l);
  const rojo = l.fefo.semaforo === 'rojo';
  return (
    <article className="card p-3.5">
      <div className="flex items-start gap-3">
        <ProductoAvatar productoId={l.productoId} tamano="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Lote #{l.codigoQR}</p>
            <span className={`pill shrink-0 ${s.fondo} ${s.texto}`}>{s.etiqueta}</span>
          </div>
          <h3 className="truncate text-[17px] font-bold leading-tight">{p.nombreCorto}</h3>
          <p className="truncate text-xs text-muted">
            {env !== null && l.envase ? `${env} ${nombreEnvase(l.envase.tipo, env)} · ` : ''}
            {kg(l.pesoKg)} · {getCamara(l.camaraId).nombre.split(' - ')[0]}
          </p>
        </div>
      </div>
      <p className="mt-3 flex gap-2 rounded-2xl bg-surface2/70 px-3 py-2.5 text-xs">
        <Hourglass size={14} className={`mt-px shrink-0 ${s.texto}`} />
        <span>{consejoLote(l, ahora)}</span>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className={rojo ? 'btn-danger' : 'btn-primary'} onClick={onAccion}>
          {rojo ? <Zap size={16} /> : <ShoppingBasket size={16} />} {rojo ? 'Rematar' : 'Venta rápida'}
        </button>
        <button className="btn-ghost" onClick={onAbrir}>
          Ver detalle <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}
