import React, { useState } from "react";
import { TurnoWalkIn, Especialista, ServicioPeluqueria } from "./types";
import { IconHourglass, IconPlus, IconCheck, IconClose, IconSparkles } from "../../Icons";

interface Props {
  turnos: TurnoWalkIn[];
  especialistas: Especialista[];
  servicios: ServicioPeluqueria[];
  onAgregarWalkIn: (turno: Omit<TurnoWalkIn, "id">) => void;
  onCambiarEstadoWalkIn: (id: string, nuevoEstado: TurnoWalkIn["estado"], datosExtra?: Partial<TurnoWalkIn>) => void;
  onCobrarWalkIn: (turno: TurnoWalkIn) => void;
}

export default function FilaAtencionWalkIn({
  turnos,
  especialistas,
  servicios,
  onAgregarWalkIn,
  onCambiarEstadoWalkIn,
  onCobrarWalkIn,
}: Props) {
  const [modalNuevoWalkIn, setModalNuevoWalkIn] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formServicio, setFormServicio] = useState(servicios[0]?.nombre || "Corte Express");
  const [formEspecialistaId, setFormEspecialistaId] = useState("");
  const [formSillon, setFormSillon] = useState("Tocador 1");

  const enEspera = turnos.filter((t) => t.estado === "ESPERANDO");
  const enSillon = turnos.filter((t) => t.estado === "EN_SILLON");
  const listosCobro = turnos.filter((t) => t.estado === "LISTO_COBRO");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const srv = servicios.find((s) => s.nombre === formServicio);
    const esp = especialistas.find((e) => e.id === formEspecialistaId);

    onAgregarWalkIn({
      clienteNombre: formNombre.trim(),
      clienteTelefono: formTelefono.trim() || "Presencial",
      servicioSolicitado: formServicio,
      precioEstimadoUSD: srv?.precioUSD || 20,
      horaLlegada: new Date().toTimeString().slice(0, 5),
      especialistaId: esp?.id,
      especialistaNombre: esp?.nombre,
      sillonOTocador: formSillon,
      estado: "ESPERANDO",
      tiempoEsperaMinutos: 0,
    });

    setFormNombre("");
    setFormTelefono("");
    setModalNuevoWalkIn(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header con Métricas y Botón Rápido */}
      <div className="apple-glass rounded-3xl p-6 border border-white/10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-rose-500/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Fila Rápida de Atención Espontánea</span>
          </div>
          <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white">
            Clientas Sin Cita (Walk-in)
          </h2>
          <p className="text-white/60 text-xs sm:text-sm mt-1 max-w-xl">
            Registra a clientas que llegan directamente a la puerta. Asígnalas a un sillón disponible y liquídalas en caja al terminar.
          </p>
        </div>

        <button
          onClick={() => setModalNuevoWalkIn(true)}
          className="btn-electric-blue px-5 py-3 rounded-2xl text-xs font-black text-white flex items-center gap-2 shadow-[0_0_25px_rgba(0,180,255,0.4)] hover:scale-105 transition-all"
        >
          <IconPlus size={16} />
          <span>+ Registrar Turno Walk-in</span>
        </button>
      </div>

      {/* 3 Columnas Kanban de Flujo de Atención */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. En Sala de Espera */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h4 className="font-['Outfit'] font-bold text-sm text-white uppercase tracking-wider">
                1. Esperando ({enEspera.length})
              </h4>
            </div>
            <span className="text-[11px] text-white/40">Fila activa</span>
          </div>

          <div className="space-y-3">
            {enEspera.length === 0 ? (
              <div className="apple-glass rounded-2xl p-6 text-center border border-dashed border-white/10 text-white/40 text-xs">
                No hay nadie en sala de espera.
              </div>
            ) : (
              enEspera.map((t) => (
                <div key={t.id} className="apple-glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      Llegó: {t.horaLlegada}
                    </span>
                    <span className="text-[11px] text-white/50 flex items-center gap-1 font-mono">
                      <IconHourglass size={12} /> {t.tiempoEsperaMinutos || 5} min
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-base text-white">{t.clienteNombre}</h5>
                    <div className="text-rose-300 text-xs font-medium mt-0.5">{t.servicioSolicitado}</div>
                    <div className="text-white/40 text-[11px] font-mono mt-0.5">{t.clienteTelefono}</div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                    <button
                      onClick={() => onCambiarEstadoWalkIn(t.id, "EN_SILLON", { sillonOTocador: "Tocador Libre" })}
                      className="w-full py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs hover:brightness-110 shadow-md"
                    >
                      Sentar en Sillón →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. En Sillón / Siendo Atendida */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
              <h4 className="font-['Outfit'] font-bold text-sm text-white uppercase tracking-wider">
                2. En Sillón ({enSillon.length})
              </h4>
            </div>
            <span className="text-[11px] text-rose-400">En proceso</span>
          </div>

          <div className="space-y-3">
            {enSillon.length === 0 ? (
              <div className="apple-glass rounded-2xl p-6 text-center border border-dashed border-white/10 text-white/40 text-xs">
                No hay clientas en sillón en este momento.
              </div>
            ) : (
              enSillon.map((t) => (
                <div key={t.id} className="apple-glass rounded-2xl p-4 border border-rose-500/30 bg-rose-500/5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-md">
                      {t.sillonOTocador || "Tocador Activo"}
                    </span>
                    <span className="font-mono text-xs text-teal-400 font-bold">
                      ${t.precioEstimadoUSD} USD
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-base text-white">{t.clienteNombre}</h5>
                    <div className="text-white/80 text-xs mt-0.5">{t.servicioSolicitado}</div>
                    <div className="text-white/50 text-[11px] mt-1 flex items-center gap-1">
                      <span>Especialista:</span>
                      <strong className="text-white/90">{t.especialistaNombre || "Asignado en turno"}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => onCambiarEstadoWalkIn(t.id, "LISTO_COBRO")}
                      className="w-full py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-black text-xs hover:brightness-110 shadow-md"
                    >
                      Terminar Servicio →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Listos para Cobrar en Caja */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h4 className="font-['Outfit'] font-bold text-sm text-white uppercase tracking-wider">
                3. Listos para Caja ({listosCobro.length})
              </h4>
            </div>
            <span className="text-[11px] text-emerald-400">Por cobrar</span>
          </div>

          <div className="space-y-3">
            {listosCobro.length === 0 ? (
              <div className="apple-glass rounded-2xl p-6 text-center border border-dashed border-white/10 text-white/40 text-xs">
                No hay cobros pendientes de turnos express.
              </div>
            ) : (
              listosCobro.map((t) => (
                <div key={t.id} className="apple-glass rounded-2xl p-4 border border-emerald-500/40 bg-emerald-500/10 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                      Listo para Facturar
                    </span>
                    <span className="font-mono text-base font-black text-emerald-400">
                      ${t.precioEstimadoUSD.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-base text-white">{t.clienteNombre}</h5>
                    <div className="text-white/70 text-xs">{t.servicioSolicitado}</div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => onCobrarWalkIn(t)}
                      className="w-full py-2 rounded-xl bg-emerald-400 text-black font-black text-xs hover:bg-emerald-300 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <IconCheck size={15} /> Cobrar en Caja
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Registrar Walk-In */}
      {modalNuevoWalkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/20 shadow-2xl relative">
            <button
              onClick={() => setModalNuevoWalkIn(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <IconClose size={20} />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider mb-2">
              <IconSparkles size={14} />
              <span>Turno Rápido Espontáneo</span>
            </div>
            <h3 className="font-['Outfit'] font-black text-2xl text-white mb-4">
              Registrar Clienta Walk-In
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Nombre o Apodo de la Clienta</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Génesis / Señora Carmen"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Teléfono Móvil (Opcional)</label>
                <input
                  type="text"
                  placeholder="+58 414 000-0000"
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Servicio Deseado</label>
                <select
                  value={formServicio}
                  onChange={(e) => setFormServicio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  {servicios.map((srv) => (
                    <option key={srv.id} value={srv.nombre}>
                      {srv.nombre} — ${srv.precioUSD} ({srv.duracionMinutos} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Especialista</label>
                  <select
                    value={formEspecialistaId}
                    onChange={(e) => setFormEspecialistaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">Cualquiera Disponible</option>
                    {especialistas.map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        {esp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Tocador / Sillón</label>
                  <select
                    value={formSillon}
                    onChange={(e) => setFormSillon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Tocador 1">Tocador 1</option>
                    <option value="Tocador 2">Tocador 2</option>
                    <option value="Tocador 3">Tocador 3</option>
                    <option value="Sillón Barbero 1">Sillón Barbero 1</option>
                    <option value="Área de Manicura">Área de Manicura</option>
                    <option value="Lavado de Cabello">Lavado</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoWalkIn(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-colors shadow-lg"
                >
                  Ingresar a Fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
