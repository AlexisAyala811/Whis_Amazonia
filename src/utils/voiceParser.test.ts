import { describe, expect, it } from 'vitest';
import { interpretarDictado } from './voiceParser';

describe('interpretarDictado', () => {
  it('interpreta la frase de ejemplo completa', () => {
    expect(interpretarDictado('Ingresan 80 kilos de pollo a cámara 1 con 2 horas sin frío')).toEqual({
      pesoKg: 80,
      productoId: 'pollo',
      camaraId: 'camara1',
      horasSinFrio: 2,
    });
  });

  it('devuelve un objeto vacío si no entiende nada', () => {
    expect(interpretarDictado('')).toEqual({});
    expect(interpretarDictado('buenos días')).toEqual({});
  });

  describe('peso', () => {
    it.each([
      ['80 kg de pescado', 80],
      ['12,5 kilos', 12.5],
      ['12.5 kilogramos', 12.5],
      ['ochenta kilos', 80],
      ['un kilo', 1],
      ['ciento veinte kilos', 120],
      ['treinta y cinco kilos', 35],
      ['doscientos cincuenta kilos', 250],
      ['quinientos kg', 500],
    ])('"%s" → %d kg', (frase, peso) => {
      expect(interpretarDictado(frase).pesoKg).toBe(peso);
    });
  });

  describe('horas sin frío', () => {
    it.each([
      ['con 2 horas sin frío', 2],
      ['3 horas de retraso', 3],
      ['llegó con 4 h fuera de cámara', 4],
      ['seis horas al calor', 6],
      ['media hora sin frío', 0.5],
      ['una hora sin refrigeración', 1],
    ])('"%s" → %d h', (frase, horas) => {
      expect(interpretarDictado(frase).horasSinFrio).toBe(horas);
    });

    it('no confunde horas sin mención de calor', () => {
      expect(interpretarDictado('80 kilos de pollo hace 2 horas').horasSinFrio).toBeUndefined();
    });
  });

  describe('precio', () => {
    it.each([
      ['a 15 soles el kilo', 15],
      ['precio de 12,50 soles', 12.5],
      ['a veinte soles', 20],
    ])('"%s" → S/ %d', (frase, precio) => {
      expect(interpretarDictado(frase).precioKg).toBe(precio);
    });
  });

  describe('cámara', () => {
    it.each([
      ['a cámara 1', 'camara1'],
      ['a la camara uno', 'camara1'],
      ['a cámara 2', 'camara2'],
      ['a cámara dos', 'camara2'],
      ['al almacén', 'almacen'],
    ])('"%s" → %s', (frase, camara) => {
      expect(interpretarDictado(frase).camaraId).toBe(camara);
    });
  });

  describe('producto', () => {
    it.each([
      ['paiche', 'pescado'],
      ['Gamitana', 'pescado'],
      ['pollo beneficiado', 'pollo'],
      ['lomo', 'res'],
      ['carne de res', 'res'],
      ['queso fresco', 'queso'],
      ['lácteos', 'queso'],
      ['camu camu', 'camu'],
      ['aguajes', 'aguaje'],
      ['cocona', 'cocona'],
      ['plátano bellaco', 'platano'],
    ])('"%s" → %s', (frase, id) => {
      expect(interpretarDictado(frase).productoId).toBe(id);
    });

    it('no detecta "res" dentro de otra palabra', () => {
      expect(interpretarDictado('tres cajas').productoId).toBeUndefined();
    });
  });
});
