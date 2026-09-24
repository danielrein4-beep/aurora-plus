import React, { useEffect, useState } from "react";
import { leerSesion } from "../api";
import { abrirWhatsAppDirecto } from "../utils/pdfReports";

interface PanelClinicaOdontologiaProps {
  clinicaNombre?: string;
  onAbrirPaciente?: (pacienteId: number, destino?: "consulta" | "planes") => void;
}

interface CitaHoy {
  id: number;
  paciente_id: number;
  hora_inicio: string;
  hora_fin: string;
  sillon_box: string;
  odontologo: string;
  motivo: string;
  estado: string;
  paciente: string;
  telefono: string | null;
}

interface CuotaVencida {
  id: number;
  nombre_plan: string;
  paciente_id: number;
  paciente: string;
  telefono: string | null;
  cuotas_vencidas: number;
  monto_vencido_usd: number;
  vencida_desde: string;
}

interface Tablero {
  citasHoy: CitaHoy[];
  cobradoHoyUsd: number;
  porCobrarUsd: number;
  presupuestosPorAprobar: { cantidad: number; monto_usd: number };
  cuotasVencidas: CuotaVencida[];
  recallCantidad: number;
  insumosBajoMinimo: { id: number; nombre: string; stock_actual: number; stock_minimo: number; unidad_medida: string | null }[];
}

interface PacienteRecall {
  paciente_id: number;
  paciente: string;
  telefono: string | null;
  ultima_visita: string;
  meses_sin_visita: number;
}

const ESTADO_CITA: Record<string, string> = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  EN_SALA: "En sala",
  EN_ATENCION: "En sillon",
  COMPLETADA: "Completada",
  NO_ASISTIO: "No asistio",
  CANCELADA: "Cancelada",
};

const usd = (n: number) => `$${Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${leerSesion()?.token || ""}` };
}

