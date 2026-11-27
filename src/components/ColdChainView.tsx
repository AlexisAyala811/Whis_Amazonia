import { useMemo, useState } from 'react';
import { History, PlugZap, Snowflake, Thermometer, Warehouse, Zap, ZapOff } from 'lucide-react';
import { CAMARAS, getCamara } from '../data/catalog';
import { useWhisStore, type ResultadoApagon } from '../hooks/useWhisStore';
import type { CamaraId } from '../types';
import { formatoFecha } from '../utils/fefoEngine';
import { BottomSheet } from './ui/BottomSheet';
import { ModernSelect, type SelectOption } from './ui/ModernSelect';
import { useToast } from './ui/Toast';

const HORAS = [1, 2, 4, 6, 8];

export function ColdChainView() {
  const { data, activos, registrarApagon } = useWhisStore();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [camara, setCamara] = useState<string>('todas');
  const [horas, setHoras] = useState(2);
  const [nota, setNota] = useState('');
  const [ultimo, setUltimo] = useState<(ResultadoApagon & { horas: number; nombre: string }) | null>(null);

  const resumen = useMemo(
    () =>
      CAMARAS.map((c) => {
        const ls = activos.filter((l) => l.camaraId === c.id);
        return {
          ...c,
          total: ls.length,
          rojos: ls.filter((l) => l.fefo.semaforo === 'rojo').length,
          amarillos: ls.filter((l) => l.fefo.semaforo === 'amarillo').length,
        };
      }),
    [activos],
  );

  const opciones: SelectOption[] = [
    { value: 'todas', label: 'Todas las cámaras', description: 'Apagón general del local', icon: <ZapOff size={18} /> },
    ...resumen.map((c) => ({
      value: c.id,
      label: c.nombre,
      description: `${c.total} lotes · ${c.tempObjetivo}`,
      icon: <Warehouse size={18} />,
    })),
  ];

  const confirmar = () => {
    const ids: CamaraId[] = camara === 'todas' ? CAMARAS.map((c) => c.id) : [camara as CamaraId];
    const r = registrarApagon(ids, horas, nota);
    const nombre = camara === 'todas' ? 'Todas las cámaras' : getCamara(camara as CamaraId).nombre;
    setUltimo({ ...r, horas, nombre });
    setAbierto(false);
    setNota('');
    const cambios = r.pasaronAAmarillo + r.pasaronARojo;
    toast(
      cambios > 0 ? 'aviso' : 'exito',
      `Apagón registrado: ${r.lotesAfectados} lotes recalculados`,
      cambios > 0
        ? `${r.pasaronAAmarillo} pasaron a Amarillo y ${r.pasaronARojo} a Rojo.`
        : 'Ningún lote cambió de estado.',
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Control de frío</h1>
        <p className="text-xs text-muted">Registra apagones y fallas: el motor FEFO se recalcula al instante</p>
      </div>

      <button
        onClick={() => setAbierto(true)}
        className="group relative flex min-h-[88px] w-full items-center gap-4 overflow-hidden rounded-3xl bg-danger p-5 text-left text-white shadow-soft transition-all duration-200 ease-out active:scale-[0.98] dark:text-[#0E1511]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
          <ZapOff size={26} />
        </span>
        <span>
          <span className="block text-base font-extrabold leading-tight">Registrar Corte de Luz / Falla de Frío</span>
          <span className="mt-0.5 block text-xs opacity-80">Suma horas de calor a los lotes de la cámara</span>
        </span>
      </button>

      {ultimo && (
        <div className="card animate-fade-in border-warn/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-warn">Impacto del último apagón</p>
          <p className="mt-1 text-sm">
            <b>{ultimo.nombre}</b> · {ultimo.horas} h sin energía
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface2 p-2.5">
              <p className="text-xl font-bold tabular-nums">{ultimo.lotesAfectados}</p>
              <p className="text-[11px] text-muted">recalculados</p>
            </div>
            <div className="rounded-2xl bg-warn/15 p-2.5 text-warn">
              <p className="text-xl font-bold tabular-nums">{ultimo.pasaronAAmarillo}</p>
              <p className="text-[11px]">a Amarillo</p>
            </div>
            <div className="rounded-2xl bg-danger/15 p-2.5 text-danger">
              <p className="text-xl font-bold tabular-nums">{ultimo.pasaronARojo}</p>
              <p className="text-[11px]">a Rojo</p>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold">Estado de cámaras</h2>
        {resumen.map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
              <Snowflake size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{c.nombre}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Thermometer size={12} /> {c.tempObjetivo} · {c.total} lotes
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {c.rojos > 0 && <span className="pill bg-danger/15 text-danger">{c.rojos}</span>}
              {c.amarillos > 0 && <span className="pill bg-warn/15 text-warn">{c.amarillos}</span>}
              {c.rojos + c.amarillos === 0 && <span className="pill bg-ok/15 text-ok">OK</span>}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <History size={18} /> Bitácora de incidencias
        </h2>
        <ol className="relative space-y-3 border-l border-line pl-5">
          {data.eventos.length === 0 && <li className="text-sm text-muted">Sin incidencias registradas.</li>}
          {data.eventos.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[27px] top-3 grid h-3.5 w-3.5 place-items-center rounded-full bg-danger ring-4 ring-canvas" />
              <div className="card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    <PlugZap size={14} className="mr-1 inline text-danger" />
                    {e.horas} h sin energía
                  </p>
                  <span className="text-[11px] text-muted">{formatoFecha(e.fecha)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {e.camaraIds.length === CAMARAS.length ? 'Todas las cámaras' : e.camaraIds.map((id) => getCamara(id).nombre).join(', ')}
                </p>
                <p className="mt-1.5 text-xs">
                  {e.lotesAfectados} lotes afectados · <span className="text-warn">{e.pasaronAAmarillo} → amarillo</span> ·{' '}
                  <span className="text-danger">{e.pasaronARojo} → rojo</span>
                </p>
                {e.nota && <p className="mt-1.5 text-xs italic text-muted">“{e.nota}”</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <BottomSheet
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Registrar corte de luz"
        subtitle="Se sumarán las horas a la exposición al calor de cada lote"
        footer={
          <button className="btn-danger w-full" onClick={confirmar}>
            <Zap size={18} /> Confirmar apagón de {horas} h
          </button>
        }
      >
        <div className="space-y-5">
          <ModernSelect value={camara} onChange={setCamara} options={opciones} label="¿Qué cámara se afectó?" />
          <div>
            <span className="label">Horas sin energía</span>
            <div className="grid grid-cols-5 gap-2">
              {HORAS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHoras(h)}
                  className={`min-h-[48px] rounded-2xl border text-sm font-bold transition-all duration-200 active:scale-95 ${
                    horas === h ? 'border-transparent bg-danger text-white dark:text-[#0E1511]' : 'border-line bg-surface2/60'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted">Otro valor:</span>
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                value={horas}
                onChange={(e) => setHoras(Math.max(0.5, Number(e.target.value) || 0.5))}
                className="field min-h-[44px] w-24 text-center"
              />
              <span className="text-xs text-muted">horas</span>
            </div>
          </div>
          <div>
            <span className="label">Nota (opcional)</span>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. corte de Electro Oriente"
              className="field"
            />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
