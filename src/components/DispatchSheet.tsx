import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import { kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { BottomSheet } from './ui/BottomSheet';
import { useToast } from './ui/Toast';

export function DispatchSheet({ lote, onClose }: { lote: LoteFefo | null; onClose: () => void }) {
  const { despachar } = useWhisStore();
  const toast = useToast();
  const [peso, setPeso] = useState('');

  useEffect(() => {
    if (lote) setPeso(String(lote.pesoKg));
  }, [lote?.id]);

  if (!lote) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>;

  const n = Math.min(Number(peso) || 0, lote.pesoKg);
  const total = n >= lote.pesoKg;
  const rapidos = [0.25, 0.5, 1].map((f) => +(lote.pesoKg * f).toFixed(1));

  const confirmar = () => {
    despachar(lote.id, n);
    toast('exito', total ? `Lote ${lote.codigoQR} despachado completo` : `Despacho parcial de ${kg(n)}`, `${getProducto(lote.productoId).nombreCorto} · ${soles(n * lote.precioVentaKg)}`);
    onClose();
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Despachar lote"
      subtitle={`${lote.codigoQR} · ${getProducto(lote.productoId).nombreCorto} · ${kg(lote.pesoKg)} disponibles`}
      footer={
        <button className="btn-primary w-full" disabled={n <= 0} onClick={confirmar}>
          <Truck size={18} /> {total ? 'Despachar todo' : `Despachar ${kg(n)}`} · {soles(n * lote.precioVentaKg)}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {rapidos.map((r, i) => (
            <button
              key={i}
              onClick={() => setPeso(String(r))}
              className={`min-h-[48px] rounded-2xl border text-sm font-semibold transition-all duration-200 active:scale-95 ${
                Number(peso) === r ? 'border-transparent bg-ink text-canvas' : 'border-line bg-surface2/60'
              }`}
            >
              {i === 2 ? 'Todo' : `${i === 0 ? '¼' : '½'}`} · {r} kg
            </button>
          ))}
        </div>
        <div>
          <span className="label">Kilos a despachar</span>
          <input className="field" type="number" inputMode="decimal" min={0} max={lote.pesoKg} value={peso} onChange={(e) => setPeso(e.target.value)} />
          <p className="mt-1 text-xs text-muted">Precio de venta: {soles(lote.precioVentaKg)}/kg</p>
        </div>
      </div>
    </BottomSheet>
  );
}
