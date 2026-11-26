import { useCallback, useState } from 'react';
import { Boxes, Home, Moon, Plus, Settings2, Snowflake, Sun, Wifi, WifiOff, Zap } from 'lucide-react';
import { AddBatchSheet } from './components/AddBatchSheet';
import { BatchesView } from './components/BatchesView';
import { ColdChainView } from './components/ColdChainView';
import { DashboardView } from './components/DashboardView';
import { DispatchSheet } from './components/DispatchSheet';
import { LiquidationView } from './components/LiquidationView';
import { SettingsSheet } from './components/SettingsSheet';
import { ThermalChartModal } from './components/ThermalChartModal';
import { WasteAuditModal } from './components/WasteAuditModal';
import { useOnline, useTheme } from './hooks/useDevice';
import { useWhisStore } from './hooks/useWhisStore';
import type { Vista } from './types';
import type { LoteFefo } from './utils/fefoEngine';

const TABS: { id: Vista; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'lotes', label: 'Lotes', icon: Boxes },
  { id: 'frio', label: 'Frío/Alertas', icon: Snowflake },
  { id: 'liquidar', label: 'Liquidar', icon: Zap },
];

export default function App() {
  const online = useOnline();
  const [tema, toggleTema] = useTheme();
  const { activos } = useWhisStore();
  const [vista, setVista] = useState<Vista>('inicio');
  const [nuevoLote, setNuevoLote] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [despachoId, setDespachoId] = useState<string | null>(null);
  const [curvaId, setCurvaId] = useState<string | null>(null);
  const [bajaId, setBajaId] = useState<string | null>(null);
  const [preLiquidar, setPreLiquidar] = useState<string | null>(null);

  const buscar = (id: string | null) => activos.find((l) => l.id === id) ?? null;
  const criticos = activos.filter((l) => l.fefo.semaforo === 'rojo').length;

  const irA = (v: Vista) => {
    setVista(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const liquidarLote = (l: LoteFefo) => {
    setPreLiquidar(l.id);
    irA('liquidar');
  };
  const limpiarPre = useCallback(() => setPreLiquidar(null), []);

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-canvas sm:border-x sm:border-line">
      {/* Cabecera */}
      <header className="glass sticky top-0 z-30 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-2 px-4">
          <img src={`${import.meta.env.BASE_URL}logo-whis.png`} alt="Whis" className="h-7 w-auto dark:invert" />
          <span
            title={online ? 'En línea · datos guardados localmente' : 'Modo Offline Activo — Datos guardados localmente'}
            className={`pill ml-1 ${online ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'}`}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? 'En línea' : 'Offline'}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleTema}
              aria-label="Cambiar tema"
              className="grid h-11 w-11 place-items-center rounded-full text-muted transition-all duration-200 hover:bg-surface2 hover:text-ink active:scale-95"
            >
              {tema === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setAjustes(true)}
              aria-label="Ajustes"
              className="grid h-11 w-11 place-items-center rounded-full text-muted transition-all duration-200 hover:bg-surface2 hover:text-ink active:scale-95"
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main key={vista} className="animate-fade-in px-4 pb-32 pt-4">
        {vista === 'inicio' && (
          <DashboardView
            online={online}
            onDespachar={(l) => setDespachoId(l.id)}
            onLiquidar={liquidarLote}
            onVerLotes={() => irA('lotes')}
          />
        )}
        {vista === 'lotes' && (
          <BatchesView
            onDespachar={(l) => setDespachoId(l.id)}
            onCurva={(l) => setCurvaId(l.id)}
            onBaja={(l) => setBajaId(l.id)}
          />
        )}
        {vista === 'frio' && <ColdChainView />}
        {vista === 'liquidar' && <LiquidationView preseleccion={preLiquidar} limpiarPreseleccion={limpiarPre} />}
      </main>

      {/* Barra inferior flotante */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="glass relative grid grid-cols-5 items-center rounded-3xl border border-line px-1 py-1 shadow-soft">
          {TABS.slice(0, 2).map((t) => (
            <TabBtn key={t.id} tab={t} activo={vista === t.id} onClick={() => irA(t.id)} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => setNuevoLote(true)}
              aria-label="Registrar nuevo lote"
              className="-mt-8 grid h-16 w-16 place-items-center rounded-full bg-brand text-white shadow-[0_10px_30px_-6px_rgb(var(--brand)/0.7)] ring-[6px] ring-canvas transition-all duration-200 ease-out hover:brightness-110 active:scale-90 dark:text-[#0D0F12]"
            >
              <Plus size={30} strokeWidth={2.6} />
            </button>
          </div>
          {TABS.slice(2).map((t) => (
            <TabBtn
              key={t.id}
              tab={t}
              activo={vista === t.id}
              onClick={() => irA(t.id)}
              badge={t.id === 'liquidar' && criticos > 0 ? criticos : undefined}
            />
          ))}
        </div>
      </nav>

      <AddBatchSheet open={nuevoLote} onClose={() => setNuevoLote(false)} />
      <SettingsSheet open={ajustes} onClose={() => setAjustes(false)} tema={tema} toggleTema={toggleTema} />
      <DispatchSheet lote={buscar(despachoId)} onClose={() => setDespachoId(null)} />
      <ThermalChartModal lote={buscar(curvaId)} onClose={() => setCurvaId(null)} />
      <WasteAuditModal lote={buscar(bajaId)} onClose={() => setBajaId(null)} />
    </div>
  );
}

function TabBtn({
  tab,
  activo,
  onClick,
  badge,
}: {
  tab: (typeof TABS)[number];
  activo: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-semibold transition-all duration-200 ease-out active:scale-95 ${
        activo ? 'text-brand' : 'text-muted hover:text-ink'
      }`}
    >
      <span className={`grid h-7 w-12 place-items-center rounded-full transition-all duration-200 ${activo ? 'bg-brand/15' : ''}`}>
        <Icon size={20} strokeWidth={activo ? 2.4 : 2} />
      </span>
      <span className="whitespace-nowrap">{tab.label}</span>
      {badge !== undefined && (
        <span className="absolute right-2 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
