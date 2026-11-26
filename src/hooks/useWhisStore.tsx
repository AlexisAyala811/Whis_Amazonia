import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CONDICIONES, getProducto, usarCatalogo } from '../data/catalog';
import { crearDatosSemilla, crearDatosVacios } from '../data/seedData';
import type {
  AppData,
  BajaMerma,
  CamaraId,
  CanalVenta,
  CompradorB2B,
  CondicionLlegada,
  Envase,
  EventoTermico,
  Festejo,
  Liquidacion,
  Lote,
  MedioPago,
  MotivoBaja,
  Producto,
  Semaforo,
} from '../types';
import { conMetaDiaria, registrarProgreso } from '../utils/logros';
import { calcularFefo, conApagon, ordenarFefo, uid, type LoteFefo } from '../utils/fefoEngine';
import {
  borrarRecuperacion,
  cargar,
  guardar,
  pedirAlmacenamientoPersistente,
  type Carga,
} from '../utils/persistencia';

export interface NuevoLoteInput {
  codigoQR: string;
  productoId: string;
  camaraId: CamaraId;
  pesoKg: number;
  costoKg: number;
  precioVentaKg: number;
  condicionLlegada: CondicionLlegada;
  /** Horas extra sin frío (p. ej. dictadas por voz) además de la condición */
  horasExtraCalor?: number;
  envase?: Envase;
}

/** Detalle opcional de una venta o salida */
export interface OpcionesSalida {
  precioKg?: number;
  canal?: CanalVenta;
  medioPago?: MedioPago;
}

/** Datos de un lote que se pueden corregir después de registrarlo */
export type CambiosLote = Partial<Pick<Lote, 'codigoQR' | 'productoId' | 'camaraId' | 'pesoKg' | 'costoKg' | 'precioVentaKg'>>;

/** Última acción que se puede deshacer */
export interface Deshacer {
  id: number;
  texto: string;
}

export interface ResultadoApagon {
  lotesAfectados: number;
  pasaronAAmarillo: number;
  pasaronARojo: number;
}

interface Store {
  data: AppData;
  ahora: number;
  activos: LoteFefo[];
  guardadoOk: boolean;
  /** true solo la primera vez que se abre la app en este equipo */
  primeraVez: boolean;
  /** Datos previos que no se pudieron abrir (se conservan aparte, nunca se sobrescriben) */
  recuperacion: { motivo: string; copiaGuardada: boolean } | null;
  descartarRecuperacion: () => void;
  empezarVacio: () => void;
  cargarDemo: () => void;
  reemplazarDatos: (data: AppData) => void;
  agregarLote: (input: NuevoLoteInput) => Lote;
  despachar: (loteId: string, pesoKg: number, opciones?: OpcionesSalida) => void;
  registrarApagon: (camaraIds: CamaraId[], horas: number, nota?: string) => ResultadoApagon;
  darDeBaja: (loteId: string, motivo: MotivoBaja, pesoKg: number, fotoEvidencia: string) => void;
  liquidar: (loteId: string, descuentoPct: number, compradorId: string) => Liquidacion | null;
  agregarComprador: (c: Omit<CompradorB2B, 'id'>) => CompradorB2B;
  eliminarComprador: (id: string) => void;
  siguienteCodigo: () => string;
  /** Productos activos (catálogo del negocio o el base) */
  productos: Producto[];
  guardarProducto: (p: Producto) => void;
  /** Borra un producto; devuelve false si tiene lotes o registros */
  eliminarProducto: (id: string) => boolean;
  productoEnUso: (id: string) => boolean;
  editarLote: (loteId: string, cambios: CambiosLote) => void;
  deshacer: Deshacer | null;
  deshacerUltimo: () => string | null;
  olvidarDeshacer: () => void;
  fijarMetaDiaria: (soles: number) => void;
  /** Celebraciones pendientes de mostrar (logros nuevos y meta del día) */
  festejos: Festejo[];
  cerrarFestejo: () => void;
  cerrarFestejos: () => void;
}

const StoreCtx = createContext<Store | null>(null);

const rango: Record<Semaforo, number> = { verde: 0, amarillo: 1, rojo: 2 };

