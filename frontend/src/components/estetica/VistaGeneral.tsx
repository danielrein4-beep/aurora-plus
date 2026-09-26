import React, { useEffect, useState } from "react";
import {
  listarCitasDelDia, reporteCobrosSalud, resumenEstetica,
  type CitaMedica, type CobroSaludDetalle, type ResumenEstetica,
} from "../../api";
import { IconWhatsApp } from "../../Icons";
import { Aviso, Boton, Cargando, Kpi, Tarjeta, Vacio, enlaceWhatsApp, formatearFecha, formatearMonto, hoyISO, mensajeError, type PaginaEstetica } from "./comun";

function saludo(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function VistaGeneral({ nombre, totalClientas, onIr }: { nombre: string; totalClientas: number; onIr: (p: PaginaEstetica) => void }) {
  const [citas, setCitas] = useState<CitaMedica[] | null>(null);
  const [cobros, setCobros] = useState<CobroSaludDetalle[] | null>(null);
  const [resumen, setResumen] = useState<ResumenEstetica | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  useEffect(() => {
    const hoy = hoyISO();
    const fallas: string[] = [];
    Promise.allSettled([
      listarCitasDelDia(hoy).then(setCitas),
      reporteCobrosSalud(`${hoy}T00:00:00`, `${hoy}T23:59:59`).then(setCobros),
      resumenEstetica().then(setResumen),
    ]).then((rs) => {
      const nombres = ["la agenda de hoy", "los cobros de hoy", "el resumen de paquetes"];
      rs.forEach((r, i) => { if (r.status === "rejected") fallas.push(`No se pudo cargar ${nombres[i]}: ${mensajeError(r.reason)}`); });
      setErrores(fallas);
    });
  }, []);

  const activas = (citas ?? []).filter((c) => !["CANCELADA", "NO_ASISTIO"].includes(c.estado)).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const pendientes = activas.filter((c) => c.estado !== "ATENDIDA");
  const cobradoUsd = (cobros ?? []).filter((c) => c.estado !== "ANULADO" && c.monedaPago === "USD").reduce((s, c) => s + Number(c.montoRecibido), 0);
  const cobradoVes = (cobros ?? []).filter((c) => c.estado !== "ANULADO" && c.monedaPago === "VES").reduce((s, c) => s + Number(c.montoRecibido), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-['Outfit'] font-bold text-2xl text-slate-900 dark:text-white tracking-tight">{saludo()}{nombre ? `, ${nombre.split(" ")[0]}` : ""}</h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5 first-letter:uppercase">
          {new Date().toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {errores.map((e) => <Aviso key={e}>{e}</Aviso>)}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Citas de hoy" valor={citas ? String(activas.length) : "—"} sub={citas ? (pendientes.length ? `${pendientes.length} por atender` : "Todas atendidas") : undefined} color="#9E4A63" onClick={() => onIr("agenda")} />
        <Kpi
          label="Cobrado hoy"
          valor={cobros ? formatearMonto(cobradoUsd) : "—"}
          sub={cobros && cobradoVes > 0 ? `+ ${formatearMonto(cobradoVes, "VES")}` : undefined}
          color="#E3A6B4"
          onClick={() => onIr("caja")}
        />
        <Kpi
          label="Paquetes activos"
          valor={resumen ? String(resumen.paquetes_activos) : "—"}
          sub={resumen ? `${resumen.sesiones_pendientes} sesiones por realizar` : undefined}
          color="#7c3aed"
          onClick={() => onIr("paquetes")}
        />
        <Kpi label="Clientas" valor={String(totalClientas)} sub={resumen ? `${resumen.sesiones_mes} sesiones este mes` : undefined} color="#64748b" onClick={() => onIr("clientas")} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Tarjeta className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Agenda de hoy</h3>
            <button onClick={() => onIr("agenda")} className="text-xs font-semibold text-[#9E4A63] dark:text-[#E3A6B4] cursor-pointer">Ver agenda</button>
          </div>
          {citas === null && errores.length === 0 ? (
            <Cargando />
          ) : activas.length === 0 ? (
            <Vacio
              titulo="Sin citas para hoy"
              texto={totalClientas === 0 ? "Empieza registrando tus clientas y tus servicios." : undefined}
              accion={<Boton tipo="secundario" onClick={() => onIr(totalClientas === 0 ? "clientas" : "agenda")}>{totalClientas === 0 ? "Registrar clienta" : "Agendar cita"}</Boton>}
            />
          ) : (
            <ul className="space-y-1.5">
              {activas.map((c) => (
                <li key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${c.estado === "ATENDIDA" ? "opacity-50" : "bg-slate-50 dark:bg-white/[0.03]"}`}>
                  <span className="text-sm font-bold text-[#9E4A63] dark:text-[#E3A6B4] w-12">{c.horaInicio.slice(0, 5)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{c.paciente?.nombreCompleto}</span>
                    <span className="block text-xs text-slate-500 truncate">{c.motivo || "—"}</span>
                  </span>
                  {c.estado === "ATENDIDA" && <span className="text-[11px] font-semibold text-emerald-600">Atendida</span>}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <div className="space-y-5">
          <Tarjeta className="p-4 sm:p-5">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">Próximas sesiones sugeridas</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mb-3">Clientas que deberían volver en los próximos 7 días según su última sesión.</p>
            {!resumen ? (
              errores.length ? null : <Cargando />
            ) : resumen.proximas_sesiones.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">Nadie pendiente esta semana.</p>
            ) : (
              <ul className="space-y-1.5">
                {resumen.proximas_sesiones.map((p) => {
                  const wa = enlaceWhatsApp(p.paciente_telefono, `Hola ${p.paciente_nombre.split(" ")[0]}, te toca tu próxima sesión de ${p.servicio} el ${formatearFecha(p.proxima_sesion)}. ¿Te agendo?`);
                  return (
                    <li key={p.paciente_id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-slate-800 dark:text-white truncate">{p.paciente_nombre}</span>
                        <span className="block text-xs text-slate-500 truncate">{p.servicio} · {formatearFecha(p.proxima_sesion)}</span>
                      </span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Escribir por WhatsApp">
                          <IconWhatsApp size={16} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Tarjeta>

          {resumen && (resumen.paquetes_por_vencer > 0 || resumen.derivaciones > 0) && (
            <Tarjeta className="p-4 sm:p-5 space-y-2">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Para revisar</h3>
              {resumen.paquetes_por_vencer > 0 && (
                <button onClick={() => onIr("paquetes")} className="block text-left text-sm text-amber-700 dark:text-amber-300 hover:underline cursor-pointer">
                  {resumen.paquetes_por_vencer} {resumen.paquetes_por_vencer === 1 ? "paquete vence" : "paquetes vencen"} en los próximos 15 días
                </button>
              )}
              {resumen.derivaciones > 0 && (
                <button onClick={() => onIr("clientas")} className="block text-left text-sm text-rose-700 dark:text-rose-300 hover:underline cursor-pointer">
                  {resumen.derivaciones} {resumen.derivaciones === 1 ? "clienta marcada" : "clientas marcadas"} para derivar al dermatólogo
                </button>
              )}
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  );
}
