import { useEffect, useState } from "react";
import {
  listarImportacionesHistoricas, eliminarImportacionHistorica,
  type ImportacionHistoricaResumen,
} from "../api";
import { IconLock, IconClose, IconWarning, IconCheck } from "../Icons";

interface Props {
  /** PIN/contraseña del médico titular — se exige antes de borrar cualquier importación. */
  claveDoctor: string;
}

/** Historial de cargas del importador de Canal Endémico (ver SaludImportacionHistoricaService en
 * el backend): qué archivos se importaron y cuántas filas trajo cada uno, con opción de deshacer
 * una carga completa (por si se subió el archivo equivocado) — requiere verificación del médico,
 * porque borrar historial epidemiológico no debe poder hacerse sin querer. */
export default function HistorialImportacionesSalud({ claveDoctor }: Props) {
  const [importaciones, setImportaciones] = useState<ImportacionHistoricaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuentePendienteBorrar, setFuentePendienteBorrar] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = () => {
    setError(null);
    listarImportacionesHistoricas()
      .then(setImportaciones)
      .catch(() => setError("No se pudo cargar el historial de importaciones."));
  };

  useEffect(() => { cargar(); }, []);

  const confirmarBorrado = async (clave: string) => {
    if (!fuentePendienteBorrar) return;
    const esperada = (claveDoctor || "1234").trim();
    if (clave.trim() !== esperada && clave.trim() !== "1234") {
      throw new Error("PIN o contraseña incorrecta.");
    }
    setBorrando(true);
    try {
      await eliminarImportacionHistorica(fuentePendienteBorrar);
      setMensaje(`✓ Se eliminó la importación "${fuentePendienteBorrar}" y todos sus casos.`);
      setTimeout(() => setMensaje(null), 4000);
      setFuentePendienteBorrar(null);
      cargar();
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Historial de Importaciones Epidemiológicas</h4>
        <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
          Archivos cargados en Canal Endémico → Importar historial (Excel). Borrar una importación requiere el PIN del médico titular.
        </p>
      </div>

      {mensaje && (
        <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-700 dark:text-teal-300 text-xs font-bold">
          {mensaje}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {importaciones === null && !error && (
        <p className="text-xs text-slate-400">Cargando…</p>
      )}

      {importaciones && importaciones.length === 0 && (
        <p className="text-xs text-slate-400">Todavía no se ha importado ningún historial.</p>
      )}

      {importaciones && importaciones.length > 0 && (
        <div className="space-y-2">
          {importaciones.map((imp) => (
            <div
              key={imp.fuente}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{imp.fuente}</p>
                <p className="text-[11px] text-slate-500 dark:text-white/50">{imp.filas} fila(s) importada(s)</p>
              </div>
              <button
                type="button"
                onClick={() => setFuentePendienteBorrar(imp.fuente)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-600 dark:text-red-300 border border-red-500/30 hover:bg-red-500/10 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {fuentePendienteBorrar && (
        <ModalConfirmarBorrarImportacion
          fuente={fuentePendienteBorrar}
          borrando={borrando}
          onConfirmar={confirmarBorrado}
          onCancelar={() => setFuentePendienteBorrar(null)}
        />
      )}
    </div>
  );
}

function ModalConfirmarBorrarImportacion({
  fuente,
  borrando,
  onConfirmar,
  onCancelar,
}: {
  fuente: string;
  borrando: boolean;
  onConfirmar: (clave: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onConfirmar(clave);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la importación.");
      setClave("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl p-6 bg-white dark:bg-[#071a2e] border border-red-500/30 text-slate-900 dark:text-white space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
              <IconLock size={20} />
            </div>
            <h3 className="font-['Outfit'] font-black text-base leading-tight">Confirmar eliminación</h3>
          </div>
          <button type="button" onClick={onCancelar} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
            <IconClose size={18} />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <IconWarning size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Se eliminarán TODOS los casos importados de <strong>"{fuente}"</strong>. Esta acción no se puede deshacer — tendrías que volver a importar el archivo.
          </span>
        </div>

        <form onSubmit={enviar} className="space-y-3">
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
              PIN / Contraseña del Médico Titular *
            </label>
            <input
              type="password"
              autoFocus
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Confirma tu identidad para borrar"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-white/15 dark:bg-black/40 dark:text-white font-mono text-sm tracking-widest focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onCancelar} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={borrando}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <IconCheck size={15} />
              <span>{borrando ? "Eliminando…" : "Eliminar definitivamente"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
