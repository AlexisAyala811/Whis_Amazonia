import { useCallback, useEffect, useRef, useState } from 'react';
import { Cherry, Mic, MicOff, PackagePlus, Snowflake, Sparkles, ThermometerSun, Timer, Warehouse } from 'lucide-react';
import { CAMARAS, CATALOGO, CONDICIONES, MARGEN_VENTA, camaraSugerida, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CamaraId, CondicionLlegada } from '../types';
import { calcularFefo, formatoHoras, soles } from '../utils/fefoEngine';
import { interpretarDictado } from '../utils/voiceParser';
import { QrScanner } from './QrScanner';
import { BottomSheet } from './ui/BottomSheet';
import { ProductoIcono, SemaforoBadge } from './ui/LoteBits';
import { ModernSelect } from './ui/ModernSelect';
import { useToast } from './ui/Toast';

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

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddBatchSheet({ open, onClose }: Props) {
  const { agregarLote, siguienteCodigo } = useWhisStore();
  const toast = useToast();

  const [codigo, setCodigo] = useState('');
  const [productoId, setProductoId] = useState<string | null>(null);
  const [camaraId, setCamaraId] = useState<CamaraId | null>(null);
  const [peso, setPeso] = useState('');
  const [costo, setCosto] = useState('');
  const [condicion, setCondicion] = useState<CondicionLlegada>('optimo');
  const [horasExtra, setHorasExtra] = useState(0);

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
      if (prod && CATALOGO.some((p) => p.id === prod)) elegirProducto(prod);
      if (cam && CAMARAS.some((c) => c.id === cam)) setCamaraId(cam as CamaraId);
      if (kgs && Number(kgs) > 0) setPeso(kgs);
      toast('exito', `QR leído: jaba ${cod}`);
    },
    [elegirProducto, toast],
  );

  const simularQr = () => onQr(`${siguienteCodigo()}|pollo|camara1|80`);

  const pesoNum = Number(peso);
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
    });
    toast('exito', `Lote ${lote.codigoQR} registrado`, `${getProducto(productoId).nombreCorto} · ${pesoNum} kg en ${CAMARAS.find((c) => c.id === camaraId)?.nombre}`);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Nuevo lote"
      subtitle="Escanea, dicta o toca: listo en 10 segundos"
      footer={
        <button className="btn-primary w-full text-base" disabled={!valido} onClick={guardar}>
          <PackagePlus size={20} /> Guardar lote
        </button>
      }
    >
      <div className="space-y-5">
        {/* 1. QR */}
        <QrScanner onResultado={onQr} onSimular={simularQr} codigoSimulado={siguienteCodigo()} />

        {/* 2. Voz */}
        <div className={`rounded-3xl border p-3 transition-all duration-200 ${escuchando ? 'border-brand bg-brand/10' : 'border-line bg-surface2/40'}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={vozSoportada ? toggleVoz : () => fraseManual && aplicarDictado(fraseManual)}
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
                escuchando ? 'bg-danger text-white' : 'bg-brand text-white dark:text-[#0D0F12]'
              }`}
              aria-label={escuchando ? 'Detener dictado' : 'Dictar por voz'}
            >
              {escuchando ? <MicOff size={24} /> : vozSoportada ? <Mic size={24} /> : <Sparkles size={22} />}
            </button>
            <div className="min-w-0 flex-1">
              {escuchando ? (
                <div className="flex h-8 items-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <span
                      key={i}
                      className="h-full w-1.5 origin-center animate-wave rounded-full bg-brand"
                      style={{ animationDelay: `${i * 110}ms` }}
                    />
                  ))}
                  <span className="ml-2 text-xs font-semibold text-brand">Escuchando…</span>
                </div>
              ) : vozSoportada ? (
                <>
                  <p className="text-sm font-semibold">Dictar por voz</p>
                  <p className="text-xs text-muted">“Ingresan 80 kilos de pollo a cámara 1 con 2 horas sin frío”</p>
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

        {/* 3. Selección táctil */}
        <div className="grid grid-cols-[96px_1fr] gap-3">
          <div>
            <span className="label">Jaba</span>
            <input className="field px-3 font-mono uppercase" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <ModernSelect
            label="Producto"
            value={productoId}
            onChange={elegirProducto}
            searchable
            placeholder="Elegir producto"
            options={CATALOGO.map((p) => ({
              value: p.id,
              label: p.nombreCorto,
              description: `${p.vidaBaseHoras} h · ${p.tempMin}–${p.tempMax} °C · calor ×${p.factorRiesgoCalor}`,
              icon: <ProductoIcono productoId={p.id} size={18} />,
            }))}
          />
        </div>

        <ModernSelect
          label="Cámara frigorífica"
          value={camaraId}
          onChange={setCamaraId}
          placeholder="Elegir cámara"
          options={CAMARAS.map((c) => ({
            value: c.id,
            label: c.nombre,
            description: `${c.descripcion} · ${c.tempObjetivo}`,
            icon: c.id === 'almacen' ? <Warehouse size={18} /> : c.id === 'camara2' ? <Cherry size={18} /> : <Snowflake size={18} />,
          }))}
        />

        <div>
          <span className="label">Peso (kg)</span>
          <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {PESOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeso(String(p))}
                className={`min-h-[40px] shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  Number(peso) === p ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface2/60 text-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input className="field" type="number" inputMode="decimal" min={0} placeholder="Otro peso" value={peso} onChange={(e) => setPeso(e.target.value)} />
        </div>

        <div>
          <span className="label">Precio costo / kg (S/)</span>
          <input className="field" type="number" inputMode="decimal" min={0} step={0.1} placeholder="0.00" value={costo} onChange={(e) => setCosto(e.target.value)} />
          {costoNum > 0 && <p className="mt-1 text-xs text-muted">Precio de venta sugerido: {soles(precioVenta)}/kg (+35 %)</p>}
        </div>

        <ModernSelect<CondicionLlegada>
          label="Condición de llegada"
          value={condicion}
          onChange={(v) => {
            setCondicion(v);
            setHorasExtra(0);
          }}
          options={CONDICIONES.map((c) => ({
            value: c.id,
            label: c.nombre,
            description: c.detalle,
            icon: c.horas === 0 ? <Snowflake size={18} /> : c.horas === 3 ? <Timer size={18} /> : <ThermometerSun size={18} />,
          }))}
        />
        {horasExtra > 0 && (
          <p className="-mt-3 text-xs text-warn">+ {horasExtra} h sin frío (dictado por voz)</p>
        )}

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
