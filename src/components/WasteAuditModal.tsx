import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, ShieldAlert, Trash2, X } from 'lucide-react';
import { MOTIVOS_BAJA, getProducto } from '../data/catalog';
import { useWhisStore } from '../hooks/useWhisStore';
import type { MotivoBaja } from '../types';
import { kg, soles, type LoteFefo } from '../utils/fefoEngine';
import { BottomSheet } from './ui/BottomSheet';
import { ModernSelect } from './ui/ModernSelect';
import { useToast } from './ui/Toast';

/** Reduce la foto a máx. 640 px y JPEG 60 % (≈40–70 KB) para guardarla offline sin llenar el almacenamiento. */
const comprimirFoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 640;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Sello de auditoría con fecha y hora
      const sello = new Date().toLocaleString('es-PE');
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Whis · evidencia ${sello}`, 10, canvas.height - 9);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen'));
    };
    img.src = url;
  });

interface Props {
  lote: LoteFefo | null;
  onClose: () => void;
}

export function WasteAuditModal({ lote, onClose }: Props) {
  const { darDeBaja } = useWhisStore();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [motivo, setMotivo] = useState<MotivoBaja | null>(null);
  const [peso, setPeso] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (lote) {
      setMotivo(null);
      setPeso(String(lote.pesoKg));
      setFoto(null);
    }
  }, [lote?.id]);

  const pesoNum = Math.min(Number(peso) || 0, lote?.pesoKg ?? 0);
  const puedeConfirmar = !!lote && !!motivo && !!foto && pesoNum > 0;

  const onFoto = async (f: File | undefined) => {
    if (!f) return;
    setProcesando(true);
    try {
      setFoto(await comprimirFoto(f));
    } catch {
      toast('error', 'No se pudo leer la foto', 'Intenta con otra imagen.');
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmar = () => {
    if (!lote || !motivo || !foto) return;
    darDeBaja(lote.id, motivo, pesoNum, foto);
    toast('aviso', `Baja registrada: ${kg(pesoNum)} de ${getProducto(lote.productoId).nombreCorto}`, `Pérdida de ${soles(pesoNum * lote.costoKg)} con evidencia fotográfica.`);
    onClose();
  };

  return (
    <BottomSheet
      open={!!lote}
      onClose={onClose}
      title="Dar de baja por merma"
      subtitle={lote ? `${lote.codigoQR} · ${getProducto(lote.productoId).nombreCorto} · ${kg(lote.pesoKg)}` : ''}
      footer={
        <button className="btn-danger w-full" disabled={!puedeConfirmar} onClick={confirmar}>
          <Trash2 size={18} /> {foto ? 'Confirmar baja auditada' : 'Falta la foto de evidencia'}
        </button>
      }
    >
      {lote && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-warn/10 p-3 text-xs text-warn">
            <ShieldAlert size={18} className="shrink-0" />
            <p>Control antifraude: cada baja exige motivo y foto. Queda registrada con fecha y hora para auditoría.</p>
          </div>

          <ModernSelect<MotivoBaja>
            label="Motivo de la baja"
            value={motivo}
            onChange={setMotivo}
            placeholder="Elegir motivo"
            options={MOTIVOS_BAJA.map((m) => ({ value: m.id, label: m.nombre, description: m.detalle }))}
          />

          <div>
            <span className="label">Peso a dar de baja (kg)</span>
            <div className="flex gap-2">
              <input
                className="field"
                type="number"
                inputMode="decimal"
                min={0}
                max={lote.pesoKg}
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
              <button type="button" className="btn-ghost shrink-0" onClick={() => setPeso(String(lote.pesoKg))}>
                Todo
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">Pérdida a costo: {soles(pesoNum * lote.costoKg)}</p>
          </div>

          <div>
            <span className="label">Foto de evidencia (obligatoria)</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFoto(e.target.files?.[0])}
            />
            {foto ? (
              <div className="relative overflow-hidden rounded-3xl border border-line">
                <img src={foto} alt="Evidencia de merma" className="max-h-64 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFoto(null)}
                  className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white"
                  aria-label="Quitar foto"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={procesando}
                className="flex min-h-[128px] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line bg-surface2/40 text-muted transition-all duration-200 hover:border-brand/60 active:scale-[0.99]"
              >
                <span className="flex gap-2">
                  <Camera size={26} />
                  <ImagePlus size={26} />
                </span>
                <span className="text-sm font-semibold">{procesando ? 'Procesando…' : 'Tomar o cargar foto'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
