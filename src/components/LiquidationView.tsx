import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Copy, MessageCircle, Plus, Store, Trash2, UserPlus, Zap } from 'lucide-react';
import { getCamara, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CompradorB2B } from '../types';
import { formatoHora, formatoHoras, kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { celularPeru } from '../utils/puesto';
import { LoteCard } from './LoteCard';
import { BottomSheet } from './ui/BottomSheet';
import { ModernSelect } from './ui/ModernSelect';
import { useToast } from './ui/Toast';

interface Props {
  preseleccion: string | null;
  limpiarPreseleccion: () => void;
}

export function LiquidationView({ preseleccion, limpiarPreseleccion }: Props) {
  const { activos, data } = useWhisStore();
  const [loteId, setLoteId] = useState<string | null>(null);

  useEffect(() => {
    if (preseleccion) {
      setLoteId(preseleccion);
      limpiarPreseleccion();
    }
  }, [preseleccion, limpiarPreseleccion]);

  const candidatos = activos.filter((l) => l.fefo.semaforo !== 'verde');
  const lote = activos.find((l) => l.id === loteId) ?? null;
  const potencial = candidatos.reduce((s, l) => s + l.fefo.valorComercial * 0.7, 0);
  const liquidadas = data.liquidaciones.slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight">Remate relámpago</h1>
        <p className="text-xs text-muted">Recupera dinero antes de la merma: ofertas a tus compradores por WhatsApp</p>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
          <Zap size={20} />
        </span>
        <div>
          <p className="text-xs text-muted">
            {candidatos.length} {candidatos.length === 1 ? 'lote listo' : 'lotes listos'} para rematar · podrías recuperar (con 30 % de descuento)
          </p>
          <p className="text-xl font-bold tabular-nums">{soles(potencial)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {candidatos.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            <CheckCircle2 className="mx-auto mb-2 text-ok" />
            No hay lotes en rojo o amarillo. ¡Todo bajo control!
          </div>
        )}
        {candidatos.map((l) => (
          <LoteCard
            key={l.id}
            lote={l}
            onClick={() => setLoteId(l.id)}
            acciones={
              <button className="btn-primary w-full" onClick={() => setLoteId(l.id)}>
                <MessageCircle size={16} /> Preparar oferta
              </button>
            }
          />
        ))}
      </div>

      {liquidadas.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold">Últimos remates</h2>
          <div className="card divide-y divide-line">
            {liquidadas.map((liq) => (
              <div key={liq.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {getProducto(liq.productoId).nombreCorto} · {liq.codigoQR}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {data.compradores.find((c) => c.id === liq.compradorId)?.nombre ?? 'Comprador'} · {liq.descuentoPct}% OFF
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-ok tabular-nums">+{soles(liq.total)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <OfertaSheet lote={lote} onClose={() => setLoteId(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

const limpiarTel = (t: string) => t.replace(/\D/g, '');

function OfertaSheet({ lote, onClose }: { lote: LoteFefo | null; onClose: () => void }) {
  const { data, agregarComprador, eliminarComprador, liquidar } = useWhisStore();
  const toast = useToast();
  const [descuento, setDescuento] = useState(30);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [enviados, setEnviados] = useState<string[]>([]);
  const [comprador, setComprador] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [editado, setEditado] = useState(false);
  const [nuevo, setNuevo] = useState<{ nombre: string; rubro: string; telefono: string } | null>(null);

  // Reiniciar al abrir otro lote
  useEffect(() => {
    if (!lote) return;
    setDescuento(lote.fefo.semaforo === 'rojo' ? 40 : 25);
    setSeleccion([]);
    setEnviados([]);
    setComprador(null);
    setEditado(false);
    setNuevo(null);
  }, [lote?.id]);

  const calculo = useMemo(() => {
    if (!lote) return null;
    const precioRemate = +(lote.precioVentaKg * (1 - descuento / 100)).toFixed(2);
    const total = +(precioRemate * lote.pesoKg).toFixed(2);
    const horasLimite = Math.max(1, Math.min(lote.fefo.semaforo === 'rojo' ? 3 : 6, Math.floor(lote.fefo.horasRestantes)));
    const limite = new Date(Date.now() + horasLimite * 3_600_000);
    return { precioRemate, total, limite };
  }, [lote, descuento]);

  const mensajeAuto = useMemo(() => {
    if (!lote || !calculo) return '';
    const p = getProducto(lote.productoId);
    return [
      `⚡ *OFERTA RELÁMPAGO B2B — Whis*`,
      ``,
      `Producto: *${p.nombre}*`,
      `Lote: ${lote.codigoQR} · ${getCamara(lote.camaraId).nombre}`,
      `Peso disponible: *${kg(lote.pesoKg)}*`,
      `Vida útil restante: ${formatoHoras(lote.fefo.horasRestantes)} (cadena de frío controlada)`,
      ``,
      `Precio normal: ~${soles(lote.precioVentaKg)}/kg~`,
      `Precio de remate: *${soles(calculo.precioRemate)}/kg* (${descuento}% OFF)`,
      `Total del lote: *${soles(calculo.total)}*`,
      ``,
      `⏰ Retiro hasta ${new Date(calculo.limite).toDateString() === new Date().toDateString() ? 'hoy' : 'mañana'} a las *${formatoHora(calculo.limite)}*.`,
      `Responda *SÍ* para separar el lote. Primero en confirmar se lo lleva.`,
    ].join('\n');
  }, [lote, calculo, descuento]);

  useEffect(() => {
    if (!editado) setMensaje(mensajeAuto);
  }, [mensajeAuto, editado]);

  if (!lote || !calculo) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;

  const seleccionados = data.compradores.filter((c) => seleccion.includes(c.id));
  const pendiente = seleccionados.find((c) => !enviados.includes(c.id));

  const toggle = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const enviar = (c: CompradorB2B) => {
    const url = `https://wa.me/${limpiarTel(c.telefono)}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank', 'noopener');
    setEnviados((e) => (e.includes(c.id) ? e : [...e, c.id]));
    if (!comprador) setComprador(c.id);
    toast('info', `Oferta abierta en WhatsApp`, `Para ${c.nombre}`);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      toast('exito', 'Mensaje copiado');
    } catch {
      toast('error', 'No se pudo copiar el mensaje');
    }
  };

  const guardarNuevo = () => {
    if (!nuevo) return;
    // Se acepta también con el código de Perú delante (+51 987 654 321)
    const digitos = celularPeru(nuevo.telefono);
    if (nuevo.nombre.trim().length < 2 || !digitos) {
      toast('error', 'Datos incompletos', 'Ingresa el nombre y un celular de 9 dígitos que empiece con 9.');
      return;
    }
    const repetido = data.compradores.find((c) => limpiarTel(c.telefono) === `51${digitos}`);
    if (repetido) {
      setSeleccion((s) => (s.includes(repetido.id) ? s : [...s, repetido.id]));
      setNuevo(null);
      toast('info', 'Ese celular ya está en tu agenda', `Es de ${repetido.nombre}; quedó seleccionado.`);
      return;
    }
    const c = agregarComprador({ nombre: nuevo.nombre.trim(), rubro: nuevo.rubro.trim() || 'Comprador B2B', telefono: `51${digitos}` });
    setSeleccion((s) => [...s, c.id]);
    setNuevo(null);
    toast('exito', 'Comprador agregado', c.nombre);
  };

  const confirmarLiquidacion = () => {
    if (!comprador) return;
    const liq = liquidar(lote.id, descuento, comprador);
    if (liq) {
      toast('exito', `Lote ${lote.codigoQR} rematado`, `+${soles(liq.total)} recuperados`);
      onClose();
    }
  };

  return (
    <BottomSheet
      open={!!lote}
      onClose={onClose}
      title={`Rematar ${getProducto(lote.productoId).nombreCorto}`}
      subtitle={`${lote.codigoQR} · ${kg(lote.pesoKg)} · quedan ${formatoHoras(lote.fefo.horasRestantes)}`}
      footer={
        <div className="space-y-2">
          <button
            className="btn w-full bg-[#25D366] text-[#08140C]"
            disabled={!pendiente}
            onClick={() => pendiente && enviar(pendiente)}
          >
            <MessageCircle size={18} />
            {seleccionados.length === 0
              ? 'Elige al menos un comprador'
              : pendiente
                ? `Enviar Oferta por WhatsApp${seleccionados.length > 1 ? ` (${enviados.length + 1}/${seleccionados.length})` : ''}`
                : 'Oferta enviada a todos'}
          </button>
          {enviados.length > 0 && (
            <div className="animate-fade-in space-y-2 rounded-2xl bg-surface2/60 p-3">
              <ModernSelect
                value={comprador}
                onChange={setComprador}
                label="¿Quién compró?"
                options={seleccionados.map((c) => ({ value: c.id, label: c.nombre, description: c.rubro, icon: <Store size={18} /> }))}
                compact
              />
              <button className="btn-primary w-full" onClick={confirmarLiquidacion} disabled={!comprador}>
                <Check size={18} /> Marcar como rematado · {soles(calculo.total)}
              </button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Precio y descuento */}
        <div className="card bg-surface2/40 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted">Precio normal</p>
              <p className="text-sm font-medium text-muted line-through tabular-nums">{soles(lote.precioVentaKg)}/kg</p>
            </div>
            <span className="pill bg-danger/15 text-sm text-danger">{descuento}% OFF</span>
          </div>
          <input
            type="range"
            min={20}
            max={50}
            step={5}
            value={descuento}
            onChange={(e) => setDescuento(Number(e.target.value))}
            className="slider my-4 w-full"
            style={{ ['--fill' as string]: `${((descuento - 20) / 30) * 100}%` }}
            aria-label="Descuento"
          />
          <div className="flex justify-between text-[11px] text-muted">
            <span>20%</span>
            <span>35%</span>
            <span>50%</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface p-3">
              <p className="text-[11px] text-muted">Remate por kg</p>
              <p className="text-lg font-bold tabular-nums">{soles(calculo.precioRemate)}</p>
            </div>
            <div className="rounded-2xl bg-ok/15 p-3 text-ok">
              <p className="text-[11px]">Dinero a recuperar</p>
              <p className="text-lg font-bold tabular-nums">{soles(calculo.total)}</p>
            </div>
          </div>
        </div>

        {/* Compradores */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Agenda B2B</span>
            <button
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand"
              onClick={() => setNuevo(nuevo ? null : { nombre: '', rubro: '', telefono: '' })}
            >
              {nuevo ? 'Cancelar' : (<><UserPlus size={16} /> Nuevo</>)}
            </button>
          </div>

          {nuevo && (
            <div className="mb-3 animate-fade-in space-y-2 rounded-2xl border border-dashed border-line p-3">
              <input className="field" placeholder="Nombre del negocio" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              <input className="field" placeholder="Rubro y ciudad (opcional)" value={nuevo.rubro} onChange={(e) => setNuevo({ ...nuevo, rubro: e.target.value })} />
              <div className="flex gap-2">
                <span className="grid min-h-[44px] place-items-center rounded-2xl bg-surface2 px-3 text-sm text-muted">+51</span>
                <input
                  className="field"
                  inputMode="numeric"
                  placeholder="Celular (9 dígitos)"
                  maxLength={15}
                  value={nuevo.telefono}
                  onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                />
              </div>
              <button className="btn-primary w-full" onClick={guardarNuevo}>
                <Plus size={16} /> Guardar comprador
              </button>
            </div>
          )}

          {data.compradores.length === 0 && !nuevo && (
            <button
              type="button"
              onClick={() => setNuevo({ nombre: '', rubro: '', telefono: '' })}
              className="flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted"
            >
              <UserPlus size={20} className="text-brand" />
              Aún no tienes compradores. Agrega a quien suele comprarte (restaurantes, bodegas, mercados).
            </button>
          )}
          <ul className="space-y-2">
            {data.compradores.map((c) => {
              const sel = seleccion.includes(c.id);
              const env = enviados.includes(c.id);
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(c.id)}
                    className={`flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-2xl border px-3 text-left transition-all duration-200 active:scale-[0.99] ${
                      sel ? 'border-brand/50 bg-brand/10' : 'border-line bg-surface2/40'
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all duration-200 ${
                        sel ? 'border-brand bg-brand text-white dark:text-[#0E1511]' : 'border-muted/40'
                      }`}
                    >
                      {sel && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.nombre}</span>
                      <span className="block truncate text-xs text-muted">
                        {c.rubro} · +{c.telefono}
                      </span>
                    </span>
                    {env && <span className="pill shrink-0 bg-[#25D366]/15 text-[#25D366]">Enviado</span>}
                  </button>
                  {sel && (
                    <button
                      onClick={() => enviar(c)}
                      aria-label={`Enviar a ${c.nombre}`}
                      className="grid h-[52px] w-11 shrink-0 place-items-center rounded-2xl bg-[#25D366]/15 text-[#25D366] transition-all active:scale-95"
                    >
                      <MessageCircle size={18} />
                    </button>
                  )}
                  {!sel && (
                    <button
                      onClick={() => eliminarComprador(c.id)}
                      aria-label={`Eliminar ${c.nombre}`}
                      className="grid h-[52px] w-11 shrink-0 place-items-center rounded-2xl text-muted transition-all hover:text-danger active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mensaje */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Mensaje generado</span>
            <div className="flex gap-3">
              {editado && (
                <button className="min-h-[44px] px-1 text-xs font-semibold text-muted" onClick={() => setEditado(false)}>
                  Restaurar
                </button>
              )}
              <button className="inline-flex min-h-[44px] items-center gap-1 px-1 text-xs font-semibold text-brand" onClick={copiar}>
                <Copy size={14} /> Copiar
              </button>
            </div>
          </div>
          <textarea
            value={mensaje}
            onChange={(e) => {
              setMensaje(e.target.value);
              setEditado(true);
            }}
            rows={9}
            className="field resize-none py-3 font-mono text-[12.5px] leading-relaxed"
          />
        </div>
      </div>
    </BottomSheet>
  );
}
