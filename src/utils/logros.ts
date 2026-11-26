import type { AppData } from '../types';

/**
 * Metas, rachas y logros. Todo se calcula a partir de los registros reales
 * (liquidaciones, bajas, lotes), así funciona sin internet, viaja en el
 * respaldo JSON y se corrige solo si se deshace una acción.
 */

export const META_DIARIA_DEFECTO = 500;
export const METAS_SUGERIDAS = [200, 500, 1000, 2000];

/** Fecha local "AAAA-MM-DD" (los días cortan a medianoche del celular, no en UTC) */
export const diaLocal = (t: number | string | Date): string => {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
};

/** Medianoche local del día de t */
const inicioDia = (t: number): number => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Suma o resta días respetando la hora local (evita saltos por horario de verano) */
const moverDias = (t: number, n: number): number => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

export const metaDiaria = (data: AppData): number => {
  const m = data.metas?.rescateDiarioSoles;
  return typeof m === 'number' && m > 0 ? m : META_DIARIA_DEFECTO;
};

export interface DiaResumen {
  dia: string;
  rescatado: number;
  kg: number;
  remates: number;
  merma: number;
  bajas: number;
}

export interface Progreso {
  meta: number;
  hoy: DiaResumen & { pct: number; cumplida: boolean };
  /** Días seguidos sin bajas por merma, contando hoy */
  racha: number;
  mejorRacha: number;
  /** Últimos 7 días, del más antiguo a hoy */
  semana: (DiaResumen & { cumplida: boolean; activo: boolean })[];
  /** % del valor que se rescató vs. se perdió en los últimos 7 días (null si no hubo nada) */
  aprovechamiento: number | null;
  totalKg: number;
  totalSoles: number;
  remates: number;
  rematesTempranos: number;
  diasMetaCumplida: number;
}

/** Descuento máximo para que un remate cuente como "a tiempo" */
export const DESCUENTO_TEMPRANO = 25;

const vacio = (dia: string): DiaResumen => ({ dia, rescatado: 0, kg: 0, remates: 0, merma: 0, bajas: 0 });

export function calcularProgreso(data: AppData, ahora: number): Progreso {
  const meta = metaDiaria(data);
  const porDia = new Map<string, DiaResumen>();
  const de = (dia: string) => {
    let r = porDia.get(dia);
    if (!r) porDia.set(dia, (r = vacio(dia)));
    return r;
  };

  let totalKg = 0;
  let totalSoles = 0;
  let rematesTempranos = 0;
  for (const q of data.liquidaciones) {
    const r = de(diaLocal(q.fecha));
    r.rescatado += q.total;
    r.kg += q.pesoKg;
    r.remates++;
    totalKg += q.pesoKg;
    totalSoles += q.total;
    if (q.descuentoPct <= DESCUENTO_TEMPRANO) rematesTempranos++;
  }
  for (const b of data.bajas) {
    const r = de(diaLocal(b.fecha));
    r.merma += b.valorPerdido;
    r.bajas++;
  }

  // La racha empieza el día del primer registro: sin datos no hay racha que contar
  const fechas = [
    ...data.lotes.map((l) => l.fechaIngreso),
    ...data.liquidaciones.map((q) => q.fecha),
    ...data.bajas.map((b) => b.fecha),
    ...data.despachos.map((d) => d.fecha),
  ]
    .map((f) => new Date(f).getTime())
    .filter((t) => Number.isFinite(t) && t <= ahora);
  const hoy0 = inicioDia(ahora);
  let racha = 0;
  let mejorRacha = 0;
  if (fechas.length > 0) {
    let actual = 0;
    for (let t = inicioDia(Math.min(...fechas)); t <= hoy0; t = moverDias(t, 1)) {
      if ((porDia.get(diaLocal(t))?.bajas ?? 0) > 0) actual = 0;
      else actual++;
      mejorRacha = Math.max(mejorRacha, actual);
    }
    racha = actual;
  }

  const semana = Array.from({ length: 7 }, (_, i) => {
    const t = moverDias(hoy0, i - 6);
    const r = porDia.get(diaLocal(t)) ?? vacio(diaLocal(t));
    return { ...r, cumplida: r.rescatado >= meta, activo: r.remates + r.bajas > 0 };
  });
  const rescSemana = semana.reduce((s, d) => s + d.rescatado, 0);
  const perdSemana = semana.reduce((s, d) => s + d.merma, 0);
  const aprovechamiento =
    rescSemana + perdSemana > 0 ? Math.round((rescSemana / (rescSemana + perdSemana)) * 100) : null;

  const hoyR = porDia.get(diaLocal(ahora)) ?? vacio(diaLocal(ahora));
  let diasMetaCumplida = 0;
  for (const r of porDia.values()) if (r.rescatado >= meta) diasMetaCumplida++;

  return {
    meta,
    hoy: { ...hoyR, pct: Math.min(100, Math.round((hoyR.rescatado / meta) * 100)), cumplida: hoyR.rescatado >= meta },
    racha,
    mejorRacha,
    semana,
    aprovechamiento,
    totalKg,
    totalSoles,
    remates: data.liquidaciones.length,
    rematesTempranos,
    diasMetaCumplida,
  };
}

