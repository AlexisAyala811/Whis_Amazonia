import type { Producto } from '../types';

/**
 * Fotos reales de productos, guardadas dentro de la app (public/productos) para que
 * funcionen sin internet. Vienen del archivo abierto de iNaturalist con licencias
 * Creative Commons que permiten su uso con atribución.
 */
export interface FotoReal {
  clave: string;
  archivo: string;
  titulo: string;
  autor: string;
  licencia: 'CC BY 4.0' | 'CC BY-SA 4.0';
  fuente: string;
}

export const FOTOS_REALES: FotoReal[] = [
  { clave: 'camu', archivo: 'camu.webp', titulo: 'Camu camu (Myrciaria dubia)', autor: 'Vincent A. Vos', licencia: 'CC BY 4.0', fuente: 'https://www.inaturalist.org/photos/126032503' },
  { clave: 'aguaje', archivo: 'aguaje.webp', titulo: 'Aguaje (Mauritia flexuosa)', autor: 'German Leonel Sarmiento Cruz', licencia: 'CC BY 4.0', fuente: 'https://www.inaturalist.org/photos/27086495' },
  { clave: 'cocona', archivo: 'cocona.webp', titulo: 'Cocona (Solanum sessiliflorum)', autor: 'Wendrio S. de Melo', licencia: 'CC BY 4.0', fuente: 'https://www.inaturalist.org/photos/425371929' },
  { clave: 'pescado', archivo: 'pescado.webp', titulo: 'Gamitana (Colossoma macropomum)', autor: 'Diogo Luiz', licencia: 'CC BY 4.0', fuente: 'https://www.inaturalist.org/photos/179491213' },
  { clave: 'platano', archivo: 'platano.webp', titulo: 'Racimo de plátano (Musa acuminata)', autor: 'Ong Jyh Seng', licencia: 'CC BY-SA 4.0', fuente: 'https://www.inaturalist.org/photos/26818770' },
];

const REGLAS: [RegExp, string][] = [
  [/camu/, 'camu'],
  [/aguaje/, 'aguaje'],
  [/cocona/, 'cocona'],
  [/pescado|paiche|gamitana|tambaqui/, 'pescado'],
  [/pl[aá]tano|bellaco/, 'platano'],
];

/** Ruta de la foto real del producto, o null si no hay una (se usa el emoji). */
export function fotoReal(p: Pick<Producto, 'id' | 'nombre'>): string | null {
  const n = `${p.id} ${p.nombre}`.toLowerCase();
  const regla = REGLAS.find(([re]) => re.test(n));
  if (!regla) return null;
  const f = FOTOS_REALES.find((x) => x.clave === regla[1]);
  return f ? `${import.meta.env.BASE_URL}productos/${f.archivo}` : null;
}

/** Foto que se muestra: la que subió la persona o, si no hay, la foto real incluida. */
export const fotoDeProducto = (p: Pick<Producto, 'id' | 'nombre' | 'foto'>): string | null => p.foto ?? fotoReal(p);
