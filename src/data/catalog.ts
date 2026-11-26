import type { Camara, CamaraId, CategoriaProducto, CondicionLlegada, MotivoBaja, Producto } from '../types';

export const CATALOGO: Producto[] = [
  {
    id: 'pescado',
    nombre: 'Pescado fresco (Paiche / Gamitana)',
    nombreCorto: 'Pescado fresco',
    categoria: 'pescados',
    vidaBaseHoras: 72,
    tempMin: 0,
    tempMax: 4,
    factorRiesgoCalor: 4.0,
    costoRefKg: 18,
    claves: ['pescado', 'paiche', 'gamitana', 'pescados'],
  },
  {
    id: 'pollo',
    nombre: 'Pollo entero / beneficiado',
    nombreCorto: 'Pollo entero',
    categoria: 'carnes',
    vidaBaseHoras: 96,
    tempMin: 0,
    tempMax: 4,
    factorRiesgoCalor: 3.8,
    costoRefKg: 9.5,
    claves: ['pollo', 'pollos', 'beneficiado', 'gallina'],
  },
  {
    id: 'res',
    nombre: 'Carne de res fresca',
    nombreCorto: 'Carne de res',
    categoria: 'carnes',
    vidaBaseHoras: 144,
    tempMin: 0,
    tempMax: 4,
    factorRiesgoCalor: 3.0,
    costoRefKg: 26,
    claves: ['res', 'carne', 'vacuno', 'lomo'],
  },
  {
    id: 'queso',
    nombre: 'Queso fresco / Lácteos',
    nombreCorto: 'Queso fresco',
    categoria: 'lacteos',
    vidaBaseHoras: 168,
    tempMin: 2,
    tempMax: 6,
    factorRiesgoCalor: 2.8,
    costoRefKg: 16,
    claves: ['queso', 'quesos', 'lacteo', 'lacteos', 'leche', 'yogur'],
  },
  {
    id: 'camu',
    nombre: 'Camu Camu fresco',
    nombreCorto: 'Camu camu',
    categoria: 'frutas',
    vidaBaseHoras: 96,
    tempMin: 8,
    tempMax: 12,
    factorRiesgoCalor: 2.5,
    costoRefKg: 7,
    claves: ['camu', 'camucamu'],
  },
  {
    id: 'aguaje',
    nombre: 'Aguaje fresco',
    nombreCorto: 'Aguaje',
    categoria: 'frutas',
    vidaBaseHoras: 120,
    tempMin: 10,
    tempMax: 14,
    factorRiesgoCalor: 2.2,
    costoRefKg: 4.5,
    claves: ['aguaje', 'aguajes'],
  },
  {
    id: 'cocona',
    nombre: 'Cocona / Frutas nativas',
    nombreCorto: 'Cocona',
    categoria: 'frutas',
    vidaBaseHoras: 144,
    tempMin: 10,
    tempMax: 14,
    factorRiesgoCalor: 2.0,
    costoRefKg: 3.8,
    claves: ['cocona', 'coconas', 'fruta', 'frutas', 'nativa', 'nativas'],
  },
  {
    id: 'platano',
    nombre: 'Plátano bellaco (maduración controlada)',
    nombreCorto: 'Plátano bellaco',
    categoria: 'frutas',
    vidaBaseHoras: 168,
    tempMin: 13,
    tempMax: 15,
    factorRiesgoCalor: 1.8,
    costoRefKg: 2.2,
    claves: ['platano', 'platanos', 'bellaco', 'bellacos'],
  },
];

export const CAMARAS: Camara[] = [
  { id: 'camara1', nombre: 'Cámara 1 - Carnes', descripcion: 'Carnes, pollo y pescado', tempObjetivo: '0–4 °C' },
  { id: 'camara2', nombre: 'Cámara 2 - Frutas', descripcion: 'Frutas amazónicas y lácteos', tempObjetivo: '2–14 °C' },
  { id: 'almacen', nombre: 'Almacén Fresco', descripcion: 'Plátano y maduración controlada', tempObjetivo: '13–15 °C' },
];

