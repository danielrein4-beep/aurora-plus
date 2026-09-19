import React, { useState, useEffect } from "react";
import { type Paciente } from "../api";

interface AgendaSillonesOdontologiaProps {
  pacientes: Paciente[] | null;
  pacienteActivoId?: number | null;
}

interface CitaOdontologica {
  id: number;
  paciente_id: number;
  nombre_paciente: string;
  cedula_paciente: string;
  telefono_paciente: string;
  odontologo: string;
  especialidad: string;
  sillon_box: string;
  fecha_cita: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  estado: string;
  recordatorio_whatsapp_enviado: boolean;
}

const SILLONES = [
  { id: "SILLON_1", nombre: "Sillon 1 - Operatoria & Preventiva", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { id: "SILLON_2", nombre: "Sillon 2 - Endodoncia & Periodoncia", color: "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  { id: "BOX_QUIRURGICO", nombre: "Box Quirurgico - Implantes & Cirugia", color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
];

export const AgendaSillonesOdontologia: React.FC<AgendaSillonesOdontologiaProps> = ({
  pacientes,
  pacienteActivoId,
}) => {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [citas, setCitas] = useState<CitaOdontologica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [errorColision, setErrorColision] = useState("");
  const [notificacion, setNotificacion] = useState("");

  // Formulario nueva cita
  const [pacienteId, setPacienteId] = useState<number>(pacienteActivoId || (pacientes && pacientes[0] ? pacientes[0].id : 1));
  const [odontologo, setOdontologo] = useState("Dra. Odontologo Titular");
  const [especialidad, setEspecialidad] = useState("ODONTOLOGIA_GENERAL");
  const [sillonBox, setSillonBox] = useState("SILLON_1");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [motivo, setMotivo] = useState("Control y Restauracion");

  useEffect(() => {
    cargarCitas();
  }, [fechaSeleccionada]);

  const cargarCitas = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch(`/api/salud/odontologia/agenda?fecha=${fechaSeleccionada}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCitas(data);
      }
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  const handleCrearCita = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorColision("");

    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch("/api/salud/odontologia/agenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          odontologo,
          especialidad,
          sillonBox,
          fechaCita: fechaSeleccionada,
          horaInicio: horaInicio + ":00",
          horaFin: horaFin + ":00",
          motivo,
        }),
      });

      if (res.ok) {
        setModalNuevaCita(false);
        setNotificacion("Cita agendada correctamente sin colisiones.");
        cargarCitas();
        setTimeout(() => setNotificacion(""), 3500);
      } else if (res.status === 409) {
        setErrorColision("Colision de horario: El sillon ya esta reservado en ese intervalo.");
      } else {
        setErrorColision("Error al registrar la cita.");
      }
    } catch {
      setErrorColision("Fallo de conexion al guardar la cita.");
    }
  };

  const handleEnviarRecordatorioWhatsApp = async (citaId: number) => {
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch(`/api/salud/odontologia/agenda/${citaId}/whatsapp-recordatorio`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.waLink, "_blank");
        cargarCitas();
      }
    } catch {
      setNotificacion("No se pudo generar el enlace de WhatsApp.");
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      {/* Cabecera de Agenda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <span>Agenda Multidimensional de Sillones & Especialistas</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40">
              Cruce Sillones & WA
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Asignacion por Sillon / Odontobox con resolucion de colisiones y recordatorios 24h
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de fecha */}
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
          />

          <button
            type="button"
            onClick={() => setModalNuevaCita(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {notificacion && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          {notificacion}
        </div>
      )}

      {/* Tablero por Sillones (Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SILLONES.map((sillon) => {
          const citasSillon = citas.filter((c) => c.sillon_box === sillon.id);

          return (
            <div key={sillon.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 space-y-4 shadow-xl flex flex-col">
              <div className={`p-3 rounded-2xl border ${sillon.color} flex items-center justify-between`}>
                <span className="font-bold text-xs">{sillon.nombre}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/40 font-mono">
                  {citasSillon.length} Citas
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                {citasSillon.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/5 text-center text-slate-500 text-xs italic">
                    Sillon disponible para esta fecha.
                  </div>
                ) : (
                  citasSillon.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {c.hora_inicio.substring(0, 5)} - {c.hora_fin.substring(0, 5)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">{c.especialidad}</span>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{c.nombre_paciente}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Dr(a): {c.odontologo}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic">&ldquo;{c.motivo}&rdquo;</div>
                      </div>

                      {/* Boton de Recordatorio WhatsApp */}
                      <div className="pt-2 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {c.recordatorio_whatsapp_enviado ? "Recordatorio enviado" : "Pendiente recordatorio"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEnviarRecordatorioWhatsApp(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Recordatorio WA</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nueva Cita */}
      {modalNuevaCita && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-3xl p-6 max-w-lg w-full text-left space-y-4 shadow-2xl">
            <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Agendar Cita en Sillon Dental</h4>

            {errorColision && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold">
                {errorColision}
              </div>
            )}

            <form onSubmit={handleCrearCita} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Paciente *</label>
                <select
                  value={pacienteId}
                  onChange={(e) => setPacienteId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                >
                  {(pacientes || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - C.I. {p.cedula}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Sillon / Odontobox *</label>
                  <select
                    value={sillonBox}
                    onChange={(e) => setSillonBox(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="SILLON_1">Sillon 1 - Operatoria</option>
                    <option value="SILLON_2">Sillon 2 - Endodoncia</option>
                    <option value="BOX_QUIRURGICO">Box Quirurgico</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Especialista *</label>
                  <input
                    type="text"
                    required
                    value={odontologo}
                    onChange={(e) => setOdontologo(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-emerald-600 dark:text-emerald-400 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1">Hora Fin *</label>
                  <input
                    type="time"
                    required
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-emerald-600 dark:text-emerald-400 font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Motivo del Procedimiento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Endodoncia pieza 24, colocacion de perno y corona..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaCita(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black hover:brightness-110 transition"
                >
                  Agendar en Sillon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaSillonesOdontologia;
