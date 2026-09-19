import React, { useState, useEffect } from "react";

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
}

interface PlanTratamiento {
  id: number;
  nombre_plan: string;
  estado: string;
  monto_total_usd: number;
  monto_total_ves: number;
  monto_pagado_usd: number;
  notas: string | null;
  fecha_creacion: string;
  items: ItemPlan[];
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

  // Items provisionales al crear plan
  const [itemsNuevos, setItemsNuevos] = useState<
    { fase: string; dienteFdi: number; cara: string; procedimiento: string; costoUsd: number }[]
  >([
    { fase: "FASE_1_HIGIENE", dienteFdi: 11, cara: "Oclusal", procedimiento: "Profilaxis y Destartraje Ultrasonico", costoUsd: 35.0 },
    { fase: "FASE_1_HIGIENE", dienteFdi: 16, cara: "Oclusal", procedimiento: "Restauracion Resina Compuesta", costoUsd: 40.0 },
    { fase: "FASE_2_QUIRURGICA", dienteFdi: 24, cara: "General", procedimiento: "Tratamiento de Conducto (Endodoncia)", costoUsd: 120.0 },
    { fase: "FASE_3_REHABILITACION", dienteFdi: 24, cara: "Total", procedimiento: "Corona de Zirconio Libre de Metal", costoUsd: 250.0 },
  ]);

  useEffect(() => {
    cargarPlanes();
  }, [pacienteId]);

  const cargarPlanes = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("aurora_token") || "";
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

    try {
      const token = localStorage.getItem("aurora_token") || "";
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
          items: itemsNuevos,
        }),
      });

      if (res.ok) {
        setModalNuevoPlan(false);
        setNombreNuevoPlan("");
        setNotasNuevoPlan("");
        setNotificacion("Plan de tratamiento creado con exito.");
        cargarPlanes();
        setTimeout(() => setNotificacion(""), 3500);
      }
    } catch {
      setNotificacion("Error al crear el plan.");
    }
  };

  const handleAprobarPlan = async (planId: number) => {
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch(`/api/salud/odontologia/planes/${planId}/aprobar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotificacion("Plan aprobado por el paciente.");
        cargarPlanes();
        setTimeout(() => setNotificacion(""), 3000);
      }
    } catch {
      setNotificacion("Error al aprobar plan.");
    }
  };

  const handleMarcarRealizado = async (itemId: number) => {
    try {
      const token = localStorage.getItem("aurora_token") || "";
      const res = await fetch(`/api/salud/odontologia/planes/items/${itemId}/realizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotificacion(data.mensaje || "Procedimiento completado.");
        cargarPlanes();
        setTimeout(() => setNotificacion(""), 4000);
      }
    } catch {
      setNotificacion("Error al marcar procedimiento.");
    }
  };

  const fName = (fase: string) => {
    if (fase === "FASE_1_HIGIENE") return "Fase 1: Control, Higiene e Infeccion";
    if (fase === "FASE_2_QUIRURGICA") return "Fase 2: Endodoncias y Cirugias";
    if (fase === "FASE_3_REHABILITACION") return "Fase 3: Rehabilitacion e Implantes";
    return fase;
  };

  return (
    <div className="space-y-6 text-slate-100 text-left">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-white flex items-center gap-2">
            <span>Planes de Tratamiento & Presupuestacion por Fases</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Presupuesto Dual USD/Bs.
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Planes progresivos para {pacienteNombre || "Paciente Activo"} con descarga automatica de insumos
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
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fadeIn">
          {notificacion}
        </div>
      )}

      {/* Listado de Planes */}
      {planes.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/10 text-center text-slate-400 text-xs">
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
              className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 space-y-5 shadow-xl"
            >
              {/* Encabezado del Plan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold">#PLAN-{plan.id}</span>
                    <h4 className="font-['Outfit'] font-black text-lg text-white">{plan.nombre_plan}</h4>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        plan.estado === "APROBADO"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {plan.estado}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Creado el {new Date(plan.fecha_creacion).toLocaleDateString()} &bull; Tasa BCV aplicable: {tasaBcv.toFixed(2)} Bs/$
                  </div>
                </div>

                {/* Resumen financiero */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Presupuesto</div>
                    <div className="text-lg font-black font-['Outfit'] text-emerald-400">
                      ${totalUsd.toFixed(2)} USD
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {totalVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs.
                    </div>
                  </div>

                  {plan.estado === "PROPUESTO" && (
                    <button
                      type="button"
                      onClick={() => handleAprobarPlan(plan.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      Aprobar Plan
                    </button>
                  )}
                </div>
              </div>

              {/* Fases clinicas e items */}
              <div className="space-y-4">
                {fasesUnicas.map((fase) => {
                  const itemsFase = (plan.items || []).filter((i) => i.fase === fase);
                  const subtotalFase = itemsFase.reduce((acc, curr) => acc + Number(curr.costo_usd || 0), 0);

                  return (
                    <div key={fase} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                          {fName(fase)}
                        </span>
                        <span className="text-xs font-black text-white font-mono">
                          Subtotal: ${subtotalFase.toFixed(2)} USD
                        </span>
                      </div>

                      <div className="space-y-2">
                        {itemsFase.map((item) => {
                          const esRealizado = item.estado === "REALIZADO";

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                {item.diente_fdi && (
                                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30 font-mono">
                                    {item.diente_fdi}
                                  </span>
                                )}
                                <div>
                                  <div className="font-bold text-white">{item.procedimiento}</div>
                                  <div className="text-[11px] text-slate-400">
                                    Cara: {item.cara || "General"} &bull; Responsable: {item.odontologo_responsable || "Dra. Titular"}
                                    {item.kit_descargado && (
                                      <span className="text-emerald-400 font-bold ml-2">
                                        &bull; Insumos descontados de stock
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-white font-mono text-sm">
                                  ${Number(item.costo_usd).toFixed(2)}
                                </span>

                                {esRealizado ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                    Realizado
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMarcarRealizado(item.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 text-slate-300 hover:text-emerald-300 text-[11px] font-bold transition cursor-pointer"
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
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full text-left space-y-4 shadow-2xl">
            <h4 className="font-['Outfit'] font-black text-xl text-white">Formular Nuevo Plan de Tratamiento</h4>
            <form onSubmit={handleCrearPlan} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nombre del Plan Clinico *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Rehabilitacion Integral y Control Periodontal"
                  value={nombreNuevoPlan}
                  onChange={(e) => setNombreNuevoPlan(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notas y Diagnostico Principal</label>
                <textarea
                  rows={2}
                  value={notasNuevoPlan}
                  onChange={(e) => setNotasNuevoPlan(e.target.value)}
                  placeholder="Observaciones de presupuesto, compromiso oseo o preferencias del paciente..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="font-bold text-slate-300 mb-2">Procedimientos Iniciales por Fases (Plantilla):</div>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  {itemsNuevos.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>Pieza {it.dienteFdi}: {it.procedimiento}</span>
                      <span className="font-mono text-emerald-400 font-bold">${it.costoUsd}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoPlan(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 font-bold"
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
