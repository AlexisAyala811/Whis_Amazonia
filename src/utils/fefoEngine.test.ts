import { describe, expect, it } from 'vitest';
import type { Lote } from '../types';
import {
  calcularFefo,
  clasificar,
  conApagon,
  exposicionParaPorcentaje,
  formatoHoras,
  horasDesde,
  kg,
  ordenarFefo,
  soles,
} from './fefoEngine';

const AHORA = Date.UTC(2026, 10, 26, 12, 0, 0);
const MS_HORA = 3_600_000;
const haceHoras = (h: number) => new Date(AHORA - h * MS_HORA).toISOString();

const lote = (over: Partial<Lote> = {}): Lote => ({
  id: 'l1',
  codigoQR: 'WHIS-001',
  productoId: 'pescado', // vida base 72 h, factor calor 4.0
  camaraId: 'camara1',
  pesoInicialKg: 10,
  pesoKg: 10,
  costoKg: 18,
  precioVentaKg: 24,
  fechaIngreso: haceHoras(0),
  horasExposicionCalor: 0,
  condicionLlegada: 'optimo',
  estado: 'activo',
  ...over,
});

describe('horasDesde', () => {
  it('calcula las horas transcurridas', () => {
    expect(horasDesde(haceHoras(5), AHORA)).toBeCloseTo(5);
  });

  it('nunca devuelve negativo si la fecha está en el futuro', () => {
    expect(horasDesde(haceHoras(-3), AHORA)).toBe(0);
  });
});

describe('clasificar (semáforo)', () => {
  it.each([
    [100, 'verde'],
    [51, 'verde'],
    [50, 'amarillo'],
    [20, 'amarillo'],
    [19, 'rojo'],
    [0, 'rojo'],
  ] as const)('%i %% → %s', (pct, color) => {
    expect(clasificar(pct)).toBe(color);
  });
});

describe('calcularFefo', () => {
  it('lote recién ingresado sin calor está al 100 % y verde', () => {
    const r = calcularFefo(lote(), AHORA);
    expect(r.horasRestantes).toBe(72);
    expect(r.porcentajeVidaUtil).toBe(100);
    expect(r.semaforo).toBe('verde');
  });

  it('descuenta el tiempo en frío hora por hora', () => {
    // pollo: vida 96 h → 24 h en frío deja 72 h (75 %)
    const r = calcularFefo(lote({ productoId: 'pollo', fechaIngreso: haceHoras(24) }), AHORA);
    expect(r.horasTranscurridas).toBeCloseTo(24);
    expect(r.horasRestantes).toBeCloseTo(72);
    expect(r.porcentajeVidaUtil).toBe(75);
    expect(r.semaforo).toBe('verde');
  });

  it('multiplica las horas de calor por el factor de riesgo del producto', () => {
    // pescado: 24 h en frío + 3 h calor × 4.0 = 36 h consumidas → 36 h restantes (50 %)
    const r = calcularFefo(lote({ fechaIngreso: haceHoras(24), horasExposicionCalor: 3 }), AHORA);
    expect(r.horasEquivalentesConsumidas).toBeCloseTo(36);
    expect(r.horasRestantes).toBeCloseTo(36);
    expect(r.porcentajeVidaUtil).toBe(50);
    expect(r.semaforo).toBe('amarillo');
  });

  it('un lote vencido queda en 0 h, 0 % y rojo (sin negativos)', () => {
    const r = calcularFefo(lote({ fechaIngreso: haceHoras(100), horasExposicionCalor: 10 }), AHORA);
    expect(r.horasRestantes).toBe(0);
    expect(r.porcentajeVidaUtil).toBe(0);
    expect(r.semaforo).toBe('rojo');
  });

  it('el valor comercial es peso actual × precio de venta', () => {
    const r = calcularFefo(lote({ pesoKg: 7.5, precioVentaKg: 20 }), AHORA);
    expect(r.valorComercial).toBe(150);
  });

  it('un producto desconocido usa el primero del catálogo (pescado)', () => {
    const r = calcularFefo(lote({ productoId: 'no-existe' }), AHORA);
    expect(r.horasRestantes).toBe(72);
  });

  // Caso apagón: las horas del corte ya corren en el reloj desde fechaIngreso,
  // así que no deben contarse además como tiempo en frío.
  describe('apagón ocurrido después del ingreso', () => {
    // Pescado en cámara hace 10 h; de esas 10 h, 2 h fueron un apagón.
    const conCorte = conApagon(lote({ fechaIngreso: haceHoras(10) }), 2);

    it('conApagon suma las horas al calor y a las horas de apagón en cámara', () => {
      expect(conCorte.horasExposicionCalor).toBe(2);
      expect(conCorte.horasApagonEnCamara).toBe(2);
      expect(conApagon(conCorte, 1.5).horasApagonEnCamara).toBe(3.5);
    });

    it('no cuenta las horas dos veces: 8 h en frío + 2 h × 4 = 16 h consumidas', () => {
      const r = calcularFefo(conCorte, AHORA);
      expect(r.horasEquivalentesConsumidas).toBeCloseTo(16);
      expect(r.horasRestantes).toBeCloseTo(56);
    });

    it('respeta el calor de llegada y suma el apagón encima', () => {
      // Sin frío +6h al llegar, luego apagón de 2 h: 8 h frío + (6 + 2) × 4 = 40 h
      const l = conApagon(lote({ fechaIngreso: haceHoras(10), horasExposicionCalor: 6 }), 2);
      expect(calcularFefo(l, AHORA).horasEquivalentesConsumidas).toBeCloseTo(40);
    });

    it('si el apagón es más largo que el tiempo en cámara, no resta más de lo transcurrido', () => {
      // Lote ingresado hace 1 h con un apagón registrado de 3 h: 0 h frío + 3 × 4 = 12 h
      const l = conApagon(lote({ fechaIngreso: haceHoras(1) }), 3);
      expect(calcularFefo(l, AHORA).horasEquivalentesConsumidas).toBeCloseTo(12);
    });

    it('lotes guardados antes del cambio (sin el campo) se calculan igual que antes', () => {
      const viejo = lote({ fechaIngreso: haceHoras(10), horasExposicionCalor: 2 });
      expect(calcularFefo(viejo, AHORA).horasEquivalentesConsumidas).toBeCloseTo(18);
    });
  });

  it('las horas de calor de llegada (antes del ingreso) sí se suman completas', () => {
    // "Sin frío +6h" ocurre antes de entrar a cámara: 0 h en frío + 6 × 4 = 24 h
    const r = calcularFefo(lote({ horasExposicionCalor: 6, condicionLlegada: 'sinfrio6' }), AHORA);
    expect(r.horasEquivalentesConsumidas).toBeCloseTo(24);
  });
});