export const CONDICIONES: { id: CondicionLlegada; nombre: string; detalle: string; horas: number }[] = [
  { id: 'optimo', nombre: 'Frío Óptimo', detalle: 'Llegó dentro del rango térmico', horas: 0 },
  { id: 'retraso3', nombre: 'Retraso leve +3h', detalle: 'Suma 3 h de exposición al calor', horas: 3 },
  { id: 'sinfrio6', nombre: 'Sin frío +6h', detalle: 'Suma 6 h de exposición al calor', horas: 6 },
];

export const MOTIVOS_BAJA: { id: MotivoBaja; nombre: string; detalle: string }[] = [
  { id: 'corte_luz', nombre: 'Corte de luz', detalle: 'Apagón o falla del equipo de frío' },
  { id: 'retraso_flete', nombre: 'Retraso de flete', detalle: 'El transporte llegó tarde o sin frío' },
  { id: 'golpeado', nombre: 'Producto golpeado', detalle: 'Daño físico en carga o descarga' },
  { id: 'vencimiento', nombre: 'Vencimiento', detalle: 'Se agotó la vida útil' },
];

/** Margen comercial por defecto sobre el costo */
export const MARGEN_VENTA = 1.35;

// ---------- Catálogo activo (editable por el negocio) ----------

let catalogoActivo: Producto[] = CATALOGO;

/** Productos que usa la app ahora: los del negocio o, si no hay, el catálogo base. */
export const getCatalogo = (): Producto[] => catalogoActivo;

/** Fija el catálogo activo. Sin lista (o vacía) vuelve al catálogo base. */
export const usarCatalogo = (lista?: Producto[]): Producto[] => {
  catalogoActivo = lista && lista.length > 0 ? lista : CATALOGO;
  return catalogoActivo;
};

export const getProducto = (id: string): Producto =>
  catalogoActivo.find((p) => p.id === id) ?? CATALOGO.find((p) => p.id === id) ?? catalogoActivo[0] ?? CATALOGO[0];

export const CATEGORIAS: { id: CategoriaProducto; nombre: string }[] = [
  { id: 'carnes', nombre: 'Carnes' },
  { id: 'pescados', nombre: 'Pescados' },
  { id: 'lacteos', nombre: 'Lácteos' },
  { id: 'frutas', nombre: 'Frutas' },
  { id: 'otros', nombre: 'Otros' },
];

/** Qué tan rápido se malogra fuera del frío: multiplica las horas de calor. */
export const SENSIBILIDADES: { factor: number; nombre: string; detalle: string }[] = [
  { factor: 1.8, nombre: 'Baja', detalle: 'Aguanta el calor (plátano, tubérculos)' },
  { factor: 2.5, nombre: 'Media', detalle: 'Frutas y lácteos' },
  { factor: 3.2, nombre: 'Alta', detalle: 'Carnes rojas' },
  { factor: 4.0, nombre: 'Muy alta', detalle: 'Pescado y pollo' },
];

export const sensibilidadCercana = (factor: number) =>
  SENSIBILIDADES.reduce((a, b) => (Math.abs(b.factor - factor) < Math.abs(a.factor - factor) ? b : a));

/** Minúsculas, sin tildes ni signos: para comparar nombres y palabras dictadas. */
export const normalizarTexto = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Palabras clave para reconocer el producto al dictar por voz. */
export const clavesDesdeNombre = (nombre: string): string[] => {
  const palabras = normalizarTexto(nombre)
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !['del', 'los', 'las', 'con', 'para'].includes(w));
  const claves = new Set<string>();
  for (const w of palabras) {
    claves.add(w);
    claves.add(w.endsWith('s') ? w.slice(0, -1) : `${w}s`);
  }
  return [...claves];
};

export const getCamara = (id: CamaraId): Camara => CAMARAS.find((c) => c.id === id) ?? CAMARAS[0];

/** Cámara sugerida según el tipo de producto */
export const camaraSugerida = (productoId: string): CamaraId => {
  const p = getProducto(productoId);
  if (p.categoria === 'carnes' || p.categoria === 'pescados') return 'camara1';
  // Productos que se guardan sobre 13 °C (plátano, maduración controlada)
  if (p.tempMin >= 13) return 'almacen';
  return 'camara2';
};