export type IconoLogro = 'remate' | 'kg' | 'caja' | 'racha' | 'reloj' | 'meta';

export interface Logro {
  id: string;
  titulo: string;
  detalle: string;
  icono: IconoLogro;
  actual: number;
  objetivo: number;
  unidad: string;
  logrado: boolean;
}

const DEF: { id: string; titulo: string; detalle: string; icono: IconoLogro; objetivo: number; unidad: string; valor: (p: Progreso) => number }[] = [
  { id: 'primer-remate', titulo: 'Primer rescate', detalle: 'Remata tu primer lote antes de perderlo', icono: 'remate', objetivo: 1, unidad: 'remate', valor: (p) => p.remates },
  { id: 'kg-100', titulo: '100 kg rescatados', detalle: 'Producto que no terminó en la basura', icono: 'kg', objetivo: 100, unidad: 'kg', valor: (p) => p.totalKg },
  { id: 'kg-1000', titulo: '1 tonelada rescatada', detalle: 'Mil kilos vendidos en vez de perdidos', icono: 'kg', objetivo: 1000, unidad: 'kg', valor: (p) => p.totalKg },
  { id: 'caja-1000', titulo: 'S/ 1 000 recuperados', detalle: 'Dinero que volvió a la caja por remates', icono: 'caja', objetivo: 1000, unidad: 'S/', valor: (p) => p.totalSoles },
  { id: 'caja-10000', titulo: 'S/ 10 000 recuperados', detalle: 'El remate ya es parte del negocio', icono: 'caja', objetivo: 10000, unidad: 'S/', valor: (p) => p.totalSoles },
  { id: 'temprano-5', titulo: 'Remate a tiempo', detalle: `5 remates con ${DESCUENTO_TEMPRANO}% de descuento o menos`, icono: 'reloj', objetivo: 5, unidad: 'remates', valor: (p) => p.rematesTempranos },
  { id: 'meta-5', titulo: 'Meta cumplida 5 días', detalle: 'Cinco días alcanzando la meta de rescate', icono: 'meta', objetivo: 5, unidad: 'días', valor: (p) => p.diasMetaCumplida },
  { id: 'racha-7', titulo: 'Semana sin merma', detalle: '7 días seguidos sin dar de baja producto', icono: 'racha', objetivo: 7, unidad: 'días', valor: (p) => p.mejorRacha },
  { id: 'racha-30', titulo: 'Mes sin merma', detalle: '30 días seguidos sin dar de baja producto', icono: 'racha', objetivo: 30, unidad: 'días', valor: (p) => p.mejorRacha },
];

export function calcularLogros(p: Progreso): Logro[] {
  return DEF.map(({ valor, ...d }) => {
    const actual = valor(p);
    return { ...d, actual: Math.min(actual, d.objetivo), logrado: actual >= d.objetivo };
  });
}

/* ---------- Logros ya celebrados (por equipo, fuera de los datos) ---------- */

const VISTOS_KEY = 'whis-amazonia:logros-vistos';

/** null = nunca se guardó (primera apertura con esta versión) */
export function leerVistos(): string[] | null {
  try {
    const raw = localStorage.getItem(VISTOS_KEY);
    if (raw === null) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return null;
  }
}

export function guardarVistos(ids: string[]) {
  try {
    localStorage.setItem(VISTOS_KEY, JSON.stringify(ids));
  } catch {
    /* sin acceso al almacenamiento */
  }
}
