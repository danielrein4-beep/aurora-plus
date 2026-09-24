import React, { useState, useEffect } from "react";

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


interface PlanesTratamientoFasesProps {
  pacienteId: number;
  pacienteNombre?: string;
  tasaBcv?: number;
}

interface ItemPlan {
  id: number;
  fase: string;
  diente_fdi: number | null;
  cara: string | null;
  procedimiento: string;
  costo_usd: number;
  estado: string;
  fecha_realizado: string | null;
  odontologo_responsable: string | null;
  kit_descargado: boolean;
  detalle_insumos?: string | null;
}

interface PlanTratamiento {
  id: number;
  nombre_plan: string;
  estado: string;
  monto_total_usd: number;
  monto_total_ves: number;
  monto_pagado_usd: number;
  pagado_al_financiar_usd?: number | null;
  notas: string | null;
  fecha_creacion: string;
  items: ItemPlan[];
}

interface CuotaPlan {
  id: number;
  numero: number;
  fecha_vencimiento: string;
  monto_usd: number;
  pagado_usd: number;
  pendiente_usd: number;
  estado: "PAGADA" | "PARCIAL" | "VENCIDA" | "PENDIENTE";
}

const ESTILO_CUOTA: Record<CuotaPlan["estado"], string> = {
  PAGADA: "text-emerald-700 dark:text-emerald-300",
  PARCIAL: "text-sky-700 dark:text-sky-300",
  VENCIDA: "text-rose-700 dark:text-rose-300 font-black",
  PENDIENTE: "text-slate-600 dark:text-slate-300",
};

