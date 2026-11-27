import { useMemo, useState } from 'react';
import { AlertCircle, Boxes, Eye, PackageOpen, Search, ShoppingBasket, SlidersHorizontal, Warehouse, Zap } from 'lucide-react';
import { CAMARAS, getCamara, getProducto, normalizarTexto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import { SEMAFORO_INFO, formatoHoras, kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { envasesDisponibles, haceDias, nombreEnvase, porcentajeSalido } from '../utils/puesto';
import { ProductoAvatar } from './ui/LoteBits';
import { ModernSelect, type SelectOption } from './ui/ModernSelect';

type Filtro = 'todos' | 'prioridad' | 'rojo' | 'verde';

const FILTROS: { id: Filtro; label: string; dot?: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'prioridad', label: 'Prioridad FEFO', dot: 'bg-warn' },
  { id: 'rojo', label: 'Críticos', dot: 'bg-danger' },
  { id: 'verde', label: 'En buen estado', dot: 'bg-ok' },
];

const pasa = (f: Filtro, l: LoteFefo) =>
  f === 'todos' ||
  (f === 'prioridad' && l.fefo.semaforo !== 'verde') ||
  (f === 'rojo' && l.fefo.semaforo === 'rojo') ||
  (f === 'verde' && l.fefo.semaforo === 'verde');

const BORDE = { verde: 'border-l-ok', amarillo: 'border-l-warn', rojo: 'border-l-danger' } as const;

interface Props {
  onRegistrar: () => void;
  onAbrir: (l: LoteFefo) => void;
  onSalida: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
}

export function BatchesView({ onRegistrar, onAbrir, onSalida, onLiquidar }: Props) {
  const { activos, ahora } = useWhisStore();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [camara, setCamara] = useState<string>('todas');
  const [q, setQ] = useState('');
  const [verCamaras, setVerCamaras] = useState(false);

  const opcionesCamara: SelectOption[] = [
    { value: 'todas', label: 'Todos los ambientes', description: `${activos.length} lotes activos`, icon: <Boxes size={18} /> },
    ...CAMARAS.map((c) => ({
      value: c.id,
      label: c.nombre.split(' - ')[0],
      description: `${c.nombre} · ${c.tempObjetivo}`,
      icon: <Warehouse size={18} />,
    })),
  ];

  const porCamara = useMemo(
    () => (camara === 'todas' ? activos : activos.filter((l) => l.camaraId === camara)),
    [activos, camara],
  );
  const visibles = useMemo(() => {
    const t = normalizarTexto(q.trim());
    return porCamara
      .filter((l) => pasa(filtro, l))
      .filter((l) => {
        if (!t) return true;
        const p = getProducto(l.productoId);
        return normalizarTexto(`${l.codigoQR} ${p.nombre} ${p.nombreCorto}`).includes(t);
      });
  }, [porCamara, filtro, q]);

  const kgTotal = porCamara.reduce((s, l) => s + l.pesoKg, 0);
  const valorTotal = porCamara.reduce((s, l) => s + l.fefo.valorComercial, 0);
  const hayPrioridad = porCamara.some((l) => l.fefo.semaforo !== 'verde');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight">Inventario de lotes activos</h1>
          <p className="text-xs text-muted">Ordenados por FEFO: primero el que vence antes.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-3xl bg-brand/10 p-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white dark:text-[#0E1511]">
          <PackageOpen size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Total en existencias</p>
          <p className="truncate text-lg font-extrabold tabular-nums">
            {kg(kgTotal)} <span className="text-sm font-semibold text-muted">· {soles(valorTotal)}</span>
          </p>
        </div>
        <span className="pill shrink-0 bg-ok/20 text-ok">{porCamara.length} lotes</span>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar lote o producto…"
            className="field rounded-full bg-surface pl-10 text-sm"
            aria-label="Buscar lote"
          />
        </div>
        <button
          onClick={() => setVerCamaras((v) => !v)}
          aria-label="Filtrar por ambiente"
          aria-pressed={verCamaras || camara !== 'todas'}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-all duration-200 active:scale-95 ${
            camara !== 'todas' ? 'border-transparent bg-brand text-white dark:text-[#0E1511]' : 'border-line bg-surface text-ink'
          }`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
      {verCamaras && (
        <div className="animate-fade-in">
          <ModernSelect value={camara} onChange={setCamara} options={opcionesCamara} sheetTitle="Filtrar por ambiente" />
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => {
          const n = porCamara.filter((l) => pasa(f.id, l)).length;
          const act = filtro === f.id;
          return (
            <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={act} className={`chip ${act ? 'chip-on' : ''}`}>
              {f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} />}
              {f.label}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${act ? 'bg-white/20' : 'bg-surface2 text-muted'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {hayPrioridad && (
        <div className="flex gap-3 rounded-3xl border border-warn/25 bg-warn/10 p-3.5">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <p className="text-sm font-bold">Regla FEFO recomendada</p>
            <p className="text-xs text-muted">
              Dale salida primero a los lotes que vencen antes para evitar pérdidas por sobremaduración y conservar margen.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {visibles.length === 0 &&
          (activos.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-8 text-center md:col-span-2">
              <PackageOpen size={28} className="text-muted" />
              <p className="text-sm text-muted">Aún no tienes mercadería registrada. Cada ingreso se vuelve un lote con su semáforo.</p>
              <button className="btn-primary" onClick={onRegistrar}>
                Registrar mi primer lote
              </button>
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-muted md:col-span-2">
              No hay lotes {q.trim() ? `que coincidan con “${q.trim()}”` : 'con este filtro'}.
              <button
                className="min-h-[44px] font-semibold text-brand"
                onClick={() => {
                  setQ('');
                  setFiltro('todos');
                  setCamara('todas');
                }}
              >
                Ver todos los lotes
              </button>
            </div>
          ))}
        {visibles.map((l, i) => (
          <TarjetaLote
            key={l.id}
            lote={l}
            ahora={ahora}
            primero={i === 0 && l.fefo.semaforo !== 'verde'}
            onAbrir={() => onAbrir(l)}
            onSalida={() => (l.fefo.semaforo === 'rojo' ? onLiquidar(l) : onSalida(l))}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaLote({
  lote: l,
  ahora,
  primero,
  onAbrir,
  onSalida,
}: {
  lote: LoteFefo;
  ahora: number;
  primero: boolean;
  onAbrir: () => void;
  onSalida: () => void;
}) {
  const p = getProducto(l.productoId);
  const s = SEMAFORO_INFO[l.fefo.semaforo];
  const env = envasesDisponibles(l);
  const envIni = l.envase?.cantidad ?? null;
  const salido = porcentajeSalido(l);
  const rojo = l.fefo.semaforo === 'rojo';
  return (
    <article className={`card overflow-hidden border-l-4 p-3.5 ${BORDE[l.fefo.semaforo]}`}>
      <div className="flex items-start gap-3">
        <ProductoAvatar productoId={l.productoId} tamano="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
            Lote #{l.codigoQR} · Ingresó {haceDias(l.fechaIngreso, ahora)}
          </p>
          <h3 className="truncate text-[17px] font-bold leading-tight">{p.nombreCorto}</h3>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            <Warehouse size={12} className="shrink-0" /> {getCamara(l.camaraId).nombre}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {primero && <span className="pill bg-danger/15 text-danger">Prioridad 1 de salida</span>}
        <span className={`pill ${s.fondo} ${s.texto}`}>
          {s.etiqueta} · {s.accion}
        </span>
        <span className="pill bg-surface2 text-muted">Quedan {formatoHoras(l.fefo.horasRestantes)}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-sm">
          {env !== null && l.envase ? (
            <>
              <b className="text-xl font-extrabold tabular-nums">{env}</b>
              <span className="text-muted">
                {envIni ? ` / ${envIni}` : ''} {nombreEnvase(l.envase.tipo, env)} disponibles
              </span>
            </>
          ) : (
            <>
              <b className="text-xl font-extrabold tabular-nums">{kg(l.pesoKg)}</b>
              <span className="text-muted"> disponibles</span>
            </>
          )}
        </p>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{env !== null ? kg(l.pesoKg) : soles(l.fefo.valorComercial)}</p>
          <p className="text-[11px] text-muted">{env !== null ? soles(l.fefo.valorComercial) : `${l.fefo.porcentajeVidaUtil}% vida útil`}</p>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.max(salido, 0)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{salido}% comercializado</span>
        <span className={s.texto}>Vida útil {l.fefo.porcentajeVidaUtil}%</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={onAbrir}>
          <Eye size={16} /> Ver lote
        </button>
        <button className={rojo ? 'btn-danger' : 'btn-primary'} onClick={onSalida}>
          {rojo ? <Zap size={16} /> : <ShoppingBasket size={16} />} {rojo ? 'Rematar' : 'Salida / Venta'}
        </button>
      </div>
    </article>
  );
}
