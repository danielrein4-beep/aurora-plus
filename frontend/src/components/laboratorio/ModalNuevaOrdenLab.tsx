import { useState, useEffect } from "react";
import {
  listarPacientes,
  crearOrdenLaboratorio,
  type Paciente,
  type OrdenLaboratorio,
} from "../../api";

const PERFILES_FRECUENTES = [
  { nombre: "Perfil 20 (Rutina Completa)", examenes: "Hematología Completa, Glicemia, Urea, Creatinina, Ácido Úrico, Colesterol Total, HDL, LDL, Triglicéridos, TGO, TGP, Bilirrubina Total y Fraccionada, Fosfatasa Alcalina, Examen General de Orina" },
  { nombre: "Hematología & Coagulación", examenes: "Hematología Completa, Plaquetas, Tiempo de Protrombina (PT), Tiempo de Tromboplastina Parcial (PTT), Fibrinógeno" },
  { nombre: "Perfil Metabólico & Glicémico", examenes: "Glicemia en Ayunas, Hemoglobina Glicosilada (HbA1c), Insulina Basal, Curva de Tolerancia a la Glucosa" },
  { nombre: "Perfil Lipídico", examenes: "Colesterol Total, HDL, LDL, VLDL, Triglicéridos, Índice Aterogénico" },
  { nombre: "Perfil Renal", examenes: "Urea, Creatinina en Sangre, Depuración de Creatinina en Orina de 24h, Ácido Úrico, Examen General de Orina" },
  { nombre: "Perfil Hepático", examenes: "TGO (AST), TGP (ALT), Bilirrubina Total y Fraccionada, Fosfatasa Alcalina, GGT, Proteínas Totales y Fraccionadas" },
  { nombre: "Perfil Tiroideo", examenes: "TSH Ultrasensible, T3 Libre, T4 Libre, Anticuerpos Anti-TPO" },
  { nombre: "Uroanálisis & Heces", examenes: "Examen Simple de Orina, Urocultivo con Antibiograma, Coproanálisis, Sangre Oculta en Heces" },
];

