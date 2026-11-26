import { useCallback, useEffect, useState } from 'react';
import { Bell, Home, Leaf, Package, Plus, UserRound, Zap } from 'lucide-react';
import { AddBatchSheet } from './components/AddBatchSheet';
import { Bienvenida } from './components/Bienvenida';
import { BatchesView } from './components/BatchesView';
import { ColdChainView } from './components/ColdChainView';
import { DashboardView } from './components/DashboardView';
import { EditLoteSheet } from './components/EditLoteSheet';
import { LiquidationView } from './components/LiquidationView';
import { LoteAccionesSheet } from './components/LoteAccionesSheet';
import { ProductosSheet } from './components/ProductosSheet';
import { Celebracion, ProgresoSheet } from './components/Progreso';
import { SalidaSheet } from './components/SalidaSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { ThermalChartModal } from './components/ThermalChartModal';
import { UndoBar } from './components/UndoBar';
import { WasteAuditModal } from './components/WasteAuditModal';
import { useToast } from './components/ui/Toast';
import { useOnline, useTheme } from './hooks/useDevice';
import { useWhisStore } from './hooks/useWhisStore';
import type { Vista } from './types';
import type { LoteFefo } from './utils/fefoEngine';
import { diasDesdeRespaldo } from './utils/persistencia';

const TABS: { id: Vista; label: string; icon: typeof Home }[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'lotes', label: 'Inventario', icon: Package },
  { id: 'frio', label: 'Alertas', icon: Bell },
  { id: 'liquidar', label: 'Remate', icon: Zap },
];

