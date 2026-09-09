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
    if (!pacienteSeleccionado) {
      alert("Por favor seleccione el paciente.");
      return;
    }
    if (!examenes.trim()) {
      alert("Por favor indique los exámenes o seleccione al menos un perfil.");
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
    } catch (err: any) {
      alert("Error al emitir la orden: " + (err.message || "Error de red"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xl">
              🔬
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-xl text-white">
                Emitir Orden Digital de Laboratorio
              </h3>
              <p className="text-xs text-slate-400">
                Se generará un código único con enlace y QR para que el laboratorio cargue los resultados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCrear} className="space-y-5">
          {/* PACIENTE */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Paciente <span className="text-teal-400">*</span>
            </label>
            {pacientePreseleccionado ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-300 font-semibold flex justify-between items-center">
                <span>{pacientePreseleccionado.nombres} {pacientePreseleccionado.apellidos}</span>
                <span className="text-xs font-mono text-slate-400">CI: {pacientePreseleccionado.identificacion}</span>
              </div>
            ) : (
              <select
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400"
                required
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
              ⚡ Perfiles Frecuentes (Clic para añadir):
            </label>
            <div className="flex flex-wrap gap-2">
              {PERFILES_FRECUENTES.map((perf, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => agregarPerfil(perf.examenes)}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-medium transition-all text-left flex items-center gap-1.5 active:scale-95"
                  title={perf.examenes}
                >
                  <span>➕</span> {perf.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* ÁREA DE EXÁMENES SOLICITADOS */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Exámenes Prescritos <span className="text-teal-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setExamenes("")}
                className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
              >
                Limpiar lista
              </button>
            </div>
            <textarea
              rows={4}
              value={examenes}
              onChange={(e) => setExamenes(e.target.value)}
              placeholder="Escriba o seleccione los análisis a realizar..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-teal-400 font-mono leading-relaxed"
              required
            />
          </div>

          {/* INDICACIONES & DIAGNÓSTICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Indicaciones Pre-Analíticas / Ayuno
              </label>
              <input
                type="text"
                value={indicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                placeholder="Ej. Ayuno 12h, primera orina"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Diagnóstico Presuntivo (Opcional)
              </label>
              <input
                type="text"
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="Ej. Control anual / Sospecha anemia"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Laboratorio Sugerido (Opcional)
            </label>
            <input
              type="text"
              value={labSugerido}
              onChange={(e) => setLabSugerido(e.target.value)}
              placeholder="Ej. A elección del paciente o Laboratorio Clínico Central"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
            >
              {guardando ? "Generando Orden..." : "Emitir Orden Médica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
