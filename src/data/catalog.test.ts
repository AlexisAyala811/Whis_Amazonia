import { afterEach, describe, expect, it } from 'vitest';
import type { Producto } from '../types';
import { calcularFefo } from '../utils/fefoEngine';
import { validarYMigrar } from '../utils/persistencia';
import { interpretarDictado } from '../utils/voiceParser';
import { CATALOGO, camaraSugerida, clavesDesdeNombre, getCatalogo, getProducto, usarCatalogo } from './catalog';

const doncella: Producto = {
  id: 'prod_doncella',
  nombre: 'Doncella fresca',
  nombreCorto: 'Doncella fresca',
  categoria: 'pescados',
  vidaBaseHoras: 48,
  tempMin: 0,
  tempMax: 4,
  factorRiesgoCalor: 4,
  costoRefKg: 20,
  claves: clavesDesdeNombre('Doncella fresca'),
};

afterEach(() => {
  usarCatalogo(undefined);
});

describe('catálogo editable', () => {
  it('sin catálogo propio usa el base', () => {
    expect(usarCatalogo(undefined)).toBe(CATALOGO);
    expect(usarCatalogo([])).toBe(CATALOGO);
  });

  it('usa los productos del negocio y conserva los del catálogo base como respaldo', () => {
    usarCatalogo([doncella]);
    expect(getCatalogo()).toEqual([doncella]);
    expect(getProducto('prod_doncella').nombreCorto).toBe('Doncella fresca');
    // Un lote antiguo con un id del catálogo base sigue resolviendo bien
    expect(getProducto('pollo').nombreCorto).toBe('Pollo entero');
  });

  it('el motor FEFO usa la vida útil del producto propio', () => {
    usarCatalogo([doncella]);
    const ahora = Date.now();
    const r = calcularFefo(
      {
        id: 'l1',
        codigoQR: 'J-1',
        productoId: 'prod_doncella',
        camaraId: 'camara1',
        pesoInicialKg: 10,
        pesoKg: 10,
        costoKg: 20,
        precioVentaKg: 27,
        fechaIngreso: new Date(ahora - 24 * 3_600_000).toISOString(),
        horasExposicionCalor: 0,
        condicionLlegada: 'optimo',
        estado: 'activo',
      },
      ahora,
    );
    expect(r.porcentajeVidaUtil).toBe(50);
  });

  it('sugiere cámara por tipo y temperatura', () => {
    usarCatalogo([doncella, { ...doncella, id: 'yuca', categoria: 'otros', tempMin: 13, tempMax: 16 }]);
    expect(camaraSugerida('prod_doncella')).toBe('camara1');
    expect(camaraSugerida('yuca')).toBe('almacen');
    usarCatalogo(undefined);
    expect(camaraSugerida('platano')).toBe('almacen');
    expect(camaraSugerida('cocona')).toBe('camara2');
  });

  it('arma palabras clave sin tildes y con plural', () => {
    expect(clavesDesdeNombre('Plátano Isla')).toEqual(expect.arrayContaining(['platano', 'platanos', 'isla', 'islas']));
  });

  it('el dictado reconoce un producto propio', () => {
    usarCatalogo([...CATALOGO, doncella]);
    expect(interpretarDictado('Ingresan 30 kilos de doncella a cámara 1').productoId).toBe('prod_doncella');
  });
});

describe('respaldo con productos', () => {
  const base = { version: 1, modo: 'real', lotes: [] };

  it('acepta un respaldo con catálogo propio', () => {
    const r = validarYMigrar({ ...base, productos: [doncella] });
    expect(r.ok && r.data.productos?.[0].id).toBe('prod_doncella');
  });

  it('rechaza un catálogo dañado', () => {
    const r = validarYMigrar({ ...base, productos: [{ id: 'x' }] });
    expect(r.ok).toBe(false);
  });
});