// Financiamiento de un plan en cuotas: los abonos se aplican a las cuotas en orden.
function CuotasPlan({
  planId,
  saldoUsd,
  financiado,
  onCambio,
}: {
  planId: number;
  saldoUsd: number;
  financiado: boolean;
  onCambio: () => void;
}) {
  const [cuotas, setCuotas] = useState<CuotaPlan[]>([]);
  const [formAbierto, setFormAbierto] = useState(false);
  const [numero, setNumero] = useState("3");
  const [dias, setDias] = useState("30");
  const [primera, setPrimera] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState("");

  const cargar = async () => {
    if (!financiado) {
      setCuotas([]);
      return;
    }
    try {
      const res = await fetch(`/api/salud/odontologia/planes/${planId}/cuotas`, {
        headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
      });
      if (res.ok) setCuotas(await res.json());
    } catch {
      setCuotas([]);
    }
  };

  useEffect(() => {
    cargar();
  }, [planId, financiado, saldoUsd]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`/api/salud/odontologia/planes/${planId}/cuotas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obtenerTokenSesion()}` },
        body: JSON.stringify({ numeroCuotas: Number(numero), fechaPrimera: primera, diasEntreCuotas: Number(dias) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `error ${res.status}`);
      setFormAbierto(false);
      onCambio();
    } catch (err) {
      setError(`No se pudieron crear las cuotas: ${err instanceof Error ? err.message : "fallo de conexion"}.`);
    }
  };

  const eliminar = async () => {
    try {
      const res = await fetch(`/api/salud/odontologia/planes/${planId}/cuotas`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
      });
      if (!res.ok) throw new Error(`error ${res.status}`);
      onCambio();
    } catch (err) {
      setError(`No se pudieron quitar las cuotas: ${err instanceof Error ? err.message : "fallo de conexion"}.`);
    }
  };

  const montoCuota = Number(numero) > 0 ? saldoUsd / Number(numero) : 0;

  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Plan de pagos</span>
        {!formAbierto && saldoUsd > 0 && (
          <button
            type="button"
            onClick={() => setFormAbierto(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 font-semibold"
          >
            {financiado ? "Refinanciar saldo" : "Financiar en cuotas"}
          </button>
        )}
      </div>

      {formAbierto && (
        <form onSubmit={crear} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Cuotas</span>
            <input type="number" min="2" max="60" required value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15" />
          </label>
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Primera cuota</span>
            <input type="date" required value={primera} onChange={(e) => setPrimera(e.target.value)} className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15" />
          </label>
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Cada (dias)</span>
            <input type="number" min="7" max="90" required value={dias} onChange={(e) => setDias(e.target.value)} className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15" />
          </label>
          <div className="text-slate-500 dark:text-slate-400">
            {Number(numero) > 0 && <>~${montoCuota.toFixed(2)} por cuota</>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormAbierto(false)} className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-white/15 font-semibold">
              Cancelar
            </button>
            <button type="submit" className="flex-1 p-2 rounded-xl bg-emerald-600 text-white font-bold">
              Crear
            </button>
          </div>
        </form>
      )}

      {error && <div className="text-rose-600 dark:text-rose-400 font-semibold">{error}</div>}

      {cuotas.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {cuotas.map((c) => (
              <div key={c.id} className="p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10">
                <div className="flex justify-between">
                  <span className="font-bold">#{c.numero}</span>
                  <span className={ESTILO_CUOTA[c.estado]}>{c.estado}</span>
                </div>
                <div className="font-mono font-bold">${Number(c.monto_usd).toFixed(2)}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(`${c.fecha_vencimiento}T00:00:00`).toLocaleDateString("es-VE")}
                  {c.estado === "PARCIAL" && ` - falta $${Number(c.pendiente_usd).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={eliminar} className="text-slate-500 hover:text-rose-600 font-semibold">
            Quitar cuotas (volver a pago libre)
          </button>
        </>
      ) : (
        !formAbierto && <p className="text-slate-500 dark:text-slate-400">Pago libre: los abonos se registran sin calendario.</p>
      )}
    </div>
  );
}

export const PlanesTratamientoFases: React.FC<PlanesTratamientoFasesProps> = ({
  pacienteId,
  pacienteNombre,
  tasaBcv = 50.0,
}) => {
  const [planes, setPlanes] = useState<PlanTratamiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalNuevoPlan, setModalNuevoPlan] = useState(false);
  const [nombreNuevoPlan, setNombreNuevoPlan] = useState("");
  const [notasNuevoPlan, setNotasNuevoPlan] = useState("");
  const [notificacion, setNotificacion] = useState("");

  // Items del plan que el odontologo arma a mano para ESTE paciente — nunca una
  // plantilla fija: cada paciente necesita piezas, procedimientos y costos distintos.
  const itemVacio = { fase: "FASE_1_HIGIENE", dienteFdi: "", cara: "", procedimiento: "", costoUsd: "" };
  const [itemsNuevos, setItemsNuevos] = useState<
    { fase: string; dienteFdi: string; cara: string; procedimiento: string; costoUsd: string }[]
  >([{ ...itemVacio }]);

  const actualizarItemNuevo = (idx: number, campo: keyof typeof itemVacio, valor: string) => {
    setItemsNuevos((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  };

  const agregarItemNuevo = () => setItemsNuevos((prev) => [...prev, { ...itemVacio }]);

  const quitarItemNuevo = (idx: number) => setItemsNuevos((prev) => prev.filter((_, i) => i !== idx));

  // Abono en curso: un solo formulario abierto a la vez, identificado por el plan.
  const [abonoPlanId, setAbonoPlanId] = useState<number | null>(null);
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoMetodo, setAbonoMetodo] = useState("EFECTIVO");
  const [abonoMoneda, setAbonoMoneda] = useState<"USD" | "VES">("USD");
  const [abonoReferencia, setAbonoReferencia] = useState("");
  const [abonoClave, setAbonoClave] = useState("");
  const [registrandoAbono, setRegistrandoAbono] = useState(false);

  const abrirAbono = (plan: PlanTratamiento, saldoUsd: number) => {
    setAbonoPlanId(plan.id);
    setAbonoMonto(saldoUsd.toFixed(2));
    setAbonoMetodo("EFECTIVO");
    setAbonoMoneda("USD");
    setAbonoReferencia("");
    // La clave se fija al abrir el formulario: un doble clic o un reintento
    // reutiliza la misma y el backend no duplica el cobro en caja.
    setAbonoClave(`odonto-abono-${plan.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  };

  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (abonoPlanId == null) return;
    const montoUsd = Number(abonoMonto);
    if (!Number.isFinite(montoUsd) || montoUsd <= 0) {
      setNotificacion("No se pudo registrar: el monto del abono debe ser mayor a cero.");
      setTimeout(() => setNotificacion(""), 3500);
      return;
    }
    setRegistrandoAbono(true);
    try {
      const res = await fetch(`/api/salud/odontologia/planes/${abonoPlanId}/abonos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${obtenerTokenSesion()}`,
        },
        body: JSON.stringify({
          claveIdempotencia: abonoClave,
          montoUsd,
          monedaPago: abonoMoneda,
          montoRecibido: abonoMoneda === "VES" ? Number((montoUsd * tasaBcv).toFixed(2)) : montoUsd,
          metodoPago: abonoMetodo,
          referenciaPago: abonoReferencia.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setAbonoPlanId(null);
        setNotificacion(data?.mensaje || "Abono registrado en caja.");
        cargarPlanes();
      } else {
        setNotificacion(`No se pudo registrar el abono: ${data?.message || `error ${res.status}`}.`);
      }
    } catch {
      setNotificacion("Fallo de conexion — el abono NO se registro.");
    } finally {
      setRegistrandoAbono(false);
      setTimeout(() => setNotificacion(""), 4500);
    }
  };

  useEffect(() => {
    cargarPlanes();
  }, [pacienteId]);

  const cargarPlanes = async () => {
    setCargando(true);
    try {
      const token = obtenerTokenSesion();
      const res = await fetch(`/api/salud/odontologia/planes?pacienteId=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlanes(data);
      }
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  const handleCrearPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoPlan.trim()) return;

    const itemsValidos = itemsNuevos.filter((it) => it.procedimiento.trim() && it.costoUsd.trim());
    if (itemsValidos.length === 0) {
      setNotificacion("Agrega al menos un procedimiento con su costo antes de crear el plan.");
      setTimeout(() => setNotificacion(""), 3500);
      return;
    }

    try {
      const token = obtenerTokenSesion();
      const res = await fetch("/api/salud/odontologia/planes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          nombrePlan: nombreNuevoPlan,
          notas: notasNuevoPlan,
          items: itemsValidos.map((it) => ({
            fase: it.fase,
            dienteFdi: it.dienteFdi.trim() ? Number(it.dienteFdi) : null,
            cara: it.cara.trim() || null,
            procedimiento: it.procedimiento.trim(),
            costoUsd: Number(it.costoUsd),
          })),
        }),
      });

      if (res.ok) {
        setModalNuevoPlan(false);
        setNombreNuevoPlan("");
        setNotasNuevoPlan("");
        setItemsNuevos([{ ...itemVacio }]);
        setNotificacion("Plan de tratamiento creado con exito.");
        cargarPlanes();
      } else {
        setNotificacion(`No se pudo crear el plan (error ${res.status}). Intenta de nuevo.`);
      }
      setTimeout(() => setNotificacion(""), 3500);
    } catch {
      setNotificacion("Fallo de conexion — el plan NO se creo. Verifica tu internet e intenta de nuevo.");
      setTimeout(() => setNotificacion(""), 3500);
    }
  };

  const handleAprobarPlan = async (planId: number) => {
    try {
      const token = obtenerTokenSesion();
      const res = await fetch(`/api/salud/odontologia/planes/${planId}/aprobar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotificacion("Plan aprobado por el paciente.");
        cargarPlanes();
      } else {
        setNotificacion(`No se pudo aprobar el plan (error ${res.status}).`);
      }
      setTimeout(() => setNotificacion(""), 3000);
    } catch {
      setNotificacion("Fallo de conexion — el plan NO se aprobo.");
      setTimeout(() => setNotificacion(""), 3000);
    }
  };

  const handleMarcarRealizado = async (itemId: number) => {
    try {
      const token = obtenerTokenSesion();
      const res = await fetch(`/api/salud/odontologia/planes/items/${itemId}/realizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotificacion(data.mensaje || "Procedimiento completado.");
        cargarPlanes();
      } else {
        setNotificacion(`No se pudo marcar el procedimiento (error ${res.status}).`);
      }
      setTimeout(() => setNotificacion(""), 4000);
    } catch {
      setNotificacion("Fallo de conexion — el procedimiento NO se marco.");
      setTimeout(() => setNotificacion(""), 4000);
    }
  };

  const fName = (fase: string) => {
    if (fase === "FASE_1_HIGIENE") return "Fase 1: Control, Higiene e Infeccion";
    if (fase === "FASE_2_QUIRURGICA") return "Fase 2: Endodoncias y Cirugias";
    if (fase === "FASE_3_REHABILITACION") return "Fase 3: Rehabilitacion e Implantes";
    return fase;
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <span>Planes de Tratamiento & Presupuestacion por Fases</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
              Presupuesto Dual USD/Bs.
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Planes progresivos para {pacienteNombre || "Paciente Activo"} con abonos enlazados a caja
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevoPlan(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Formular Nuevo Plan por Fases</span>
        </button>
      </div>

      {notificacion && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold animate-fadeIn ${
          notificacion.includes("NO se") || notificacion.includes("No se pudo") || notificacion.includes("Agrega al menos")
            ? "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300"
            : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
        }`}>
          {notificacion}
        </div>
      )}

      {/* Listado de Planes */}
      {planes.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 text-center text-slate-500 dark:text-slate-400 text-xs">
          No hay planes de tratamiento formulados para este paciente. Haga clic en "Formular Nuevo Plan por Fases" para comenzar.
        </div>
      ) : (
        planes.map((plan) => {
          const totalUsd = Number(plan.monto_total_usd || 0);
          const totalVes = totalUsd * tasaBcv;
          const pagadoUsd = Number(plan.monto_pagado_usd || 0);
          const saldoUsd = totalUsd - pagadoUsd;

          // Agrupar items por fase
          const fasesUnicas = Array.from(new Set((plan.items || []).map((i) => i.fase)));

          return (
            <div
              key={plan.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 space-y-5 shadow-xl"
            >
              {/* Encabezado del Plan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">#PLAN-{plan.id}</span>
                    <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{plan.nombre_plan}</h4>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        plan.estado === "APROBADO" || plan.estado === "COMPLETADO"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                          : plan.estado === "EN_CURSO"
                            ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {plan.estado}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Creado el {new Date(plan.fecha_creacion).toLocaleDateString()} &bull; Tasa BCV aplicable: {tasaBcv.toFixed(2)} Bs/$
                  </div>
                </div>

                {/* Resumen financiero */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Presupuesto</div>
                    <div className="text-lg font-black font-['Outfit'] text-emerald-600 dark:text-emerald-400">
                      ${totalUsd.toFixed(2)} USD
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {totalVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs.
                    </div>
                    <div className="text-[11px] mt-1 font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Pagado ${pagadoUsd.toFixed(2)}</span>
                      <span className={`ml-2 font-bold ${saldoUsd > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {saldoUsd > 0 ? `Saldo $${saldoUsd.toFixed(2)}` : "Pagado completo"}
                      </span>
                    </div>
                  </div>

                  {saldoUsd > 0 && plan.estado !== "CANCELADO" && abonoPlanId !== plan.id && (
                    <button
                      type="button"
                      onClick={() => abrirAbono(plan, saldoUsd)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                    >
                      Registrar abono
                    </button>
                  )}

                  {plan.estado === "PROPUESTO" && (
                    <button
                      type="button"
                      onClick={() => handleAprobarPlan(plan.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      Aprobar Plan
                    </button>
                  )}
                </div>
              </div>

              {abonoPlanId === plan.id && (
                <form
                  onSubmit={handleRegistrarAbono}
                  className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                >
                  <label className="block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Monto (USD) *</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={saldoUsd.toFixed(2)}
                      required
                      value={abonoMonto}
                      onChange={(e) => setAbonoMonto(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15 font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Paga en</span>
                    <select
                      value={abonoMoneda}
                      onChange={(e) => setAbonoMoneda(e.target.value as "USD" | "VES")}
                      className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15"
                    >
                      <option value="USD">Dolares</option>
                      <option value="VES">Bolivares ({(Number(abonoMonto || 0) * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Metodo</span>
                    <select
                      value={abonoMetodo}
                      onChange={(e) => setAbonoMetodo(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="PAGO_MOVIL">Pago movil</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="PUNTO_VENTA">Punto de venta</option>
                      <option value="ZELLE">Zelle</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Referencia</span>
                    <input
                      type="text"
                      value={abonoReferencia}
                      onChange={(e) => setAbonoReferencia(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15"
                    />
                  </label>
                  <div className="flex gap-2 col-span-2 md:col-span-1">
                    <button
                      type="button"
                      onClick={() => setAbonoPlanId(null)}
                      className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-white/15 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={registrandoAbono}
                      className="flex-1 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                    >
                      {registrandoAbono ? "..." : "Cobrar"}
                    </button>
                  </div>
                </form>
              )}

              {(saldoUsd > 0 || plan.pagado_al_financiar_usd != null) && plan.estado !== "CANCELADO" && (
                <CuotasPlan planId={plan.id} saldoUsd={saldoUsd} financiado={plan.pagado_al_financiar_usd != null} onCambio={cargarPlanes} />
              )}

              {/* Fases clinicas e items */}
              <div className="space-y-4">
                {fasesUnicas.map((fase) => {
                  const itemsFase = (plan.items || []).filter((i) => i.fase === fase);
                  const subtotalFase = itemsFase.reduce((acc, curr) => acc + Number(curr.costo_usd || 0), 0);

                  return (
                    <div key={fase} className="rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/5 pb-2">
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                          {fName(fase)}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                          Subtotal: ${subtotalFase.toFixed(2)} USD
                        </span>
                      </div>

                      <div className="space-y-2">
                        {itemsFase.map((item) => {
                          const esRealizado = item.estado === "REALIZADO";

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200/70 dark:border-white/5 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                {item.diente_fdi && (
                                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30 font-mono">
                                    {item.diente_fdi}
                                  </span>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{item.procedimiento}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Cara: {item.cara || "General"} &bull; Responsable: {item.odontologo_responsable || "Sin asignar"}
                                  </div>
                                  {item.detalle_insumos && (
                                    <div
                                      className={`text-[11px] mt-0.5 ${
                                        item.kit_descargado ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                                      }`}
                                    >
                                      {item.detalle_insumos}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                                  ${Number(item.costo_usd).toFixed(2)}
                                </span>

                                {esRealizado ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                    Realizado
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMarcarRealizado(item.id)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-300 text-[11px] font-bold transition cursor-pointer"
                                  >
                                    Marcar Realizado & Descargar Kit
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Modal Nuevo Plan */}
      {modalNuevoPlan && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-3xl p-6 max-w-lg w-full text-left space-y-4 shadow-2xl">
            <h4 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Formular Nuevo Plan de Tratamiento</h4>
            <form onSubmit={handleCrearPlan} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Nombre del Plan Clinico *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Rehabilitacion Integral y Control Periodontal"
                  value={nombreNuevoPlan}
                  onChange={(e) => setNombreNuevoPlan(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Notas y Diagnostico Principal</label>
                <textarea
                  rows={2}
                  value={notasNuevoPlan}
                  onChange={(e) => setNotasNuevoPlan(e.target.value)}
                  placeholder="Observaciones de presupuesto, compromiso oseo o preferencias del paciente..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-600 dark:text-slate-300">Procedimientos de este plan *</div>
                  <button
                    type="button"
                    onClick={agregarItemNuevo}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    + Agregar procedimiento
                  </button>
                </div>
                <div className="space-y-2">
                  {itemsNuevos.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                      <select
                        value={it.fase}
                        onChange={(e) => actualizarItemNuevo(idx, "fase", e.target.value)}
                        className="col-span-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-[10px]"
                      >
                        <option value="FASE_1_HIGIENE">Fase 1: Higiene</option>
                        <option value="FASE_2_QUIRURGICA">Fase 2: Quirurgica</option>
                        <option value="FASE_3_REHABILITACION">Fase 3: Rehabilitacion</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Pieza"
                        value={it.dienteFdi}
                        onChange={(e) => actualizarItemNuevo(idx, "dienteFdi", e.target.value)}
                        className="col-span-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-[10px]"
                      />
                      <input
                        type="text"
                        placeholder="Procedimiento *"
                        value={it.procedimiento}
                        onChange={(e) => actualizarItemNuevo(idx, "procedimiento", e.target.value)}
                        className="col-span-4 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-[10px]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Costo $ *"
                        value={it.costoUsd}
                        onChange={(e) => actualizarItemNuevo(idx, "costoUsd", e.target.value)}
                        className="col-span-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={() => quitarItemNuevo(idx)}
                        disabled={itemsNuevos.length === 1}
                        className="col-span-1 text-rose-500 dark:text-rose-400 disabled:opacity-30 text-xs font-bold"
                        title="Quitar procedimiento"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalNuevoPlan(false);
                    setItemsNuevos([{ ...itemVacio }]);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black hover:brightness-110 transition"
                >
                  Crear Plan y Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanesTratamientoFases;
