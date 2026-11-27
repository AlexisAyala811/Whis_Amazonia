import { useRef, useState } from 'react';
import { Camera, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
import {
  CATEGORIAS,
  SENSIBILIDADES,
  clavesDesdeNombre,
  normalizarTexto,
  sensibilidadCercana,
} from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CategoriaProducto, Producto } from '../types';
import { soles, uid } from '../utils/fefoEngine';
import { fotoCuadrada } from '../utils/fotos';
import { fotoReal } from '../utils/fotosReales';
import { emojiProducto } from '../utils/puesto';
import { BottomSheet } from './ui/BottomSheet';
import { ProductoAvatar } from './ui/LoteBits';
import { useToast } from './ui/Toast';

interface Borrador {
  id: string | null;
  nombre: string;
  categoria: CategoriaProducto;
  dias: string;
  tempMin: string;
  tempMax: string;
  factor: number;
  costo: string;
  foto?: string;
}

const VACIO: Borrador = { id: null, nombre: '', categoria: 'frutas', dias: '', tempMin: '', tempMax: '', factor: 2.5, costo: '' };

/** Sensibilidad al calor que se propone al elegir el tipo de un producto nuevo */
const FACTOR_POR_TIPO: Record<CategoriaProducto, number> = { carnes: 3.2, pescados: 4.0, lacteos: 2.5, frutas: 2.5, otros: 1.8 };

const dias = (horas: number) => +(horas / 24).toFixed(1);
const vidaTexto = (horas: number) => (horas < 48 ? `${horas} h` : `${dias(horas)} días`);

