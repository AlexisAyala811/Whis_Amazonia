import { useEffect, useState } from 'react';
import { Save, Warehouse } from 'lucide-react';
import { CAMARAS } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { CamaraId } from '../types';
import { kg, type LoteFefo } from '../utils/fefoEngine';
import { BottomSheet } from './ui/BottomSheet';
import { ProductoIcono } from './ui/LoteBits';
import { ModernSelect } from './ui/ModernSelect';
import { useToast } from './ui/Toast';

/** Corrige un lote mal registrado: código, producto, cámara, peso o precios. */
export function EditLoteSheet({ lote, onClose }: { lote: LoteFefo | null; onClose: () => void }) {
  const { editarLote, productos, data } = useWhisStore();
  const toast = useToast();
  const [codigo, setCodigo] = useState('');
  const [productoId, setProductoId] = useState('');
  const [camaraId, setCamaraId] = useState<CamaraId>('camara1');
  const [peso, setPeso] = useState('');
  const [costo, setCosto] = useState('');
  const [venta, setVenta] = useState('');

  useEffect(() => {
    if (!lote) return;
    setCodigo(lote.codigoQR);
    setProductoId(lote.productoId);
    setCamaraId(lote.camaraId);
    setPeso(String(lote.pesoKg));
    setCosto(String(lote.costoKg));
    setVenta(String(lote.precioVentaKg));
    // Solo al abrir otro lote
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote?.id]);

  if (!lote) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;

  const cod = codigo.trim().toUpperCase();
  const repetido = cod !== lote.codigoQR && data.lotes.some((l) => l.codigoQR === cod && l.estado === 'activo');
  const pesoNum = Number(peso);
  const costoNum = Number(costo);
  const ventaNum = Number(venta);
  const valido = cod.length > 0 && !repetido && pesoNum > 0 && costoNum > 0 && ventaNum > 0;
  const conMovimientos = lote.pesoKg !== lote.pesoInicialKg;

  const guardar = () => {
    if (!valido) return;
    editarLote(lote.id, {
      codigoQR: cod,
      productoId,
      camaraId,
      pesoKg: pesoNum,
      costoKg: costoNum,
      precioVentaKg: ventaNum,
    });
    toast('exito', `Lote ${cod} corregido`);
    onClose();
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Corregir lote"
      subtitle="Arregla un dato mal ingresado. Puedes deshacerlo después."
      footer={
        <button className="btn-primary w-full" disabled={!valido} onClick={guardar}>
          <Save size={18} /> Guardar cambios
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[96px_1fr] gap-3">
          <div>
            <span className="label">Jaba</span>
            <input className="field px-3 font-mono uppercase" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <ModernSelect
            label="Producto"
            value={productoId}
            onChange={setProductoId}
            searchable
            options={productos.map((p) => ({
              value: p.id,
              label: p.nombreCorto,
              icon: <ProductoIcono productoId={p.id} size={18} />,
            }))}
          />
        </div>
        {repetido && <p className="-mt-2 text-xs text-danger">Ya hay otro lote activo con la jaba {cod}.</p>}

        <ModernSelect<CamaraId>
          label="Cámara"
          value={camaraId}
          onChange={setCamaraId}
          options={CAMARAS.map((c) => ({
            value: c.id,
            label: c.nombre,
            description: c.tempObjetivo,
            icon: <Warehouse size={18} />,
          }))}
        />

        <div>
          <span className="label">Peso actual (kg)</span>
          <input className="field" type="number" inputMode="decimal" min={0} value={peso} onChange={(e) => setPeso(e.target.value)} />
          {conMovimientos && (
            <p className="mt-1 text-xs text-muted">Ingresó con {kg(lote.pesoInicialKg)}; ya tuvo despachos o bajas.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Costo / kg</span>
            <input className="field" type="number" inputMode="decimal" min={0} step={0.1} value={costo} onChange={(e) => setCosto(e.target.value)} />
          </div>
          <div>
            <span className="label">Venta / kg</span>
            <input className="field" type="number" inputMode="decimal" min={0} step={0.1} value={venta} onChange={(e) => setVenta(e.target.value)} />
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
