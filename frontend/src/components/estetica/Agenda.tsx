import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  listarCitasPorRango, agendarCita, actualizarEstadoCita,
  type CitaMedica, type Paciente, type ProcedimientoMedico,
} from "../../api";
import { IconChevronLeft, IconChevronRight, IconWhatsApp } from "../../Icons";
import {
  Aviso, Boton, Campo, Cargando, EncabezadoPagina, Insignia, Modal, Tarjeta, Vacio, claseInput,
  enlaceWhatsApp, formatearFecha, hoyISO, mensajeError, sumarDias,
} from "./comun";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const ESTADO: Record<string, { t: string; c: "slate" | "rosa" | "verde" | "ambar" | "rojo" }> = {
  PROGRAMADA: { t: "Agendada", c: "slate" },
  CONFIRMADA: { t: "Confirmada", c: "rosa" },
  EN_SALA: { t: "Llegó", c: "ambar" },
  EN_CONSULTA: { t: "En cabina", c: "ambar" },
  ATENDIDA: { t: "Atendida", c: "verde" },
  CANCELADA: { t: "Cancelada", c: "rojo" },
  NO_ASISTIO: { t: "No vino", c: "rojo" },
};

function lunesDe(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  return sumarDias(fechaISO, dia === 0 ? -6 : 1 - dia);
}

