import { useState } from 'react';
import { Database, FileJson, FileSpreadsheet, Moon, RotateCcw, Sun } from 'lucide-react';
import { useWhisStore } from '../hooks/useWhisStore';
import type { Tema } from '../hooks/useDevice';
import { exportarCSV, exportarJSON } from '../utils/exportar';
import { BottomSheet } from './ui/BottomSheet';
import { useToast } from './ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  tema: Tema;
  toggleTema: () => void;
}

export function SettingsSheet({ open, onClose, tema, toggleTema }: Props) {
  const { data, reiniciarDemo, guardadoOk } = useWhisStore();
  const toast = useToast();
  const [confirmando, setConfirmando] = useState(false);

  const fila = 'flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 text-left transition-all duration-200 hover:bg-surface2 active:scale-[0.99]';
  const icono = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2 text-muted';

  return (
    <BottomSheet open={open} onClose={() => { setConfirmando(false); onClose(); }} title="Ajustes" subtitle="Whis · v0.1 MVP">
      <div className="space-y-1">
        <button className={fila} onClick={toggleTema}>
          <span className={icono}>{tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Tema {tema === 'dark' ? 'claro (Warm Cream)' : 'oscuro (Obsidian)'}</span>
            <span className="block text-xs text-muted">Cambiar apariencia</span>
          </span>
        </button>
        <button
          className={fila}
          onClick={() => {
            exportarCSV(data);
            toast('exito', 'Reporte CSV exportado', 'Ábrelo con Excel o Google Sheets.');
          }}
        >
          <span className={icono}><FileSpreadsheet size={18} /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Exportar Reporte CSV</span>
            <span className="block text-xs text-muted">Lotes, liquidaciones, bajas y apagones</span>
          </span>
        </button>
        <button
          className={fila}
          onClick={() => {
            exportarJSON(data);
            toast('exito', 'Respaldo JSON exportado');
          }}
        >
          <span className={icono}><FileJson size={18} /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Exportar respaldo JSON</span>
            <span className="block text-xs text-muted">Copia completa de los datos locales</span>
          </span>
        </button>
        <div className={`${fila} pointer-events-none`}>
          <span className={icono}><Database size={18} /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Almacenamiento local</span>
            <span className={`block text-xs ${guardadoOk ? 'text-muted' : 'text-danger'}`}>
              {guardadoOk ? `${data.lotes.length} lotes · ${data.bajas.length} bajas · guardado en este equipo` : 'Almacenamiento lleno: exporta y reinicia'}
            </span>
          </span>
        </div>

        <div className="pt-3">
          {confirmando ? (
            <div className="animate-fade-in rounded-2xl bg-danger/10 p-3">
              <p className="mb-2 text-sm text-danger">Se borrarán todos los datos y se cargará la demo inicial. ¿Continuar?</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => setConfirmando(false)}>Cancelar</button>
                <button
                  className="btn-danger"
                  onClick={() => {
                    reiniciarDemo();
                    setConfirmando(false);
                    onClose();
                    toast('exito', 'Datos de demo reiniciados');
                  }}
                >
                  Sí, reiniciar
                </button>
              </div>
            </div>
          ) : (
            <button className="btn w-full text-danger" onClick={() => setConfirmando(true)}>
              <RotateCcw size={16} /> Reiniciar datos de demo
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