export function WhisStoreProvider({ children }: { children: ReactNode }) {
  const [carga] = useState<Carga>(cargar);
  const [data, setData] = useState<AppData>(carga.data);
  const [ahora, setAhora] = useState(() => Date.now());
  const [guardadoOk, setGuardadoOk] = useState(true);
  const [primeraVez, setPrimeraVez] = useState(carga.tipo === 'primeraVez');
  const [recuperacion, setRecuperacion] = useState(
    carga.tipo === 'recuperacion' ? { motivo: carga.motivo, copiaGuardada: carga.copiaGuardada } : null,
  );

  // Deshacer: se guarda la foto de los datos justo antes de la última acción.
  // Solo la última acción se puede deshacer, así restaurar nunca pisa otra.
  const dataRef = useRef(data);
  dataRef.current = data;
  const previoRef = useRef<AppData | null>(null);
  const [deshacer, setDeshacer] = useState<Deshacer | null>(null);
  const recordar = (texto: string) => {
    previoRef.current = dataRef.current;
    setDeshacer({ id: Date.now(), texto });
  };
  const olvidarDeshacer = useCallback(() => {
    previoRef.current = null;
    setDeshacer(null);
  }, []);
  const deshacerUltimo = useCallback((): string | null => {
    const previo = previoRef.current;
    if (!previo) return null;
    const texto = deshacer?.texto ?? null;
    previoRef.current = null;
    setDeshacer(null);
    setData(previo);
    setAhora(Date.now());
    return texto;
  }, [deshacer]);

  // Persistencia local automática. Si hay datos sin poder abrir y no se logró
  // guardarlos aparte, no se escribe nada hasta que el usuario decida.
  const pausado = recuperacion !== null && !recuperacion.copiaGuardada;
  useEffect(() => {
    if (primeraVez || pausado) return;
    setGuardadoOk(guardar(data));
  }, [data, primeraVez, pausado]);

  useEffect(() => {
    void pedirAlmacenamientoPersistente();
    // Claves de la primera versión de logros; ahora el registro vive en los datos
    try {
      localStorage.removeItem('whis-amazonia:logros-vistos');
      localStorage.removeItem('whis-amazonia:meta-celebrada');
    } catch {
      /* sin acceso al almacenamiento */
    }
  }, []);

  // El motor FEFO se recalcula cada 30 s
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // El catálogo activo se fija antes de calcular el FEFO de los lotes
  const productos = useMemo(() => usarCatalogo(data.productos), [data.productos]);
  const activos = useMemo(() => ordenarFefo(data.lotes, ahora), [data.lotes, ahora, productos]);

  const actualizarLote = (lotes: Lote[], id: string, fn: (l: Lote) => Lote) =>
    lotes.map((l) => (l.id === id ? fn(l) : l));

  const agregarLote = useCallback((input: NuevoLoteInput): Lote => {
    const condicion = CONDICIONES.find((c) => c.id === input.condicionLlegada);
    const lote: Lote = {
      id: uid('lote'),
      codigoQR: input.codigoQR,
      productoId: input.productoId,
      camaraId: input.camaraId,
      pesoInicialKg: input.pesoKg,
      pesoKg: input.pesoKg,
      costoKg: input.costoKg,
      precioVentaKg: input.precioVentaKg,
      fechaIngreso: new Date().toISOString(),
      horasExposicionCalor: (condicion?.horas ?? 0) + (input.horasExtraCalor ?? 0),
      condicionLlegada: input.condicionLlegada,
      estado: 'activo',
      ...(input.envase && input.envase.cantidad > 0 && input.envase.kgPorEnvase > 0 ? { envase: input.envase } : {}),
    };
    recordar(`Lote ${lote.codigoQR} registrado`);
    setData((d) => ({ ...d, lotes: [lote, ...d.lotes] }));
    setAhora(Date.now());
    return lote;
  }, []);

  const despachar = useCallback((loteId: string, pesoKg: number, opciones: OpcionesSalida = {}) => {
    recordar('Venta registrada');
    setData((d) => {
      const lote = d.lotes.find((l) => l.id === loteId);
      if (!lote) return d;
      const kgReal = Math.min(pesoKg, lote.pesoKg);
      const restante = +(lote.pesoKg - kgReal).toFixed(2);
      return {
        ...d,
        lotes: actualizarLote(d.lotes, loteId, (l) => ({
          ...l,
          pesoKg: restante,
          estado: restante <= 0 ? 'despachado' : l.estado,
        })),
        despachos: [
          {
            id: uid('desp'),
            loteId,
            fecha: new Date().toISOString(),
            pesoKg: kgReal,
            total: +(kgReal * (opciones.precioKg && opciones.precioKg > 0 ? opciones.precioKg : lote.precioVentaKg)).toFixed(2),
            ...(opciones.precioKg && opciones.precioKg > 0 ? { precioKg: opciones.precioKg } : {}),
            ...(opciones.canal ? { canal: opciones.canal } : {}),
            ...(opciones.medioPago ? { medioPago: opciones.medioPago } : {}),
          },
          ...d.despachos,
        ],
      };
    });
  }, []);

  const registrarApagon = useCallback(
    (camaraIds: CamaraId[], horas: number, nota?: string): ResultadoApagon => {
      const t = Date.now();
      const afectados = data.lotes.filter(
        (l) => l.estado === 'activo' && l.pesoKg > 0 && camaraIds.includes(l.camaraId),
      );
      let pasaronAAmarillo = 0;
      let pasaronARojo = 0;
      for (const l of afectados) {
        const antes = calcularFefo(l, t).semaforo;
        const despues = calcularFefo(conApagon(l, horas), t).semaforo;
        if (rango[despues] > rango[antes]) {
          if (despues === 'rojo') pasaronARojo++;
          else pasaronAAmarillo++;
        }
      }
      const resultado = { lotesAfectados: afectados.length, pasaronAAmarillo, pasaronARojo };
      const evento: EventoTermico = {
        id: uid('evt'),
        fecha: new Date(t).toISOString(),
        camaraIds,
        horas,
        nota: nota?.trim() || undefined,
        ...resultado,
      };
      const ids = new Set(afectados.map((l) => l.id));
      recordar(`Apagón de ${horas} h registrado`);
      setData((d) => ({
        ...d,
        lotes: d.lotes.map((l) =>
          ids.has(l.id) ? conApagon(l, horas) : l,
        ),
        eventos: [evento, ...d.eventos],
      }));
      setAhora(t);
      return resultado;
    },
    [data.lotes],
  );

  const darDeBaja = useCallback((loteId: string, motivo: MotivoBaja, pesoKg: number, fotoEvidencia: string) => {
    recordar('Baja registrada');
    setData((d) => {
      const lote = d.lotes.find((l) => l.id === loteId);
      if (!lote) return d;
      const kgReal = Math.min(pesoKg, lote.pesoKg);
      const restante = +(lote.pesoKg - kgReal).toFixed(2);
      const baja: BajaMerma = {
        id: uid('baja'),
        loteId,
        codigoQR: lote.codigoQR,
        productoId: lote.productoId,
        fecha: new Date().toISOString(),
        motivo,
        pesoKg: kgReal,
        valorPerdido: kgReal * lote.costoKg,
        fotoEvidencia,
      };
      return {
        ...d,
        lotes: actualizarLote(d.lotes, loteId, (l) => ({
          ...l,
          pesoKg: restante,
          estado: restante <= 0 ? 'baja' : l.estado,
        })),
        bajas: [baja, ...d.bajas],
      };
    });
  }, []);

  const liquidar = useCallback(
    (loteId: string, descuentoPct: number, compradorId: string): Liquidacion | null => {
      const lote = data.lotes.find((l) => l.id === loteId);
      if (!lote) return null;
      const precioRemateKg = +(lote.precioVentaKg * (1 - descuentoPct / 100)).toFixed(2);
      const liq: Liquidacion = {
        id: uid('liq'),
        loteId,
        codigoQR: lote.codigoQR,
        productoId: lote.productoId,
        fecha: new Date().toISOString(),
        pesoKg: lote.pesoKg,
        precioNormalKg: lote.precioVentaKg,
        descuentoPct,
        precioRemateKg,
        total: +(lote.pesoKg * precioRemateKg).toFixed(2),
        compradorId,
      };
      recordar(`Lote ${lote.codigoQR} liquidado`);
      setData((d) => ({
        ...d,
        lotes: actualizarLote(d.lotes, loteId, (l) => ({ ...l, pesoKg: 0, estado: 'liquidado' })),
        liquidaciones: [liq, ...d.liquidaciones],
      }));
      return liq;
    },
    [data.lotes],
  );

  const agregarComprador = useCallback((c: Omit<CompradorB2B, 'id'>): CompradorB2B => {
    const nuevo = { ...c, id: uid('cmp') };
    setData((d) => ({ ...d, compradores: [...d.compradores, nuevo] }));
    return nuevo;
  }, []);

  const eliminarComprador = useCallback((id: string) => {
    recordar('Comprador eliminado');
    setData((d) => ({ ...d, compradores: d.compradores.filter((c) => c.id !== id) }));
  }, []);

  const empezarVacio = useCallback(() => {
    olvidarDeshacer();
    setData(crearDatosVacios());
    setPrimeraVez(false);
    setAhora(Date.now());
  }, []);

  const cargarDemo = useCallback(() => {
    const t = Date.now();
    olvidarDeshacer();
    setData(crearDatosSemilla(t));
    setPrimeraVez(false);
    setAhora(t);
  }, []);

  const reemplazarDatos = useCallback((nuevos: AppData) => {
    olvidarDeshacer();
    setData(nuevos);
    setPrimeraVez(false);
    setAhora(Date.now());
  }, []);

  const descartarRecuperacion = useCallback(() => {
    borrarRecuperacion();
    setRecuperacion(null);
  }, []);

  const productoEnUso = useCallback(
    (id: string) =>
      data.lotes.some((l) => l.productoId === id) ||
      data.bajas.some((b) => b.productoId === id) ||
      data.liquidaciones.some((q) => q.productoId === id),
    [data.lotes, data.bajas, data.liquidaciones],
  );

  const guardarProducto = useCallback((p: Producto) => {
    const existe = productos.some((x) => x.id === p.id);
    recordar(`Producto ${p.nombreCorto} ${existe ? 'actualizado' : 'agregado'}`);
    setData((d) => {
      // La primera vez que se edita, el catálogo base pasa a ser del negocio
      const base = d.productos && d.productos.length > 0 ? d.productos : productos;
      const lista = base.some((x) => x.id === p.id) ? base.map((x) => (x.id === p.id ? p : x)) : [...base, p];
      return { ...d, productos: lista };
    });
  }, [productos]);

  const eliminarProducto = useCallback(
    (id: string): boolean => {
      if (productoEnUso(id) || productos.length <= 1) return false;
      const p = productos.find((x) => x.id === id);
      recordar(`Producto ${p?.nombreCorto ?? ''} eliminado`);
      setData((d) => ({ ...d, productos: productos.filter((x) => x.id !== id) }));
      return true;
    },
    [productoEnUso, productos],
  );

  const editarLote = useCallback((loteId: string, cambios: CambiosLote) => {
    const lote = dataRef.current.lotes.find((l) => l.id === loteId);
    if (!lote) return;
    recordar(`Lote ${cambios.codigoQR ?? lote.codigoQR} corregido`);
    setData((d) => ({
      ...d,
      lotes: actualizarLote(d.lotes, loteId, (l) => {
        const sinMovimientos = l.pesoKg === l.pesoInicialKg;
        const pesoKg = cambios.pesoKg !== undefined && cambios.pesoKg > 0 ? +cambios.pesoKg.toFixed(2) : l.pesoKg;
        return {
          ...l,
          ...cambios,
          pesoKg,
          // Si aún no salió nada del lote, corregir el peso corrige también el de ingreso
          pesoInicialKg: sinMovimientos ? pesoKg : Math.max(l.pesoInicialKg, pesoKg),
        };
      }),
    }));
    setAhora(Date.now());
  }, []);

  const fijarMetaDiaria = useCallback((soles: number) => {
    if (!(soles > 0)) return;
    setData((d) => conMetaDiaria(d, soles, Date.now()));
  }, []);

  // Tras cada cambio de datos se anotan los logros nuevos (con su fecha) y se
  // encolan sus celebraciones. Va en los datos: viaja en el respaldo y Deshacer
  // lo revierte junto con la acción que lo provocó.
  const [festejos, setFestejos] = useState<Festejo[]>([]);
  useEffect(() => {
    if (primeraVez) return;
    const r = registrarProgreso(data, Date.now());
    if (r.data !== data) setData(r.data);
    if (r.festejos.length > 0) {
      setFestejos((f) => [...f, ...r.festejos]);
      if ('vibrate' in navigator) navigator.vibrate?.([20, 60, 20, 60, 40]);
    }
  }, [data, primeraVez]);
  const cerrarFestejo = useCallback(() => setFestejos((f) => f.slice(1)), []);
  const cerrarFestejos = useCallback(() => setFestejos([]), []);

  const siguienteCodigo = useCallback((): string => {
    const usados = new Set(data.lotes.map((l) => l.codigoQR));
    let n = 104;
    while (usados.has(`J-${n}`)) n++;
    return `J-${n}`;
  }, [data.lotes]);

  const value: Store = {
    data,
    ahora,
    activos,
    guardadoOk,
    primeraVez,
    recuperacion,
    descartarRecuperacion,
    empezarVacio,
    cargarDemo,
    reemplazarDatos,
    agregarLote,
    despachar,
    registrarApagon,
    darDeBaja,
    liquidar,
    agregarComprador,
    eliminarComprador,
    siguienteCodigo,
    productos,
    guardarProducto,
    eliminarProducto,
    productoEnUso,
    editarLote,
    deshacer,
    deshacerUltimo,
    olvidarDeshacer,
    fijarMetaDiaria,
    festejos,
    cerrarFestejo,
    cerrarFestejos,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useWhisStore(): Store {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useWhisStore debe usarse dentro de <WhisStoreProvider>');
  return ctx;
}

/** Nombre corto del producto de un lote (atajo para la UI) */
export const nombreProducto = (productoId: string) => getProducto(productoId).nombreCorto;