describe('ordenarFefo', () => {
  it('excluye lotes no activos o sin peso y ordena por menor vida restante', () => {
    const lotes = [
      lote({ id: 'nuevo', fechaIngreso: haceHoras(1) }),
      lote({ id: 'viejo', fechaIngreso: haceHoras(50) }),
      lote({ id: 'medio', fechaIngreso: haceHoras(20) }),
      lote({ id: 'despachado', estado: 'despachado', fechaIngreso: haceHoras(70) }),
      lote({ id: 'vacio', pesoKg: 0, fechaIngreso: haceHoras(70) }),
    ];
    const r = ordenarFefo(lotes, AHORA);
    expect(r.map((l) => l.id)).toEqual(['viejo', 'medio', 'nuevo']);
    expect(r[0].fefo.horasRestantes).toBeCloseTo(22);
  });

  it('no modifica el arreglo original', () => {
    const lotes = [lote({ id: 'a', fechaIngreso: haceHoras(1) }), lote({ id: 'b', fechaIngreso: haceHoras(5) })];
    ordenarFefo(lotes, AHORA);
    expect(lotes.map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('exposicionParaPorcentaje', () => {
  it('calcula las horas de calor que llevan a un porcentaje objetivo', () => {
    // pescado con 24 h en frío: para quedar en 50 % (36 h consumidas) faltan 12 h → 3 h de calor
    expect(exposicionParaPorcentaje('pescado', 24, 50)).toBeCloseTo(3);
  });

  it('es coherente con calcularFefo', () => {
    const horas = exposicionParaPorcentaje('queso', 30, 20);
    const r = calcularFefo(
      lote({ productoId: 'queso', fechaIngreso: haceHoras(30), horasExposicionCalor: horas }),
      AHORA,
    );
    expect(r.porcentajeVidaUtil).toBe(20);
  });

  it('devuelve 0 si el lote ya está por debajo del objetivo', () => {
    expect(exposicionParaPorcentaje('pescado', 70, 50)).toBe(0);
  });
});

describe('formateadores', () => {
  it.each([
    [0, 'Vencido'],
    [-2, 'Vencido'],
    [0.5, '30 min'],
    [0.001, '1 min'],
    [2.5, '2 h 30 min'],
    [5.05, '5 h 03 min'],
    [47.5, '47 h 30 min'],
    [50, '2 d 2 h'],
    [72, '3 d 0 h'],
  ])('formatoHoras(%d) → %s', (h, texto) => {
    expect(formatoHoras(h)).toBe(texto);
  });

  it.each([
    [0.999, '1 h 00 min'],
    [1.995, '2 h 00 min'],
    [47.999, '2 d 0 h'],
    [71.6, '3 d 0 h'],
  ])('formatoHoras(%d) no muestra "60 min" ni "24 h" al redondear → %s', (h, texto) => {
    expect(formatoHoras(h)).toBe(texto);
  });

  it('soles y kg', () => {
    expect(soles(12.5)).toBe('S/ 12.50');
    expect(kg(12.34)).toBe('12.3 kg');
  });
});