export default function App() {
  const online = useOnline();
  const [tema, toggleTema] = useTheme();
  const { activos, data, primeraVez, recuperacion } = useWhisStore();
  const toast = useToast();
  const [vista, setVista] = useState<Vista>('inicio');
  const [nuevoLote, setNuevoLote] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [productos, setProductos] = useState(false);
  const [progreso, setProgreso] = useState(false);
  const [accionesId, setAccionesId] = useState<string | null>(null);
  const [editarId, setEditarId] = useState<string | null>(null);
  const [salidaId, setSalidaId] = useState<string | null>(null);
  const [curvaId, setCurvaId] = useState<string | null>(null);
  const [bajaId, setBajaId] = useState<string | null>(null);
  const [preLiquidar, setPreLiquidar] = useState<string | null>(null);

  // Recordatorio de respaldo (una vez por apertura) y aviso de datos sin abrir
  useEffect(() => {
    if (primeraVez) return;
    if (recuperacion) {
      toast('aviso', 'Había datos que no se pudieron abrir', 'Se guardaron aparte. Revisa Ajustes.');
      return;
    }
    const dias = diasDesdeRespaldo();
    const hayDatos = data.lotes.length + data.compradores.length > 0;
    if (data.modo === 'real' && hayDatos && (dias === null || dias >= 7)) {
      toast('info', 'Haz un respaldo', dias === null ? 'Aún no exportas una copia de tus datos.' : `Último respaldo hace ${dias} días. Ajustes → Exportar respaldo JSON.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeraVez]);

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
  const abrirLote = (l: LoteFefo) => setAccionesId(l.id);
  /** Cierra la hoja de acciones y abre la siguiente */
  const desdeAcciones = (fn: (l: LoteFefo) => void) => (l: LoteFefo) => {
    setAccionesId(null);
    fn(l);
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-canvas sm:border-x sm:border-line">
      {/* Cabecera */}
      <header className="glass sticky top-0 z-30 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center gap-2.5 px-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand text-white dark:text-[#0D0F12]">
            <Leaf size={20} strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <img src={`${import.meta.env.BASE_URL}logo-whis.png`} alt="Whis" className="h-[18px] w-auto dark:invert" />
              <span className="pill bg-ok/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ok">Amazonia</span>
              {data.modo === 'demo' && !primeraVez && (
                <button onClick={() => setAjustes(true)} className="pill bg-warn/15 px-2 py-0.5 text-[10px] uppercase text-warn" title="Estás viendo datos de ejemplo">
                  Demo
                </button>
              )}
            </div>
            <p className="truncate text-[11px] text-muted">Cuida tu mercadería, evita pérdidas</p>
          </div>
          <button
            onClick={() => setAjustes(true)}
            aria-label="Ajustes"
            className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-all duration-200 active:scale-95 dark:text-[#0D0F12]"
          >
            <UserRound size={19} />
          </button>
        </div>
      </header>

      <main key={vista} className="animate-fade-in px-4 pb-32 pt-4">
        {vista === 'inicio' && (
          <DashboardView
            online={online}
            onAbrir={abrirLote}
            onSalida={(l) => setSalidaId(l.id)}
            onLiquidar={liquidarLote}
            onVerLotes={() => irA('lotes')}
            onProgreso={() => setProgreso(true)}
            onRegistrar={() => setNuevoLote(true)}
            onRemates={() => irA('liquidar')}
            onAlertas={() => irA('frio')}
          />
        )}
        {vista === 'lotes' && <BatchesView onAbrir={abrirLote} onSalida={(l) => setSalidaId(l.id)} onLiquidar={liquidarLote} />}
        {vista === 'frio' && <ColdChainView />}
        {vista === 'liquidar' && <LiquidationView preseleccion={preLiquidar} limpiarPreseleccion={limpiarPre} />}
      </main>

      {/* Barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.25)]">
        <div className="grid grid-cols-5 items-end px-1 pb-1.5 pt-1">
          {TABS.slice(0, 2).map((t) => (
            <TabBtn key={t.id} tab={t} activo={vista === t.id} onClick={() => irA(t.id)} />
          ))}
          <button
            onClick={() => setNuevoLote(true)}
            aria-label="Registrar nuevo lote"
            className="group flex flex-col items-center gap-0.5 text-[10.5px] font-semibold text-muted"
          >
            <span className="-mt-7 grid h-[60px] w-[60px] place-items-center rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgb(var(--brand)/0.8)] ring-[5px] ring-canvas transition-all duration-200 ease-out group-active:scale-90 dark:text-[#0D0F12]">
              <Plus size={28} strokeWidth={2.6} />
            </span>
            Registrar
          </button>
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

      <Bienvenida />
      <AddBatchSheet open={nuevoLote} onClose={() => setNuevoLote(false)} />
      <SettingsSheet
        open={ajustes}
        onClose={() => setAjustes(false)}
        tema={tema}
        toggleTema={toggleTema}
        onProductos={() => {
          setAjustes(false);
          setProductos(true);
        }}
      />
      <ProductosSheet open={productos} onClose={() => setProductos(false)} />
      <LoteAccionesSheet
        lote={buscar(accionesId)}
        onClose={() => setAccionesId(null)}
        onSalida={desdeAcciones((l) => setSalidaId(l.id))}
        onLiquidar={desdeAcciones(liquidarLote)}
        onCurva={desdeAcciones((l) => setCurvaId(l.id))}
        onEditar={desdeAcciones((l) => setEditarId(l.id))}
        onBaja={desdeAcciones((l) => setBajaId(l.id))}
      />
      <EditLoteSheet lote={buscar(editarId)} onClose={() => setEditarId(null)} />
      <SalidaSheet
        lote={buscar(salidaId)}
        onClose={() => setSalidaId(null)}
        onMerma={(l) => {
          setSalidaId(null);
          setBajaId(l.id);
        }}
        onRemate={(l) => {
          setSalidaId(null);
          liquidarLote(l);
        }}
      />
      <ThermalChartModal lote={buscar(curvaId)} onClose={() => setCurvaId(null)} />
      <WasteAuditModal lote={buscar(bajaId)} onClose={() => setBajaId(null)} />
      <ProgresoSheet open={progreso} onClose={() => setProgreso(false)} />
      <UndoBar />
      <Celebracion onVerProgreso={() => setProgreso(true)} />
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
      aria-current={activo ? 'page' : undefined}
      className={`relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-semibold transition-all duration-200 ease-out active:scale-95 ${
        activo ? 'text-brand' : 'text-muted hover:text-ink'
      }`}
    >
      <span className={`grid h-7 w-12 place-items-center rounded-full transition-all duration-200 ${activo ? 'bg-brand/10' : ''}`}>
        <Icon size={20} strokeWidth={activo ? 2.4 : 2} />
      </span>
      <span className="whitespace-nowrap">{tab.label}</span>
      {badge !== undefined && (
        <span className="absolute right-3 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
