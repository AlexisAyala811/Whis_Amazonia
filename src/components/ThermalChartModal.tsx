import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bluetooth, BluetoothSearching, ThermometerSnowflake, ThermometerSun } from 'lucide-react';
import { getCamara, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { EventoTermico } from '../types';
import { formatoHoras, type LoteFefo } from '../utils/fefoEngine';
import { BottomSheet } from './ui/BottomSheet';

interface Lectura {
  t: number;
  etiqueta: string;
  temp: number;
  fuera: boolean;
}

/** Generador pseudoaleatorio determinista (misma curva para el mismo lote) */
const rng = (semilla: string) => {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const MS_H = 3_600_000;

/** Simula la descarga de un registrador BLE dentro de la cámara/transporte. */
function simularLecturas(lote: LoteFefo, eventos: EventoTermico[], ahora: number): Lectura[] {
  const p = getProducto(lote.productoId);
  const rand = rng(lote.id);
  const ingreso = new Date(lote.fechaIngreso).getTime();
  const apagones = eventos
    .filter((e) => e.camaraIds.includes(lote.camaraId))
    .map((e) => ({ fin: new Date(e.fecha).getTime(), horas: e.horas }))
    .filter((a) => a.fin > ingreso && a.fin <= ahora);
  const horasApagon = apagones.reduce((s, a) => s + a.horas, 0);
  const horasTransporte = Math.max(0, lote.horasExposicionCalor - horasApagon);

  const inicio = ingreso - horasTransporte * MS_H;
  const totalH = (ahora - inicio) / MS_H;
  const paso = Math.max(0.5, Math.ceil(totalH / 80));
  const medio = (p.tempMin + p.tempMax) / 2;
  const out: Lectura[] = [];

  for (let h = 0; h <= totalH; h += paso) {
    const t = inicio + h * MS_H;
    let temp = medio + (rand() - 0.5) * (p.tempMax - p.tempMin) * 0.6;
    if (t < ingreso) {
      // Transporte sin frío: temperatura ambiente amazónica
      temp = 24 + rand() * 9;
    } else {
      for (const a of apagones) {
        const ini = a.fin - a.horas * MS_H;
        if (t >= ini && t <= a.fin + MS_H) {
          const prog = Math.min(1, (t - ini) / (a.horas * MS_H));
          temp = p.tempMax + 2 + prog * Math.min(18, a.horas * 3.5) + rand() * 1.5;
        }
      }
    }
    temp = Math.round(temp * 10) / 10;
    const d = new Date(t);
    out.push({
      t,
      etiqueta: `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}h`,
      temp,
      fuera: temp > p.tempMax || temp < p.tempMin,
    });
  }
  return out;
}

interface Props {
  lote: LoteFefo | null;
  onClose: () => void;
}

export function ThermalChartModal({ lote, onClose }: Props) {
  const { data, ahora } = useWhisStore();
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    if (!lote) return;
    setProgreso(0);
    const t = window.setInterval(() => setProgreso((p) => (p >= 100 ? 100 : p + 8)), 90);
    return () => window.clearInterval(t);
  }, [lote?.id]);

  const lecturas = useMemo(() => (lote ? simularLecturas(lote, data.eventos, ahora) : []), [lote, data.eventos, ahora]);
  const p = lote ? getProducto(lote.productoId) : null;
  const fuera = lecturas.filter((l) => l.fuera).length;
  const maxTemp = lecturas.reduce((m, l) => Math.max(m, l.temp), -Infinity);
  const listo = progreso >= 100;

  return (
    <BottomSheet
      open={!!lote}
      onClose={onClose}
      title="Curva térmica"
      subtitle={lote && p ? `${lote.codigoQR} · ${p.nombreCorto} · ${getCamara(lote.camaraId).nombre}` : ''}
    >
      {lote && p && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface2/60 p-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${listo ? 'bg-brand/15 text-brand' : 'bg-surface text-muted'}`}>
              {listo ? <Bluetooth size={18} /> : <BluetoothSearching size={18} className="animate-pulse" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {listo ? `Sensor BLE TS-${lote.codigoQR.replace(/\D/g, '')} sincronizado` : 'Descargando datos del sensor BLE…'}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand transition-all duration-100" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          </div>

          {listo && (
            <div className="animate-fade-in space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-surface2/60 p-2.5">
                  <ThermometerSnowflake size={16} className="mx-auto text-brand" />
                  <p className="mt-1 text-sm font-bold">
                    {p.tempMin}–{p.tempMax} °C
                  </p>
                  <p className="text-[10px] text-muted">rango ideal</p>
                </div>
                <div className="rounded-2xl bg-danger/10 p-2.5 text-danger">
                  <ThermometerSun size={16} className="mx-auto" />
                  <p className="mt-1 text-sm font-bold">{maxTemp.toFixed(1)} °C</p>
                  <p className="text-[10px]">pico máximo</p>
                </div>
                <div className="rounded-2xl bg-warn/10 p-2.5 text-warn">
                  <p className="text-lg font-bold leading-tight">{lote.horasExposicionCalor.toFixed(1)} h</p>
                  <p className="text-[10px]">fuera de rango</p>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lecturas} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgb(var(--muted) / 0.15)" />
                    <ReferenceArea y1={p.tempMin} y2={p.tempMax} fill="rgb(var(--ok))" fillOpacity={0.12} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 9, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={28} />
                    <YAxis unit="°" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgb(var(--surface))',
                        border: '1px solid rgb(var(--muted) / 0.2)',
                        borderRadius: 16,
                        fontSize: 12,
                        color: 'rgb(var(--ink))',
                      }}
                      formatter={(v: number) => [`${v} °C`, 'Temperatura']}
                    />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="rgb(var(--brand))"
                      strokeWidth={2}
                      isAnimationActive
                      dot={(props: { cx?: number; cy?: number; payload?: Lectura; index?: number }) => {
                        const { cx = 0, cy = 0, payload, index } = props;
                        if (!payload?.fuera) return <g key={`d${index}`} />;
                        return <circle key={`d${index}`} cx={cx} cy={cy} r={3} fill="rgb(var(--danger))" stroke="none" />;
                      }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-muted">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />
                {fuera} lecturas fuera de rango. Banda verde = temperatura ideal. Con el factor de calor ×{p.factorRiesgoCalor}, el lote
                consumió {formatoHoras(lote.fefo.horasEquivalentesConsumidas)} equivalentes de vida útil.
              </p>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
