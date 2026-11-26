import { describe, expect, it } from 'vitest';
import { crearDatosVacios } from '../data/seedData';
import type { AppData, Lote } from '../types';
import { emojiProducto, envasesDisponibles, haceDias, porcentajeSalido, resumenDelDia, salidasDeHoy } from './puesto';

const AHORA = new Date(2026, 10, 26, 15, 0, 0).getTime();
const hace = (d: number, h = 9) => {
  const t = new Date(AHORA);
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};

const lote = (over: Partial<Lote> = {}): Lote => ({
  id: 'l1',
  codigoQR: 'J-1',
  productoId: 'platano',
  camaraId: 'almacen',
  pesoInicialKg: 700,
  pesoKg: 700,
  costoKg: 2.2,
  precioVentaKg: 3,
  fechaIngreso: hace(4),
  horasExposicionCalor: 0,
  condicionLlegada: 'optimo',
  estado: 'activo',
  ...over,
});

const datos = (over: Partial<AppData> = {}): AppData => ({ ...crearDatosVacios(), ...over });

describe('envases y avance', () => {
  it('calcula envases que quedan según el peso', () => {
    expect(envasesDisponibles(lote({ envase: { tipo: 'jaba', cantidad: 35, kgPorEnvase: 20 } }))).toBe(35);
    expect(envasesDisponibles(lote({ pesoKg: 210, envase: { tipo: 'jaba', cantidad: 35, kgPorEnvase: 20 } }))).toBe(11);
    expect(envasesDisponibles(lote())).toBeNull();
  });

  it('porcentaje comercializado', () => {
    expect(porcentajeSalido(lote({ pesoKg: 420 }))).toBe(40);
    expect(porcentajeSalido(lote())).toBe(0);
  });

  it('textos de días', () => {
    expect(haceDias(hace(0), AHORA)).toBe('hoy');
    expect(haceDias(hace(1, 23), AHORA)).toBe('ayer');
    expect(haceDias(hace(4), AHORA)).toBe('hace 4 días');
  });

  it('elige un ícono por nombre y luego por categoría', () => {
    expect(emojiProducto({ id: 'platano', nombre: 'Plátano bellaco', categoria: 'frutas' })).toBe('🍌');
    expect(emojiProducto({ id: 'x1', nombre: 'Paiche', categoria: 'pescados' })).toBe('🐟');
    expect(emojiProducto({ id: 'x2', nombre: 'Fruta rara', categoria: 'frutas' })).toBe('🥭');
    // "fresco" contiene "res": no debe confundirse con carne
    expect(emojiProducto({ id: 'queso', nombre: 'Queso fresco', categoria: 'lacteos' })).toBe('🧀');
    expect(emojiProducto({ id: 'res', nombre: 'Carne de res', categoria: 'carnes' })).toBe('🥩');
  });
});

describe('ventas del día', () => {
  const d = datos({
    lotes: [lote()],
    despachos: [
      { id: 'd1', loteId: 'l1', fecha: hace(0, 8), pesoKg: 200, total: 420, canal: 'mayorista', medioPago: 'yape' },
      { id: 'd2', loteId: 'l1', fecha: hace(1), pesoKg: 100, total: 300 },
    ],
    liquidaciones: [
      { id: 'q1', loteId: 'l1', codigoQR: 'J-1', productoId: 'platano', fecha: hace(0, 10), pesoKg: 50, precioNormalKg: 3, descuentoPct: 30, precioRemateKg: 2.1, total: 105, compradorId: 'c' },
    ],
    bajas: [
      { id: 'b1', loteId: 'l1', codigoQR: 'J-1', productoId: 'platano', fecha: hace(0, 12), motivo: 'golpeado', pesoKg: 10, valorPerdido: 22, fotoEvidencia: '' },
    ],
  });

  it('suma solo lo de hoy', () => {
    expect(resumenDelDia(d, AHORA)).toEqual({ ventas: 525, kgVendidos: 250, operaciones: 2, merma: 22 });
  });

  it('lista las salidas de hoy de la más reciente a la más antigua', () => {
    const s = salidasDeHoy(d, AHORA);
    expect(s.map((x) => x.id)).toEqual(['b1', 'q1', 'd1']);
    expect(s[0].monto).toBe(-22);
    expect(s[2].detalle).toBe('Mayorista · Yape / Plin');
  });
});