export default function PanelClinicaOdontologia({ clinicaNombre, onAbrirPaciente }: PanelClinicaOdontologiaProps) {
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mesesRecall, setMesesRecall] = useState(6);
  const [recall, setRecall] = useState<PacienteRecall[] | null>(null);

  const clinica = clinicaNombre || "la clinica";

  useEffect(() => {
    fetch("/api/salud/odontologia/tablero", { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error(`error ${r.status}`);
        setTablero(await r.json());
      })
      .catch((e) => setError(`No se pudo cargar el tablero (${e instanceof Error ? e.message : "fallo de conexion"}).`));
  }, []);

  useEffect(() => {
    setRecall(null);
    fetch(`/api/salud/odontologia/recall?meses=${mesesRecall}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRecall)
      .catch(() => setRecall([]));
  }, [mesesRecall]);

  if (error) {
    return <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold">{error}</div>;
  }
  if (!tablero) {
    return <div className="p-6 text-xs text-slate-500">Cargando tablero...</div>;
  }

  const citas = tablero.citasHoy;
  const enSillon = citas.filter((c) => c.estado === "EN_ATENCION").length;
  const enSala = citas.filter((c) => c.estado === "EN_SALA").length;
  const pendientes = citas.filter((c) => c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA").length;
  const sinConfirmar = citas.filter((c) => c.estado === "PROGRAMADA").length;

  const kpis = [
    { etiqueta: "Citas hoy", valor: String(citas.length), detalle: `${enSillon} en sillon, ${enSala} en sala, ${pendientes} por llegar` },
    { etiqueta: "Cobrado hoy", valor: usd(tablero.cobradoHoyUsd), detalle: "Abonos a planes" },
    { etiqueta: "Por cobrar", valor: usd(tablero.porCobrarUsd), detalle: "Saldo de planes activos" },
    {
      etiqueta: "Presupuestos sin aprobar",
      valor: String(tablero.presupuestosPorAprobar.cantidad),
      detalle: `${usd(tablero.presupuestosPorAprobar.monto_usd)} esperando respuesta`,
    },
  ];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left text-xs">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.etiqueta} className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{k.etiqueta}</div>
            <div className="text-2xl font-black font-['Outfit'] text-slate-900 dark:text-white mt-1">{k.valor}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{k.detalle}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agenda del dia */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Agenda de hoy</h3>
            {sinConfirmar > 0 && <span className="text-amber-600 dark:text-amber-400 font-semibold">{sinConfirmar} sin confirmar</span>}
          </div>
          {citas.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay citas agendadas para hoy.</p>
          ) : (
            <ul className="space-y-1.5">
              {citas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5">
                  <div className="min-w-0">
                    <div className="font-bold truncate">
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 mr-2">{c.hora_inicio.substring(0, 5)}</span>
                      {c.paciente}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {c.sillon_box.replace("_", " ")} - {c.odontologo} - {c.motivo}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{ESTADO_CITA[c.estado] || c.estado}</span>
                    {!["COMPLETADA", "CANCELADA", "NO_ASISTIO"].includes(c.estado) && (
                      <button
                        type="button"
                        onClick={() => onAbrirPaciente?.(c.paciente_id, "consulta")}
                        className="px-2 py-1 rounded-lg bg-violet-600 text-[#FFFFFF] font-bold"
                      >
                        Atender
                      </button>
                    )}
                    {c.estado === "PROGRAMADA" && c.telefono && (
                      <button
                        type="button"
                        onClick={() =>
                          abrirWhatsAppDirecto(
                            c.telefono!,
                            `Hola ${c.paciente}, le escribimos de ${clinica} para confirmar su cita de hoy a las ${c.hora_inicio.substring(0, 5)}. Por favor responda para confirmar su asistencia.`
                          )
                        }
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                      >
                        Confirmar por WA
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cuotas vencidas */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3">
          <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Cuotas vencidas</h3>
          {tablero.cuotasVencidas.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay cuotas vencidas.</p>
          ) : (
            <ul className="space-y-1.5">
              {tablero.cuotasVencidas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <button type="button" onClick={() => onAbrirPaciente?.(c.paciente_id)} className="min-w-0 text-left">
                    <div className="font-bold truncate">{c.paciente}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {c.nombre_plan} - {c.cuotas_vencidas} cuota(s) desde {new Date(`${c.vencida_desde}T00:00:00`).toLocaleDateString("es-VE")}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">{usd(c.monto_vencido_usd)}</span>
                    {c.telefono && (
                      <button
                        type="button"
                        onClick={() =>
                          abrirWhatsAppDirecto(
                            c.telefono!,
                            `Hola ${c.paciente}, le escribimos de ${clinica}. Le recordamos que tiene un saldo pendiente de ${usd(c.monto_vencido_usd)} de su plan "${c.nombre_plan}". Quedamos atentos para coordinar su pago.`
                          )
                        }
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                      >
                        Recordar por WA
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recall */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Pacientes para llamar (recall)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sin visita reciente y sin cita futura agendada</p>
            </div>
            <select
              value={mesesRecall}
              onChange={(e) => setMesesRecall(Number(e.target.value))}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 font-semibold"
            >
              <option value={3}>Mas de 3 meses</option>
              <option value={6}>Mas de 6 meses</option>
              <option value={12}>Mas de 12 meses</option>
            </select>
          </div>
          {recall === null ? (
            <p className="text-slate-500">Cargando...</p>
          ) : recall.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">Todos los pacientes estan al dia con sus controles.</p>
          ) : (
            <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {recall.map((r) => (
                <li key={r.paciente_id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5">
                  <button type="button" onClick={() => onAbrirPaciente?.(r.paciente_id)} className="min-w-0 text-left">
                    <div className="font-bold truncate">{r.paciente}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ultima visita {new Date(`${r.ultima_visita}T00:00:00`).toLocaleDateString("es-VE")} ({r.meses_sin_visita} meses)
                    </div>
                  </button>
                  {r.telefono ? (
                    <button
                      type="button"
                      onClick={() =>
                        abrirWhatsAppDirecto(
                          r.telefono!,
                          `Hola ${r.paciente}, le escribimos de ${clinica}. Ya pasaron ${r.meses_sin_visita} meses desde su ultimo control dental. Le gustaria agendar su cita de revision y limpieza?`
                        )
                      }
                      className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                    >
                      Invitar por WA
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-400">Sin telefono</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Insumos */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3">
          <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Insumos por reponer</h3>
          {tablero.insumosBajoMinimo.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">Ningun insumo esta por debajo de su stock minimo.</p>
          ) : (
            <ul className="space-y-1.5">
              {tablero.insumosBajoMinimo.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <span className="font-semibold">{i.nombre}</span>
                  <span className="font-mono">
                    <span className="font-black text-rose-600 dark:text-rose-400">{Number(i.stock_actual)}</span>
                    <span className="text-slate-500"> / min {Number(i.stock_minimo)} {i.unidad_medida || ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