export default function ModalNuevaOrdenLab({
  tenantId,
  pacientePreseleccionado,
  medicoNombre,
  onClose,
  onOrdenCreada,
}: {
  tenantId: number;
  pacientePreseleccionado?: Paciente | null;
  medicoNombre?: string;
  onClose: () => void;
  onOrdenCreada: (orden: OrdenLaboratorio) => void;
}) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState<number | "">(pacientePreseleccionado?.id || "");
  const [examenes, setExamenes] = useState("");
  const [indicaciones, setIndicaciones] = useState("Ayuno estricto de 10 a 12 horas. Evitar consumo de alcohol y grasas la noche anterior.");
  const [diagnostico, setDiagnostico] = useState("");
  const [labSugerido, setLabSugerido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pacientePreseleccionado) {
      listarPacientes(tenantId).then((res) => setPacientes(res));
    }
  }, [tenantId, pacientePreseleccionado]);

  const agregarPerfil = (perfilExamenes: string) => {
    if (!examenes.trim()) {
      setExamenes(perfilExamenes);
    } else {
      setExamenes((prev) => prev + "\n- " + perfilExamenes);
    }
  };

  const pacienteSeleccionado = pacientePreseleccionado || pacientes.find((p) => p.id === Number(pacienteId));

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pacienteSeleccionado) {
      setError("Selecciona el paciente antes de emitir la orden.");
      return;
    }
    if (!examenes.trim()) {
      setError("Indica al menos un examen (escríbelo o elige un perfil frecuente arriba).");
      return;
    }

    setGuardando(true);
    try {
      const nueva = await crearOrdenLaboratorio(tenantId, {
        pacienteId: pacienteSeleccionado.id,
        pacienteNombre: `${pacienteSeleccionado.nombres} ${pacienteSeleccionado.apellidos}`,
        pacienteCedula: pacienteSeleccionado.identificacion || "",
        pacienteTelefono: pacienteSeleccionado.telefono || "",
        medicoNombre: medicoNombre || "Dr. Médico Tratante",
        examenesSolicitados: examenes.trim(),
        indicacionesClinicas: indicaciones.trim(),
        diagnosticoPresuntivo: diagnostico.trim(),
        laboratorioSugerido: labSugerido.trim(),
      });

      onOrdenCreada(nueva);
    } catch (err) {
      setError("No se pudo emitir la orden: " + (err instanceof Error ? err.message : "error de red"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="max-w-2xl w-full max-h-[90vh] bg-gradient-to-b from-slate-900 to-slate-950 border border-teal-500/20 rounded-3xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
        {/* Header fijo — con acento de degradé, siempre visible aunque el formulario haga scroll */}
        <div className="relative flex-shrink-0 flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400" />
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center text-xl border border-teal-500/20 shadow-inner">
              🔬
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg sm:text-xl text-white leading-tight">
                Emitir Orden Digital de Laboratorio
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Genera un código con enlace y QR para que el laboratorio cargue los resultados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo con scroll propio — el header y el pie de acciones se quedan quietos */}
        <form id="form-orden-lab" onSubmit={handleCrear} className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-5">
          {error && (
            <div className="rounded-xl px-4 py-3 bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-start gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* PACIENTE */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Paciente <span className="text-teal-400">*</span>
            </label>
            {pacientePreseleccionado ? (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-300 font-semibold flex justify-between items-center">
                <span>{pacientePreseleccionado.nombres} {pacientePreseleccionado.apellidos}</span>
                <span className="text-xs font-mono text-slate-400">CI: {pacientePreseleccionado.identificacion}</span>
              </div>
            ) : (
              <select
                value={pacienteId}
                onChange={(e) => { setPacienteId(e.target.value ? Number(e.target.value) : ""); setError(null); }}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all cursor-pointer"
              >
                <option value="">Seleccione un paciente...</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombres} {p.apellidos} {p.identificacion ? `(CI: ${p.identificacion})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* CHIPS DE PERFILES RÁPIDOS */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              ⚡ Perfiles Frecuentes (clic para añadir)
            </label>
            <div className="flex flex-wrap gap-2">
              {PERFILES_FRECUENTES.map((perf, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => agregarPerfil(perf.examenes)}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-medium transition-all text-left flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title={perf.examenes}
                >
                  <span>➕</span> {perf.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* ÁREA DE EXÁMENES SOLICITADOS */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Exámenes Prescritos <span className="text-teal-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setExamenes("")}
                className="text-[11px] text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
              >
                Limpiar lista
              </button>
            </div>
            <textarea
              rows={4}
              value={examenes}
              onChange={(e) => { setExamenes(e.target.value); setError(null); }}
              placeholder="Escriba o seleccione los análisis a realizar..."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all font-mono leading-relaxed resize-none"
            />
          </div>

          {/* INDICACIONES & DIAGNÓSTICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Indicaciones Pre-Analíticas / Ayuno
              </label>
              <input
                type="text"
                value={indicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                placeholder="Ej. Ayuno 12h, primera orina"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Diagnóstico Presuntivo (Opcional)
              </label>
              <input
                type="text"
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="Ej. Control anual / Sospecha anemia"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Laboratorio Sugerido (Opcional)
            </label>
            <input
              type="text"
              value={labSugerido}
              onChange={(e) => setLabSugerido(e.target.value)}
              placeholder="Ej. A elección del paciente o Laboratorio Clínico Central"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
        </form>

        {/* Pie fijo con las acciones — siempre alcanzable, sin importar cuánto haya que scrollear arriba */}
        <div className="flex-shrink-0 flex gap-3 px-6 sm:px-8 py-4 border-t border-slate-800/80 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-orden-lab"
            disabled={guardando}
            className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {guardando ? "Generando Orden…" : "Emitir Orden Médica"}
          </button>
        </div>
      </div>
    </div>
  );
}
