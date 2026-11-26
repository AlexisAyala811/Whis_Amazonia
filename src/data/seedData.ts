import type { AppData, CamaraId, CompradorB2B, CondicionLlegada, EventoTermico, Lote, ResumenSemanal } from '../types';
import { MARGEN_VENTA, getProducto } from './catalog';
import { exposicionParaPorcentaje } from '../utils/fefoEngine';

export const DATA_VERSION = 1;

const MS_HORA = 3_600_000;

interface SemillaLote {
  codigo: string;
  productoId: string;
  camaraId: CamaraId;
  pesoKg: number;
  condicion: CondicionLlegada;
  horasEnCamara: number;
  /** Porcentaje de vida útil con el que debe arrancar la demo */
  porcentajeObjetivo: number;
}

// 2 rojos, 3 amarillos, 3 verdes
const SEMILLAS: SemillaLote[] = [
  { codigo: 'J-096', productoId: 'pescado', camaraId: 'camara1', pesoKg: 45, condicion: 'sinfrio6', horasEnCamara: 30, porcentajeObjetivo: 12 },
  { codigo: 'J-097', productoId: 'camu', camaraId: 'camara2', pesoKg: 60, condicion: 'sinfrio6', horasEnCamara: 50, porcentajeObjetivo: 15 },
  { codigo: 'J-098', productoId: 'pollo', camaraId: 'camara1', pesoKg: 80, condicion: 'retraso3', horasEnCamara: 40, porcentajeObjetivo: 38 },
  { codigo: 'J-099', productoId: 'queso', camaraId: 'camara2', pesoKg: 35, condicion: 'retraso3', horasEnCamara: 70, porcentajeObjetivo: 42 },
  { codigo: 'J-100', productoId: 'aguaje', camaraId: 'camara2', pesoKg: 120, condicion: 'sinfrio6', horasEnCamara: 50, porcentajeObjetivo: 30 },
  { codigo: 'J-101', productoId: 'res', camaraId: 'camara1', pesoKg: 95, condicion: 'retraso3', horasEnCamara: 20, porcentajeObjetivo: 78 },
  { codigo: 'J-102', productoId: 'cocona', camaraId: 'camara2', pesoKg: 70, condicion: 'retraso3', horasEnCamara: 24, porcentajeObjetivo: 74 },
  { codigo: 'J-103', productoId: 'platano', camaraId: 'almacen', pesoKg: 250, condicion: 'optimo', horasEnCamara: 30, porcentajeObjetivo: 80 },
];

const redondear = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Teléfonos de ejemplo (formato 51 + 9 dígitos). Reemplázalos por los
 * números reales de tus compradores antes de usar la app en producción.
 */
export const COMPRADORES_SEMILLA: CompradorB2B[] = [
  { id: 'cmp_bosque', nombre: 'Pollería El Bosque', rubro: 'Pollería · Pucallpa', telefono: '51900000001' },
  { id: 'cmp_juguera', nombre: 'Juguería Amazónica', rubro: 'Jugos y pulpas · Iquitos', telefono: '51900000002' },
  { id: 'cmp_comedor', nombre: 'Comedor Industrial Ucayali', rubro: 'Comedor de planta · Ucayali', telefono: '51900000003' },
  { id: 'cmp_pulpas', nombre: 'Planta de Pulpas Selva Viva', rubro: 'Agroindustria · Tarapoto', telefono: '51900000004' },
];

const HISTORIAL: ResumenSemanal[] = [
  { semana: 'Sem -5', recuperado: 820, perdido: 2140 },
  { semana: 'Sem -4', recuperado: 1240, perdido: 1810 },
  { semana: 'Sem -3', recuperado: 1680, perdido: 1320 },
  { semana: 'Sem -2', recuperado: 2050, perdido: 980 },
  { semana: 'Sem -1', recuperado: 2430, perdido: 720 },
];

export const crearDatosSemilla = (ahora: number = Date.now()): AppData => {
  const lotes: Lote[] = SEMILLAS.map((s, i) => {
    const p = getProducto(s.productoId);
    const costoKg = p.costoRefKg;
    return {
      id: `lote_seed_${i + 1}`,
      codigoQR: s.codigo,
      productoId: s.productoId,
      camaraId: s.camaraId,
      pesoInicialKg: s.pesoKg,
      pesoKg: s.pesoKg,
      costoKg,
      precioVentaKg: redondear(costoKg * MARGEN_VENTA, 1),
      fechaIngreso: new Date(ahora - s.horasEnCamara * MS_HORA).toISOString(),
      horasExposicionCalor: redondear(exposicionParaPorcentaje(s.productoId, s.horasEnCamara, s.porcentajeObjetivo), 1),
      condicionLlegada: s.condicion,
      estado: 'activo',
    };
  });

  const eventos: EventoTermico[] = [
    {
      id: 'evt_seed_1',
      fecha: new Date(ahora - 52 * MS_HORA).toISOString(),
      camaraIds: ['camara2'],
      horas: 4,
      lotesAfectados: 3,
      pasaronAAmarillo: 2,
      pasaronARojo: 0,
      nota: 'Corte programado de Electro Oriente, grupo electrógeno no arrancó.',
    },
    {
      id: 'evt_seed_2',
      fecha: new Date(ahora - 26 * MS_HORA).toISOString(),
      camaraIds: ['camara1'],
      horas: 2,
      lotesAfectados: 2,
      pasaronAAmarillo: 1,
      pasaronARojo: 1,
      nota: 'Falla del compresor de Cámara 1 por sobrecalentamiento.',
    },
  ];

  return {
    version: DATA_VERSION,
    lotes,
    eventos,
    compradores: COMPRADORES_SEMILLA,
    bajas: [],
    liquidaciones: [],
    despachos: [],
    historialSemanal: HISTORIAL,
  };
};
