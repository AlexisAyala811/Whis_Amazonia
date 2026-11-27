import { MOTIVOS_BAJA } from '../data/catalog';
import type { AppData, CanalVenta, Lote, MedioPago, Producto, TipoEnvase } from '../types';
import { diaLocal } from './logros';
import { formatoHoras, type LoteFefo } from './fefoEngine';

/** Datos del día y textos del puesto (ventas, salidas, envases). Funciones puras. */

export const CANALES: { id: CanalVenta; nombre: string }[] = [
  { id: 'mayorista', nombre: 'Mayorista' },
  { id: 'minorista', nombre: 'Minorista' },
  { id: 'puesto', nombre: 'Puesto' },
];

export const MEDIOS_PAGO: { id: MedioPago; nombre: string }[] = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'yape', nombre: 'Yape / Plin' },
  { id: 'credito', nombre: 'A crédito' },
];

export const ENVASES: { id: TipoEnvase; nombre: string; plural: string; detalle: string; kgDefecto: number }[] = [
  { id: 'jaba', nombre: 'Jaba', plural: 'jabas', detalle: 'Plástico', kgDefecto: 20 },
  { id: 'caja', nombre: 'Caja', plural: 'cajas', detalle: 'Madera', kgDefecto: 15 },
  { id: 'saco', nombre: 'Saco', plural: 'sacos', detalle: 'Yute', kgDefecto: 40 },
];

export const nombreEnvase = (tipo: TipoEnvase, n: number) => {
  const e = ENVASES.find((x) => x.id === tipo) ?? ENVASES[0];
  return n === 1 ? e.nombre.toLowerCase() : e.plural;
};

/** Envases que quedan según el peso actual (redondeado, nunca negativo) */
export const envasesDisponibles = (l: Lote): number | null =>
  l.envase && l.envase.kgPorEnvase > 0 ? Math.max(0, Math.round(l.pesoKg / l.envase.kgPorEnvase)) : null;

/** % del lote que ya salió (vendido, rematado o dado de baja) */
export const porcentajeSalido = (l: Lote): number =>
  l.pesoInicialKg > 0 ? Math.round(((l.pesoInicialKg - l.pesoKg) / l.pesoInicialKg) * 100) : 0;

/** "hoy", "ayer", "hace 3 días" según días calendario locales */
export function haceDias(iso: string, ahora: number): string {
  const a = new Date(iso);
  a.setHours(0, 0, 0, 0);
  const b = new Date(ahora);
  b.setHours(0, 0, 0, 0);
  const d = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
}

/** Consejo corto para un lote, según su semáforo */
export function consejoLote(l: LoteFefo, ahora: number): string {
  const ingreso = `Ingresó ${haceDias(l.fechaIngreso, ahora)}`;
  const quedan = formatoHoras(l.fefo.horasRestantes);
  if (l.fefo.semaforo === 'rojo') return `${ingreso}. Quedan ${quedan}: remata o vende hoy para no perderlo.`;
  if (l.fefo.semaforo === 'amarillo') return `${ingreso}. Quedan ${quedan}: dale salida prioritaria hoy.`;
  return `${ingreso}. Quedan ${quedan} de vida útil: venta normal.`;
}

/** Ícono visual del producto (emoji: funciona sin internet y sin imágenes) */
export function emojiProducto(p: Pick<Producto, 'id' | 'categoria' | 'nombre'>): string {
  const n = `${p.id} ${p.nombre}`.toLowerCase();
  const tabla: [RegExp, string][] = [
    [/pl[aá]tano|banano/, '🍌'],
    [/camu/, '🍒'],
    [/cocona|tomate/, '🍅'],
    [/aguaje/, '🥥'],
    [/papaya/, '🥭'],
    [/pi[nñ]a/, '🍍'],
    [/lim[oó]n/, '🍋'],
    [/naranja|mandarina/, '🍊'],
    [/uva/, '🍇'],
    [/sand[ií]a/, '🍉'],
    [/palta/, '🥑'],
    [/yuca|papa|camote/, '🥔'],
    [/ma[ií]z|choclo/, '🌽'],
    [/queso/, '🧀'],
    [/leche|yogur/, '🥛'],
    [/pescado|paiche|doncella|boquichico/, '🐟'],
    [/pollo|gallina/, '🍗'],
    [/\bres\b|cerdo|carne|cecina|chancho/, '🥩'],
    [/huevo/, '🥚'],
  ];
  for (const [re, e] of tabla) if (re.test(n)) return e;
  return { carnes: '🥩', pescados: '🐟', lacteos: '🧀', frutas: '🥭', otros: '📦' }[p.categoria] ?? '📦';
}

