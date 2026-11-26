import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CONDICIONES, getProducto } from '../data/catalog';
import { crearDatosSemilla, crearDatosVacios } from '../data/seedData';
import type {
  AppData,
  BajaMerma,
  CamaraId,
  CompradorB2B,
  CondicionLlegada,
  EventoTermico,
  Liquidacion,
  Lote,
  MotivoBaja,
  Semaforo,
} from '../types';
import { calcularFefo, ordenarFefo, uid, type LoteFefo } from '../utils/fefoEngine';
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
  despachar: (loteId: string, pesoKg: number) => void;
  registrarApagon: (camaraIds: CamaraId[], horas: number, nota?: string) => ResultadoApagon;
  darDeBaja: (loteId: string, motivo: MotivoBaja, pesoKg: number, fotoEvidencia: string) => void;
  liquidar: (loteId: string, descuentoPct: number, compradorId: string) => Liquidacion | null;
  agregarComprador: (c: Omit<CompradorB2B, 'id'>) => CompradorB2B;
  eliminarComprador: (id: string) => void;
  siguienteCodigo: () => string;
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

  // Persistencia local automática. Si hay datos sin poder abrir y no se logró
  // guardarlos aparte, no se escribe nada hasta que el usuario decida.
  const pausado = recuperacion !== null && !recuperacion.copiaGuardada;
  useEffect(() => {
    if (primeraVez || pausado) return;
    setGuardadoOk(guardar(data));
  }, [data, primeraVez, pausado]);

  useEffect(() => {
    void pedirAlmacenamientoPersistente();
  }, []);

  // El motor FEFO se recalcula cada 30 s
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const activos = useMemo(() => ordenarFefo(data.lotes, ahora), [data.lotes, ahora]);

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
    };
    setData((d) => ({ ...d, lotes: [lote, ...d.lotes] }));
    setAhora(Date.now());
    return lote;
  }, []);

  const despachar = useCallback((loteId: string, pesoKg: number) => {
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
          { id: uid('desp'), loteId, fecha: new Date().toISOString(), pesoKg: kgReal, total: kgReal * lote.precioVentaKg },
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
        const despues = calcularFefo({ ...l, horasExposicionCalor: l.horasExposicionCalor + horas }, t).semaforo;
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
      setData((d) => ({
        ...d,
        lotes: d.lotes.map((l) =>
          ids.has(l.id) ? { ...l, horasExposicionCalor: +(l.horasExposicionCalor + horas).toFixed(2) } : l,
        ),
        eventos: [evento, ...d.eventos],
      }));
      setAhora(t);
      return resultado;
    },
    [data.lotes],
  );

  const darDeBaja = useCallback((loteId: string, motivo: MotivoBaja, pesoKg: number, fotoEvidencia: string) => {
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
    setData((d) => ({ ...d, compradores: d.compradores.filter((c) => c.id !== id) }));
  }, []);

  const empezarVacio = useCallback(() => {
    setData(crearDatosVacios());
    setPrimeraVez(false);
    setAhora(Date.now());
  }, []);

  const cargarDemo = useCallback(() => {
    const t = Date.now();
    setData(crearDatosSemilla(t));
    setPrimeraVez(false);
    setAhora(t);
  }, []);

  const reemplazarDatos = useCallback((nuevos: AppData) => {
    setData(nuevos);
    setPrimeraVez(false);
    setAhora(Date.now());
  }, []);

  const descartarRecuperacion = useCallback(() => {
    borrarRecuperacion();
    setRecuperacion(null);
  }, []);

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
