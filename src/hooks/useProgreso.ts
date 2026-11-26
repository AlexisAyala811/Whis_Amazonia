import { useMemo } from 'react';
import { calcularLogros, calcularProgreso } from '../utils/logros';
import { useWhisStore } from './useWhisStore';

/** Meta del día, racha y logros, recalculados con cada cambio de datos */
export function useProgreso() {
  const { data, ahora } = useWhisStore();
  // Se recalcula por día (no cada 30 s) salvo que cambien los registros
  const dia = new Date(ahora).toDateString();
  const progreso = useMemo(() => calcularProgreso(data, ahora), [data, dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const logros = useMemo(() => calcularLogros(progreso), [progreso]);
  return { progreso, logros, logrados: logros.filter((l) => l.logrado).length };
}
