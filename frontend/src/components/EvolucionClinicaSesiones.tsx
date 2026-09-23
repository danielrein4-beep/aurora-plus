import React, { useState, useEffect } from "react";
import { leerSesion } from "../api";

// El objeto de sesion completo vive en localStorage["aurora_token"] (JSON.stringify),
// no el JWT crudo — hay que extraer el campo .token antes de mandarlo como Bearer.
function obtenerTokenSesion(): string {
  try {
    const raw = localStorage.getItem("aurora_token");
    if (!raw) return "";
    return JSON.parse(raw).token || "";
  } catch {
    return "";
  }
}


interface EvolucionClinicaSesionesProps {
  pacienteId: number;
  pacienteNombre?: string;
}

interface SesionOdonto {
  id: number;
  fecha_sesion: string;
  diente_fdi: number | null;
  procedimiento_realizado: string;
  tecnica_aislamiento: string;
  anestesia_administrada: string | null;
  conductometria_notas: string | null;
  medicacion_indicada: string | null;
  proxima_cita_conducta: string | null;
  odontologo: string;
  fecha_creacion: string;
}

export const EvolucionClinicaSesiones: React.FC<EvolucionClinicaSesionesProps> = ({
  pacienteId,
  pacienteNombre,
}) => {
  const [sesiones, setSesiones] = useState<SesionOdonto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Formulario de sesion
  const [dienteFdi, setDienteFdi] = useState<number | "">("");
  const [procedimiento, setProcedimiento] = useState("");
  const [aislamiento, setAislamiento] = useState("ABSOLUTO_DIQUE");
  const [anestesia, setAnestesia] = useState("1 carpule Lidocaina 2% con epinefrina 1:100.000");
  const [conductometria, setConductometria] = useState("");
  const [medicacion, setMedicacion] = useState("");
  const [proximaCita, setProximaCita] = useState("");
  const [odontologo, setOdontologo] = useState(() => leerSesion()?.username || "");

  useEffect(() => {
    cargarSesiones();
  }, [pacienteId]);

  const cargarSesiones = async () => {
    setCargando(true);
    try {
      const token = obtenerTokenSesion();
      const res = await fetch(`/api/salud/odontologia/evolucion?pacienteId=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSesiones(data);
      }
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedimiento.trim()) return;

    try {
      const token = obtenerTokenSesion();
      const res = await fetch("/api/salud/odontologia/evolucion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          fechaSesion: new Date().toISOString().slice(0, 10),
          dienteFdi: dienteFdi !== "" ? Number(dienteFdi) : null,
          procedimientoRealizado: procedimiento,
          tecnicaAislamiento: aislamiento,
          anestesiaAdministrada: anestesia,
          conductometriaNotas: conductometria,
          medicacionIndicada: medicacion,
          proximaCitaConducta: proximaCita,
          odontologo,
        }),
      });

      if (res.ok) {
        setModalNueva(false);
        setProcedimiento("");
        setConductometria("");
        setMedicacion("");
        setProximaCita("");
        setDienteFdi("");
        setMensaje("Nota de evolucion clinica guardada en expediente.");
        cargarSesiones();
      } else {
        setMensaje(`No se pudo guardar la sesion (error ${res.status}).`);
      }
      setTimeout(() => setMensaje(""), 3500);
    } catch {
      setMensaje("Fallo de conexion — la sesion NO se guardo.");
      setTimeout(() => setMensaje(""), 3500);
    }
  };

  const nombreAislamiento = (t: string) => {
    if (t === "ABSOLUTO_DIQUE") return "Aislamiento Absoluto (Dique de Goma)";
    if (t === "RELATIVO_ALGODON") return "Aislamiento Relativo (Rollos de Algodon)";
    return "Sin aislamiento especial";
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <span>Bitacora de Evolucion Clinica por Sesion</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
              Diario de Sillon
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro cronologico de visitas al sillon, procedimientos ejecutados y tecnica anestesica para {pacienteNombre || "Paciente Activo"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNueva(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nueva Nota de Sesion en Sillon</span>
        </button>
      </div>

      {mensaje && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold ${
          mensaje.includes("NO se") || mensaje.includes("No se pudo")
            ? "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300"
            : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
        }`}>
          {mensaje}
        </div>
      )}

      {/* Linea de Tiempo de Sesiones */}
      {sesiones.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 text-xs">
          No hay notas de evolucion registradas para este paciente. Haga clic en "Nueva Nota de Sesion en Sillon" para abrir la ficha de atencion.
        </div>
      ) : (
        <div className="space-y-4">
          {sesiones.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 space-y-4 shadow-xl text-xs"
            >
              {/* Encabezado de Sesion */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-black flex items-center justify-center border border-emerald-500/30 text-sm">
                    {s.diente_fdi ? s.diente_fdi : "GEN"}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {s.procedimiento_realizado}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Fecha: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{s.fecha_sesion}</span> &bull; Dr(a): {s.odontologo}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                    {nombreAislamiento(s.tecnica_aislamiento)}
                  </span>
                </div>
              </div>

              {/* Detalle de Anestesia y Notas Tecnicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {s.anestesia_administrada && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block mb-0.5">
                      Tecnica Anestesica / Farmaco:
                    </span>
                    <span className="text-slate-900 dark:text-white">{s.anestesia_administrada}</span>
                  </div>
                )}

                {s.conductometria_notas && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block mb-0.5">
                      Conductometria / Notas Operatorias:
                    </span>
                    <span className="text-slate-900 dark:text-white">{s.conductometria_notas}</span>
                  </div>
                )}
              </div>

              {/* Medicacion indicada y proxima cita */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {s.medicacion_indicada && (
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-200">
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase block mb-0.5">
                      Prescripcion Post-Atencion:
                    </span>
                    <span>{s.medicacion_indicada}</span>
                  </div>
                )}

                {s.proxima_cita_conducta && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-900 dark:text-cyan-200">
                    <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold uppercase block mb-0.5">
                      Proxima Cita & Plan a Seguir:
                    </span>
                    <span>{s.proxima_cita_conducta}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Sesion */}
      {modalNueva && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-3xl p-6 max-w-lg w-full text-left space-y-4 shadow-2xl">
            <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Registrar Evolucion en Sillon</h4>
            <form onSubmit={handleGuardarSesion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Pieza FDI Tratada</label>
                  <input
                    type="number"
                    min="11"
                    max="85"
                    placeholder="Ej: 16 o vacio para general"
                    value={dienteFdi}
                    onChange={(e) => setDienteFdi(e.target.value ? Number(e.target.value) : "")}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-center font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Odontologo Responsable *</label>
                  <input
                    type="text"
                    required
                    value={odontologo}
                    onChange={(e) => setOdontologo(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Procedimiento Clinico Realizado *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej: Apertura cameral, localizacion de 3 conductos, instrumentacion rotatoria a 21mm, irrigacion NaOCl..."
                  value={procedimiento}
                  onChange={(e) => setProcedimiento(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Tecnica de Aislamiento</label>
                  <select
                    value={aislamiento}
                    onChange={(e) => setAislamiento(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="ABSOLUTO_DIQUE">Absoluto (Dique de Goma)</option>
                    <option value="RELATIVO_ALGODON">Relativo (Rollos)</option>
                    <option value="NINGUNO">Sin Aislamiento</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Anestesia Administrada</label>
                  <input
                    type="text"
                    value={anestesia}
                    onChange={(e) => setAnestesia(e.target.value)}
                    placeholder="Ej: 1 carpule Lidocaina 2% con epi..."
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Conductometria / Longitudes de Trabajo / Notas Tecnicas</label>
                <input
                  type="text"
                  placeholder="Ej: MV: 21mm #25, DV: 20mm #25, P: 22mm #30. Sellador AH Plus..."
                  value={conductometria}
                  onChange={(e) => setConductometria(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Prescripcion Medicamentosa</label>
                  <input
                    type="text"
                    placeholder="Ej: Ibuprofeno 600mg c/8h x 3d"
                    value={medicacion}
                    onChange={(e) => setMedicacion(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Proxima Cita / Conducta</label>
                  <input
                    type="text"
                    placeholder="Ej: Obturacion definitiva en 7d"
                    value={proximaCita}
                    onChange={(e) => setProximaCita(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNueva(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black hover:brightness-110 transition"
                >
                  Guardar Nota de Evolucion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvolucionClinicaSesiones;
