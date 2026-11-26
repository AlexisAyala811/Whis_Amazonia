import { DATA_VERSION, crearDatosSemilla, crearDatosVacios } from '../data/seedData';
import type { AppData } from '../types';
import { sanearGamificacion } from './logros';

export const STORAGE_KEY = 'whis-amazonia:data';
/** Copia intacta de datos que no se pudieron abrir, para no perderlos nunca. */
export const RECUPERACION_KEY = 'whis-amazonia:recuperacion';
const RESPALDO_KEY = 'whis-amazonia:ultimo-respaldo';

const LISTAS = ['lotes', 'eventos', 'compradores', 'bajas', 'liquidaciones', 'despachos', 'historialSemanal'] as const;

export type ResultadoValidacion = { ok: true; data: AppData } | { ok: false; motivo: string };

/**
 * Revisa que un objeto tenga la forma de AppData y lo lleva a la versión actual.
 * Nunca inventa datos: si algo no cuadra, lo rechaza con un motivo legible.
 */
export function validarYMigrar(entrada: unknown): ResultadoValidacion {
  if (!entrada || typeof entrada !== 'object') return { ok: false, motivo: 'El archivo no contiene datos de Whis.' };
  const obj = entrada as Record<string, unknown>;
  const version = typeof obj.version === 'number' ? obj.version : NaN;
  if (!Number.isFinite(version)) return { ok: false, motivo: 'El archivo no indica su versión.' };
  if (version > DATA_VERSION) {
    return { ok: false, motivo: `Los datos son de una versión más nueva de la app (v${version}). Actualiza la app.` };
  }
  if (!Array.isArray(obj.lotes)) return { ok: false, motivo: 'El archivo no tiene la lista de lotes.' };

  // Migraciones: cuando DATA_VERSION suba, agregar aquí un paso por versión (v1 → v2, …).
  const data = { ...obj } as Record<string, unknown>;
  for (const k of LISTAS) {
    if (data[k] === undefined) data[k] = [];
    if (!Array.isArray(data[k])) return { ok: false, motivo: `La sección "${k}" está dañada.` };
  }
  if (data.productos !== undefined) {
    const ok =
      Array.isArray(data.productos) &&
      (data.productos as Record<string, unknown>[]).every(
        (p) =>
          p &&
          typeof p.id === 'string' &&
          typeof p.nombreCorto === 'string' &&
          typeof p.vidaBaseHoras === 'number' &&
          p.vidaBaseHoras > 0 &&
          typeof p.factorRiesgoCalor === 'number' &&
          Array.isArray(p.claves),
      );
    if (!ok) return { ok: false, motivo: 'La sección "productos" está dañada.' };
  }
  sanearGamificacion(data);
  if (data.modo !== 'demo' && data.modo !== 'real') {
    // Datos creados antes de existir el modo: si conservan los lotes semilla, eran demo.
    data.modo = (data.lotes as { id?: string }[]).some((l) => l?.id?.startsWith('lote_seed_')) ? 'demo' : 'real';
  }
  data.version = DATA_VERSION;
  return { ok: true, data: data as unknown as AppData };
}

export type Carga =
  | { tipo: 'primeraVez'; data: AppData }
  | { tipo: 'ok'; data: AppData }
  /** Había datos pero no se pudieron abrir: se guardaron aparte y no se sobrescriben. */
  | { tipo: 'recuperacion'; data: AppData; motivo: string; copiaGuardada: boolean };

export function cargar(): Carga {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { tipo: 'primeraVez', data: crearDatosSemilla() };
  }
  if (!raw) return { tipo: 'primeraVez', data: crearDatosSemilla() };

  let motivo: string;
  try {
    const r = validarYMigrar(JSON.parse(raw));
    if (r.ok) return { tipo: 'ok', data: r.data };
    motivo = r.motivo;
  } catch {
    motivo = 'Los datos guardados están dañados.';
  }

  let copiaGuardada = false;
  try {
    if (!localStorage.getItem(RECUPERACION_KEY)) localStorage.setItem(RECUPERACION_KEY, raw);
    copiaGuardada = localStorage.getItem(RECUPERACION_KEY) === raw;
  } catch {
    copiaGuardada = false;
  }
  return { tipo: 'recuperacion', data: crearDatosVacios(), motivo, copiaGuardada };
}

export function guardar(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function leerRecuperacion(): string | null {
  try {
    return localStorage.getItem(RECUPERACION_KEY);
  } catch {
    return null;
  }
}

export function borrarRecuperacion() {
  try {
    localStorage.removeItem(RECUPERACION_KEY);
  } catch {
    /* sin acceso al almacenamiento */
  }
}

export function marcarRespaldo() {
  try {
    localStorage.setItem(RESPALDO_KEY, new Date().toISOString());
  } catch {
    /* sin acceso al almacenamiento */
  }
}

/** Días desde el último respaldo JSON exportado o importado; null si nunca se hizo. */
export function diasDesdeRespaldo(ahora = Date.now()): number | null {
  try {
    const v = localStorage.getItem(RESPALDO_KEY);
    if (!v) return null;
    return Math.floor((ahora - new Date(v).getTime()) / 86_400_000);
  } catch {
    return null;
  }
}

/** Pide al navegador que no borre los datos de la app cuando falte espacio. */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
