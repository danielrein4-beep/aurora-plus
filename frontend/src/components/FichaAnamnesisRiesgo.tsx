import React, { useState, useEffect } from "react";

interface FichaAnamnesisRiesgoProps {
  pacienteId: number;
  pacienteNombre?: string;
}

interface DatosAnamnesis {
  alergia_anestesia: boolean;
  detalle_alergias: string;
  toma_anticoagulantes: boolean;
  profilaxis_antibiotica_requerida: boolean;
  trastorno_coagulacion: boolean;
  hipertension: boolean;
  diabetes: boolean;
  embarazo_lactancia: boolean;
  bruxismo_atm: boolean;
  tabaquismo: boolean;
  observaciones_medicas: string;
}

export const FichaAnamnesisRiesgo: React.FC<FichaAnamnesisRiesgoProps> = ({
  pacienteId,
  pacienteNombre,
}) => {
  const [datos, setDatos] = useState<DatosAnamnesis>({
    alergia_anestesia: false,
    detalle_alergias: "",
    toma_anticoagulantes: false,
    profilaxis_antibiotica_requerida: false,
    trastorno_coagulacion: false,
    hipertension: false,
    diabetes: false,
    embarazo_lactancia: false,
    bruxismo_atm: false,
    tabaquismo: false,
    observaciones_medicas: "",
  });

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarAnamnesis();
  }, [pacienteId]);

  const cargarAnamnesis = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch(`/api/salud/odontologia/anamnesis?pacienteId=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setDatos({
          alergia_anestesia: Boolean(d.alergia_anestesia),
          detalle_alergias: d.detalle_alergias || "",
          toma_anticoagulantes: Boolean(d.toma_anticoagulantes),
          profilaxis_antibiotica_requerida: Boolean(d.profilaxis_antibiotica_requerida),
          trastorno_coagulacion: Boolean(d.trastorno_coagulacion),
          hipertension: Boolean(d.hipertension),
          diabetes: Boolean(d.diabetes),
          embarazo_lactancia: Boolean(d.embarazo_lactancia),
          bruxismo_atm: Boolean(d.bruxismo_atm),
          tabaquismo: Boolean(d.tabaquismo),
          observaciones_medicas: d.observaciones_medicas || "",
        });
      }
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch("/api/salud/odontologia/anamnesis", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          alergiaAnestesia: datos.alergia_anestesia,
          detalleAlergias: datos.detalle_alergias,
          tomaAnticoagulantes: datos.toma_anticoagulantes,
          profilaxisAntibioticaRequerida: datos.profilaxis_antibiotica_requerida,
          trastornoCoagulacion: datos.trastorno_coagulacion,
          hipertension: datos.hipertension,
          diabetes: datos.diabetes,
          embarazoLactancia: datos.embarazo_lactancia,
          bruxismoAtm: datos.bruxismo_atm,
          tabaquismo: datos.tabaquismo,
          observacionesMedicas: datos.observaciones_medicas,
        }),
      });

      if (res.ok) {
        setMensaje("Ficha de anamnesis odontologica actualizada.");
        setTimeout(() => setMensaje(""), 3500);
      }
    } catch {
      setMensaje("Error al guardar la anamnesis.");
    } finally {
      setGuardando(false);
    }
  };

  const tieneRiesgoCritico =
    datos.alergia_anestesia ||
    datos.toma_anticoagulantes ||
    datos.profilaxis_antibiotica_requerida ||
    datos.trastorno_coagulacion;

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      {/* Alerta Quirurgica en Sillon */}
      {tieneRiesgoCritico ? (
        <div className="p-5 rounded-3xl bg-rose-500/20 border-2 border-rose-500 text-rose-900 dark:text-rose-200 space-y-2 shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
              ALERTA CLINICA EN SILLON: Paciente con Riesgo Quirurgico
            </h4>
          </div>
          <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
            {datos.alergia_anestesia && "ATENCION: Alergia a anestesicos locales registrada. Verificar formulacion sin parabenos o alternativa. "}
            {datos.toma_anticoagulantes && "PRECAUCION: Toma anticoagulantes. Riesgo de hemorragia en exodoncia/cirugia. "}
            {datos.profilaxis_antibiotica_requerida && "REQUERIMIENTO: Requiere profilaxis antibiotica previa al procedimiento. "}
            {datos.trastorno_coagulacion && "ADVERTENCIA: Trastorno de coagulacion en expediente."}
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="font-bold">Anamnesis sin alertas quirurgicas criticas reportadas</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Apto para procedimiento estandar</span>
        </div>
      )}

      {/* Formulario de Anamnesis */}
      <form onSubmit={handleGuardar} className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Ficha de Anamnesis Dental & Riesgo Medico
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paciente: <strong className="text-emerald-600 dark:text-emerald-400">{pacienteNombre || "Seleccionado"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {mensaje && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{mensaje}</span>}
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {guardando ? "Guardando..." : "Guardar Anamnesis"}
            </button>
          </div>
        </div>

        {/* Cuadricula de Antecedentes y Riesgos */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            1. Antecedentes Quirurgicos y Farmacologicos Criticos:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Alergia Anestesia */}
            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, alergia_anestesia: !p.alergia_anestesia }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.alergia_anestesia
                  ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Alergia a Anestesicos</span>
              <span className={`w-3 h-3 rounded-full ${datos.alergia_anestesia ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            {/* Anticoagulantes */}
            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, toma_anticoagulantes: !p.toma_anticoagulantes }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.toma_anticoagulantes
                  ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Toma Anticoagulantes</span>
              <span className={`w-3 h-3 rounded-full ${datos.toma_anticoagulantes ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            {/* Profilaxis Antibiotica */}
            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, profilaxis_antibiotica_requerida: !p.profilaxis_antibiotica_requerida }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.profilaxis_antibiotica_requerida
                  ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Profilaxis Antibiotica</span>
              <span className={`w-3 h-3 rounded-full ${datos.profilaxis_antibiotica_requerida ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            {/* Trastorno Coagulacion */}
            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, trastorno_coagulacion: !p.trastorno_coagulacion }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.trastorno_coagulacion
                  ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Trastorno Coagulacion</span>
              <span className={`w-3 h-3 rounded-full ${datos.trastorno_coagulacion ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>
          </div>

          {/* Campo detalle alergias si esta activo */}
          {datos.alergia_anestesia && (
            <div>
              <label className="text-[11px] text-rose-700 dark:text-rose-300 font-bold block mb-1">
                Especificar Alergias Anestesicas / Medicamentosas:
              </label>
              <input
                type="text"
                value={datos.detalle_alergias}
                onChange={(e) => setDatos((p) => ({ ...p, detalle_alergias: e.target.value }))}
                placeholder="Ej: Reaccion adversa a Lidocaina con epinefrina, alergia a penicilinas..."
                className="w-full p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-slate-900 dark:text-white placeholder-rose-400/50"
              />
            </div>
          )}
        </div>

        {/* Enfermedades Sistemicas y Condiciones */}
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            2. Condiciones Medicas Sistemicas:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, hipertension: !p.hipertension }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.hipertension
                  ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Hipertension Arterial</span>
              <span className={`w-3 h-3 rounded-full ${datos.hipertension ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, diabetes: !p.diabetes }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.diabetes
                  ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Diabetes Mellitus</span>
              <span className={`w-3 h-3 rounded-full ${datos.diabetes ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, embarazo_lactancia: !p.embarazo_lactancia }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.embarazo_lactancia
                  ? "bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Embarazo / Lactancia</span>
              <span className={`w-3 h-3 rounded-full ${datos.embarazo_lactancia ? "bg-purple-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, bruxismo_atm: !p.bruxismo_atm }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.bruxismo_atm
                  ? "bg-teal-500/20 border-teal-500 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Bruxismo / Trastorno ATM</span>
              <span className={`w-3 h-3 rounded-full ${datos.bruxismo_atm ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>

            <button
              type="button"
              onClick={() => setDatos((p) => ({ ...p, tabaquismo: !p.tabaquismo }))}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                datos.tabaquismo
                  ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/40"
                  : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <span>Tabaquismo</span>
              <span className={`w-3 h-3 rounded-full ${datos.tabaquismo ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}></span>
            </button>
          </div>
        </div>

        {/* Observaciones Generales */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
            Observaciones Medicas y Antecedentes Odontologicos:
          </label>
          <textarea
            rows={3}
            value={datos.observaciones_medicas}
            onChange={(e) => setDatos((p) => ({ ...p, observaciones_medicas: e.target.value }))}
            placeholder="Intervenciones quirurgicas previas, medicacion habitual, complicaciones anestesicas anteriores..."
            className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </form>
    </div>
  );
};

export default FichaAnamnesisRiesgo;
