import { describe, expect, it } from 'vitest';
import { crearDatosVacios } from '../data/seedData';
import type { AppData, Lote } from '../types';
import { calcularCierre, enlaceWhatsApp, textoCierre } from './cierre';

const AHORA = new Date(2026, 10, 26, 19, 0, 0).getTime();
const hace = (d: number, h = 9) => {
  const t = new Date(AHORA);
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};

const lote: Lote = {
  id: 'l1',
  codigoQR: 'J-1',
  productoId: 'platano',
  camaraId: 'almacen',
  pesoInicialKg: 700,
  pesoKg: 400,
  costoKg: 2.2,
  precioVentaKg: 3,
  fechaIngreso: hace(3),
  horasExposicionCalor: 0,
  condicionLlegada: 'optimo',
  estado: 'activo',
};

const datos = (over: Partial<AppData> = {}): AppData => ({ ...crearDatosVacios(), lotes: [lote], ...over });
const STOCK = { lotes: 3, kg: 450, criticos: 1 };

const conMovimientos = datos({
  despachos: [
    { id: 'd1', loteId: 'l1', fecha: hace(0, 8), pesoKg: 200, total: 420, medioPago: 'yape' },
    { id: 'd2', loteId: 'l1', fecha: hace(0, 11), pesoKg: 50, total: 150, medioPago: 'efectivo' },
    { id: 'd3', loteId: 'l1', fecha: hace(0, 12), pesoKg: 10, total: 30 },
    { id: 'd4', loteId: 'l1', fecha: hace(1), pesoKg: 100, total: 300, medioPago: 'efectivo' },
  ],
  liquidaciones: [
    { id: 'q1', loteId: 'l1', codigoQR: 'J-1', productoId: 'platano', fecha: hace(0, 10), pesoKg: 50, precioNormalKg: 3, descuentoPct: 30, precioRemateKg: 2.1, total: 105, compradorId: 'c' },
  ],
  bajas: [
    { id: 'b1', loteId: 'l1', codigoQR: 'J-1', productoId: 'platano', fecha: hace(0, 12), motivo: 'golpeado', pesoKg: 10, valorPerdido: 22, fotoEvidencia: '' },
  ],
});

describe('cierre del día', () => {
  it('suma solo lo de hoy, separado en ventas, remates y merma', () => {
    const c = calcularCierre(conMovimientos, AHORA, STOCK);
    expect(c.ventas).toEqual({ soles: 600, kg: 260, n: 3 });
    expect(c.remates).toEqual({ soles: 105, kg: 50, n: 1 });
    expect(c.merma).toEqual({ soles: 22, kg: 10, n: 1 });
    expect(c.ingresos).toBe(705);
    expect(c.vacio).toBe(false);
  });

  it('agrupa las ventas por medio de pago y deja aparte las que no lo indican', () => {
    const c = calcularCierre(conMovimientos, AHORA, STOCK);
    expect(c.porMedio).toEqual([
      { id: 'efectivo', nombre: 'Efectivo', soles: 150 },
      { id: 'yape', nombre: 'Yape / Plin', soles: 420 },
      { id: 'sin', nombre: 'Sin indicar', soles: 30 },
    ]);
  });

  it('usa la meta de rescate y la racha del progreso', () => {
    const c = calcularCierre(conMovimientos, AHORA, STOCK);
    expect(c.meta).toBe(500);
    expect(c.rescatado).toBe(105);
    expect(c.pctMeta).toBe(21);
    expect(c.metaCumplida).toBe(false);
    // Hubo una baja hoy: la racha vuelve a cero
    expect(c.racha).toBe(0);
  });

  it('día sin movimientos', () => {
    const c = calcularCierre(datos(), AHORA, { lotes: 1, kg: 400, criticos: 0 });
    expect(c.vacio).toBe(true);
    expect(c.ingresos).toBe(0);
    expect(c.porMedio).toEqual([]);
    expect(c.racha).toBe(4);
    const t = textoCierre(c);
    expect(t).toContain('no se registraron ventas');
    expect(t).toContain('Racha: 4 días sin merma');
    expect(t).not.toContain('Para mañana');
  });
});

describe('texto para WhatsApp', () => {
  const t = textoCierre(calcularCierre(conMovimientos, AHORA, STOCK), 'Puesto 12');

  it('trae título, fecha y montos', () => {
    expect(t.split('\n')[0]).toBe('*Cierre del día · Puesto 12*');
    expect(t).toContain('26 de noviembre');
    expect(t).toContain('Ingresos: S/ 705.00');
    expect(t).toContain('Ventas: S/ 600.00 (3 ventas, 260 kg)');
    expect(t).toContain('Remates: S/ 105.00 (1 remate, 50 kg)');
    expect(t).toContain('Yape / Plin S/ 420.00');
    expect(t).toContain('Merma: S/ 22.00 (10 kg, 1 baja)');
    expect(t).toContain('S/ 105.00 de S/ 500.00 (21%)');
  });

  it('avisa los lotes críticos para mañana', () => {
    expect(t).toContain('Queda en stock: 3 lotes, 450 kg');
    expect(t).toContain('1 lote crítico por rematar');
  });

  it('arma el enlace wa.me con o sin número', () => {
    expect(enlaceWhatsApp('Hola mundo')).toBe('https://wa.me/?text=Hola%20mundo');
    expect(enlaceWhatsApp('a&b', '+51 987 654 321')).toBe('https://wa.me/51987654321?text=a%26b');
  });
});
