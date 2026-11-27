import { useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  Compass,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileUp,
  FlaskConical,
  DoorOpen,
  Moon,
  Package,
  Sun,
  Trash2,
} from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';
import { FOTOS_REALES } from '../utils/fotosReales';
import type { Tema } from '../hooks/useDevice';
import type { AppData } from '../types';
import { descargarTexto, exportarCSV, exportarJSON } from '../utils/exportar';
import { diasDesdeRespaldo, leerRecuperacion, marcarRespaldo, validarYMigrar } from '../utils/persistencia';
import { BottomSheet } from './ui/BottomSheet';
import { useToast } from './ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  tema: Tema;
  toggleTema: () => void;
  onProductos: () => void;
  onEntrada: () => void;
  onGuia: () => void;
  onCierre: () => void;
}

type Confirmacion =
  | { tipo: 'importar'; data: AppData; nombre: string }
  | { tipo: 'vaciar' }
  | { tipo: 'demo' }
  | null;

const resumen = (d: AppData) =>
  `${d.lotes.length} lotes · ${d.compradores.length} compradores · ${d.liquidaciones.length} liquidaciones · ${d.bajas.length} bajas`;

const textoRespaldo = (dias: number | null) => {
  if (dias === null) return 'Aún no exportas un respaldo';
  if (dias <= 0) return 'Último respaldo: hoy';
  if (dias === 1) return 'Último respaldo: ayer';
  return `Último respaldo: hace ${dias} días`;
};

