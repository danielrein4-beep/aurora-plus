import { useState, useEffect } from "react";
import { IconTooth, IconClose } from "../Icons";
import {
  listarOdontograma, actualizarDienteOdontograma,
  type OdontogramaDiente, type EstadoDiente,
} from "../api";

// Notación FDI, orden estándar de presentación (como se ve al paciente de frente):
// arcada superior izquierda→derecha, arcada inferior izquierda→derecha.
const ARCADA_SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const ARCADA_INFERIOR = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const ESTADO_INFO: Record<EstadoDiente, { label: string; color: string; bg: string }> = {
  SANO: { label: "Sano", color: "#94a3b8", bg: "bg-slate-100 dark:bg-white/10" },
  CARIES: { label: "Caries", color: "#ef4444", bg: "bg-red-100 dark:bg-red-500/20" },
  OBTURADO: { label: "Obturado", color: "#0ea5e9", bg: "bg-sky-100 dark:bg-sky-500/20" },
  AUSENTE: { label: "Ausente", color: "#64748b", bg: "bg-slate-200 dark:bg-white/5" },
  CORONA: { label: "Corona", color: "#eab308", bg: "bg-amber-100 dark:bg-amber-500/20" },
  ENDODONCIA: { label: "Endodoncia", color: "#a855f7", bg: "bg-purple-100 dark:bg-purple-500/20" },
  EXTRACCION_INDICADA: { label: "Extracción indicada", color: "#f97316", bg: "bg-orange-100 dark:bg-orange-500/20" },
  IMPLANTE: { label: "Implante", color: "#14b8a6", bg: "bg-teal-100 dark:bg-teal-500/20" },
};

// Sextantes odontológicos estándar: 1-2 molares/premolares sup., 3 anterior sup.,
// 4 anterior inf., 5-6 molares/premolares inf. — puramente informativo, no afecta datos.
function sextanteDe(fdi: number): number {
  const cuadrante = Math.floor(fdi / 10);
  const posicion = fdi % 10;
  const esAnterior = posicion <= 3;
  if (cuadrante === 1) return esAnterior ? 2 : 1;
  if (cuadrante === 2) return esAnterior ? 2 : 3;
  if (cuadrante === 4) return esAnterior ? 5 : 6;
  if (cuadrante === 3) return esAnterior ? 5 : 4;
  return 0;
}

function Diente({ fdi, estado, onClick }: { fdi: number; estado: EstadoDiente; onClick: () => void }) {
  const info = ESTADO_INFO[estado];
  return (
    <button
      onClick={onClick}
      title={`Diente ${fdi} — ${info.label}`}
      className={`flex flex-col items-center gap-1 p-1.5 rounded-xl cursor-pointer transition-all hover:scale-110 ${info.bg}`}
    >
      <IconTooth size={22} />
      <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-white/50">{fdi}</span>
    </button>
  );
}

function ArcadaFila({ numeros, dientesPorFdi, onClickDiente }: {
  numeros: number[]; dientesPorFdi: Record<number, EstadoDiente>; onClickDiente: (fdi: number) => void;
}) {
  return (
    <div className="grid grid-cols-16 gap-0.5 sm:gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
      {numeros.map((fdi) => (
        <Diente key={fdi} fdi={fdi} estado={dientesPorFdi[fdi] || "SANO"} onClick={() => onClickDiente(fdi)} />
      ))}
    </div>
  );
}

export default function Odontograma({ pacienteId }: { pacienteId: number }) {
  const [dientes, setDientes] = useState<OdontogramaDiente[] | null>(null);
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null);
  const [estadoForm, setEstadoForm] = useState<EstadoDiente>("SANO");
  const [notasForm, setNotasForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => listarOdontograma(pacienteId).then(setDientes).catch(() => setDientes([]));
  useEffect(() => { cargar(); }, [pacienteId]);

  const dientesPorFdi: Record<number, EstadoDiente> = {};
  (dientes || []).forEach((d) => { dientesPorFdi[d.numeroFdi] = d.estado; });

  const abrirDiente = (fdi: number) => {
    setDienteSeleccionado(fdi);
    const existente = (dientes || []).find((d) => d.numeroFdi === fdi);
    setEstadoForm(existente?.estado || "SANO");
    setNotasForm(existente?.notas || "");
    setError(null);
  };

  const guardarDiente = async () => {
    if (dienteSeleccionado == null) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarDienteOdontograma(pacienteId, dienteSeleccionado, { estado: estadoForm, notas: notasForm || undefined });
      setDienteSeleccionado(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el diente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-300/60 dark:border-white/15 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <IconTooth size={20} />
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Odontograma Internacional FDI</h3>
      </div>

      {dientes === null ? (
        <p className="text-xs text-slate-400">Cargando odontograma…</p>
      ) : (
        <div className="space-y-4 overflow-x-auto">
          <div className="min-w-[560px] space-y-1">
            <ArcadaFila numeros={ARCADA_SUPERIOR} dientesPorFdi={dientesPorFdi} onClickDiente={abrirDiente} />
            <div className="flex justify-center py-1">
              <span className="text-[10px] text-slate-400 dark:text-white/30 font-semibold uppercase tracking-wider">Arcada Superior</span>
            </div>
          </div>
          <div className="min-w-[560px] space-y-1">
            <div className="flex justify-center py-1">
              <span className="text-[10px] text-slate-400 dark:text-white/30 font-semibold uppercase tracking-wider">Arcada Inferior</span>
            </div>
            <ArcadaFila numeros={ARCADA_INFERIOR} dientesPorFdi={dientesPorFdi} onClickDiente={abrirDiente} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-300/50 dark:border-white/10">
        {(Object.keys(ESTADO_INFO) as EstadoDiente[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-white/50">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ESTADO_INFO[k].color }} />
            {ESTADO_INFO[k].label}
          </div>
        ))}
      </div>

      {dienteSeleccionado != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDienteSeleccionado(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0d131f] text-slate-900 dark:text-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-['Outfit'] font-bold text-base">Diente {dienteSeleccionado} · Sextante {sextanteDe(dienteSeleccionado)}</h4>
              <button onClick={() => setDienteSeleccionado(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"><IconClose size={16} /></button>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">Estado</label>
              <select value={estadoForm} onChange={(e) => setEstadoForm(e.target.value as EstadoDiente)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm">
                {(Object.keys(ESTADO_INFO) as EstadoDiente[]).map((k) => (
                  <option key={k} value={k}>{ESTADO_INFO[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">Notas (opcional)</label>
              <textarea value={notasForm} onChange={(e) => setNotasForm(e.target.value)} rows={2}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={guardarDiente} disabled={guardando}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar diente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
