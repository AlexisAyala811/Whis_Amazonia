import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Banknote, HardDriveDownload, ShieldCheck, Truck, Zap } from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';
import { solesCorto, soles, type LoteFefo } from '../utils/fefoEngine';
import { LoteCard } from './LoteCard';

interface Props {
  online: boolean;
  onDespachar: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
  onVerLotes: () => void;
}

const SEMANA_MS = 7 * 24 * 3_600_000;

/** Etiquetas compactas del eje Y: 2600 → "2.6k" */
const ejeSoles = (v: number): string =>
  v >= 1000 ? `${(v / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k` : String(v);

export function DashboardView({ online, onDespachar, onLiquidar, onVerLotes }: Props) {
  const { data, activos, ahora } = useWhisStore();

  const kpi = useMemo(() => {
    const enRiesgo = activos.filter((l) => l.fefo.semaforo !== 'verde');
    const dineroRiesgo = enRiesgo.reduce((s, l) => s + l.fefo.valorComercial, 0);
    // Caja Recuperada: solo liquidaciones reales registradas en la app (arranca en S/ 0)
    const recuperado = data.liquidaciones.reduce((s, l) => s + l.total, 0);
    // Merma evitada: incluye el historial semanal para tener tendencia desde el primer día
    const recuperadoTotal = data.historialSemanal.reduce((s, w) => s + w.recuperado, 0) + recuperado;
    const perdido =
      data.historialSemanal.reduce((s, w) => s + w.perdido, 0) + data.bajas.reduce((s, b) => s + b.valorPerdido, 0);
    const mermaEvitada =
      recuperadoTotal + perdido > 0 ? Math.round((recuperadoTotal / (recuperadoTotal + perdido)) * 100) : 0;
    return {
      dineroRiesgo,
      rojos: enRiesgo.filter((l) => l.fefo.semaforo === 'rojo').length,
      amarillos: enRiesgo.filter((l) => l.fefo.semaforo === 'amarillo').length,
      recuperado,
      mermaEvitada,
    };
  }, [activos, data]);

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

  const prioritarios = activos.slice(0, 5);

  return (
    <div className="space-y-5">
      <div
        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs ${
          online ? 'border-line bg-surface text-muted' : 'border-warn/30 bg-warn/10 text-warn'
        }`}
      >
        <HardDriveDownload size={16} className="shrink-0" />
        <span>
          {online ? (
            <>
              <b className="font-semibold text-ink">En línea</b> · Todo se guarda localmente en este equipo, también funciona
              sin internet.
            </>
          ) : (
            <b className="font-semibold">Modo Offline Activo — Datos guardados localmente</b>
          )}
        </span>
      </div>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card col-span-2 overflow-hidden p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dinero en riesgo hoy</p>
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">{soles(kpi.dineroRiesgo)}</p>
          <div className="mt-2 flex gap-2">
            <span className="pill bg-danger/15 text-danger">{kpi.rojos} críticos</span>
            <span className="pill bg-warn/15 text-warn">{kpi.amarillos} prioritarios</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Caja recuperada</p>
            <Banknote size={16} className="text-ok" />
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums">{solesCorto(kpi.recuperado)}</p>
          <p className="text-[11px] text-muted">{data.liquidaciones.length} {data.liquidaciones.length === 1 ? 'liquidación' : 'liquidaciones'}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Merma evitada</p>
            <ShieldCheck size={16} className="text-brand" />
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums">{kpi.mermaEvitada}%</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${kpi.mermaEvitada}%` }} />
          </div>
        </div>
      </section>

      {/* Lista prioritaria FEFO */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold">Qué sacar primero hoy</h2>
            <p className="text-xs text-muted">Orden FEFO térmico: menor vida útil real primero</p>
          </div>
          <button onClick={onVerLotes} className="inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand">
            Ver todo <ArrowRight size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {prioritarios.length === 0 && (
            <div className="card p-6 text-center text-sm text-muted">No hay lotes activos. Registra uno con el botón +.</div>
          )}
          {prioritarios.map((l) => (
            <LoteCard
              key={l.id}
              lote={l}
              compacto
              acciones={
                <>
                  <button className="btn-ghost flex-1" onClick={() => onDespachar(l)}>
                    <Truck size={16} /> Despachar
                  </button>
                  <button
                    className={`btn flex-1 ${l.fefo.semaforo === 'verde' ? 'border border-line bg-surface text-muted' : 'bg-danger/15 text-danger'}`}
                    onClick={() => onLiquidar(l)}
                  >
                    <Zap size={16} /> Liquidar
                  </button>
                </>
              }
            />
          ))}
        </div>
      </section>

      {/* Gráfico semanal */}
      <section className="card p-4">
        <h2 className="text-base font-bold">Recuperado vs. perdido por merma</h2>
        <p className="mb-3 text-xs text-muted">Soles por semana</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semanal} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="rgb(var(--muted) / 0.15)" />
              <XAxis dataKey="semana" interval={0} tick={{ fontSize: 9, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={ejeSoles}
              />
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
      </section>
    </div>
  );
}
