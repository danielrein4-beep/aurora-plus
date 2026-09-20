import React, { useState, useMemo } from "react";
import { CitaPeluqueria, Especialista, ServicioPeluqueria, CitaEstado } from "./types";
import {
  IconCalendar,
  IconClock,
  IconUsers,
  IconCheck,
  IconClose,
  IconPlus,
  IconSparkles,
  IconChat,
  IconScissors,
  IconChevronLeft,
  IconChevronRight,
  IconCard,
} from "../../Icons";

interface Props {
  citas: CitaPeluqueria[];
  especialistas: Especialista[];
  servicios: ServicioPeluqueria[];
  onCrearCita: (cita: Omit<CitaPeluqueria, "id" | "fechaCreacion">) => void;
  onCambiarEstadoCita: (id: string, nuevoEstado: CitaEstado) => void;
  onIniciarCobroCita: (cita: CitaPeluqueria) => void;
}

type TipoVistaCalendario = "mes" | "semana" | "dia";

const ESTADO_BADGES: Record<CitaEstado, { label: string; bg: string; text: string; border: string }> = {
  CONFIRMADA: { label: "Confirmada", bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" },
  EN_SALA: { label: "En Sala", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  EN_ATENCION: { label: "En Sillón", bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/40" },
  FINALIZADA: { label: "Cobrada", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  CANCELADA: { label: "Cancelada", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  NO_ASISTIO: { label: "No Asistió", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const formatYYYYMMDD = (y: number, m: number, d: number): string => {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

export default function AgendaReservasPeluqueria({
  citas,
  especialistas,
  servicios,
  onCrearCita,
  onCambiarEstadoCita,
  onIniciarCobroCita,
}: Props) {
  const hoyObj = new Date();
  const hoyStr = formatYYYYMMDD(hoyObj.getFullYear(), hoyObj.getMonth(), hoyObj.getDate());

  const [vista, setVista] = useState<TipoVistaCalendario>("mes");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyStr);
  const [fechaReferencia, setFechaReferencia] = useState<Date>(new Date());
  const [filtroEspecialista, setFiltroEspecialista] = useState<string>("TODOS");

  const [modalNuevaCita, setModalNuevaCita] = useState(false);
  const [citaSeleccionadaModal, setCitaSeleccionadaModal] = useState<CitaPeluqueria | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formEspecialistaId, setFormEspecialistaId] = useState(especialistas[0]?.id || "");
  const [formServicioId, setFormServicioId] = useState(servicios[0]?.id || "");
  const [formFecha, setFormFecha] = useState(fechaSeleccionada);
  const [formHora, setFormHora] = useState("10:00");
  const [formNotas, setFormNotas] = useState("");

  const handleNavegar = (direccion: "prev" | "next" | "hoy") => {
    if (direccion === "hoy") {
      const hoy = new Date();
      setFechaReferencia(hoy);
      setFechaSeleccionada(formatYYYYMMDD(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
      return;
    }

    const delta = direccion === "next" ? 1 : -1;
    const nuevaRef = new Date(fechaReferencia);

    if (vista === "mes") {
      nuevaRef.setMonth(nuevaRef.getMonth() + delta);
    } else if (vista === "semana") {
      nuevaRef.setDate(nuevaRef.getDate() + delta * 7);
    } else {
      nuevaRef.setDate(nuevaRef.getDate() + delta);
      setFechaSeleccionada(formatYYYYMMDD(nuevaRef.getFullYear(), nuevaRef.getMonth(), nuevaRef.getDate()));
    }
    setFechaReferencia(nuevaRef);
  };

  const tituloNavegacion = useMemo(() => {
    const y = fechaReferencia.getFullYear();
    const m = fechaReferencia.getMonth();

    if (vista === "mes") {
      return `${MESES_ES[m]} ${y}`;
    }

    if (vista === "semana") {
      const dayOfWeek = (fechaReferencia.getDay() + 6) % 7;
      const lun = new Date(y, m, fechaReferencia.getDate() - dayOfWeek);
      const dom = new Date(y, m, fechaReferencia.getDate() - dayOfWeek + 6);
      return `${lun.getDate()} ${MESES_ES[lun.getMonth()].slice(0, 3)} - ${dom.getDate()} ${MESES_ES[dom.getMonth()].slice(0, 3)} ${y}`;
    }

    const [selY, selM, selD] = fechaSeleccionada.split("-").map(Number);
    const dateObj = new Date(selY, selM - 1, selD);
    const nombreDia = DIAS_SEMANA_CORTOS[(dateObj.getDay() + 6) % 7];
    return `${nombreDia}, ${selD} de ${MESES_ES[selM - 1]} ${selY}`;
  }, [vista, fechaReferencia, fechaSeleccionada]);
  const diasMes = useMemo(() => {
    const y = fechaReferencia.getFullYear();
    const m = fechaReferencia.getMonth();

    const primerDiaMes = new Date(y, m, 1);
    const diaInicioSemana = (primerDiaMes.getDay() + 6) % 7;

    const totalDiasMes = new Date(y, m + 1, 0).getDate();
    const totalDiasMesPrev = new Date(y, m, 0).getDate();

    const resultado: { day: number; dateStr: string; esMesActual: boolean }[] = [];

    for (let i = diaInicioSemana - 1; i >= 0; i--) {
      const d = totalDiasMesPrev - i;
      resultado.push({
        day: d,
        dateStr: formatYYYYMMDD(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, d),
        esMesActual: false,
      });
    }

    for (let d = 1; d <= totalDiasMes; d++) {
      resultado.push({
        day: d,
        dateStr: formatYYYYMMDD(y, m, d),
        esMesActual: true,
      });
    }

    const sobrantes = 7 - (resultado.length % 7);
    if (sobrantes < 7) {
      for (let d = 1; d <= sobrantes; d++) {
        resultado.push({
          day: d,
          dateStr: formatYYYYMMDD(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, d),
          esMesActual: false,
        });
      }
    }

    return resultado;
  }, [fechaReferencia]);

  const diasSemana = useMemo(() => {
    const y = fechaReferencia.getFullYear();
    const m = fechaReferencia.getMonth();
    const dayOfWeek = (fechaReferencia.getDay() + 6) % 7;
    const lunes = new Date(y, m, fechaReferencia.getDate() - dayOfWeek);

    const resultado: { dayNumber: number; dayName: string; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      resultado.push({
        dayNumber: d.getDate(),
        dayName: DIAS_SEMANA_CORTOS[i],
        dateStr: formatYYYYMMDD(d.getFullYear(), d.getMonth(), d.getDate()),
      });
    }
    return resultado;
  }, [fechaReferencia]);

  const citasPorFecha = useMemo(() => {
    const mapa: Record<string, CitaPeluqueria[]> = {};
    citas.forEach((c) => {
      if (filtroEspecialista !== "TODOS" && c.especialistaId !== filtroEspecialista) {
        return;
      }
      if (!mapa[c.fecha]) mapa[c.fecha] = [];
      mapa[c.fecha].push(c);
    });

    Object.keys(mapa).forEach((fecha) => {
      mapa[fecha].sort((a, b) => a.hora.localeCompare(b.hora));
    });

    return mapa;
  }, [citas, filtroEspecialista]);

  const citasDiaSeleccionado = useMemo(() => {
    return citasPorFecha[fechaSeleccionada] || [];
  }, [citasPorFecha, fechaSeleccionada]);

  const metricasDia = useMemo(() => {
    const total = citasDiaSeleccionado.length;
    const enSillon = citasDiaSeleccionado.filter((c) => c.estado === "EN_ATENCION").length;
    const enEspera = citasDiaSeleccionado.filter((c) => c.estado === "EN_SALA").length;
    const finalizadas = citasDiaSeleccionado.filter((c) => c.estado === "FINALIZADA").length;
    return { total, enSillon, enEspera, finalizadas };
  }, [citasDiaSeleccionado]);

  const handleGuardarCita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const esp = especialistas.find((e) => e.id === formEspecialistaId) || especialistas[0];
    const srv = servicios.find((s) => s.id === formServicioId) || servicios[0];

    onCrearCita({
      clienteNombre: formNombre.trim(),
      clienteTelefono: formTelefono.trim() || "+58 412 000-0000",
      especialistaId: esp.id,
      especialistaNombre: esp.nombre,
      servicioId: srv.id,
      servicioNombre: srv.nombre,
      fecha: formFecha,
      hora: formHora,
      duracionMinutos: srv.duracionMinutos,
      precioEstimadoUSD: srv.precioUSD,
      estado: "CONFIRMADA",
      esWalkIn: false,
      notas: formNotas.trim() || undefined,
    });

    setFormNombre("");
    setFormTelefono("");
    setFormNotas("");
    setModalNuevaCita(false);
  };

  const abrirModalNuevaCitaEnFecha = (fechaStr: string) => {
    setFormFecha(fechaStr);
    setModalNuevaCita(true);
  };

  const enviarWhatsAppCita = (cita: CitaPeluqueria) => {
    const texto = `Hola ${cita.clienteNombre}. Te recordamos tu cita para *${cita.servicioNombre}* con *${cita.especialistaNombre}* el día *${cita.fecha}* a las *${cita.hora}*. Te esperamos en nuestro salón. Nos confirmas tu asistencia?`;
    const url = `https://wa.me/${cita.clienteTelefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };
  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE CONTROL DEL CALENDARIO */}
      <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Selector de Vistas: Mes | Semana | Día */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {(["mes", "semana", "dia"] as TipoVistaCalendario[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                vista === v
                  ? "bg-teal-500 text-black shadow-md font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {v === "mes" ? "Mes" : v === "semana" ? "Semana" : "Día"}
            </button>
          ))}
        </div>

        {/* Controles de Navegación de Fechas */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => handleNavegar("prev")}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 transition-colors cursor-pointer"
            title="Anterior"
          >
            <IconChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleNavegar("hoy")}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/90 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => handleNavegar("next")}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 transition-colors cursor-pointer"
            title="Siguiente"
          >
            <IconChevronRight size={16} />
          </button>

          <h2 className="font-['Outfit'] font-black text-base sm:text-xl text-white ml-2">
            {tituloNavegacion}
          </h2>
        </div>

        {/* Filtros y Acción Principal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
            <IconUsers size={14} className="text-rose-400" />
            <select
              value={filtroEspecialista}
              onChange={(e) => setFiltroEspecialista(e.target.value)}
              className="bg-transparent text-white border-none focus:outline-none cursor-pointer text-xs"
            >
              <option value="TODOS" className="bg-slate-900 text-white">Todos los Especialistas</option>
              {especialistas.map((esp) => (
                <option key={esp.id} value={esp.id} className="bg-slate-900 text-white">
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => abrirModalNuevaCitaEnFecha(fechaSeleccionada)}
            className="btn-cyber-neon px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            <IconPlus size={14} />
            <span>+ Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: MENSUAL COMPLETA */}
      {vista === "mes" && (
        <div className="apple-glass rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold text-white/50 uppercase tracking-wider py-1 border-b border-white/10">
            {DIAS_SEMANA_CORTOS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {diasMes.map((cell, idx) => {
              const citasEsteDia = citasPorFecha[cell.dateStr] || [];
              const esHoy = cell.dateStr === hoyStr;
              const esSeleccionado = cell.dateStr === fechaSeleccionada;

              return (
                <div
                  key={idx}
                  onClick={() => setFechaSeleccionada(cell.dateStr)}
                  className={`min-h-[105px] sm:min-h-[120px] p-2 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group relative ${
                    esSeleccionado
                      ? "bg-teal-500/15 border-teal-400 shadow-lg shadow-teal-500/10"
                      : cell.esMesActual
                      ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20"
                      : "bg-white/[0.01] border-white/5 opacity-40 hover:opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-black font-['Outfit'] rounded-lg px-1.5 py-0.5 ${
                        esHoy
                          ? "bg-teal-400 text-black font-bold"
                          : esSeleccionado
                          ? "text-teal-300 font-bold"
                          : "text-white"
                      }`}
                    >
                      {cell.day}
                    </span>

                    <div className="flex items-center gap-1">
                      {citasEsteDia.length > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300">
                          {citasEsteDia.length}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalNuevaCitaEnFecha(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/10 hover:bg-teal-500 hover:text-black text-white text-[10px] transition-all cursor-pointer"
                        title="Agendar cita en este día"
                      >
                        <IconPlus size={10} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {citasEsteDia.slice(0, 3).map((c) => {
                      const badge = ESTADO_BADGES[c.estado] || ESTADO_BADGES.CONFIRMADA;
                      return (
                        <div
                          key={c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCitaSeleccionadaModal(c);
                          }}
                          className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-lg border truncate font-medium flex items-center gap-1 cursor-pointer hover:scale-[1.02] transition-transform ${badge.bg} ${badge.border} ${badge.text}`}
                          title={`${c.hora} - ${c.clienteNombre} (${c.servicioNombre})`}
                        >
                          <span className="font-mono font-bold">{c.hora}</span>
                          <span className="truncate">{c.clienteNombre}</span>
                        </div>
                      );
                    })}

                    {citasEsteDia.length > 3 && (
                      <div className="text-[10px] font-mono text-white/50 text-right pr-1">
                        +{citasEsteDia.length - 3} más
                      </div>
                    )}
                  </div>

                  {citasEsteDia.length > 0 && (
                    <div className="pt-1 text-[9px] text-teal-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                      <span>Ver detalles</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-white/70">
              <span>Día Seleccionado:</span>
              <span className="font-bold text-white font-mono">{fechaSeleccionada}</span>
              <span>({citasDiaSeleccionado.length} citas programadas)</span>
            </div>

            <button
              type="button"
              onClick={() => setVista("dia")}
              className="text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir vista detallada de este día</span>
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {/* VISTA 2: SEMANAL */}
      {vista === "semana" && (
        <div className="apple-glass rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {diasSemana.map((col) => {
              const citasDelDia = citasPorFecha[col.dateStr] || [];
              const esHoy = col.dateStr === hoyStr;
              const esSeleccionado = col.dateStr === fechaSeleccionada;

              return (
                <div
                  key={col.dateStr}
                  onClick={() => setFechaSeleccionada(col.dateStr)}
                  className={`rounded-2xl border p-3 flex flex-col justify-between transition-all min-h-[320px] cursor-pointer ${
                    esSeleccionado
                      ? "bg-teal-500/10 border-teal-400/80 shadow-lg shadow-teal-500/10"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="border-b border-white/10 pb-2 mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-white/50 uppercase font-bold">
                        {col.dayName}
                      </div>
                      <div className={`text-lg font-black font-['Outfit'] ${esHoy ? "text-teal-300" : "text-white"}`}>
                        {col.dayNumber}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalNuevaCitaEnFecha(col.dateStr);
                      }}
                      className="p-1 rounded-lg bg-white/5 hover:bg-teal-500 hover:text-black text-white/70 transition-colors cursor-pointer"
                      title="Agendar cita en este día"
                    >
                      <IconPlus size={12} />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {citasDelDia.length === 0 ? (
                      <div className="text-[11px] text-white/30 text-center py-8">
                        Sin citas
                      </div>
                    ) : (
                      citasDelDia.map((c) => {
                        const badge = ESTADO_BADGES[c.estado] || ESTADO_BADGES.CONFIRMADA;
                        return (
                          <div
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCitaSeleccionadaModal(c);
                            }}
                            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-teal-400/50 transition-all cursor-pointer space-y-1 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded">
                                {c.hora}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-white truncate">
                              {c.clienteNombre}
                            </div>
                            <div className="text-[11px] text-white/60 truncate">
                              {c.servicioNombre}
                            </div>
                            <div className="text-[10px] text-rose-300/80 font-mono">
                              {c.especialistaNombre.split(" ")[0]}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {citasDelDia.length > 0 && (
                    <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-white/40 text-center">
                      {citasDelDia.length} citas
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: DÍA DETALLADA */}
      {vista === "dia" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="apple-glass rounded-2xl p-4 border border-white/10 bg-slate-900/40">
              <div className="text-slate-400 text-xs font-mono uppercase tracking-wider">Citas del Día</div>
              <div className="text-2xl font-black text-white font-['Outfit'] mt-1">{metricasDia.total}</div>
              <div className="text-[11px] text-teal-400 mt-0.5 font-mono">{fechaSeleccionada}</div>
            </div>
            <div className="apple-glass rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
              <div className="text-rose-300 text-xs font-mono uppercase tracking-wider">En Sillón</div>
              <div className="text-2xl font-black text-rose-400 font-['Outfit'] mt-1">{metricasDia.enSillon}</div>
              <div className="text-[11px] text-rose-300/70 mt-0.5">Atención en proceso</div>
            </div>
            <div className="apple-glass rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="text-amber-300 text-xs font-mono uppercase tracking-wider">En Sala de Espera</div>
              <div className="text-2xl font-black text-amber-400 font-['Outfit'] mt-1">{metricasDia.enEspera}</div>
              <div className="text-[11px] text-amber-300/70 mt-0.5">Listas para ser llamadas</div>
            </div>
            <div className="apple-glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
              <div className="text-emerald-300 text-xs font-mono uppercase tracking-wider">Cobradas / Finalizadas</div>
              <div className="text-2xl font-black text-emerald-400 font-['Outfit'] mt-1">{metricasDia.finalizadas}</div>
              <div className="text-[11px] text-emerald-300/70 mt-0.5">Completadas hoy</div>
            </div>
          </div>

          {citasDiaSeleccionado.length === 0 ? (
            <div className="apple-glass rounded-3xl p-12 text-center border border-white/10 space-y-3">
              <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
                <IconScissors size={28} />
              </div>
              <h3 className="font-['Outfit'] font-bold text-lg text-white">
                No hay citas para {fechaSeleccionada}
              </h3>
              <p className="text-white/50 text-xs max-w-sm mx-auto">
                Puedes agendar una nueva cita para este día con el botón superior.
              </p>
              <button
                type="button"
                onClick={() => abrirModalNuevaCitaEnFecha(fechaSeleccionada)}
                className="px-4 py-2 rounded-xl bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 transition-colors cursor-pointer"
              >
                Agendar Cita en Esta Fecha
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {citasDiaSeleccionado.map((cita) => {
                const badge = ESTADO_BADGES[cita.estado] || ESTADO_BADGES.CONFIRMADA;
                return (
                  <div
                    key={cita.id}
                    className="apple-glass rounded-2xl p-5 border border-white/10 hover:border-teal-400/40 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg">
                            {cita.hora}
                          </span>
                          <span className="text-[11px] text-white/40 flex items-center gap-1">
                            <IconClock size={12} /> {cita.duracionMinutos} min
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </div>

                      <h4 className="font-['Outfit'] font-black text-lg text-white group-hover:text-teal-300 transition-colors">
                        {cita.clienteNombre}
                      </h4>
                      <div className="text-white/50 text-xs font-mono">{cita.clienteTelefono}</div>

                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/40">Servicio:</span>
                          <span className="font-semibold text-white truncate">{cita.servicioNombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Especialista:</span>
                          <span className="font-semibold text-rose-300">{cita.especialistaNombre}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40">Estimado:</span>
                          <span className="font-mono font-bold text-teal-300">${cita.precioEstimadoUSD.toFixed(2)} USD</span>
                        </div>
                        {cita.notas && (
                          <div className="mt-2 text-[11px] text-white/60 bg-white/5 p-2 rounded-lg italic">
                            "{cita.notas}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-2">
                        {cita.estado === "CONFIRMADA" && (
                          <button
                            type="button"
                            onClick={() => onCambiarEstadoCita(cita.id, "EN_SALA")}
                            className="w-full py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                          >
                            En Sala
                          </button>
                        )}

                        {cita.estado !== "EN_ATENCION" && cita.estado !== "FINALIZADA" && (
                          <button
                            type="button"
                            onClick={() => onCambiarEstadoCita(cita.id, "EN_ATENCION")}
                            className="w-full py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-colors cursor-pointer"
                          >
                            Sentar en Sillón
                          </button>
                        )}

                        {cita.estado !== "FINALIZADA" && (
                          <button
                            type="button"
                            onClick={() => onIniciarCobroCita(cita)}
                            className="w-full py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <IconCard size={12} />
                            <span>Cobrar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => enviarWhatsAppCita(cita)}
                          className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-teal-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <IconChat size={12} />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCitaSeleccionadaModal(cita)}
                        className="w-full py-1 text-[11px] text-white/40 hover:text-white transition-colors text-center cursor-pointer"
                      >
                        Ver detalles completos & Cambiar estado
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALLE DE CITA */}
      {citaSeleccionadaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-500/40 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-mono text-teal-400 font-bold">Detalle y Gestión de Cita</span>
                <h3 className="font-['Outfit'] font-black text-xl text-white">
                  {citaSeleccionadaModal.clienteNombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCitaSeleccionadaModal(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-white/40 block text-[10px]">Fecha & Hora</span>
                <span className="text-white font-bold font-mono">
                  {citaSeleccionadaModal.fecha} a las {citaSeleccionadaModal.hora}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-white/40 block text-[10px]">Especialista</span>
                <span className="text-rose-300 font-bold truncate block">
                  {citaSeleccionadaModal.especialistaNombre}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-white/40 block text-[10px]">Servicio</span>
                <span className="text-white font-bold truncate block">
                  {citaSeleccionadaModal.servicioNombre}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-white/40 block text-[10px]">Precio Estimado</span>
                <span className="text-teal-300 font-bold font-mono">
                  ${citaSeleccionadaModal.precioEstimadoUSD.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/50">Teléfono:</span>
                <span className="font-mono text-white">{citaSeleccionadaModal.clienteTelefono}</span>
              </div>
              {citaSeleccionadaModal.notas && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-white/70 italic text-[11px] mt-2">
                  "{citaSeleccionadaModal.notas}"
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2">
                Actualizar Estado de la Cita:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["CONFIRMADA", "EN_SALA", "EN_ATENCION", "FINALIZADA", "CANCELADA", "NO_ASISTIO"] as CitaEstado[]).map((st) => {
                  const b = ESTADO_BADGES[st];
                  const esActivo = citaSeleccionadaModal.estado === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        onCambiarEstadoCita(citaSeleccionadaModal.id, st);
                        setCitaSeleccionadaModal({ ...citaSeleccionadaModal, estado: st });
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer truncate ${
                        esActivo
                          ? `${b.bg} ${b.border} ${b.text} ring-2 ring-teal-400/50 scale-[1.02]`
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => enviarWhatsAppCita(citaSeleccionadaModal)}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <IconChat size={14} />
                <span>Enviar WhatsApp</span>
              </button>

              {citaSeleccionadaModal.estado !== "FINALIZADA" && (
                <button
                  type="button"
                  onClick={() => {
                    onIniciarCobroCita(citaSeleccionadaModal);
                    setCitaSeleccionadaModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black text-xs font-bold hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
                >
                  <IconCard size={14} />
                  <span>Cobrar en Caja</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA */}
      {modalNuevaCita && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-500/40 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalNuevaCita(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <IconClose size={18} />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-mono uppercase mb-2">
                <IconScissors size={12} />
                <span>Agendar Cita en Salón</span>
              </div>
              <h3 className="font-['Outfit'] font-black text-2xl text-white">Nueva Reserva</h3>
              <p className="text-white/60 text-xs">Ingresa los datos para registrar la cita en el calendario.</p>
            </div>

            <form onSubmit={handleGuardarCita} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-white/70 mb-1">Nombre de la Clienta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Laura Pérez"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-white/70 mb-1">Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="+58 412 000-0000"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-white/70 mb-1">Especialista</label>
                  <select
                    value={formEspecialistaId}
                    onChange={(e) => setFormEspecialistaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                  >
                    {especialistas.map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        {esp.nombre} ({esp.rol.split("&")[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-white/70 mb-1">Servicio</label>
                  <select
                    value={formServicioId}
                    onChange={(e) => setFormServicioId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                  >
                    {servicios.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.nombre} (${srv.precioUSD} USD)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-white/70 mb-1">Fecha de la Cita</label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-white/70 mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    required
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-white/70 mb-1">Notas Técnicas o Preferencias</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre tono deseado, alergias o solicitudes especiales..."
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevaCita(false)}
                  className="px-4 py-2 rounded-xl text-white/70 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-black text-xs shadow-lg hover:brightness-110 cursor-pointer"
                >
                  Guardar Cita en Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
