import { describe, expect, it } from 'vitest';
import { crearDatosVacios } from '../data/seedData';
import type { AppData, BajaMerma, Liquidacion, Lote } from '../types';
import {
  META_DIARIA_DEFECTO,
  calcularLogros,
  calcularProgreso,
  conMetaDiaria,
  diaLocal,
  metaParaDia,
  registrarProgreso,
} from './logros';
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

describe('historial de metas', () => {
  it('cambiar la meta hoy no cambia cómo se juzgan los días pasados', () => {
    // Ayer se rescató S/ 600 con la meta por defecto (500): cumplida
    let d = datos({ liquidaciones: [liq(haceDias(1), 600)] });
    expect(calcularProgreso(d, AHORA).diasMetaCumplida).toBe(1);
    d = conMetaDiaria(d, 1000, AHORA);
    const p = calcularProgreso(d, AHORA);
    expect(p.meta).toBe(1000);
    expect(p.diasMetaCumplida).toBe(1);
    expect(p.semana[5].cumplida).toBe(true);
    expect(p.semana[5].meta).toBe(META_DIARIA_DEFECTO);
    expect(p.semana[6].meta).toBe(1000);
  });

  it('dos cambios el mismo día dejan solo el último', () => {
    let d = conMetaDiaria(datos(), 800, AHORA);
    d = conMetaDiaria(d, 300, AHORA);
    expect(d.metas?.rescateDiarioSoles).toBe(300);
    expect(d.metas?.historial?.filter((c) => c.desde === diaLocal(AHORA))).toEqual([{ desde: diaLocal(AHORA), soles: 300 }]);
    expect(metaParaDia(d, diaLocal(haceDias(3)))).toBe(META_DIARIA_DEFECTO);
  });

  it('ignora montos no válidos', () => {
    const d = datos();
    expect(conMetaDiaria(d, 0, AHORA)).toBe(d);
    expect(conMetaDiaria(d, -5, AHORA)).toBe(d);
  });
});

describe('registrarProgreso', () => {
  const unRemate = () => datos({ liquidaciones: [liq(haceDias(0), 250)] });

  it('la primera vez anota lo ya logrado sin celebrar', () => {
    const r = registrarProgreso(unRemate(), AHORA);
    expect(r.festejos).toEqual([]);
    expect(Object.keys(r.data.progreso!.logros)).toEqual(['primer-remate']);
  });

  it('celebra un logro nuevo una sola vez y lo fecha', () => {
    const base = registrarProgreso(datos({ lotes: [lote(haceDias(0))] }), AHORA).data;
    const r1 = registrarProgreso({ ...base, liquidaciones: [liq(haceDias(0), 250)] }, AHORA);
    expect(r1.festejos.map((f) => f.id)).toEqual(['primer-remate']);
    expect(r1.data.progreso!.logros['primer-remate']).toBe(new Date(AHORA).toISOString());
    const r2 = registrarProgreso(r1.data, AHORA + 60_000);
    expect(r2.festejos).toEqual([]);
    expect(r2.data).toBe(r1.data);
  });

  it('celebra la meta del día primero y solo una vez por día', () => {
    const base = registrarProgreso(datos(), AHORA).data;
    const r1 = registrarProgreso({ ...base, liquidaciones: [liq(haceDias(0), 700)] }, AHORA);
    expect(r1.festejos[0].tipo).toBe('meta');
    expect(r1.data.progreso!.metaCelebrada).toBe(diaLocal(AHORA));
    const r2 = registrarProgreso({ ...r1.data, liquidaciones: [...r1.data.liquidaciones, liq(haceDias(0), 100)] }, AHORA);
    expect(r2.festejos.some((f) => f.tipo === 'meta')).toBe(false);
  });

  it('si se deshace la acción, el logro sale del registro y se puede volver a celebrar', () => {
    const base = registrarProgreso(datos({ lotes: [lote(haceDias(0))] }), AHORA).data;
    const con = registrarProgreso({ ...base, liquidaciones: [liq(haceDias(0), 250)] }, AHORA).data;
    const sin = registrarProgreso({ ...con, liquidaciones: [] }, AHORA).data;
    expect(sin.progreso!.logros['primer-remate']).toBeUndefined();
    const otra = registrarProgreso({ ...sin, liquidaciones: [liq(haceDias(0), 250)] }, AHORA);
    expect(otra.festejos.map((f) => f.id)).toEqual(['primer-remate']);
  });

  it('conserva logros de una versión más nueva de la app', () => {
    const d = { ...datos(), progreso: { logros: { 'logro-futuro': new Date(AHORA).toISOString() } } };
    const r = registrarProgreso({ ...d, liquidaciones: [liq(haceDias(0), 250)] }, AHORA);
    expect(r.data.progreso!.logros['logro-futuro']).toBeDefined();
  });
});

describe('progreso en el respaldo', () => {
  it('conserva el historial de metas válido, ordenado, y descarta lo dañado', () => {
    const r = validarYMigrar({
      ...crearDatosVacios(),
      metas: {
        rescateDiarioSoles: 900,
        historial: [{ desde: '2026-11-20', soles: 900 }, { desde: 'ayer', soles: 5 }, { desde: '2026-01-01', soles: 400 }, null],
      },
    });
    expect(r.ok && r.data.metas?.historial).toEqual([
      { desde: '2026-01-01', soles: 400 },
      { desde: '2026-11-20', soles: 900 },
    ]);
  });

  it('limpia el registro de logros y no rechaza el respaldo por él', () => {
    const r = validarYMigrar({
      ...crearDatosVacios(),
      progreso: { logros: { 'primer-remate': '2026-11-26T10:00:00.000Z', roto: 42, malo: 'no es fecha' }, metaCelebrada: 'x' },
    });
    expect(r.ok && r.data.progreso).toEqual({ logros: { 'primer-remate': '2026-11-26T10:00:00.000Z' } });
    const r2 = validarYMigrar({ ...crearDatosVacios(), progreso: 'dañado' });
    expect(r2.ok && r2.data.progreso).toBeUndefined();
  });
});
