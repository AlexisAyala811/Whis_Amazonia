import type { AppData, MedioPago } from '../types';
import { kg, soles } from './fefoEngine';
import { calcularProgreso, diaLocal } from './logros';
import { MEDIOS_PAGO } from './puesto';

/**
 * Cierre del día: lo vendido, rematado y perdido hoy, la meta y la racha,
 * más lo que queda en stock. Funciones puras: funcionan sin internet.
 */

export interface StockCierre {
  lotes: number;
  kg: number;
  /** Lotes en rojo: hay que rematarlos o venderlos mañana temprano */
  criticos: number;
}

export interface CierreDia {
  dia: string;
  ventas: { soles: number; kg: number; n: number };
  remates: { soles: number; kg: number; n: number };
  merma: { soles: number; kg: number; n: number };
  /** Ventas + remates */
  ingresos: number;
  /** Solo ventas (los remates no registran medio de pago) */
  porMedio: { id: MedioPago | 'sin'; nombre: string; soles: number }[];
  meta: number;
  /** Lo recuperado con remates hoy, como en la meta de rescate */
  rescatado: number;
  pctMeta: number;
  metaCumplida: boolean;
  racha: number;
  stock: StockCierre;
  /** No hubo ventas, remates ni mermas hoy */
  vacio: boolean;
}

export function calcularCierre(data: AppData, ahora: number, stock: StockCierre): CierreDia {
  const hoy = diaLocal(ahora);
  const esHoy = (f: string) => diaLocal(f) === hoy;
  const desp = data.despachos.filter((d) => esHoy(d.fecha));
  const liq = data.liquidaciones.filter((q) => esHoy(q.fecha));
  const bajas = data.bajas.filter((b) => esHoy(b.fecha));
  const suma = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

  const ventas = { soles: suma(desp, (d) => d.total), kg: suma(desp, (d) => d.pesoKg), n: desp.length };
  const remates = { soles: suma(liq, (q) => q.total), kg: suma(liq, (q) => q.pesoKg), n: liq.length };
  const merma = { soles: suma(bajas, (b) => b.valorPerdido), kg: suma(bajas, (b) => b.pesoKg), n: bajas.length };

  const porMedio: CierreDia['porMedio'] = MEDIOS_PAGO.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    soles: suma(desp.filter((d) => d.medioPago === m.id), (d) => d.total),
  }));
  const sinMedio = suma(desp.filter((d) => !d.medioPago || !MEDIOS_PAGO.some((m) => m.id === d.medioPago)), (d) => d.total);
  if (sinMedio > 0) porMedio.push({ id: 'sin', nombre: 'Sin indicar', soles: sinMedio });

  const p = calcularProgreso(data, ahora);
  return {
    dia: hoy,
    ventas,
    remates,
    merma,
    ingresos: ventas.soles + remates.soles,
    porMedio: porMedio.filter((m) => m.soles > 0),
    meta: p.meta,
    rescatado: p.hoy.rescatado,
    pctMeta: p.hoy.pct,
    metaCumplida: p.hoy.cumplida,
    racha: p.racha,
    stock,
    vacio: desp.length + liq.length + bajas.length === 0,
  };
}

/** "jueves 26 de noviembre" */
export function fechaLarga(dia: string): string {
  return new Date(`${dia}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Texto listo para WhatsApp (los *asteriscos* salen en negrita) */
export function textoCierre(c: CierreDia, puesto?: string): string {
  const l: string[] = [];
  l.push(`*Cierre del día${puesto ? ` · ${puesto}` : ''}*`);
  l.push(fechaLarga(c.dia));
  l.push('');
  if (c.vacio) {
    l.push('Hoy no se registraron ventas, remates ni mermas.');
  } else {
    l.push(`💰 *Ingresos: ${soles(c.ingresos)}*`);
    l.push(`• Ventas: ${soles(c.ventas.soles)} (${plural(c.ventas.n, 'venta', 'ventas')}, ${kg(c.ventas.kg)})`);
    l.push(`• Remates: ${soles(c.remates.soles)} (${plural(c.remates.n, 'remate', 'remates')}, ${kg(c.remates.kg)})`);
    if (c.porMedio.length > 0) {
      l.push(`• Cobro: ${c.porMedio.map((m) => `${m.nombre} ${soles(m.soles)}`).join(' · ')}`);
    }
    l.push('');
    l.push(
      c.merma.n > 0
        ? `🗑️ Merma: ${soles(c.merma.soles)} (${kg(c.merma.kg)}, ${plural(c.merma.n, 'baja', 'bajas')})`
        : '✅ Sin merma hoy',
    );
  }
  l.push(
    `🎯 Meta de rescate: ${soles(c.rescatado)} de ${soles(c.meta)}${c.metaCumplida ? ' · ¡cumplida!' : ` (${c.pctMeta}%)`}`,
  );
  if (c.racha > 0) l.push(`🔥 Racha: ${plural(c.racha, 'día', 'días')} sin merma`);
  l.push('');
  l.push(`📦 Queda en stock: ${plural(c.stock.lotes, 'lote', 'lotes')}, ${kg(c.stock.kg)}`);
  if (c.stock.criticos > 0) {
    l.push(`⚠️ Para mañana: ${plural(c.stock.criticos, 'lote crítico', 'lotes críticos')} por rematar temprano`);
  }
  l.push('');
  l.push('_Enviado desde Whis Amazonia_');
  return l.join('\n');
}

/** Enlace de WhatsApp con el texto. Sin número, WhatsApp deja elegir el chat. */
export function enlaceWhatsApp(texto: string, telefono?: string): string {
  const tel = (telefono ?? '').replace(/\D/g, '');
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
}
