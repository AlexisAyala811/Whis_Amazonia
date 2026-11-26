import { getProducto } from '../data/catalog';
import type { FefoResultado, Lote, Semaforo } from '../types';

const MS_HORA = 3_600_000;

/** Horas transcurridas desde el ingreso del lote a cámara */
export const horasDesde = (iso: string, ahora: number = Date.now()): number =>
  Math.max(0, (ahora - new Date(iso).getTime()) / MS_HORA);

export const clasificar = (porcentaje: number): Semaforo => {
  if (porcentaje > 50) return 'verde';
  if (porcentaje >= 20) return 'amarillo';
  return 'rojo';
};

/**
 * Motor FEFO térmico.
 *   horasEquivalentesConsumidas = horasEnFrio + horasExposicionCalor × factorRiesgoCalor
 *   horasRestantes = max(0, vidaBase − horasEquivalentesConsumidas)
 *   porcentajeVidaUtil = round(horasRestantes / vidaBase × 100)
 */
export const calcularFefo = (lote: Lote, ahora: number = Date.now()): FefoResultado => {
  const p = getProducto(lote.productoId);
  const horasTranscurridas = horasDesde(lote.fechaIngreso, ahora);
  const horasEquivalentesConsumidas = horasTranscurridas + lote.horasExposicionCalor * p.factorRiesgoCalor;
  const horasRestantes = Math.max(0, p.vidaBaseHoras - horasEquivalentesConsumidas);
  const porcentajeVidaUtil = Math.round((horasRestantes / p.vidaBaseHoras) * 100);
  return {
    horasTranscurridas,
    horasEquivalentesConsumidas,
    horasRestantes,
    porcentajeVidaUtil,
    semaforo: clasificar(porcentajeVidaUtil),
    valorComercial: lote.pesoKg * lote.precioVentaKg,
  };
};

export interface LoteFefo extends Lote {
  fefo: FefoResultado;
}

/** Lotes activos con su cálculo FEFO, ordenados por menor vida restante */
export const ordenarFefo = (lotes: Lote[], ahora: number = Date.now()): LoteFefo[] =>
  lotes
    .filter((l) => l.estado === 'activo' && l.pesoKg > 0)
    .map((l) => ({ ...l, fefo: calcularFefo(l, ahora) }))
    .sort((a, b) => a.fefo.horasRestantes - b.fefo.horasRestantes);

/** Horas de exposición (en calor) necesarias para llegar a un porcentaje objetivo */
export const exposicionParaPorcentaje = (
  productoId: string,
  horasTranscurridas: number,
  porcentajeObjetivo: number,
): number => {
  const p = getProducto(productoId);
  const consumidas = p.vidaBaseHoras * (1 - porcentajeObjetivo / 100);
  return Math.max(0, (consumidas - horasTranscurridas) / p.factorRiesgoCalor);
};

// ---------- Formateadores ----------

const fmtSoles = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtSolesCorto = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });

export const soles = (n: number): string => `S/ ${fmtSoles.format(n)}`;
export const solesCorto = (n: number): string => `S/ ${fmtSolesCorto.format(Math.round(n))}`;

export const kg = (n: number): string =>
  `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(n)} kg`;

export const formatoHoras = (h: number): string => {
  if (h <= 0) return 'Vencido';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.floor(h)} h ${Math.round((h % 1) * 60)
    .toString()
    .padStart(2, '0')} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${Math.round(h - d * 24)} h`;
};

export const formatoFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatoHora = (d: Date): string =>
  d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

export const SEMAFORO_INFO: Record<Semaforo, { etiqueta: string; accion: string; texto: string; fondo: string; barra: string }> = {
  verde: {
    etiqueta: 'Óptimo',
    accion: 'Despacho normal',
    texto: 'text-ok',
    fondo: 'bg-ok/15',
    barra: 'bg-ok',
  },
  amarillo: {
    etiqueta: 'Prioritario',
    accion: 'Despachar hoy',
    texto: 'text-warn',
    fondo: 'bg-warn/15',
    barra: 'bg-warn',
  },
  rojo: {
    etiqueta: 'Crítico',
    accion: 'Liquidar ya',
    texto: 'text-danger',
    fondo: 'bg-danger/15',
    barra: 'bg-danger',
  },
};

export const uid = (prefijo = 'id'): string =>
  `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