/** Catálogo propio: productos con su vida útil, rango de frío y costo de referencia. */
export function ProductosSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { productos, guardarProducto, eliminarProducto, productoEnUso } = useWhisStore();
  const toast = useToast();
  const [b, setB] = useState<Borrador | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const cerrar = () => {
    setB(null);
    onClose();
  };

  const editar = (p: Producto) =>
    setB({
      id: p.id,
      nombre: p.nombreCorto,
      categoria: p.categoria,
      dias: String(dias(p.vidaBaseHoras)),
      tempMin: String(p.tempMin),
      tempMax: String(p.tempMax),
      factor: p.factorRiesgoCalor,
      costo: String(p.costoRefKg),
      foto: p.foto,
    });

  const nombre = b?.nombre.trim() ?? '';
  const diasNum = Number(b?.dias);
  const tMin = Number(b?.tempMin);
  const tMax = Number(b?.tempMax);
  const costoNum = Number(b?.costo);
  const duplicado =
    !!b && productos.some((p) => p.id !== b.id && normalizarTexto(p.nombreCorto) === normalizarTexto(nombre));
  const errores = b
    ? [
        nombre.length < 2 && 'Escribe el nombre',
        duplicado && 'Ya existe un producto con ese nombre',
        !(diasNum > 0) && 'Indica la vida útil en días',
        (b.tempMin === '' || b.tempMax === '' || !Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin > tMax) &&
          'Revisa el rango de temperatura',
        !(costoNum >= 0) && 'Revisa el costo',
      ].filter(Boolean)
    : [];

  const guardar = () => {
    if (!b || errores.length) return;
    const previo = productos.find((p) => p.id === b.id);
    const cambioNombre = !previo || normalizarTexto(previo.nombreCorto) !== normalizarTexto(nombre);
    const producto: Producto = {
      id: previo?.id ?? uid('prod'),
      nombre: cambioNombre ? nombre : previo.nombre,
      nombreCorto: nombre,
      categoria: b.categoria,
      vidaBaseHoras: Math.round(diasNum * 24),
      tempMin: tMin,
      tempMax: tMax,
      factorRiesgoCalor: b.factor,
      costoRefKg: costoNum,
      claves: [...new Set([...(previo?.claves ?? []), ...clavesDesdeNombre(nombre)])],
      ...(b.foto ? { foto: b.foto } : {}),
    };
    guardarProducto(producto);
    toast('exito', previo ? 'Producto actualizado' : 'Producto agregado', `${producto.nombreCorto} · ${vidaTexto(producto.vidaBaseHoras)} de vida útil`);
    setB(null);
  };

  const borrar = () => {
    if (!b?.id) return;
    if (eliminarProducto(b.id)) {
      toast('aviso', 'Producto eliminado', nombre);
      setB(null);
    }
  };

  const enUso = b?.id ? productoEnUso(b.id) : false;

  return (
    <BottomSheet
      open={open}
      onClose={cerrar}
      title={b ? (b.id ? 'Editar producto' : 'Nuevo producto') : 'Mis productos'}
      subtitle={b ? 'La vida útil y el frío ideal definen el semáforo' : `${productos.length} productos · tócalos para editarlos`}
      footer={
        b ? (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button className="btn-ghost" onClick={() => setB(null)}>
              Volver
            </button>
            <button className="btn-primary" disabled={errores.length > 0} onClick={guardar}>
              <Save size={18} /> Guardar
            </button>
          </div>
        ) : (
          <button className="btn-primary w-full" onClick={() => setB({ ...VACIO })}>
            <Plus size={18} /> Agregar producto
          </button>
        )
      }
    >
      {!b ? (
        <ul className="space-y-1.5">
          {productos.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => editar(p)}
                className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all duration-200 hover:bg-surface2 active:scale-[0.99]"
              >
                <ProductoAvatar productoId={p.id} tamano="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.nombreCorto}</span>
                  <span className="block truncate text-xs text-muted">
                    {vidaTexto(p.vidaBaseHoras)} · {p.tempMin}–{p.tempMax} °C · {soles(p.costoRefKg)}/kg
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {b.foto || fotoReal({ id: b.id ?? '', nombre: b.nombre }) ? (
              <img src={b.foto ?? fotoReal({ id: b.id ?? '', nombre: b.nombre }) ?? ''} alt="" className="h-16 w-16 shrink-0 rounded-[18px] object-cover" />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-[#FBF3DC] to-[#EADFC2] text-3xl dark:from-surface2 dark:to-surface2">
                {emojiProducto({ id: b.id ?? '', nombre: b.nombre, categoria: b.categoria })}
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <button type="button" className="btn-ghost w-full" onClick={() => fotoRef.current?.click()}>
                <Camera size={16} /> {b.foto ? 'Cambiar foto' : 'Agregar foto'}
              </button>
              {b.foto && (
                <button type="button" className="w-full text-xs font-semibold text-muted" onClick={() => setB({ ...b, foto: undefined })}>
                  Quitar foto
                </button>
              )}
            </div>
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const foto = await fotoCuadrada(f);
                  setB((x) => (x ? { ...x, foto } : x));
                } catch {
                  toast('error', 'No se pudo leer la foto');
                }
              }}
            />
          </div>

          <div>
            <span className="label">Nombre</span>
            <input
              className="field"
              placeholder="Ej.: Doncella fresca"
              value={b.nombre}
              onChange={(e) => setB({ ...b, nombre: e.target.value })}
            />
          </div>

          <div>
            <span className="label">Tipo</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setB({ ...b, categoria: c.id, factor: b.id ? b.factor : FACTOR_POR_TIPO[c.id] })}
                  className={`min-h-[44px] rounded-full border px-3.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    b.categoria === c.id ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface2/60 text-muted'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Vida útil en frío (días)</span>
            <input
              className="field"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              placeholder="Ej.: 3"
              value={b.dias}
              onChange={(e) => setB({ ...b, dias: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted">Cuánto dura bien refrigerado, desde que entra a cámara.</p>
          </div>

          <div>
            <span className="label">Temperatura ideal (°C)</span>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="field"
                type="number"
                inputMode="decimal"
                placeholder="Mínima"
                aria-label="Temperatura mínima"
                value={b.tempMin}
                onChange={(e) => setB({ ...b, tempMin: e.target.value })}
              />
              <input
                className="field"
                type="number"
                inputMode="decimal"
                placeholder="Máxima"
                aria-label="Temperatura máxima"
                value={b.tempMax}
                onChange={(e) => setB({ ...b, tempMax: e.target.value })}
              />
            </div>
          </div>

          <div>
            <span className="label">Se malogra con el calor</span>
            <div className="grid grid-cols-2 gap-2">
              {SENSIBILIDADES.map((s) => {
                const sel = sensibilidadCercana(b.factor).factor === s.factor;
                return (
                  <button
                    key={s.factor}
                    type="button"
                    onClick={() => setB({ ...b, factor: s.factor })}
                    className={`min-h-[56px] rounded-2xl border px-3 py-2 text-left transition-all duration-200 active:scale-[0.97] ${
                      sel ? 'border-brand bg-brand/10' : 'border-line bg-surface2/60'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{s.nombre}</span>
                    <span className="block text-[11px] leading-tight text-muted">{s.detalle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label">Costo de referencia / kg (S/)</span>
            <input
              className="field"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              placeholder="0.00"
              value={b.costo}
              onChange={(e) => setB({ ...b, costo: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted">Se propone al registrar un lote; puedes cambiarlo en cada lote.</p>
          </div>

          {errores.length > 0 && b.nombre !== '' && <p className="text-xs text-warn">{errores[0]}</p>}

          {b.id && (
            <div className="border-t border-line pt-3">
              {enUso ? (
                <p className="text-xs text-muted">
                  No se puede borrar: tiene lotes o registros. Si ya no lo vendes, simplemente no lo uses.
                </p>
              ) : (
                <button className="btn w-full text-danger" onClick={borrar} disabled={productos.length <= 1}>
                  <Trash2 size={16} /> Borrar producto
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
