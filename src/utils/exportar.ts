import { CAMARAS, MOTIVOS_BAJA, getProducto } from '../data/catalog';
import type { AppData } from '../types';
import { calcularFefo } from './fefoEngine';

const celda = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Excel en español usa ";" como separador; el BOM asegura tildes correctas
const csv = (filas: (string | number)[][]) => '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');

const descargar = (contenido: string, nombre: string, tipo: string) => {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Descarga texto como archivo (JSON por defecto). */
export const descargarTexto = (contenido: string, nombre: string, tipo = 'application/json') =>
  descargar(contenido, nombre, tipo);

const fecha = () => new Date().toISOString().slice(0, 10);
const dec = (n: number) => n.toFixed(2).replace('.', ',');

export function exportarCSV(data: AppData) {
  const ahora = Date.now();
  const filas: (string | number)[][] = [
    ['REPORTE WHIS', new Date().toLocaleString('es-PE')],
    [],
    ['INVENTARIO DE LOTES'],
    ['Código', 'Producto', 'Cámara', 'Estado', 'Peso actual kg', 'Costo S/kg', 'Precio venta S/kg', 'Horas calor', 'Horas restantes', 'Vida útil %', 'Semáforo', 'Valor S/', 'Ingreso'],
    ...data.lotes.map((l) => {
      const f = calcularFefo(l, ahora);
      return [
        l.codigoQR,
        getProducto(l.productoId).nombre,
        CAMARAS.find((c) => c.id === l.camaraId)?.nombre ?? l.camaraId,
        l.estado,
        dec(l.pesoKg),
        dec(l.costoKg),
        dec(l.precioVentaKg),
        dec(l.horasExposicionCalor),
        l.estado === 'activo' ? dec(f.horasRestantes) : '',
        l.estado === 'activo' ? f.porcentajeVidaUtil : '',
        l.estado === 'activo' ? f.semaforo : '',
        dec(f.valorComercial),
        new Date(l.fechaIngreso).toLocaleString('es-PE'),
      ];
    }),
    [],
    ['LIQUIDACIONES B2B'],
    ['Fecha', 'Código', 'Producto', 'Comprador', 'Kg', 'Descuento %', 'Precio remate S/kg', 'Total S/'],
    ...data.liquidaciones.map((q) => [
      new Date(q.fecha).toLocaleString('es-PE'),
      q.codigoQR,
      getProducto(q.productoId).nombre,
      data.compradores.find((c) => c.id === q.compradorId)?.nombre ?? q.compradorId,
      dec(q.pesoKg),
      q.descuentoPct,
      dec(q.precioRemateKg),
      dec(q.total),
    ]),
    [],
    ['BAJAS AUDITADAS'],
    ['Fecha', 'Código', 'Producto', 'Motivo', 'Kg', 'Pérdida S/', 'Con foto'],
    ...data.bajas.map((b) => [
      new Date(b.fecha).toLocaleString('es-PE'),
      b.codigoQR,
      getProducto(b.productoId).nombre,
      MOTIVOS_BAJA.find((m) => m.id === b.motivo)?.nombre ?? b.motivo,
      dec(b.pesoKg),
      dec(b.valorPerdido),
      b.fotoEvidencia ? 'Sí' : 'No',
    ]),
    [],
    ['BITÁCORA DE APAGONES'],
    ['Fecha', 'Cámaras', 'Horas', 'Lotes afectados', 'A amarillo', 'A rojo', 'Nota'],
    ...data.eventos.map((e) => [
      new Date(e.fecha).toLocaleString('es-PE'),
      e.camaraIds.map((id) => CAMARAS.find((c) => c.id === id)?.nombre ?? id).join(' + '),
      dec(e.horas),
      e.lotesAfectados,
      e.pasaronAAmarillo,
      e.pasaronARojo,
      e.nota ?? '',
    ]),
  ];
  descargar(csv(filas), `whis-reporte-${fecha()}.csv`, 'text/csv;charset=utf-8');
}

export function exportarJSON(data: AppData) {
  descargar(JSON.stringify(data, null, 2), `whis-respaldo-${fecha()}.json`, 'application/json');
}
