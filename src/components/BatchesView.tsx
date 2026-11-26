import { useMemo, useState } from 'react';
import { Boxes, Search, Warehouse } from 'lucide-react';
import { CAMARAS, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { Semaforo } from '../types';
import { type LoteFefo } from '../utils/fefoEngine';
import { AccionRapida, LoteFila } from './LoteFila';
import { ModernSelect, type SelectOption } from './ui/ModernSelect';

type Filtro = 'todos' | Semaforo;

const FILTROS: { id: Filtro; label: string; dot?: string }[] = [
  { id: 'todos', label: 'Todos', dot: 'bg-muted' },
  { id: 'rojo', label: 'Críticos', dot: 'bg-danger' },
  { id: 'amarillo', label: 'Prioritarios', dot: 'bg-warn' },
  { id: 'verde', label: 'Óptimos', dot: 'bg-ok' },
];

interface Props {
  onAbrir: (l: LoteFefo) => void;
  onDespachar: (l: LoteFefo) => void;
  onLiquidar: (l: LoteFefo) => void;
}

export function BatchesView({ onAbrir, onDespachar, onLiquidar }: Props) {
  const { activos } = useWhisStore();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [camara, setCamara] = useState<string>('todas');
  const [q, setQ] = useState('');

  const opcionesCamara: SelectOption[] = [
    { value: 'todas', label: 'Todas', description: `Todas las cámaras · ${activos.length} lotes activos`, icon: <Boxes size={18} /> },
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
        <p className="text-xs text-muted">Primero los que vencen antes. Toca un lote para ver sus acciones.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => {
          const act = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              aria-pressed={act}
              className={`flex min-h-[56px] min-w-0 flex-col items-center justify-center rounded-2xl border px-1 transition-all duration-200 ease-out active:scale-95 ${
                act ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface text-muted'
              }`}
            >
              <span className="flex items-center gap-1.5 text-lg font-bold leading-tight tabular-nums">
                <span className={`h-2 w-2 rounded-full ${f.dot}`} />
                {conteo(f.id)}
              </span>
              <span className="max-w-full truncate text-[11px] font-semibold">{f.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
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
        <ModernSelect value={camara} onChange={setCamara} options={opcionesCamara} sheetTitle="Filtrar por cámara" compact />
      </div>

      <div className="space-y-2">
        {visibles.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">No hay lotes con este filtro.</div>
        )}
        {visibles.map((l) => (
          <LoteFila
            key={l.id}
            lote={l}
            mostrarCamara
            onAbrir={() => onAbrir(l)}
            accion={<AccionRapida lote={l} onDespachar={onDespachar} onLiquidar={onLiquidar} />}
          />
        ))}
      </div>
    </div>
  );
}
