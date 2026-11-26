import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Boxes,
  History,
  Mic,
  MicOff,
  Minus,
  PackagePlus,
  Plus,
  Scale,
  Search,
  Snowflake,
  Sparkles,
  Sun,
  ThermometerSun,
  Timer,
  Warehouse,
} from 'lucide-react';
import { CAMARAS, CONDICIONES, MARGEN_VENTA, camaraSugerida, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CamaraId, CondicionLlegada, TipoEnvase } from '../types';
import { calcularFefo, formatoHoras, kg, soles } from '../utils/fefoEngine';
import { ENVASES } from '../utils/puesto';
import { interpretarDictado } from '../utils/voiceParser';
import { QrScanner } from './QrScanner';
import { BottomSheet } from './ui/BottomSheet';
import { ProductoAvatar, SemaforoBadge } from './ui/LoteBits';
import { useToast } from './ui/Toast';

const ICONO_CAMARA: Record<CamaraId, typeof Snowflake> = { camara1: Snowflake, camara2: Snowflake, almacen: Sun };
const ICONO_COND: Record<CondicionLlegada, typeof Snowflake> = { optimo: Snowflake, retraso3: Timer, sinfrio6: ThermometerSun };

// Tipos mínimos de la Web Speech API (no vienen en lib.dom de TypeScript)
interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

const obtenerSpeech = (): SpeechCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const PESOS = [20, 50, 80, 100, 200];

