import { describe, expect, it } from 'vitest';
import { CATALOGO } from '../data/catalog';
import { FOTOS_REALES, fotoDeProducto, fotoReal } from './fotosReales';

describe('fotos reales', () => {
  it('asigna foto a los productos amazónicos del catálogo', () => {
    const con = CATALOGO.filter((p) => fotoReal(p)).map((p) => p.id);
    expect(con).toEqual(expect.arrayContaining(['camu', 'aguaje', 'cocona', 'pescado', 'platano']));
  });
  it('no inventa foto para productos sin una', () => {
    expect(fotoReal({ id: 'x', nombre: 'Queso fresco' })).toBeNull();
  });
  it('la foto subida por la persona tiene prioridad', () => {
    expect(fotoDeProducto({ id: 'camu', nombre: 'Camu', foto: 'data:image/jpeg;base64,AA' })).toMatch(/^data:/);
  });
  it('cada foto tiene autor, licencia y fuente', () => {
    for (const f of FOTOS_REALES) expect(f.autor && f.licencia && f.fuente.startsWith('https://')).toBeTruthy();
  });
});
