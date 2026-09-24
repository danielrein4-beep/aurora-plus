import React, { useEffect, useMemo, useState } from "react";
import { leerSesion, type Paciente } from "../api";
import Odontograma from "./Odontograma";
import { PLANTILLAS_EVOLUCION } from "./EvolucionClinicaSesiones";

// Pantalla unica para el paciente que esta en el sillon: alertas, odontograma,
// lo que toca hoy segun su plan, evolucion, cobro, proxima cita y cierre de la consulta.
// Las pestanas detalladas siguen existiendo; esta es la entrada rapida.

interface Props {
  paciente: Paciente;
  tasaBcv: number;
  onIrA: (pestana: "recetas" | "anamnesis" | "planes") => void;
}

interface ItemPlan {
  id: number;
  fase: string;
  diente_fdi: number | null;
  procedimiento: string;
  costo_usd: number;
  estado: string;
}

interface Plan {
  id: number;
  nombre_plan: string;
  estado: string;
  monto_total_usd: number;
  monto_pagado_usd: number;
  items: ItemPlan[];
}

interface Cita {
  id: number;
  fecha_cita: string;
  hora_inicio: string;
  estado: string;
  motivo: string;
  sillon_box: string;
}

const hoyIso = () => new Date().toISOString().slice(0, 10);

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${leerSesion()?.token || ""}` };
}

async function llamar(metodo: string, ruta: string, cuerpo?: unknown) {
  const r = await fetch(ruta, { method: metodo, headers: authHeaders(), body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.message || `error ${r.status}`);
  return d;
}

function edadDe(fecha?: string | null) {
  if (!fecha) return null;
  const n = new Date(fecha);
  if (Number.isNaN(n.getTime())) return null;
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
}

const caja = "p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-3";
const campo = "w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-xs";

export default function ModoConsultaOdonto({ paciente, tasaBcv, onIrA }: Props) {
  const [anamnesis, setAnamnesis] = useState<Record<string, any> | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [citaHoy, setCitaHoy] = useState<Cita | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Evolucion rapida
  const [procedimiento, setProcedimiento] = useState("");
  const [pieza, setPieza] = useState("");
  const [notas, setNotas] = useState("");
  const [plantilla, setPlantilla] = useState<(typeof PLANTILLAS_EVOLUCION)[number] | null>(null);

  // Abono rapido
  const [abono, setAbono] = useState("");
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [claveAbono, setClaveAbono] = useState(() => `consulta-${Date.now()}`);

  // Proxima cita
  const [fechaCita, setFechaCita] = useState("");
  const [horaCita, setHoraCita] = useState("09:00");
  const [duracion, setDuracion] = useState(45);
  const [motivoCita, setMotivoCita] = useState("");

  const avisar = (ok: boolean, texto: string) => {
    setAviso({ ok, texto });
    setTimeout(() => setAviso(null), 5000);
  };

  const cargar = async () => {
    const [a, p, c] = await Promise.allSettled([
      llamar("GET", `/api/salud/odontologia/anamnesis?pacienteId=${paciente.id}`),
      llamar("GET", `/api/salud/odontologia/planes?pacienteId=${paciente.id}`),
      llamar("GET", `/api/salud/odontologia/agenda?pacienteId=${paciente.id}`),
    ]);
    setAnamnesis(a.status === "fulfilled" ? a.value : null);
    setPlanes(p.status === "fulfilled" ? p.value : []);
    const citas: Cita[] = c.status === "fulfilled" ? c.value : [];
    setCitaHoy(citas.find((x) => x.fecha_cita === hoyIso() && !["CANCELADA", "NO_ASISTIO"].includes(x.estado)) || null);
  };

  useEffect(() => {
    setAviso(null);
    setProcedimiento("");
    setPieza("");
    setNotas("");
    setPlantilla(null);
    cargar();
  }, [paciente.id]);

  // Alertas clinicas que el odontologo debe ver antes de tocar al paciente.
  const alertas = useMemo(() => {
    const l: string[] = [];
    if (paciente.alergias) l.push(`Alergia: ${paciente.alergias}`);
    if (anamnesis?.alergia_anestesia) l.push("Alergia a anestesia local");
    if (anamnesis?.detalle_alergias && anamnesis.detalle_alergias !== paciente.alergias) l.push(`Alergias: ${anamnesis.detalle_alergias}`);
    if (anamnesis?.toma_anticoagulantes) l.push("Toma anticoagulantes");
    if (anamnesis?.trastorno_coagulacion) l.push("Trastorno de coagulacion");
    if (anamnesis?.profilaxis_antibiotica_requerida) l.push("Requiere profilaxis antibiotica");
    if (anamnesis?.hipertension) l.push("Hipertension");
    if (anamnesis?.diabetes) l.push("Diabetes");
    if (anamnesis?.embarazo_lactancia) l.push("Embarazo o lactancia");
    return l;
  }, [anamnesis, paciente.alergias]);

  const pendientes = useMemo(
    () =>
      planes
        .filter((p) => p.estado !== "CANCELADO" && p.estado !== "COMPLETADO")
        .flatMap((p) => p.items.filter((i) => i.estado !== "REALIZADO" && i.estado !== "ANULADO").map((i) => ({ ...i, plan: p }))),
    [planes]
  );
  const planConSaldo = planes.find((p) => p.estado !== "CANCELADO" && Number(p.monto_total_usd) > Number(p.monto_pagado_usd));
  const saldo = planConSaldo ? Number(planConSaldo.monto_total_usd) - Number(planConSaldo.monto_pagado_usd) : 0;

  const accion = async (clave: string, fn: () => Promise<string>) => {
    setOcupado(clave);
    try {
      avisar(true, await fn());
      await cargar();
    } catch (e) {
      avisar(false, e instanceof Error ? e.message : "No se pudo completar la accion.");
    } finally {
      setOcupado(null);
    }
  };

  const realizar = (item: ItemPlan) =>
    accion(`item-${item.id}`, async () => {
      const d = await llamar("POST", `/api/salud/odontologia/planes/items/${item.id}/realizar`);
      if (!procedimiento) {
        setProcedimiento(item.procedimiento);
        if (item.diente_fdi) setPieza(String(item.diente_fdi));
      }
      return d?.mensaje || "Procedimiento realizado.";
    });

  const usarPlantilla = (p: (typeof PLANTILLAS_EVOLUCION)[number]) => {
    setPlantilla(p);
    setProcedimiento(p.procedimiento);
    setNotas(p.notas);
  };

  const guardarEvolucion = () =>
    accion("evolucion", async () => {
      await llamar("POST", "/api/salud/odontologia/evolucion", {
        pacienteId: paciente.id,
        fechaSesion: hoyIso(),
        dienteFdi: pieza ? Number(pieza) : null,
        procedimientoRealizado: procedimiento.trim(),
        tecnicaAislamiento: plantilla?.aislamiento || "ABSOLUTO_DIQUE",
        anestesiaAdministrada: plantilla?.anestesia || null,
        conductometriaNotas: notas || null,
        medicacionIndicada: plantilla?.medicacion || null,
        proximaCitaConducta: plantilla?.proximaCita || null,
      });
      setProcedimiento("");
      setPieza("");
      setNotas("");
      setPlantilla(null);
      return "Evolucion guardada en la historia.";
    });

  const cobrar = () =>
    accion("abono", async () => {
      if (!planConSaldo) throw new Error("No hay saldo pendiente.");
      const d = await llamar("POST", `/api/salud/odontologia/planes/${planConSaldo.id}/abonos`, {
        claveIdempotencia: claveAbono,
        montoUsd: Number(abono),
        monedaPago: "USD",
        metodoPago: metodo,
      });
      setAbono("");
      setClaveAbono(`consulta-${Date.now()}`);
      return d?.mensaje || "Abono registrado en caja.";
    });

  const agendar = () =>
    accion("cita", async () => {
      const [h, m] = horaCita.split(":").map(Number);
      const fin = new Date(2000, 0, 1, h, m + duracion);
      const horaFin = `${String(fin.getHours()).padStart(2, "0")}:${String(fin.getMinutes()).padStart(2, "0")}:00`;
      await llamar("POST", "/api/salud/odontologia/agenda", {
        pacienteId: paciente.id,
        sillonBox: citaHoy?.sillon_box || "SILLON_1",
        fechaCita: fechaCita,
        horaInicio: `${horaCita}:00`,
        horaFin,
        motivo: motivoCita.trim() || "Control",
      });
      setFechaCita("");
      setMotivoCita("");
      return `Proxima cita agendada para el ${new Date(`${fechaCita}T00:00:00`).toLocaleDateString("es-VE")} a las ${horaCita}.`;
    });

  const cambiarEstadoCita = (estado: string, mensaje: string) =>
    accion(`cita-${estado}`, async () => {
      if (!citaHoy) throw new Error("El paciente no tiene cita hoy.");
      await llamar("PATCH", `/api/salud/odontologia/agenda/${citaHoy.id}/estado`, { estado });
      return mensaje;
    });

  const edad = edadDe(paciente.fechaNacimiento) ?? paciente.edad;

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100 text-left text-xs">
      {/* Paciente y alertas */}
      <div className={`${caja} ${alertas.length ? "border-rose-300 dark:border-rose-500/40" : ""}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-[#FFFFFF]">{paciente.nombreCompleto}</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {edad != null ? `${edad} anos` : "Edad no registrada"} · CI {paciente.identificacion || "no registrada"}
              {paciente.telefono ? ` · ${paciente.telefono}` : ""}
            </p>
          </div>
          {citaHoy ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 font-semibold">
                Cita de hoy {citaHoy.hora_inicio.substring(0, 5)} · {citaHoy.motivo}
              </span>
              {citaHoy.estado !== "EN_ATENCION" && citaHoy.estado !== "COMPLETADA" && (
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={() => cambiarEstadoCita("EN_ATENCION", "Paciente en el sillon.")}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 text-[#FFFFFF] font-bold disabled:opacity-50"
                >
                  Pasar al sillon
                </button>
              )}
              {citaHoy.estado === "COMPLETADA" && <span className="font-bold text-emerald-700 dark:text-emerald-400">Consulta terminada</span>}
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">Sin cita agendada hoy</span>
          )}
        </div>

        {alertas.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {alertas.map((a) => (
              <span key={a} className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold">
                {a}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">
            Sin alertas clinicas registradas.{" "}
            <button type="button" onClick={() => onIrA("anamnesis")} className="font-semibold underline">
              Revisar ficha de riesgo
            </button>
          </p>
        )}
      </div>

      {aviso && (
        <div
          className={`p-3 rounded-2xl font-bold ${
            aviso.ok
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Odontograma */}
        <div className="xl:col-span-2">
          <Odontograma
            pacienteId={paciente.id}
            nombrePaciente={paciente.nombreCompleto}
            cedulaPaciente={paciente.identificacion}
            tasaBcv={tasaBcv}
            onPlanCreado={cargar}
          />
        </div>

        {/* Lo que toca hoy y cobro */}
        <div className="space-y-5">
          <div className={caja}>
            <div className="flex items-center justify-between">
              <h4 className="font-['Outfit'] font-bold text-base">Lo que toca</h4>
              <button type="button" onClick={() => onIrA("planes")} className="font-semibold text-slate-500 hover:underline">
                Ver planes
              </button>
            </div>
            {pendientes.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">
                No hay tratamientos pendientes. Usa "Presupuesto Dental" en el odontograma para armar un plan.
              </p>
            ) : (
              <ul className="space-y-2">
                {pendientes.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{i.procedimiento}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {i.plan.estado === "PROPUESTO" ? "Plan por aprobar" : i.plan.nombre_plan} · ${Number(i.costo_usd).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={ocupado !== null || i.plan.estado === "PROPUESTO"}
                      title={i.plan.estado === "PROPUESTO" ? "El paciente debe aprobar el plan primero" : "Marcar como realizado y descontar insumos"}
                      onClick={() => realizar(i)}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-[#FFFFFF] font-bold disabled:opacity-40"
                    >
                      {ocupado === `item-${i.id}` ? "..." : "Realizado"}
                    </button>
                  </li>
                ))}
                {pendientes.length > 8 && <li className="text-slate-500">y {pendientes.length - 8} mas en Planes.</li>}
              </ul>
            )}
          </div>

          <div className={caja}>
            <h4 className="font-['Outfit'] font-bold text-base">Cobrar</h4>
            {planConSaldo ? (
              <>
                <p className="text-slate-500 dark:text-slate-400">
                  Saldo de "{planConSaldo.nombre_plan}": <span className="font-bold text-slate-900 dark:text-[#FFFFFF]">${saldo.toFixed(2)}</span>
                  {" "}({(saldo * tasaBcv).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={saldo.toFixed(2)}
                    value={abono}
                    onChange={(e) => setAbono(e.target.value)}
                    placeholder="Monto USD"
                    aria-label="Monto del abono en dolares"
                    className={campo}
                  />
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={campo} aria-label="Metodo de pago">
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="PAGO_MOVIL">Pago movil</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="PUNTO_VENTA">Punto de venta</option>
                    <option value="ZELLE">Zelle</option>
                  </select>
                </div>
                <button
                  type="button"
                  disabled={ocupado !== null || !(Number(abono) > 0)}
                  onClick={cobrar}
                  className="w-full p-2.5 rounded-xl bg-slate-900 dark:bg-white text-[#FFFFFF] dark:text-slate-900 font-bold disabled:opacity-40"
                >
                  {ocupado === "abono" ? "Registrando..." : "Registrar abono en caja"}
                </button>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">No hay saldo pendiente.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Evolucion rapida */}
        <div className={caja}>
          <h4 className="font-['Outfit'] font-bold text-base">Evolucion de hoy</h4>
          <div className="flex flex-wrap gap-1.5">
            {PLANTILLAS_EVOLUCION.map((p) => (
              <button
                key={p.nombre}
                type="button"
                onClick={() => usarPlantilla(p)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                  plantilla?.nombre === p.nombre
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5"
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input
              type="text"
              value={procedimiento}
              onChange={(e) => setProcedimiento(e.target.value)}
              placeholder="Procedimiento realizado"
              aria-label="Procedimiento realizado"
              className={`${campo} col-span-3`}
            />
            <input
              type="number"
              min="11"
              max="85"
              value={pieza}
              onChange={(e) => setPieza(e.target.value)}
              placeholder="Pieza"
              aria-label="Pieza FDI"
              className={campo}
            />
          </div>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Notas clinicas" aria-label="Notas clinicas" className={campo} />
          <button
            type="button"
            disabled={ocupado !== null || !procedimiento.trim()}
            onClick={guardarEvolucion}
            className="w-full p-2.5 rounded-xl bg-emerald-600 text-[#FFFFFF] font-bold disabled:opacity-40"
          >
            {ocupado === "evolucion" ? "Guardando..." : "Guardar evolucion"}
          </button>
        </div>

        {/* Proxima cita y cierre */}
        <div className={caja}>
          <h4 className="font-['Outfit'] font-bold text-base">Proxima cita</h4>
          <div className="grid grid-cols-3 gap-2">
            <input type="date" min={hoyIso()} value={fechaCita} onChange={(e) => setFechaCita(e.target.value)} aria-label="Fecha" className={campo} />
            <input type="time" value={horaCita} onChange={(e) => setHoraCita(e.target.value)} aria-label="Hora" className={campo} />
            <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} aria-label="Duracion" className={campo}>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hora</option>
              <option value={90}>1 h 30</option>
            </select>
          </div>
          <input
            type="text"
            value={motivoCita}
            onChange={(e) => setMotivoCita(e.target.value)}
            placeholder={plantilla?.proximaCita || "Motivo (ej: Endodoncia sesion 2)"}
            aria-label="Motivo de la proxima cita"
            className={campo}
          />
          <button
            type="button"
            disabled={ocupado !== null || !fechaCita}
            onClick={agendar}
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/15 font-bold disabled:opacity-40"
          >
            {ocupado === "cita" ? "Agendando..." : "Agendar proxima cita"}
          </button>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onIrA("recetas")} className="p-2.5 rounded-xl border border-slate-300 dark:border-white/15 font-bold">
              Recetar
            </button>
            <button
              type="button"
              disabled={ocupado !== null || !citaHoy || citaHoy.estado === "COMPLETADA"}
              onClick={() => cambiarEstadoCita("COMPLETADA", "Consulta terminada. Todo quedo guardado en la historia.")}
              className="p-2.5 rounded-xl bg-violet-600 text-[#FFFFFF] font-bold disabled:opacity-40"
              title={citaHoy ? "Marca la cita de hoy como completada" : "El paciente no tiene cita hoy"}
            >
              Terminar consulta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
