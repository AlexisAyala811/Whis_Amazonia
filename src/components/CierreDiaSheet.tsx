import { useMemo, useState, type ReactNode } from 'react';
import { Copy, Flame, MessageCircle, Package, Target, Trash2, TrendingUp, WifiOff, Zap } from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';
import { useOnline } from '../hooks/useDevice';
import { kg, soles } from '../utils/fefoEngine';
import { calcularCierre, enlaceWhatsApp, fechaLarga, textoCierre } from '../utils/cierre';
import { BottomSheet } from './ui/BottomSheet';
import { useToast } from './ui/Toast';

const TEL_KEY = 'whis-cierre-tel';

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const leerTel = () => {
  try {
    return localStorage.getItem(TEL_KEY) ?? '';
  } catch {
    return '';
  }
};
const guardarTel = (t: string) => {
  try {
    if (t) localStorage.setItem(TEL_KEY, t);
    else localStorage.removeItem(TEL_KEY);
  } catch {
    /* sin almacenamiento: se pide de nuevo la próxima vez */
  }
};

/** Resumen del día (ventas, remates, merma, meta y racha) para compartir por WhatsApp. */
export function CierreDiaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, activos, ahora } = useWhisStore();
  const online = useOnline();
  const toast = useToast();
  const [tel, setTel] = useState(leerTel);

  const cierre = useMemo(
    () =>
      calcularCierre(data, ahora, {
        lotes: activos.length,
        kg: activos.reduce((s, l) => s + l.pesoKg, 0),
        criticos: activos.filter((l) => l.fefo.semaforo === 'rojo').length,
      }),
    [data, activos, ahora],
  );
  const texto = useMemo(() => textoCierre(cierre), [cierre]);
  const digitos = tel.replace(/\D/g, '');
  // Un número peruano de 9 dígitos se completa con el código del país
  const destino = digitos.length === 9 ? `51${digitos}` : digitos;
  const telValido = destino === '' || destino.length >= 10;

  const enviar = () => {
    guardarTel(tel.trim());
    window.open(enlaceWhatsApp(texto, destino), '_blank', 'noopener');
    toast('info', 'Cierre abierto en WhatsApp', destino ? `Para +${destino}` : 'Elige el chat y envía');
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast('exito', 'Texto copiado', 'Pégalo en WhatsApp o donde quieras.');
    } catch {
      toast('error', 'No se pudo copiar', 'Mantén presionado el resumen para copiarlo.');
    }
  };

  const enDemo = data.modo === 'demo';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Cierre del día"
      subtitle={mayuscula(fechaLarga(cierre.dia))}
      footer={
        <div className="space-y-2">
          <button className="btn-primary w-full" onClick={enviar} disabled={!telValido}>
            <MessageCircle size={18} /> Enviar por WhatsApp
          </button>
          <button className="btn-ghost w-full" onClick={copiar}>
            <Copy size={16} /> Copiar texto
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {enDemo && (
          <p className="rounded-2xl bg-warn/10 px-3 py-2 text-xs text-warn">Estás en la demo: el resumen usa datos de ejemplo.</p>
        )}

        {/* Total del día */}
        <section className="rounded-3xl bg-brand p-4 text-white dark:text-[#0D331F]">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Ingresos de hoy</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums tracking-tight">{soles(cierre.ingresos)}</p>
          <p className="mt-0.5 text-xs opacity-85">
            {cierre.vacio
              ? 'Aún no registras ventas, remates ni mermas hoy'
              : `${kg(cierre.ventas.kg + cierre.remates.kg)} vendidos en ${cierre.ventas.n + cierre.remates.n} ${
                  cierre.ventas.n + cierre.remates.n === 1 ? 'operación' : 'operaciones'
                }`}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Dato
            icono={<TrendingUp size={16} className="text-brand" />}
            titulo="Ventas"
            valor={soles(cierre.ventas.soles)}
            detalle={`${cuenta(cierre.ventas.n, 'venta', 'ventas')} · ${kg(cierre.ventas.kg)}`}
          />
          <Dato
            icono={<Zap size={16} className="text-warn" />}
            titulo="Remates"
            valor={soles(cierre.remates.soles)}
            detalle={`${cuenta(cierre.remates.n, 'remate', 'remates')} · ${kg(cierre.remates.kg)}`}
          />
          <Dato
            icono={<Trash2 size={16} className={cierre.merma.n > 0 ? 'text-danger' : 'text-ok'} />}
            titulo="Merma"
            valor={cierre.merma.n > 0 ? `−${soles(cierre.merma.soles)}` : 'Sin merma'}
            valorClase={cierre.merma.n > 0 ? 'text-danger' : 'text-ok'}
            detalle={cierre.merma.n > 0 ? `${cuenta(cierre.merma.n, 'baja', 'bajas')} · ${kg(cierre.merma.kg)}` : '¡Bien!'}
          />
          <Dato
            icono={<Package size={16} className="text-muted" />}
            titulo="Queda en stock"
            valor={kg(cierre.stock.kg)}
            detalle={
              cierre.stock.criticos > 0
                ? `${cierre.stock.criticos} ${cierre.stock.criticos === 1 ? 'crítico' : 'críticos'} para mañana`
                : `${cierre.stock.lotes} ${cierre.stock.lotes === 1 ? 'lote' : 'lotes'}`
            }
            detalleClase={cierre.stock.criticos > 0 ? 'text-danger' : undefined}
          />
        </div>

        {cierre.porMedio.length > 0 && (
          <section className="rounded-2xl bg-surface2/60 p-3">
            <p className="mb-1.5 text-xs font-semibold text-muted">Cobro de las ventas</p>
            <div className="space-y-1">
              {cierre.porMedio.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span>{m.nombre}</span>
                  <span className="font-semibold tabular-nums">{soles(m.soles)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meta y racha */}
        <section className="grid grid-cols-2 gap-2">
          <div className={`rounded-2xl p-3 ${cierre.metaCumplida ? 'bg-ok/10' : 'bg-surface2/60'}`}>
            <Target size={16} className={cierre.metaCumplida ? 'text-ok' : 'text-brand'} />
            <p className="mt-1 text-sm font-bold">{cierre.metaCumplida ? '¡Meta cumplida!' : `Meta al ${cierre.pctMeta}%`}</p>
            <p className="text-[11px] text-muted">
              {soles(cierre.rescatado)} de {soles(cierre.meta)} en remates
            </p>
          </div>
          <div className={`rounded-2xl p-3 ${cierre.racha > 0 ? 'bg-warn/10' : 'bg-surface2/60'}`}>
            <Flame size={16} className="text-warn" />
            <p className="mt-1 text-sm font-bold">
              {cierre.racha} {cierre.racha === 1 ? 'día' : 'días'}
            </p>
            <p className="text-[11px] text-muted">seguidos sin merma</p>
          </div>
        </section>

        {/* Destino */}
        <section>
          <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="cierre-tel">
            Enviar a (opcional)
          </label>
          <input
            id="cierre-tel"
            className="field"
            type="tel"
            inputMode="tel"
            placeholder="Celular del dueño o socio, ej. 987 654 321"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
          />
          <p className={`mt-1 text-[11px] ${telValido ? 'text-muted' : 'text-danger'}`}>
            {telValido
              ? destino
                ? 'Se recuerda para el próximo cierre.'
                : 'Déjalo vacío para elegir el chat en WhatsApp.'
              : 'Revisa el número: 9 dígitos, o con código de país.'}
          </p>
        </section>

        {!online && (
          <p className="flex items-center gap-2 rounded-2xl bg-warn/10 px-3 py-2 text-xs text-warn">
            <WifiOff size={14} className="shrink-0" /> Sin internet: copia el texto y envíalo cuando tengas señal.
          </p>
        )}

        <details className="rounded-2xl border border-line px-3 py-2">
          <summary className="cursor-pointer py-1 text-sm font-semibold">Ver el mensaje</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words pb-1 font-sans text-xs text-muted">{texto}</pre>
        </details>
      </div>
    </BottomSheet>
  );
}

function Dato({
  icono,
  titulo,
  valor,
  valorClase,
  detalle,
  detalleClase,
}: {
  icono: ReactNode;
  titulo: string;
  valor: string;
  valorClase?: string;
  detalle: string;
  detalleClase?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface2/60 p-3">
      <div className="flex items-center gap-1.5">
        {icono}
        <p className="text-xs font-semibold text-muted">{titulo}</p>
      </div>
      <p className={`mt-1 truncate text-lg font-bold tabular-nums leading-tight ${valorClase ?? ''}`}>{valor}</p>
      <p className={`truncate text-[11px] ${detalleClase ?? 'text-muted'}`}>{detalle}</p>
    </div>
  );
}
