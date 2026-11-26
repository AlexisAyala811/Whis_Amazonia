import { useMemo, useState } from 'react';
import { Activity, Boxes, Search, Trash2, Truck, Warehouse } from 'lucide-react';
import { CAMARAS, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { Semaforo } from '../types';
import { type LoteFefo } from '../utils/fefoEngine';
import { LoteCard } from './LoteCard';
import { ModernSelect, type SelectOption } from './ui/ModernSelect';

type Filtro = 'todos' | Semaforo;

const FILTROS: { id: Filtro; label: string; dot?: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'rojo', label: 'Críticos', dot: 'bg-danger' },
  { id: 'amarillo', label: 'Prioritarios', dot: 'bg-warn' },
  { id: 'verde', label: 'Óptimos', dot: 'bg-ok' },
];

interface Props {
  onDespachar: (l: LoteFefo) => void;
  onCurva: (l: LoteFefo) => void;
  onBaja: (l: LoteFefo) => void;
}

export function BatchesView({ onDespachar, onCurva, onBaja }: Props) {
  const { activos } = useWhisStore();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [camara, setCamara] = useState<string>('todas');
  const [q, setQ] = useState('');

  const opcionesCamara: SelectOption[] = [
    { value: 'todas', label: 'Todas las cámaras', description: `${activos.length} lotes activos`, icon: <Boxes size={18} /> },
    ...CAMARAS.map((c) => ({
      value: c.id,
      label: c.nombre,
      description: `${c.descripcion} · ${c.tempObjetivo}`,
      icon: <Warehouse size={18} />,
    })),
  ];

  const porCamara = useMemo(
    () => (camara === 'todas' ? activos : activos.filter((l) => l.camaraId === camara)),
    [activos, camara],
  );

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return porCamara
      .filter((l) => filtro === 'todos' || l.fefo.semaforo === filtro)
      .filter((l) => !t || `${l.codigoQR} ${getProducto(l.productoId).nombre}`.toLowerCase().includes(t));
  }, [porCamara, filtro, q]);

  const conteo = (f: Filtro) => (f === 'todos' ? porCamara.length : porCamara.filter((l) => l.fefo.semaforo === f).length);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Inventario de lotes</h1>
        <p className="text-xs text-muted">Ordenados por vida útil real restante (FEFO térmico)</p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {FILTROS.map((f) => {
          const act = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200 ease-out active:scale-95 ${
                act ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface text-muted'
              }`}
            >
              {f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} />}
              {f.label}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${act ? 'bg-canvas/20' : 'bg-surface2'}`}>{conteo(f.id)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
        <ModernSelect value={camara} onChange={setCamara} options={opcionesCamara} sheetTitle="Filtrar por cámara" compact />
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar"
            className="field min-h-[44px] pl-9 text-sm"
            aria-label="Buscar lote"
          />
        </div>
      </div>

      <div className="space-y-3">
        {visibles.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">No hay lotes con este filtro.</div>
        )}
        {visibles.map((l) => (
          <LoteCard
            key={l.id}
            lote={l}
            acciones={
              <>
                <button className="btn-ghost flex-1 px-2" onClick={() => onDespachar(l)}>
                  <Truck size={16} /> Despachar
                </button>
                <button className="btn-ghost flex-1 px-2" onClick={() => onCurva(l)}>
                  <Activity size={16} /> Curva
                </button>
                <button className="btn flex-1 bg-danger/10 px-2 text-danger" onClick={() => onBaja(l)}>
                  <Trash2 size={16} /> Baja
                </button>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}