function sumarMinutos(hora: string, min: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = Math.min(h * 60 + m + min, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function Agenda({ clientas, servicios, onCambio }: { clientas: Paciente[]; servicios: ProcedimientoMedico[]; onCambio?: () => void }) {
  const [dia, setDia] = useState(hoyISO());
  const [citas, setCitas] = useState<CitaMedica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);

  const lunes = lunesDe(dia);
  const semana = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)), [lunes]);

  const cargar = useCallback(async () => {
    try {
      setCitas(await listarCitasPorRango(semana[0], semana[6]));
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la agenda."));
    } finally {
      setCargando(false);
    }
  }, [semana]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  const delDia = citas
    .filter((c) => c.fecha === dia)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const cambiarEstado = async (c: CitaMedica, estado: string) => {
    try {
      await actualizarEstadoCita(c.id, estado);
      await cargar();
      onCambio?.();
    } catch (e) {
      setError(mensajeError(e, "No se pudo actualizar la cita."));
    }
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Agenda"
        subtitulo={`Semana del ${formatearFecha(semana[0])} al ${formatearFecha(semana[6])}`}
        acciones={<Boton onClick={() => setNueva(true)} disabled={clientas.length === 0}>Nueva cita</Boton>}
      />
      {error && <div className="mb-4"><Aviso onCerrar={() => setError(null)}>{error}</Aviso></div>}

      <Tarjeta className="p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setDia(sumarDias(dia, -7))} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer" aria-label="Semana anterior">
            <IconChevronLeft size={16} />
          </button>
          <div className="flex-1 grid grid-cols-7 gap-1">
            {semana.map((f) => {
              const n = citas.filter((c) => c.fecha === f && c.estado !== "CANCELADA").length;
              const [y, m, d] = f.split("-").map(Number);
              const activo = f === dia;
              const esHoy = f === hoyISO();
              return (
                <button
                  key={f}
                  onClick={() => setDia(f)}
                  className={`flex flex-col items-center py-2 rounded-xl transition cursor-pointer ${activo ? "bg-[#9E4A63] text-white" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${activo ? "text-white/80" : "text-slate-400"}`}>{DIAS[new Date(y, m - 1, d).getDay()]}</span>
                  <span className={`text-base font-bold ${activo ? "" : esHoy ? "text-[#9E4A63] dark:text-[#E3A6B4]" : "text-slate-800 dark:text-white"}`}>{d}</span>
                  <span className={`h-1.5 mt-0.5 flex gap-0.5`}>
                    {Array.from({ length: Math.min(n, 4) }).map((_, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${activo ? "bg-white" : "bg-[#E3A6B4]"}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setDia(sumarDias(dia, 7))} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer" aria-label="Semana siguiente">
            <IconChevronRight size={16} />
          </button>
        </div>
        {dia !== hoyISO() && (
          <div className="text-center mt-2">
            <button onClick={() => setDia(hoyISO())} className="text-xs font-semibold text-[#9E4A63] dark:text-[#E3A6B4] cursor-pointer">Ir a hoy</button>
          </div>
        )}
      </Tarjeta>

      <Tarjeta className="p-4 sm:p-5">
        {cargando ? (
          <Cargando texto="Cargando agenda…" />
        ) : delDia.length === 0 ? (
          <Vacio
            titulo="Sin citas este día"
            texto={clientas.length === 0 ? "Primero registra una clienta en Clientas." : undefined}
            accion={clientas.length > 0 ? <Boton tipo="secundario" onClick={() => setNueva(true)}>Agendar cita</Boton> : undefined}
          />
        ) : (
          <ul className="space-y-2">
            {delDia.map((c) => {
              const e = ESTADO[c.estado] ?? { t: c.estado, c: "slate" as const };
              const cerrada = ["ATENDIDA", "CANCELADA", "NO_ASISTIO"].includes(c.estado);
              const wa = !cerrada
                ? enlaceWhatsApp(c.paciente?.telefono, `Hola ${c.paciente?.nombres || ""}, te recordamos tu cita de ${c.motivo || "estética"} el ${formatearFecha(c.fecha)} a las ${c.horaInicio.slice(0, 5)}. ¿Nos confirmas tu asistencia?`)
                : null;
              return (
                <li key={c.id} className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10 ${cerrada ? "opacity-60" : ""}`}>
                  <div className="w-16 flex-shrink-0 text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{c.horaInicio.slice(0, 5)}</div>
                    <div className="text-[11px] text-slate-400">{c.horaFin.slice(0, 5)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.paciente?.nombreCompleto}</div>
                    <div className="text-xs text-slate-500 dark:text-white/50 truncate">{c.motivo || "Sin servicio indicado"}</div>
                  </div>
                  <Insignia color={e.c}>{e.t}</Insignia>
                  {!cerrada && (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" title="Recordar por WhatsApp" className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                          <IconWhatsApp size={16} />
                        </a>
                      )}
                      {c.estado === "PROGRAMADA" && <Boton tipo="secundario" className="!py-1.5 text-xs" onClick={() => cambiarEstado(c, "CONFIRMADA")}>Confirmó</Boton>}
                      <Boton className="!py-1.5 text-xs" onClick={() => cambiarEstado(c, "ATENDIDA")}>Atendida</Boton>
                      <select
                        className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1.5 text-slate-600 dark:text-white/70 cursor-pointer"
                        value=""
                        onChange={(ev) => ev.target.value && cambiarEstado(c, ev.target.value)}
                        aria-label="Más acciones"
                      >
                        <option value="">Más…</option>
                        <option value="NO_ASISTIO">No vino</option>
                        <option value="CANCELADA">Cancelar cita</option>
                      </select>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      {nueva && (
        <NuevaCita
          clientas={clientas}
          servicios={servicios}
          fechaInicial={dia}
          onCerrar={() => setNueva(false)}
          onGuardada={(fecha) => { setNueva(false); setDia(fecha); cargar(); onCambio?.(); }}
        />
      )}
    </div>
  );
}

function NuevaCita({ clientas, servicios, fechaInicial, onCerrar, onGuardada }: {
  clientas: Paciente[]; servicios: ProcedimientoMedico[]; fechaInicial: string; onCerrar: () => void; onGuardada: (fecha: string) => void;
}) {
  const [clientaId, setClientaId] = useState("");
  const [servicio, setServicio] = useState("");
  const [fecha, setFecha] = useState(fechaInicial < hoyISO() ? hoyISO() : fechaInicial);
  const [hora, setHora] = useState("09:00");
  const [duracion, setDuracion] = useState(60);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegirServicio = (nombre: string) => {
    setServicio(nombre);
    const s = servicios.find((x) => x.nombre === nombre);
    if (s?.duracionMinutos) setDuracion(s.duracionMinutos);
  };

  const guardar = async () => {
    if (!clientaId) { setError("Elige la clienta."); return; }
    setGuardando(true);
    setError(null);
    try {
      await agendarCita({
        pacienteId: Number(clientaId), fecha, horaInicio: hora, horaFin: sumarMinutos(hora, duracion),
        motivo: servicio.trim() || undefined, especialidad: "Estética",
      });
      onGuardada(fecha);
    } catch (e) {
      setError(mensajeError(e, "No se pudo agendar la cita."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Nueva cita" onCerrar={onCerrar}>
      <div className="space-y-3">
        <Campo label="Clienta">
          <select className={claseInput} value={clientaId} onChange={(e) => setClientaId(e.target.value)} autoFocus>
            <option value="">Elegir clienta…</option>
            {[...clientas].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es")).map((c) => (
              <option key={c.id} value={c.id}>{c.nombreCompleto}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Servicio">
          <input className={claseInput} list="servicios-agenda" value={servicio} onChange={(e) => elegirServicio(e.target.value)} placeholder="Limpieza facial" />
          <datalist id="servicios-agenda">{servicios.map((s) => <option key={s.id} value={s.nombre} />)}</datalist>
        </Campo>
        <div className="grid grid-cols-3 gap-3">
          <Campo label="Fecha"><input type="date" className={claseInput} value={fecha} min={hoyISO()} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo label="Hora"><input type="time" className={claseInput} value={hora} step={900} onChange={(e) => setHora(e.target.value)} /></Campo>
          <Campo label="Duración">
            <select className={claseInput} value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}>
              {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}`}</option>)}
            </select>
          </Campo>
        </div>
        <p className="text-xs text-slate-500">Termina a las {sumarMinutos(hora, duracion)}</p>
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Agendando…" : "Agendar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}
