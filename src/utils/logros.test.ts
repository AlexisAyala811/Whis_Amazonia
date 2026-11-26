import { describe, expect, it } from 'vitest';
import { crearDatosVacios } from '../data/seedData';
import type { AppData, BajaMerma, Liquidacion, Lote } from '../types';
import { META_DIARIA_DEFECTO, calcularLogros, calcularProgreso, diaLocal } from './logros';
import { validarYMigrar } from './persistencia';

// Fechas en hora local, para que los días corten igual en cualquier zona horaria
const AHORA = new Date(2026, 10, 26, 15, 0, 0).getTime();
const haceDias = (d: number, hora = 10) => {
  const t = new Date(AHORA);
  t.setDate(t.getDate() - d);
  t.setHours(hora, 0, 0, 0);
  return t.toISOString();
};

const lote = (fecha: string): Lote => ({
  id: `l-${fecha}`,
  codigoQR: 'J-1',
  productoId: 'pescado',
  camaraId: 'camara1',
  pesoInicialKg: 10,
  pesoKg: 10,
  costoKg: 18,
  precioVentaKg: 24,
  fechaIngreso: fecha,
  horasExposicionCalor: 0,
  condicionLlegada: 'optimo',
  estado: 'activo',
});

const liq = (fecha: string, total: number, over: Partial<Liquidacion> = {}): Liquidacion => ({
  id: `q-${fecha}-${total}`,
  loteId: 'l1',
  codigoQR: 'J-1',
  productoId: 'pescado',
  fecha,
  pesoKg: 20,
  precioNormalKg: 24,
  descuentoPct: 30,
  precioRemateKg: 16.8,
  total,
  compradorId: 'c1',
  ...over,
});

const baja = (fecha: string): BajaMerma => ({
  id: `b-${fecha}`,
  loteId: 'l1',
  codigoQR: 'J-1',
  productoId: 'pescado',
  fecha,
  motivo: 'vencimiento',
  pesoKg: 5,
  valorPerdido: 90,
  fotoEvidencia: '',
});

const datos = (over: Partial<AppData> = {}): AppData => ({ ...crearDatosVacios(), ...over });

describe('calcularProgreso', () => {
  it('sin registros no hay racha ni avance', () => {
    const p = calcularProgreso(datos(), AHORA);
    expect(p.racha).toBe(0);
    expect(p.mejorRacha).toBe(0);
    expect(p.hoy.rescatado).toBe(0);
    expect(p.meta).toBe(META_DIARIA_DEFECTO);
    expect(p.aprovechamiento).toBeNull();
    expect(p.semana).toHaveLength(7);
    expect(p.semana[6].dia).toBe(diaLocal(AHORA));
  });

  it('cuenta la meta de hoy solo con los remates de hoy', () => {
    const p = calcularProgreso(
      datos({ liquidaciones: [liq(haceDias(0), 300), liq(haceDias(1), 900)], metas: { rescateDiarioSoles: 400 } }),
      AHORA,
    );
    expect(p.hoy.rescatado).toBe(300);
    expect(p.hoy.pct).toBe(75);
    expect(p.hoy.cumplida).toBe(false);
    expect(p.diasMetaCumplida).toBe(1);
    expect(p.totalSoles).toBe(1200);
  });

  it('el porcentaje de la meta no pasa de 100', () => {
    const p = calcularProgreso(datos({ liquidaciones: [liq(haceDias(0), 2000)] }), AHORA);
    expect(p.hoy.pct).toBe(100);
    expect(p.hoy.cumplida).toBe(true);
  });

  it('la racha cuenta días sin bajas desde el primer registro', () => {
    const p = calcularProgreso(datos({ lotes: [lote(haceDias(4))] }), AHORA);
    expect(p.racha).toBe(5); // hace 4 días, 3, 2, 1 y hoy
    expect(p.mejorRacha).toBe(5);
  });

  it('una baja reinicia la racha pero guarda la mejor', () => {
    const p = calcularProgreso(datos({ lotes: [lote(haceDias(10))], bajas: [baja(haceDias(3))] }), AHORA);
    expect(p.mejorRacha).toBe(7); // hace 10 … hace 4
    expect(p.racha).toBe(3); // hace 2, 1 y hoy
  });

  it('una baja hoy deja la racha en cero', () => {
    const p = calcularProgreso(datos({ lotes: [lote(haceDias(2))], bajas: [baja(haceDias(0))] }), AHORA);
    expect(p.racha).toBe(0);
  });

  it('aprovechamiento de 7 días = rescatado / (rescatado + perdido)', () => {
    const p = calcularProgreso(
      datos({ liquidaciones: [liq(haceDias(2), 810)], bajas: [baja(haceDias(1)), baja(haceDias(20))] }),
      AHORA,
    );
    expect(p.aprovechamiento).toBe(90);
  });
});

describe('calcularLogros', () => {
  it('desbloquea el primer rescate y lleva el avance del resto', () => {
    const p = calcularProgreso(datos({ liquidaciones: [liq(haceDias(0), 250, { descuentoPct: 20 })] }), AHORA);
    const l = Object.fromEntries(calcularLogros(p).map((x) => [x.id, x]));
    expect(l['primer-remate'].logrado).toBe(true);
    expect(l['kg-100'].logrado).toBe(false);
    expect(l['kg-100'].actual).toBe(20);
    expect(l['temprano-5'].actual).toBe(1);
  });

  it('el avance no pasa del objetivo', () => {
    const p = calcularProgreso(datos({ liquidaciones: [liq(haceDias(0), 5000, { pesoKg: 300 })] }), AHORA);
    const kg100 = calcularLogros(p).find((x) => x.id === 'kg-100')!;
    expect(kg100.actual).toBe(100);
    expect(kg100.logrado).toBe(true);
  });
});

describe('metas en el respaldo', () => {
  it('conserva una meta válida y descarta una dañada', () => {
    const ok = validarYMigrar({ ...crearDatosVacios(), metas: { rescateDiarioSoles: 800 } });
    expect(ok.ok && ok.data.metas?.rescateDiarioSoles).toBe(800);
    const mala = validarYMigrar({ ...crearDatosVacios(), metas: { rescateDiarioSoles: -1 } });
    expect(mala.ok && mala.data.metas).toBeUndefined();
  });
});
