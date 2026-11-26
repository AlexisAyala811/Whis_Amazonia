import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Award, Banknote, ChevronRight, Clock, Flame, Lock, Scale, Target, Trophy, Zap } from 'lucide-react';
import { useProgreso } from '../hooks/useProgreso';
import { useWhisStore } from '../hooks/useWhisStore';
import { soles, solesCorto } from '../utils/fefoEngine';
import { METAS_SUGERIDAS, type IconoLogro, type Logro } from '../utils/logros';
import { BottomSheet } from './ui/BottomSheet';

const ICONOS: Record<IconoLogro, typeof Award> = {
  remate: Zap,
  kg: Scale,
  caja: Banknote,
  racha: Flame,
  reloj: Clock,
  meta: Target,
};

const numero = (n: number) => Math.round(n).toLocaleString('es-PE');
const textoDias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function Barra({ pct, clase = 'bg-brand', alto = 'h-2' }: { pct: number; clase?: string; alto?: string }) {
  return (
    <div className={`${alto} overflow-hidden rounded-full bg-surface2`}>
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${clase}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/* ---------- Tarjeta de Inicio ---------- */

export function MetaDelDiaCard({ onAbrir }: { onAbrir: () => void }) {
  const { progreso: p, logrados, logros } = useProgreso();
  const falta = Math.max(0, p.meta - p.hoy.rescatado);
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="card w-full p-4 text-left transition-all duration-200 ease-out active:scale-[0.99]"
      aria-label="Ver meta, racha y logros"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Meta de rescate hoy</p>
        <span
          className={`pill ${p.racha > 0 ? 'bg-warn/15 text-warn' : 'bg-surface2 text-muted'}`}
          title="Días seguidos sin dar de baja producto"
        >
          <Flame size={12} /> {textoDias(p.racha)} sin merma
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold tabular-nums tracking-tight">{solesCorto(p.hoy.rescatado)}</span>
        <span className="text-sm text-muted">de {solesCorto(p.meta)}</span>
        {p.hoy.cumplida && <Trophy size={18} className="ml-auto self-center text-ok" />}
      </div>
      <div className="mt-2">
        <Barra pct={p.hoy.pct} clase={p.hoy.cumplida ? 'bg-ok' : 'bg-brand'} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">
          {p.hoy.cumplida
            ? `Meta cumplida · ${p.hoy.remates} ${p.hoy.remates === 1 ? 'remate' : 'remates'} hoy`
            : p.hoy.rescatado > 0
              ? `Faltan ${solesCorto(falta)} · ${p.hoy.pct}%`
              : 'Remata lotes en riesgo para sumar'}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand">
          <Award size={14} /> {logrados}/{logros.length} logros <ChevronRight size={14} />
        </span>
      </div>
    </button>
  );
}

/* ---------- Hoja de progreso ---------- */

export function ProgresoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { progreso: p, logros, logrados } = useProgreso();
  const { fijarMetaDiaria, data } = useWhisStore();
  const registro = data.progreso;
  const [editando, setEditando] = useState(false);
  const [otra, setOtra] = useState('');

  useEffect(() => {
    if (!open) setEditando(false);
  }, [open]);

  const elegir = (n: number) => {
    fijarMetaDiaria(n);
    setEditando(false);
    setOtra('');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Tu progreso" subtitle="Rescata a tiempo y evita la merma">
      <div className="space-y-5">
        {/* Indicadores */}
        <div className="grid grid-cols-3 gap-2">
          <Dato icono={<Flame size={16} className="text-warn" />} valor={String(p.racha)} etiqueta="días sin merma" />
          <Dato icono={<Trophy size={16} className="text-brand" />} valor={String(p.mejorRacha)} etiqueta="mejor racha" />
          <Dato
            icono={<Target size={16} className="text-ok" />}
            valor={p.aprovechamiento === null ? '—' : `${p.aprovechamiento}%`}
            etiqueta="rescatado (7 días)"
          />
        </div>

        {/* Últimos 7 días */}
        <section>
          <h3 className="mb-2 text-sm font-bold">Últimos 7 días</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {p.semana.map((d, i) => {
              const fecha = new Date(`${d.dia}T12:00:00`);
              const esHoy = i === 6;
              const alto = Math.max(6, Math.min(100, (d.rescatado / d.meta) * 100));
              return (
                <div key={d.dia} className="flex flex-col items-center gap-1" title={`${d.dia}: ${soles(d.rescatado)} de ${soles(d.meta)}`}>
                  <div className="relative flex h-16 w-full items-end overflow-hidden rounded-xl bg-surface2">
                    {d.rescatado > 0 && (
                      <div
                        className={`w-full rounded-xl ${d.cumplida ? 'bg-ok' : 'bg-brand/50'}`}
                        style={{ height: `${alto}%` }}
                      />
                    )}
                    {d.bajas > 0 && (
                      <span className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-danger" />
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold ${esHoy ? 'text-ink' : 'text-muted'}`}>
                    {esHoy ? 'Hoy' : DIAS_CORTOS[fecha.getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" /> Meta cumplida</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand/50" /> Rescate parcial</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> Hubo merma</span>
          </div>
        </section>

        {/* Meta diaria */}
        <section className="rounded-2xl bg-surface2/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Meta diaria: {soles(p.meta)}</p>
              <p className="text-xs text-muted">Soles a recuperar con remates cada día</p>
            </div>
            <button className="btn-ghost shrink-0 px-3" onClick={() => setEditando((v) => !v)}>
              {editando ? 'Listo' : 'Cambiar'}
            </button>
          </div>
          {editando && (
            <div className="mt-3 animate-fade-in space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {METAS_SUGERIDAS.map((n) => (
                  <button
                    key={n}
                    onClick={() => elegir(n)}
                    className={`min-h-[44px] rounded-2xl border text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      p.meta === n ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-surface'
                    }`}
                  >
                    {solesCorto(n)}
                  </button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(otra);
                  if (n > 0) elegir(n);
                }}
              >
                <input
                  className="field"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  placeholder="Otro monto (S/)"
                  value={otra}
                  onChange={(e) => setOtra(e.target.value)}
                />
                <button className="btn-primary shrink-0" disabled={!(Number(otra) > 0)}>
                  Guardar
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Logros */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-bold">Logros</h3>
            <span className="text-xs text-muted">
              {logrados} de {logros.length}
            </span>
          </div>
          <div className="space-y-2">
            {logros.map((l) => (
              <LogroFila key={l.id} logro={l} fecha={registro?.logros[l.id]} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Se calculan con tus remates y bajas registrados en este equipo. Una baja por merma reinicia la racha.
          </p>
        </section>
      </div>
    </BottomSheet>
  );
}

function Dato({ icono, valor, etiqueta }: { icono: ReactNode; valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl bg-surface2/60 p-3">
      {icono}
      <p className="mt-1 text-xl font-bold tabular-nums leading-none">{valor}</p>
      <p className="mt-1 text-[11px] leading-tight text-muted">{etiqueta}</p>
    </div>
  );
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });

function LogroFila({ logro: l, fecha }: { logro: Logro; fecha?: string }) {
  const Icono = ICONOS[l.icono];
  const pct = (l.actual / l.objetivo) * 100;
  const avance = l.unidad === 'S/' ? `${soles(l.actual)} de ${soles(l.objetivo)}` : `${numero(l.actual)} de ${numero(l.objetivo)} ${l.unidad}`;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${l.logrado ? 'border-ok/30 bg-ok/5' : 'border-line'}`}>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${l.logrado ? 'bg-ok/15 text-ok' : 'bg-surface2 text-muted'}`}
      >
        {l.logrado ? <Icono size={19} /> : pct > 0 ? <Icono size={19} className="opacity-60" /> : <Lock size={17} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${l.logrado ? '' : 'text-ink/80'}`}>{l.titulo}</p>
        <p className="truncate text-xs text-muted">{l.logrado ? l.detalle : avance}</p>
        {l.logrado && fecha && <p className="text-[11px] font-medium text-ok">Logrado el {fechaCorta(fecha)}</p>}
        {!l.logrado && (
          <div className="mt-1.5">
            <Barra pct={pct} alto="h-1.5" clase="bg-brand/70" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Celebración ---------- */

/** Muestra, una por una, las celebraciones que el store dejó en cola. */
export function Celebracion({ onVerProgreso }: { onVerProgreso: () => void }) {
  const { festejos, cerrarFestejo, cerrarFestejos } = useWhisStore();
  const actual = festejos[0];
  if (!actual) return null;
  const Icono = ICONOS[actual.icono];
  const esMeta = actual.tipo === 'meta';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-[2px]" onClick={cerrarFestejo} />
      <div
        key={actual.id}
        role="alertdialog"
        aria-labelledby="festejo-titulo"
        className="relative w-full max-w-xs animate-pop-in overflow-hidden rounded-3xl border border-line bg-surface p-6 text-center shadow-soft"
      >
        <Destellos />
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 animate-ring rounded-full bg-ok/25" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-ok/15 text-ok">
            <Icono size={30} strokeWidth={2.2} />
          </span>
        </div>
        <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-wide text-ok">
          {esMeta ? '¡Bien hecho!' : 'Logro desbloqueado'}
        </p>
        <h2 id="festejo-titulo" className="relative mt-1 text-xl font-bold">
          {actual.titulo}
        </h2>
        <p className="relative mt-1.5 text-sm text-muted">{actual.detalle}</p>
        <div className="relative mt-5 grid gap-2">
          <button className="btn-primary w-full" onClick={cerrarFestejo}>
            {festejos.length > 1 ? 'Siguiente' : 'Seguir'}
          </button>
          <button
            className="btn w-full text-muted"
            onClick={() => {
              cerrarFestejos();
              onVerProgreso();
            }}
          >
            Ver mi progreso
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Pequeños destellos de color que caen una vez (sin librerías, solo CSS) */
function Destellos() {
  const colores = ['bg-ok', 'bg-warn', 'bg-brand', 'bg-ok/60', 'bg-warn/70'];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className={`absolute top-0 h-2 w-1.5 animate-destello rounded-sm ${colores[i % colores.length]}`}
          style={{
            left: `${6 + ((i * 37) % 88)}%`,
            animationDelay: `${(i % 7) * 70}ms`,
            ['--giro' as string]: `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`,
          }}
        />
      ))}
    </div>
  );
}
