import type { AppData, CambioMeta, Festejo, RegistroProgreso } from '../types';

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

/** Meta vigente (la de hoy) */
export const metaDiaria = (data: AppData): number => {
  const m = data.metas?.rescateDiarioSoles;
  return typeof m === 'number' && m > 0 ? m : META_DIARIA_DEFECTO;
};

/**
 * Meta que regía un día dado. Cambiar la meta hoy no reescribe el pasado:
 * los días anteriores se juzgan con la meta que tenían. Antes del primer
 * cambio registrado rige el primero (o la vigente si no hay historial).
 */
export function metaParaDia(data: AppData, dia: string): number {
  const h = data.metas?.historial;
  if (!h || h.length === 0) return metaDiaria(data);
  let m = h[0].soles;
  for (const c of h) {
    if (c.desde <= dia) m = c.soles;
    else break;
  }
  return m;
}

/** Devuelve los datos con la nueva meta vigente desde hoy, guardando el historial */
export function conMetaDiaria(data: AppData, soles: number, ahora: number): AppData {
  const valor = Math.round(soles);
  if (!(valor > 0)) return data;
  const hoy = diaLocal(ahora);
  const previo: CambioMeta[] = data.metas?.historial ?? [
    // Primer cambio: la meta anterior queda registrada como la que regía hasta ayer
    { desde: '0000-01-01', soles: metaDiaria(data) },
  ];
  const historial = [...previo.filter((c) => c.desde < hoy), { desde: hoy, soles: valor }];
  return { ...data, metas: { rescateDiarioSoles: valor, historial } };
}

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
  semana: (DiaResumen & { meta: number; cumplida: boolean; activo: boolean })[];
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
    const metaDia = metaParaDia(data, r.dia);
    return { ...r, meta: metaDia, cumplida: r.rescatado >= metaDia, activo: r.remates + r.bajas > 0 };
  });
  const rescSemana = semana.reduce((s, d) => s + d.rescatado, 0);
  const perdSemana = semana.reduce((s, d) => s + d.merma, 0);
  const aprovechamiento =
    rescSemana + perdSemana > 0 ? Math.round((rescSemana / (rescSemana + perdSemana)) * 100) : null;

  const hoyR = porDia.get(diaLocal(ahora)) ?? vacio(diaLocal(ahora));
  let diasMetaCumplida = 0;
  for (const r of porDia.values()) if (r.rescatado > 0 && r.rescatado >= metaParaDia(data, r.dia)) diasMetaCumplida++;

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

export type IconoLogro = Festejo['icono'];

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

/* ---------- Registro de logros y celebraciones ---------- */

/**
 * Compara lo logrado con lo ya registrado en los datos y devuelve los datos
 * con los logros nuevos fechados, más lo que corresponde celebrar.
 * - La primera vez (sin registro) anota lo ya logrado sin celebrar nada.
 * - Si algo deja de estar logrado (p. ej. por Deshacer), se quita del registro
 *   y se puede volver a celebrar.
 * - Devuelve el mismo objeto `data` si no hay nada que cambiar.
 */
export function registrarProgreso(data: AppData, ahora: number): { data: AppData; festejos: Festejo[] } {
  const p = calcularProgreso(data, ahora);
  const logros = calcularLogros(p);
  const hoy = diaLocal(ahora);
  const fecha = new Date(ahora).toISOString();
  const previo = data.progreso;

  if (!previo) {
    const registro: RegistroProgreso = {
      logros: Object.fromEntries(logros.filter((l) => l.logrado).map((l) => [l.id, fecha])),
      ...(p.hoy.cumplida ? { metaCelebrada: hoy } : {}),
    };
    return { data: { ...data, progreso: registro }, festejos: [] };
  }

  const festejos: Festejo[] = [];
  const nuevoRegistro: Record<string, string> = {};
  let cambio = false;
  for (const l of logros) {
    if (!l.logrado) {
      if (previo.logros[l.id]) cambio = true;
      continue;
    }
    if (previo.logros[l.id]) {
      nuevoRegistro[l.id] = previo.logros[l.id];
    } else {
      nuevoRegistro[l.id] = fecha;
      cambio = true;
      festejos.push({ id: l.id, tipo: 'logro', titulo: l.titulo, detalle: l.detalle, icono: l.icono });
    }
  }
  // Ids desconocidos (de una versión futura) se conservan tal cual
  const conocidos = new Set(logros.map((l) => l.id));
  for (const [id, f] of Object.entries(previo.logros)) if (!conocidos.has(id)) nuevoRegistro[id] = f;

  let metaCelebrada = previo.metaCelebrada;
  if (p.hoy.cumplida && previo.metaCelebrada !== hoy) {
    metaCelebrada = hoy;
    cambio = true;
    festejos.unshift({
      id: `meta-${hoy}`,
      tipo: 'meta',
      titulo: 'Meta de hoy cumplida',
      detalle: `Recuperaste ${solesTexto(p.hoy.rescatado)} con remates. La meta era ${solesTexto(p.meta)}.`,
      icono: 'meta',
    });
  }

  if (!cambio) return { data, festejos };
  return {
    data: { ...data, progreso: { logros: nuevoRegistro, ...(metaCelebrada ? { metaCelebrada } : {}) } },
    festejos,
  };
}

const solesTexto = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ---------- Validación al restaurar un respaldo ---------- */

const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Limpia metas y registro de progreso de un respaldo. Lo dañado se descarta
 * (se vuelve a lo de por defecto) en vez de rechazar todo el respaldo.
 */
export function sanearGamificacion(data: Record<string, unknown>) {
  const m = data.metas as Record<string, unknown> | null | undefined;
  if (m !== undefined) {
    if (!m || typeof m !== 'object' || typeof m.rescateDiarioSoles !== 'number' || !(m.rescateDiarioSoles > 0)) {
      delete data.metas;
    } else {
      const h = Array.isArray(m.historial)
        ? (m.historial as Record<string, unknown>[])
            .filter((c) => c && typeof c.desde === 'string' && DIA_RE.test(c.desde as string) && typeof c.soles === 'number' && (c.soles as number) > 0)
            .map((c) => ({ desde: c.desde as string, soles: c.soles as number }))
            .sort((a, b) => a.desde.localeCompare(b.desde))
        : [];
      data.metas = { rescateDiarioSoles: m.rescateDiarioSoles, ...(h.length > 0 ? { historial: h } : {}) };
    }
  }
  const p = data.progreso as Record<string, unknown> | null | undefined;
  if (p !== undefined) {
    const logros = p && typeof p === 'object' && p.logros && typeof p.logros === 'object' && !Array.isArray(p.logros)
      ? Object.fromEntries(
          Object.entries(p.logros as Record<string, unknown>).filter(
            ([, f]) => typeof f === 'string' && Number.isFinite(new Date(f).getTime()),
          ),
        )
      : null;
    if (!logros) delete data.progreso;
    else {
      const mc = typeof p!.metaCelebrada === 'string' && DIA_RE.test(p!.metaCelebrada) ? p!.metaCelebrada : undefined;
      data.progreso = { logros, ...(mc ? { metaCelebrada: mc } : {}) };
    }
  }
}
