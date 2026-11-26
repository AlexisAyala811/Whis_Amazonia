export type Semaforo = 'verde' | 'amarillo' | 'rojo';

export type CategoriaProducto = 'carnes' | 'pescados' | 'lacteos' | 'frutas';

export interface Producto {
  id: string;
  nombre: string;
  nombreCorto: string;
  categoria: CategoriaProducto;
  /** Horas de vida útil en refrigeración óptima */
  vidaBaseHoras: number;
  /** Rango térmico ideal (°C) */
  tempMin: number;
  tempMax: number;
  /** Multiplicador de deterioro fuera de rango térmico */
  factorRiesgoCalor: number;
  /** Costo de referencia por kg (S/) */
  costoRefKg: number;
  /** Palabras clave para el dictado por voz */
  claves: string[];
}

export type CamaraId = 'camara1' | 'camara2' | 'almacen';

export interface Camara {
  id: CamaraId;
  nombre: string;
  descripcion: string;
  tempObjetivo: string;
}

export type CondicionLlegada = 'optimo' | 'retraso3' | 'sinfrio6';

export type EstadoLote = 'activo' | 'despachado' | 'liquidado' | 'baja';

export interface Lote {
  id: string;
  codigoQR: string;
  productoId: string;
  camaraId: CamaraId;
  pesoInicialKg: number;
  pesoKg: number;
  costoKg: number;
  precioVentaKg: number;
  /** ISO 8601 */
  fechaIngreso: string;
  /** Horas acumuladas fuera del rango térmico (llegada + apagones) */
  horasExposicionCalor: number;
  /**
   * Parte de horasExposicionCalor que ocurrió con el lote ya en cámara (apagones).
   * Esas horas ya corren en el reloj desde fechaIngreso, así que el motor no las
   * cuenta además como tiempo en frío.
   */
  horasApagonEnCamara?: number;
  condicionLlegada: CondicionLlegada;
  estado: EstadoLote;
}

export interface EventoTermico {
  id: string;
  fecha: string;
  camaraIds: CamaraId[];
  horas: number;
  lotesAfectados: number;
  pasaronAAmarillo: number;
  pasaronARojo: number;
  nota?: string;
}

export interface CompradorB2B {
  id: string;
  nombre: string;
  rubro: string;
  /** Formato internacional sin "+", ej. 51987654321 */
  telefono: string;
}

export type MotivoBaja = 'corte_luz' | 'retraso_flete' | 'golpeado' | 'vencimiento';

export interface BajaMerma {
  id: string;
  loteId: string;
  codigoQR: string;
  productoId: string;
  fecha: string;
  motivo: MotivoBaja;
  pesoKg: number;
  valorPerdido: number;
  /** Foto de evidencia comprimida (data URL JPEG) */
  fotoEvidencia: string;
}

export interface Liquidacion {
  id: string;
  loteId: string;
  codigoQR: string;
  productoId: string;
  fecha: string;
  pesoKg: number;
  precioNormalKg: number;
  descuentoPct: number;
  precioRemateKg: number;
  total: number;
  compradorId: string;
}

export interface Despacho {
  id: string;
  loteId: string;
  fecha: string;
  pesoKg: number;
  total: number;
}

export interface ResumenSemanal {
  semana: string;
  recuperado: number;
  perdido: number;
}

export type ModoDatos = 'demo' | 'real';

export interface AppData {
  version: number;
  /** 'demo' = datos de ejemplo; 'real' = datos del negocio */
  modo: ModoDatos;
  lotes: Lote[];
  eventos: EventoTermico[];
  compradores: CompradorB2B[];
  bajas: BajaMerma[];
  liquidaciones: Liquidacion[];
  despachos: Despacho[];
  historialSemanal: ResumenSemanal[];
}

export interface FefoResultado {
  horasTranscurridas: number;
  horasEquivalentesConsumidas: number;
  horasRestantes: number;
  porcentajeVidaUtil: number;
  semaforo: Semaforo;
  valorComercial: number;
}

export type Vista = 'inicio' | 'lotes' | 'frio' | 'liquidar';
