import { useEffect, useRef, useState } from 'react';
import { CameraOff, QrCode, ScanLine } from 'lucide-react';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

interface Props {
  onResultado: (texto: string) => void;
  onSimular: () => void;
  codigoSimulado: string;
}

/**
 * Lector QR con la cámara trasera usando la API nativa BarcodeDetector
 * (Chrome/Edge en Android). Si no está disponible, queda el botón de simulación.
 */
export function QrScanner({ onResultado, onSimular, codigoSimulado }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelado = false;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

    (async () => {
      if (!Detector) {
        setError('Este navegador no lee QR de forma nativa. Usa Chrome en Android o el botón de simulación.');
        setActivo(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelado || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new Detector({ formats: ['qr_code'] });
        const loop = async () => {
          if (cancelado || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onResultado(codes[0].rawValue);
              setActivo(false);
              return;
            }
          } catch {
            /* frame no listo */
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setError('No se pudo abrir la cámara. Revisa los permisos o usa la simulación.');
        setActivo(false);
      }
    })();

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [activo, onResultado]);

  return (
    <div className="space-y-2">
      {activo && (
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-10 rounded-3xl border-2 border-white/80" />
          <ScanLine className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse text-white" size={48} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setError(null);
            setActivo((a) => !a);
          }}
        >
          {activo ? <CameraOff size={18} /> : <QrCode size={18} />}
          {activo ? 'Cerrar cámara' : 'Escanear QR'}
        </button>
        <button type="button" className="btn-ghost" onClick={onSimular}>
          <ScanLine size={18} /> Simular {codigoSimulado}
        </button>
      </div>
      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}