export interface ResumenDia {
  ventas: number;
  kgVendidos: number;
  operaciones: number;
  merma: number;
}

export function resumenDelDia(data: AppData, ahora: number): ResumenDia {
  const hoy = diaLocal(ahora);
  const esHoy = (f: string) => diaLocal(f) === hoy;
  const desp = data.despachos.filter((d) => esHoy(d.fecha));
  const liq = data.liquidaciones.filter((q) => esHoy(q.fecha));
  const bajas = data.bajas.filter((b) => esHoy(b.fecha));
  return {
    ventas: desp.reduce((s, d) => s + d.total, 0) + liq.reduce((s, q) => s + q.total, 0),
    kgVendidos: desp.reduce((s, d) => s + d.pesoKg, 0) + liq.reduce((s, q) => s + q.pesoKg, 0),
    operaciones: desp.length + liq.length,
    merma: bajas.reduce((s, b) => s + b.valorPerdido, 0),
  };
}

export interface Salida {
  id: string;
  tipo: 'venta' | 'remate' | 'merma';
  fecha: string;
  codigo: string;
  loteId: string;
  kg: number;
  /** Positivo si entra dinero, negativo si es pérdida */
  monto: number;
  detalle: string;
}

/** Ventas, remates y mermas de hoy, de la más reciente a la más antigua */
export function salidasDeHoy(data: AppData, ahora: number, loteId?: string): Salida[] {
  const hoy = diaLocal(ahora);
  const codigoDe = (id: string) => data.lotes.find((l) => l.id === id)?.codigoQR ?? '—';
  const lista: Salida[] = [
    ...data.despachos.map((d) => ({
      id: d.id,
      tipo: 'venta' as const,
      fecha: d.fecha,
      codigo: codigoDe(d.loteId),
      loteId: d.loteId,
      kg: d.pesoKg,
      monto: d.total,
      detalle: [CANALES.find((c) => c.id === d.canal)?.nombre ?? 'Venta', MEDIOS_PAGO.find((m) => m.id === d.medioPago)?.nombre]
        .filter(Boolean)
        .join(' · '),
    })),
    ...data.liquidaciones.map((q) => ({
      id: q.id,
      tipo: 'remate' as const,
      fecha: q.fecha,
      codigo: q.codigoQR,
      loteId: q.loteId,
      kg: q.pesoKg,
      monto: q.total,
      detalle: `Remate ${q.descuentoPct}% · ${data.compradores.find((c) => c.id === q.compradorId)?.nombre ?? 'Comprador'}`,
    })),
    ...data.bajas.map((b) => ({
      id: b.id,
      tipo: 'merma' as const,
      fecha: b.fecha,
      codigo: b.codigoQR,
      loteId: b.loteId,
      kg: b.pesoKg,
      monto: -b.valorPerdido,
      detalle: `Merma: ${MOTIVOS_BAJA.find((m) => m.id === b.motivo)?.nombre ?? b.motivo}`,
    })),
  ];
  return lista
    .filter((s) => diaLocal(s.fecha) === hoy && (!loteId || s.loteId === loteId))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Celular peruano de 9 dígitos a partir de lo escrito ("987 654 321", "+51 987654321"); null si no cuadra */
export function celularPeru(texto: string): string | null {
  let d = texto.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
  return /^9\d{8}$/.test(d) ? d : null;
}