export function SettingsSheet({ open, onClose, tema, toggleTema, onProductos, onEntrada, onGuia, onCierre }: Props) {
  const { data, productos, guardadoOk, empezarVacio, cargarDemo, reemplazarDatos, recuperacion, descartarRecuperacion } =
    useWhisStore();
  const toast = useToast();
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const [dias, setDias] = useState(() => diasDesdeRespaldo());
  const archivoRef = useRef<HTMLInputElement>(null);

  const fila =
    'flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 text-left transition-all duration-200 hover:bg-surface2 active:scale-[0.99]';
  const icono = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2 text-muted';
  const respaldoViejo = data.modo === 'real' && (dias === null || dias >= 7);

  const cerrar = () => {
    setConfirmacion(null);
    onClose();
  };

  const leerArchivo = async (file: File) => {
    try {
      const r = validarYMigrar(JSON.parse(await file.text()));
      if (!r.ok) return toast('error', 'No se pudo importar', r.motivo);
      setConfirmacion({ tipo: 'importar', data: r.data, nombre: file.name });
    } catch {
      toast('error', 'No se pudo importar', 'El archivo no es un respaldo JSON válido.');
    }
  };

  const confirmar = () => {
    if (!confirmacion) return;
    if (confirmacion.tipo === 'importar') {
      reemplazarDatos(confirmacion.data);
      marcarRespaldo();
      setDias(0);
      toast('exito', 'Respaldo restaurado', resumen(confirmacion.data));
    } else if (confirmacion.tipo === 'vaciar') {
      empezarVacio();
      toast('exito', 'Listo para tus datos reales', 'Se borraron lotes, compradores e historial.');
    } else {
      cargarDemo();
      toast('info', 'Datos de demo cargados', 'Los compradores de ejemplo tienen teléfonos ficticios.');
    }
    cerrar();
  };

  return (
    <BottomSheet open={open} onClose={cerrar} title="Ajustes" subtitle="Whis · v0.3">
      <div className="space-y-1">
        {recuperacion && (
          <div className="mb-2 rounded-2xl bg-warn/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-warn">
              <AlertTriangle size={16} /> Datos anteriores sin abrir
            </p>
            <p className="mt-1 text-muted">
              {recuperacion.motivo}{' '}
              {recuperacion.copiaGuardada
                ? 'Se guardó una copia aparte; descárgala antes de descartarla.'
                : 'No se guardan cambios hasta que descargues la copia.'}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                className="btn-ghost"
                onClick={() => {
                  const raw = leerRecuperacion();
                  if (raw) descargarTexto(raw, `whis-datos-recuperados-${new Date().toISOString().slice(0, 10)}.json`);
                  else toast('error', 'No se encontró la copia');
                }}
              >
                <Download size={16} /> Descargar
              </button>
              <button className="btn w-full" onClick={descartarRecuperacion}>
                Descartar
              </button>
            </div>
          </div>
        )}

        <Fila
          clase={fila}
          icono={<span className={icono}><Package size={18} /></span>}
          titulo="Mis productos"
          detalle={`${productos.length} productos · vida útil, frío ideal y costo`}
          onClick={onProductos}
        />

        <Fila
          clase={fila}
          icono={<span className={icono}><DoorOpen size={18} /></span>}
          titulo="Pantalla de bienvenida"
          detalle="Ver la demo o empezar con tus datos"
          onClick={onEntrada}
        />

        <Fila
          clase={fila}
          icono={<span className={icono}><Compass size={18} /></span>}
          titulo="Guía rápida"
          detalle="Cómo usar Whis en 4 pasos"
          onClick={onGuia}
        />

        <Fila
          clase={fila}
          icono={<span className={icono}><ClipboardCheck size={18} /></span>}
          titulo="Cierre del día"
          detalle="Resumen de hoy para enviar por WhatsApp"
          onClick={onCierre}
        />

        <Fila icono={<span className={icono}>{tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</span>} clase={fila} onClick={toggleTema}
          titulo={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} detalle={tema === 'dark' ? 'Crema con verde (predeterminado)' : 'Verde selva de noche, descansa la vista'} />

        <Fila
          clase={fila}
          icono={<span className={icono}><FileSpreadsheet size={18} /></span>}
          titulo="Exportar Reporte CSV"
          detalle="Lotes, liquidaciones, bajas y apagones"
          onClick={() => {
            exportarCSV(data);
            toast('exito', 'Reporte CSV exportado', 'Ábrelo con Excel o Google Sheets.');
          }}
        />
        <Fila
          clase={fila}
          icono={<span className={`${icono} ${respaldoViejo ? 'bg-warn/15 text-warn' : ''}`}><FileJson size={18} /></span>}
          titulo="Exportar respaldo JSON"
          detalle={textoRespaldo(dias)}
          detalleClase={respaldoViejo ? 'text-warn' : undefined}
          onClick={() => {
            exportarJSON(data);
            marcarRespaldo();
            setDias(0);
            toast('exito', 'Respaldo JSON exportado', 'Guárdalo fuera del celular (Drive, correo o PC).');
          }}
        />
        <Fila
          clase={fila}
          icono={<span className={icono}><FileUp size={18} /></span>}
          titulo="Restaurar respaldo JSON"
          detalle="Reemplaza los datos de este equipo"
          onClick={() => archivoRef.current?.click()}
        />
        <input
          ref={archivoRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void leerArchivo(f);
          }}
        />

        <div className={`${fila} pointer-events-none`}>
          <span className={icono}>{data.modo === 'demo' ? <FlaskConical size={18} /> : <Database size={18} />}</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">
              {data.modo === 'demo' ? 'Modo demo (datos de ejemplo)' : 'Datos reales en este equipo'}
            </span>
            <span className={`block text-xs ${guardadoOk ? 'text-muted' : 'text-danger'}`}>
              {guardadoOk ? resumen(data) : 'Almacenamiento lleno: exporta un respaldo y libera espacio'}
            </span>
          </span>
        </div>

        <div className="pt-3">
          {confirmacion ? (
            <div className="animate-fade-in rounded-2xl bg-danger/10 p-3">
              <p className="mb-2 text-sm text-danger">
                {confirmacion.tipo === 'importar' &&
                  `Se reemplazarán los datos actuales (${resumen(data)}) por los de "${confirmacion.nombre}" (${resumen(confirmacion.data)}).`}
                {confirmacion.tipo === 'vaciar' &&
                  'Se borrarán todos los lotes, compradores, liquidaciones, bajas e historial de este equipo.'}
                {confirmacion.tipo === 'demo' && 'Se borrarán los datos actuales y se cargarán datos de ejemplo.'}{' '}
                {data.modo === 'real' && data.lotes.length > 0 && 'Exporta un respaldo antes si no lo hiciste.'} ¿Continuar?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => setConfirmacion(null)}>
                  Cancelar
                </button>
                <button className="btn-danger" onClick={confirmar}>
                  Sí, continuar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn w-full text-danger" onClick={() => setConfirmacion({ tipo: 'vaciar' })}>
                <Trash2 size={16} /> Borrar todo
              </button>
              <button className="btn w-full" onClick={() => setConfirmacion({ tipo: 'demo' })}>
                <FlaskConical size={16} /> Cargar demo
              </button>
            </div>
          )}
        </div>

        <details className="mt-3 rounded-2xl bg-surface2/60 px-3 py-2 text-xs text-muted">
          <summary className="cursor-pointer py-1 font-semibold text-ink">Créditos de las fotos</summary>
          <ul className="mt-1 space-y-1 pb-1">
            {FOTOS_REALES.map((f) => (
              <li key={f.clave}>
                {f.titulo}: foto de{' '}
                <a href={f.fuente} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                  {f.autor}
                </a>{' '}
                en iNaturalist, {f.licencia}.
              </li>
            ))}
          </ul>
        </details>
      </div>
    </BottomSheet>
  );
}

function Fila({
  clase,
  icono,
  titulo,
  detalle,
  detalleClase,
  onClick,
}: {
  clase: string;
  icono: ReactNode;
  titulo: string;
  detalle: string;
  detalleClase?: string;
  onClick: () => void;
}) {
  return (
    <button className={clase} onClick={onClick}>
      {icono}
      <span className="flex-1">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className={`block text-xs ${detalleClase ?? 'text-muted'}`}>{detalle}</span>
      </span>
    </button>
  );
}
