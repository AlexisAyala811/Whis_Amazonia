import { useState, type ReactNode } from 'react';
import { ArrowRight, FlaskConical, MessageCircle, Store, ThermometerSnowflake, WifiOff } from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';
import { FOTOS_REALES } from '../utils/fotosReales';

const ENTRADA_KEY = 'whis-entrada-vista';

/** La portada se muestra al abrir la app (una vez por apertura) y siempre la primera vez. */
export function debeMostrarEntrada(): boolean {
  try {
    return sessionStorage.getItem(ENTRADA_KEY) !== '1';
  } catch {
    return true;
  }
}

function marcarEntradaVista() {
  try {
    sessionStorage.setItem(ENTRADA_KEY, '1');
  } catch {
    /* sin sessionStorage: se vuelve a mostrar en la próxima apertura */
  }
}

const VENTAJAS = [
  { icono: ThermometerSnowflake, titulo: 'Semáforo FEFO', detalle: 'Sabes qué vender primero' },
  { icono: MessageCircle, titulo: 'Remate por WhatsApp', detalle: 'Ofertas a tus compradores' },
  { icono: WifiOff, titulo: 'Funciona sin internet', detalle: 'Tus datos quedan en el equipo' },
];

interface Props {
  open: boolean;
  onEntrar: () => void;
}

/** Portada de entrada: marca Whis y elección entre la demo o los datos propios. */
export function Bienvenida({ open, onEntrar }: Props) {
  const { primeraVez, data, empezarVacio, cargarDemo } = useWhisStore();
  const [confirmarDemo, setConfirmarDemo] = useState(false);
  if (!open && !primeraVez) return null;

  const enDemo = data.modo === 'demo';
  const hayDatosReales = !enDemo && data.lotes.length + data.compradores.length + data.liquidaciones.length > 0;

  const entrar = (accion?: () => void) => {
    accion?.();
    marcarEntradaVista();
    setConfirmarDemo(false);
    onEntrar();
  };
  const verDemo = () => (hayDatosReales && !primeraVez ? setConfirmarDemo(true) : entrar(cargarDemo));

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-canvas" role="dialog" aria-modal="true" aria-label="Bienvenida a Whis Amazonia">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pb-[calc(max(1.5rem,env(safe-area-inset-bottom))+var(--insignia,0px))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-4xl md:flex-row md:items-center md:gap-8 md:px-8">
        {/* Portada de marca */}
        <section className="relative animate-fade-in overflow-hidden rounded-[2rem] bg-brand p-6 text-white md:flex-1 md:p-8 dark:text-[#0D331F]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative flex items-end gap-2.5">
            <span role="img" aria-label="Whis" className="logo-whis h-16 md:h-20" />
            <span className="mb-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Amazonia</span>
          </div>
          <p className="relative mt-4 text-sm opacity-90">
            Control de lotes perecibles para tu puesto: camu camu, aguaje, cocona, plátano y más.
          </p>
          <div className="relative mt-5 flex gap-2" aria-hidden="true">
            {FOTOS_REALES.map((f) => (
              <img
                key={f.clave}
                src={`${import.meta.env.BASE_URL}productos/${f.archivo}`}
                alt=""
                className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-2 ring-white/70 md:h-14 md:w-14"
              />
            ))}
          </div>
          <ul className="relative mt-5 space-y-2.5">
            {VENTAJAS.map(({ icono: Icono, titulo, detalle }) => (
              <li key={titulo} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icono size={17} />
                </span>
                <span className="text-sm">
                  <b className="font-bold">{titulo}</b> <span className="opacity-80">· {detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Opciones de entrada */}
        <section className="animate-fade-in space-y-3 md:w-[360px] md:shrink-0">
          <div>
            <h2 className="text-xl font-extrabold">{primeraVez ? '¿Cómo quieres empezar?' : 'Bienvenido de vuelta'}</h2>
            <p className="mt-1 text-sm text-muted">
              {primeraVez
                ? 'Prueba la demo con datos de ejemplo o empieza con tu propio puesto.'
                : enDemo
                  ? 'Estás usando la demo con datos de ejemplo.'
                  : `Tus datos: ${data.lotes.length} lotes y ${data.compradores.length} compradores en este equipo.`}
            </p>
          </div>

          {confirmarDemo ? (
            <div className="card animate-fade-in space-y-3 border border-danger/30 p-4">
              <p className="text-sm">
                Para ver la demo se borrarán tus datos de este equipo. Exporta un respaldo desde Ajustes si no lo hiciste.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => setConfirmarDemo(false)}>
                  Cancelar
                </button>
                <button className="btn-danger" onClick={() => entrar(cargarDemo)}>
                  Ver la demo
                </button>
              </div>
            </div>
          ) : (
            <>
              {!primeraVez && (
                <OpcionEntrada
                  principal
                  icono={<ArrowRight size={22} />}
                  titulo={enDemo ? 'Seguir en la demo' : 'Entrar a mi puesto'}
                  detalle={enDemo ? 'Continúa donde la dejaste' : 'Continúa con tus lotes y ventas'}
                  onClick={() => entrar()}
                />
              )}
              {(primeraVez || !enDemo) && (
                <OpcionEntrada
                  principal={primeraVez}
                  icono={<FlaskConical size={22} />}
                  titulo="Ver la demo"
                  detalle="Lotes, apagones y compradores de ejemplo (teléfonos ficticios)"
                  onClick={verDemo}
                />
              )}
              {(primeraVez || enDemo) && (
                <OpcionEntrada
                  icono={<Store size={22} />}
                  titulo="Empezar con mis datos"
                  detalle={primeraVez ? 'Empieza vacío: registra tus lotes y compradores reales' : 'Deja la demo y empieza vacío con tu puesto'}
                  onClick={() => entrar(empezarVacio)}
                />
              )}
            </>
          )}

          <p className="pt-1 text-center text-[11px] text-muted">
            Tus datos se guardan solo en este equipo. Vuelve a esta pantalla desde Ajustes.
          </p>
        </section>
      </div>
    </div>
  );
}

function OpcionEntrada({
  icono,
  titulo,
  detalle,
  onClick,
  principal,
}: {
  icono: ReactNode;
  titulo: string;
  detalle: string;
  onClick: () => void;
  principal?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-3xl p-4 text-left transition-all duration-200 active:scale-[0.98] ${
        principal
          ? 'bg-brand text-white shadow-[0_12px_28px_-14px_rgb(var(--brand)/0.9)] dark:text-[#0D331F]'
          : 'card border border-line hover:border-brand/40'
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${principal ? 'bg-white/15' : 'bg-brand/10 text-brand'}`}>
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{titulo}</span>
        <span className={`block text-xs ${principal ? 'opacity-85' : 'text-muted'}`}>{detalle}</span>
      </span>
    </button>
  );
}
