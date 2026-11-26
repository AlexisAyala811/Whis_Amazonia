import { CATALOGO } from '../data/catalog';
import type { CamaraId } from '../types';

export interface DatosDictados {
  productoId?: string;
  camaraId?: CamaraId;
  pesoKg?: number;
  horasSinFrio?: number;
  precioKg?: number;
}

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40,
  cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
  doscientos: 200, trescientos: 300, quinientos: 500, media: 0.5,
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2');

/** Convierte palabras numéricas sueltas a dígitos ("ochenta kilos" → "80 kilos") */
const palabrasANumeros = (s: string) =>
  s.replace(/\b([a-z]+)\b/g, (w) => (w in NUMEROS && w !== 'media' && w !== 'un' && w !== 'una' ? String(NUMEROS[w]) : w));

/** Une números compuestos: "100 20" → "120", "30 y 5" → "35" */
const unirCompuestos = (s: string) => {
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\b(\d+)(?:\s+y)?\s+(\d+)\b/, (m, a: string, b: string) => {
      const x = Number(a);
      const y = Number(b);
      const unidad = 10 ** String(y).length;
      return x % unidad === 0 && x > y ? String(x + y) : m;
    });
  }
  return s;
};

const num = String.raw`(\d+(?:\.\d+)?|un|una|media)`;
const aNumero = (v: string) => (v in NUMEROS ? NUMEROS[v] : Number(v));

/**
 * Extrae datos del lote desde una frase dictada, por ejemplo:
 * "Ingresan 80 kilos de pollo a cámara 1 con 2 horas sin frío"
 */
export function interpretarDictado(frase: string): DatosDictados {
  const t = unirCompuestos(palabrasANumeros(normalizar(frase)));
  const r: DatosDictados = {};

  const peso = t.match(new RegExp(`${num}\\s*(?:kilos?|kg|kilogramos?)`));
  if (peso) r.pesoKg = aNumero(peso[1]);

  const horas = t.match(new RegExp(`${num}\\s*(?:horas?|hrs?|h)\\b[^.]*?(?:sin frio|sin refrigeracion|fuera|al calor|de calor|de retraso|retraso)`));
  if (horas) r.horasSinFrio = aNumero(horas[1]);
  else if (/sin frio/.test(t) && /media hora/.test(t)) r.horasSinFrio = 0.5;

  const precio = t.match(new RegExp(`(?:a|precio(?: de)?)\\s*${num}\\s*(?:soles|sol)`));
  if (precio) r.precioKg = aNumero(precio[1]);

  const camara = t.match(/camara\s*(\d|uno|dos)/);
  if (camara) r.camaraId = ['1', 'uno'].includes(camara[1]) ? 'camara1' : 'camara2';
  else if (/almacen/.test(t)) r.camaraId = 'almacen';

  const palabras = t.split(/[^a-z]+/);
  for (const p of CATALOGO) {
    if (p.claves.some((k) => palabras.includes(k) || (k.length > 5 && t.includes(k)))) {
      r.productoId = p.id;
      break;
    }
  }
  return r;
}