type Empaque = 'kg' | TipoEnvase;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddBatchSheet({ open, onClose }: Props) {
  const { agregarLote, siguienteCodigo, productos, data } = useWhisStore();
  const toast = useToast();

  const [codigo, setCodigo] = useState('');
  const [productoId, setProductoId] = useState<string | null>(null);
  const [camaraId, setCamaraId] = useState<CamaraId | null>(null);
  const [peso, setPeso] = useState('');
  const [costo, setCosto] = useState('');
  const [condicion, setCondicion] = useState<CondicionLlegada>('optimo');
  const [horasExtra, setHorasExtra] = useState(0);
  const [empaque, setEmpaque] = useState<Empaque>('kg');
  const [envases, setEnvases] = useState(10);
  const [kgEnvase, setKgEnvase] = useState('20');
  const [buscar, setBuscar] = useState('');

  const [escuchando, setEscuchando] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const [fraseManual, setFraseManual] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const vozSoportada = typeof window !== 'undefined' && !!obtenerSpeech();

  useEffect(() => {
    if (open) {
      setCodigo(siguienteCodigo());
      setProductoId(null);
      setCamaraId(null);
      setPeso('');
      setCosto('');
      setCondicion('optimo');
      setHorasExtra(0);
      setEmpaque('kg');
      setEnvases(10);
      setKgEnvase('20');
      setBuscar('');
      setTranscripcion('');
      setFraseManual('');
    } else {
      recRef.current?.stop();
    }
    // Solo al abrir/cerrar
  }, [open]);

  const elegirProducto = useCallback((id: string) => {
    setProductoId(id);
    setCamaraId((c) => c ?? camaraSugerida(id));
    setCosto((c) => c || String(getProducto(id).costoRefKg));
  }, []);

  const aplicarDictado = useCallback(
    (frase: string) => {
      const d = interpretarDictado(frase);
      const campos: string[] = [];
      if (d.productoId) {
        setProductoId(d.productoId);
        setCosto(String(d.precioKg ?? getProducto(d.productoId).costoRefKg));
        setCamaraId(d.camaraId ?? camaraSugerida(d.productoId));
        campos.push(getProducto(d.productoId).nombreCorto);
      } else if (d.camaraId) setCamaraId(d.camaraId);
      if (d.pesoKg) {
        setEmpaque('kg');
        setPeso(String(d.pesoKg));
        campos.push(`${d.pesoKg} kg`);
      }
      if (d.camaraId) campos.push(CAMARAS.find((c) => c.id === d.camaraId)?.nombre ?? '');
      if (d.horasSinFrio !== undefined) {
        if (d.horasSinFrio === 3) {
          setCondicion('retraso3');
          setHorasExtra(0);
        } else if (d.horasSinFrio === 6) {
          setCondicion('sinfrio6');
          setHorasExtra(0);
        } else {
          setCondicion('optimo');
          setHorasExtra(d.horasSinFrio);
        }
        campos.push(`${d.horasSinFrio} h sin frío`);
      }
      if (campos.length) toast('exito', 'Dictado interpretado', `${campos.filter(Boolean).join(' · ')}. Revisa y guarda.`);
      else toast('aviso', 'No entendí los datos', 'Prueba: “80 kilos de pollo a cámara 1 con 2 horas sin frío”.');
    },
    [toast],
  );

  const toggleVoz = () => {
    if (escuchando) {
      recRef.current?.stop();
      return;
    }
    const Ctor = obtenerSpeech();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'es-PE';
    rec.interimResults = true;
    rec.continuous = false;
    let final = '';
    rec.onresult = (e) => {
      let texto = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else texto += r[0].transcript;
      }
      setTranscripcion(final + texto);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech')
        toast('error', 'Micrófono no disponible', e.error === 'not-allowed' ? 'Permite el acceso al micrófono.' : 'El dictado por voz necesita conexión en algunos navegadores.');
    };
    rec.onend = () => {
      setEscuchando(false);
      if (final.trim()) aplicarDictado(final);
    };
    recRef.current = rec;
    setTranscripcion('');
    setEscuchando(true);
    rec.start();
  };

  const onQr = useCallback(
    (texto: string) => {
      // Formatos aceptados: "J-105" o "J-105|pollo|camara1|80"
      const [cod, prod, cam, kgs] = texto.trim().split('|');
      setCodigo(cod.slice(0, 20));
      if (prod && productos.some((p) => p.id === prod)) elegirProducto(prod);
      if (cam && CAMARAS.some((c) => c.id === cam)) setCamaraId(cam as CamaraId);
      if (kgs && Number(kgs) > 0) {
        setEmpaque('kg');
        setPeso(kgs);
      }
      toast('exito', `QR leído: jaba ${cod}`);
    },
    [elegirProducto, toast, productos],
  );

  const simularQr = () => onQr(`${siguienteCodigo()}|pollo|camara1|80`);

  // Con envases, el peso sale de cantidad × peso promedio (cálculo en vivo)
  const pesoNum = empaque === 'kg' ? Number(peso) : +(envases * (Number(kgEnvase) || 0)).toFixed(2);
  const costoNum = Number(costo);
  const valido = !!productoId && !!camaraId && pesoNum > 0 && costoNum > 0 && codigo.trim().length > 0;

  const precioVenta = +(costoNum * MARGEN_VENTA).toFixed(1);
  const exposicion = (CONDICIONES.find((c) => c.id === condicion)?.horas ?? 0) + horasExtra;
  const vista =
    productoId && valido
      ? calcularFefo({
          id: 'preview',
          codigoQR: codigo,
          productoId,
          camaraId: camaraId!,
          pesoInicialKg: pesoNum,
          pesoKg: pesoNum,
          costoKg: costoNum,
          precioVentaKg: precioVenta,
          fechaIngreso: new Date().toISOString(),
          horasExposicionCalor: exposicion,
          condicionLlegada: condicion,
          estado: 'activo',
        })
      : null;

  const ultimo = data.lotes[0];
  const duplicarUltimo = () => {
    if (!ultimo) return;
    setProductoId(ultimo.productoId);
    setCamaraId(ultimo.camaraId);
    setCosto(String(ultimo.costoKg));
    setCondicion('optimo');
    setHorasExtra(0);
    if (ultimo.envase) {
      setEmpaque(ultimo.envase.tipo);
      setEnvases(ultimo.envase.cantidad);
      setKgEnvase(String(ultimo.envase.kgPorEnvase));
    } else {
      setEmpaque('kg');
      setPeso(String(ultimo.pesoInicialKg));
    }
    toast('info', 'Datos del último ingreso copiados', 'Revisa la cantidad y guarda.');
  };

  const elegirEmpaque = (e: Empaque) => {
    setEmpaque(e);
    if (e !== 'kg') setKgEnvase(String(ENVASES.find((x) => x.id === e)?.kgDefecto ?? 20));
  };

  const t = buscar.trim().toLowerCase();
  const listaProductos = productos.filter((p) => !t || `${p.nombre} ${p.nombreCorto}`.toLowerCase().includes(t));

  const guardar = () => {
    if (!valido || !productoId || !camaraId) return;
    const lote = agregarLote({
      codigoQR: codigo.trim().toUpperCase(),
      productoId,
      camaraId,
      pesoKg: pesoNum,
      costoKg: costoNum,
      precioVentaKg: precioVenta,
      condicionLlegada: condicion,
      horasExtraCalor: horasExtra,
      envase: empaque === 'kg' ? undefined : { tipo: empaque, cantidad: envases, kgPorEnvase: Number(kgEnvase) },
    });
    toast('exito', `Lote ${lote.codigoQR} registrado`, `${getProducto(productoId).nombreCorto} · ${kg(pesoNum)} en ${CAMARAS.find((c) => c.id === camaraId)?.nombre}`);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Nuevo ingreso de mercadería"
      subtitle="Cada ingreso crea un lote propio, trazable por FEFO"
      footer={
        <button className="btn-primary w-full py-3 text-base" disabled={!valido} onClick={guardar}>
          <PackagePlus size={20} /> Guardar lote {codigo && `#${codigo.toUpperCase()}`}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Código y carga rápida */}
        <div className="flex items-center gap-2">
          <span className="pill bg-ok/15 text-ok">● Funciona sin internet</span>
          <label className="ml-auto flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
            <span className="text-[11px] font-semibold text-muted">Lote</span>
            <input
              className="w-20 bg-transparent font-mono text-sm font-bold uppercase outline-none"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              aria-label="Código del lote"
            />
          </label>
        </div>

        {ultimo && (
          <button
            onClick={duplicarUltimo}
            className="flex w-full items-center gap-3 rounded-3xl border border-warn/25 bg-warn/10 p-3 text-left transition-all active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-warn text-white">
              <History size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-warn">Carga rápida</span>
              <span className="block truncate text-sm font-semibold">
                Duplicar último ingreso ({getProducto(ultimo.productoId).nombreCorto})
              </span>
            </span>
          </button>
        )}

        {/* QR y voz */}
        <QrScanner onResultado={onQr} onSimular={simularQr} codigoSimulado={siguienteCodigo()} />
        <div className={`rounded-3xl border p-3 transition-all duration-200 ${escuchando ? 'border-brand bg-brand/10' : 'border-line bg-surface2/40'}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={vozSoportada ? toggleVoz : () => fraseManual && aplicarDictado(fraseManual)}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
                escuchando ? 'bg-danger text-white' : 'bg-brand text-white dark:text-[#0D0F12]'
              }`}
              aria-label={escuchando ? 'Detener dictado' : 'Dictar por voz'}
            >
              {escuchando ? <MicOff size={22} /> : vozSoportada ? <Mic size={22} /> : <Sparkles size={20} />}
            </button>
            <div className="min-w-0 flex-1">
              {escuchando ? (
                <div className="flex h-8 items-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span key={i} className="h-full w-1.5 origin-center animate-wave rounded-full bg-brand" style={{ animationDelay: `${i * 110}ms` }} />
                  ))}
                  <span className="ml-2 text-xs font-semibold text-brand">Escuchando…</span>
                </div>
              ) : vozSoportada ? (
                <>
                  <p className="text-sm font-semibold">Dictar por voz</p>
                  <p className="truncate text-xs text-muted">“80 kilos de pollo a cámara 1 con 2 horas sin frío”</p>
                </>
              ) : (
                <input
                  className="field min-h-[44px] text-sm"
                  placeholder="Escribe la frase (sin micrófono)"
                  value={fraseManual}
                  onChange={(e) => setFraseManual(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fraseManual && aplicarDictado(fraseManual)}
                />
              )}
            </div>
          </div>
          {transcripcion && <p className="mt-2 rounded-2xl bg-surface px-3 py-2 text-xs italic text-muted">“{transcripcion}”</p>}
        </div>

        {/* Producto */}
        <section>
          <div className="seccion">
            <h3 className="seccion-titulo">Producto</h3>
            {productoId && <span className="text-xs font-semibold text-brand">{getProducto(productoId).nombreCorto}</span>}
          </div>
          {productos.length > 6 && (
            <div className="relative mb-2">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="field rounded-full bg-surface pl-10 text-sm"
                placeholder="Buscar producto…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {listaProductos.map((p) => {
              const on = productoId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegirProducto(p.id)}
                  aria-pressed={on}
                  className={`flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-3xl border p-2 text-center transition-all duration-200 active:scale-95 ${
                    on ? 'border-transparent bg-brand text-white dark:text-[#0D0F12]' : 'border-line bg-surface'
                  }`}
                >
                  <ProductoAvatar productoId={p.id} tamano="sm" className={on ? 'from-white/90 to-white/70' : ''} />
                  <span className="line-clamp-2 text-xs font-semibold leading-tight">{p.nombreCorto}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Empaque y peso */}
        <section>
          <div className="seccion">
            <h3 className="seccion-titulo">
              <Boxes size={17} className="text-brand" /> Empaque y peso
            </h3>
            <span className="pill bg-ok/15 text-ok">Cálculo en vivo</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([{ id: 'kg', nombre: 'Kilos', detalle: 'A granel' }, ...ENVASES.map((e) => ({ id: e.id, nombre: `${e.nombre}s`, detalle: e.detalle }))] as {
              id: Empaque;
              nombre: string;
              detalle: string;
            }[]).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => elegirEmpaque(e.id)}
                aria-pressed={empaque === e.id}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl border px-1 transition-all duration-200 active:scale-95 ${
                  empaque === e.id ? 'border-transparent bg-brand text-white dark:text-[#0D0F12]' : 'border-line bg-surface'
                }`}
              >
                <span className="text-sm font-bold">{e.nombre}</span>
                <span className={`text-[10.5px] ${empaque === e.id ? 'opacity-80' : 'text-muted'}`}>{e.detalle}</span>
              </button>
            ))}
          </div>

          {empaque === 'kg' ? (
            <div className="mt-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                {PESOS.map((p) => (
                  <button key={p} type="button" onClick={() => setPeso(String(p))} className={`chip px-3.5 ${Number(peso) === p ? 'chip-on' : ''}`}>
                    {p} kg
                  </button>
                ))}
              </div>
              <input className="field" type="number" inputMode="decimal" min={0} placeholder="Otro peso (kg)" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface2/60 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">Cantidad de {ENVASES.find((e) => e.id === empaque)?.plural}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvases((n) => Math.max(1, n - 1))}
                    aria-label="Restar envase"
                    className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface active:scale-90"
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    className="w-14 bg-transparent text-center text-xl font-extrabold tabular-nums outline-none"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={envases}
                    onChange={(e) => setEnvases(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                    aria-label="Cantidad de envases"
                  />
                  <button
                    type="button"
                    onClick={() => setEnvases((n) => n + 1)}
                    aria-label="Sumar envase"
                    className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white active:scale-90 dark:text-[#0D0F12]"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface2/60 px-3 py-2">
                <span className="text-sm font-semibold">Peso promedio por envase</span>
                <span className="flex items-center gap-1.5">
                  <input
                    className="field w-20 bg-surface px-2 text-center font-bold"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={kgEnvase}
                    onChange={(e) => setKgEnvase(e.target.value)}
                  />
                  <span className="text-sm text-muted">kg</span>
                </span>
              </label>
            </div>
          )}

          <label className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface2/60 px-3 py-2">
            <span className="text-sm font-semibold">Costo de compra por kg</span>
            <span className="flex items-center gap-1.5">
              <span className="text-sm text-muted">S/</span>
              <input
                className="field w-24 bg-surface px-2 text-center font-bold"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="0.00"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
            </span>
          </label>

          <div className="mt-3 rounded-3xl bg-brand p-4 text-white dark:text-[#0D0F12]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
                <Scale size={15} /> Peso total estimado
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">#{codigo.toUpperCase()}</span>
            </div>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {pesoNum > 0 ? pesoNum.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '0'}{' '}
              <span className="text-base font-semibold opacity-90">kilos netos</span>
            </p>
            <div className="mt-2 flex justify-between gap-2 border-t border-white/20 pt-2 text-xs">
              <span className="opacity-90">Costo de compra</span>
              <b className="tabular-nums">
                {soles(pesoNum * costoNum)} {costoNum > 0 && <span className="font-normal opacity-80">· venta sugerida {soles(precioVenta)}/kg</span>}
              </b>
            </div>
          </div>
        </section>

        {/* Ubicación */}
        <section>
          <div className="seccion">
            <h3 className="seccion-titulo">
              <Warehouse size={17} className="text-brand" /> Ubicación en almacén
            </h3>
          </div>
          <div className="space-y-2">
            {CAMARAS.map((c) => {
              const Icono = ICONO_CAMARA[c.id];
              const on = camaraId === c.id;
              const sugerida = productoId && camaraSugerida(productoId) === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCamaraId(c.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition-all duration-200 active:scale-[0.99] ${
                    on ? 'border-brand bg-brand/10' : 'border-line bg-surface'
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                    <Icono size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {c.nombre}
                      {sugerida && <span className="pill bg-ok/15 py-0.5 text-ok">Sugerida</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.descripcion} · {c.tempObjetivo}
                    </span>
                  </span>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-brand' : 'border-line'}`}>
                    {on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Condición de llegada */}
        <section>
          <div className="seccion">
            <h3 className="seccion-titulo">
              <ThermometerSun size={17} className="text-warn" /> Condición de llegada
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CONDICIONES.map((c) => {
              const Icono = ICONO_COND[c.id];
              const on = condicion === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCondicion(c.id);
                    setHorasExtra(0);
                  }}
                  aria-pressed={on}
                  className={`flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-3xl border p-2 text-center transition-all duration-200 active:scale-95 ${
                    on ? 'border-brand bg-brand/10' : 'border-line bg-surface'
                  }`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${c.horas === 0 ? 'bg-ok/15 text-ok' : c.horas === 3 ? 'bg-warn/15 text-warn' : 'bg-danger/15 text-danger'}`}>
                    <Icono size={17} />
                  </span>
                  <span className="text-xs font-bold leading-tight">{c.nombre}</span>
                  <span className="text-[10.5px] leading-tight text-muted">{c.horas === 0 ? 'Sin calor' : `+${c.horas} h de calor`}</span>
                </button>
              );
            })}
          </div>
          {horasExtra > 0 && <p className="mt-1.5 text-xs text-warn">+ {horasExtra} h sin frío (dictado por voz)</p>}
        </section>

        {vista && productoId && (
          <div className="card animate-fade-in flex items-center gap-3 bg-surface2/40 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Vida útil real estimada al ingreso</p>
              <p className="text-sm font-semibold">
                {formatoHoras(vista.horasRestantes)} · {vista.porcentajeVidaUtil}%
              </p>
            </div>
            <SemaforoBadge semaforo={vista.semaforo} />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
