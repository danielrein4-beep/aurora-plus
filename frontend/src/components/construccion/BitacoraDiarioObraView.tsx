import React, { useState } from "react";
import { RegistroBitacora, ProyectoConstruccion, ClimaJornada } from "./types";
import { IconPlus, IconClose, IconCheck, IconCalendar, IconUsers, IconConstruction } from "../../Icons";

interface Props {
  proyecto: ProyectoConstruccion;
  bitacora: RegistroBitacora[];
  onAgregarEntradaBitacora: (registro: RegistroBitacora) => void;
}

export default function BitacoraDiarioObraView({
  proyecto,
  bitacora,
  onAgregarEntradaBitacora,
}: Props) {
  const [modalNuevo, setModalNuevo] = useState(false);

  // Form nueva entrada
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [clima, setClima] = useState<ClimaJornada>("SOLEADO");
  const [cuadrillas, setCuadrillas] = useState(2);
  const [obreros, setObreros] = useState(12);
  const [equipos, setEquipos] = useState("");
  const [trabajos, setTrabajos] = useState("");
  const [incidencias, setIncidencias] = useState("");

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajos.trim()) return;

    onAgregarEntradaBitacora({
      id: `bit-${Date.now()}`,
      proyectoId: proyecto.id,
      fecha,
      clima,
      cuadrillasActivas: Number(cuadrillas) || 1,
      obrerosPresentes: Number(obreros) || 1,
      equiposEnSitio: equipos.trim() || "Herramientas menores de construcción.",
      trabajosEjecutados: trabajos.trim(),
      incidencias: incidencias.trim() || undefined,
      ingenieroFirma: `${proyecto.ingenieroResidente} (${proyecto.ingenieroCiv})`,
    });

    setTrabajos("");
    setIncidencias("");
    setModalNuevo(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE BITÁCORA */}
      <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="text-[10px] font-mono text-teal-400 uppercase font-bold">Libro de Obra & Diario de Campo</div>
          <h3 className="font-['Outfit'] font-black text-xl text-white">
            Bitácora Oficial de Construcción
          </h3>
          <p className="text-xs text-white/50">
            Registro legal y técnico diario de labores, condiciones climáticas y personal en sitio.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="btn-cyber-neon px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
        >
          <IconPlus size={14} />
          <span>+ Asentar Jornada en Bitácora</span>
        </button>
      </div>

      {/* LISTADO DE ASIENTOS DE BITÁCORA */}
      <div className="space-y-4">
        {bitacora.length === 0 ? (
          <div className="apple-glass rounded-3xl p-12 text-center border border-white/10 text-white/50">
            No hay registros en la bitácora aún. Asienta la primera jornada de trabajo.
          </div>
        ) : (
          bitacora.map((reg) => (
            <div
              key={reg.id}
              className="apple-glass rounded-3xl p-6 border border-white/10 hover:border-teal-400/30 transition-all space-y-4 shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-teal-300 text-sm bg-teal-500/10 px-2.5 py-1 rounded-xl">
                    {reg.fecha}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    reg.clima === "SOLEADO"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : reg.clima === "LLUVIOSO"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                  }`}>
                    Clima: {reg.clima}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-white/60 font-mono">
                  <span>{reg.cuadrillasActivas} cuadrillas activas</span>
                  <span>•</span>
                  <span>{reg.obrerosPresentes} obreros en campo</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-mono font-bold">
                    Labores & Trabajos Ejecutados:
                  </span>
                  <p className="text-white leading-relaxed mt-0.5 text-xs font-sans whitespace-pre-wrap">
                    {reg.trabajosEjecutados}
                  </p>
                </div>

                {reg.equiposEnSitio && (
                  <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                    <span className="text-white/40 block text-[10px] uppercase font-mono">
                      Maquinaria & Equipos en Operación:
                    </span>
                    <span className="text-white/80">{reg.equiposEnSitio}</span>
                  </div>
                )}

                {reg.incidencias && (
                  <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-200">
                    <span className="block text-[10px] uppercase font-mono font-bold text-amber-400">
                      Novedades & Ensayos Técnicos:
                    </span>
                    <p className="mt-0.5">{reg.incidencias}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-white/40 font-mono">
                <span>Registrado por: {reg.ingenieroFirma}</span>
                <span className="text-teal-400 font-bold">Conforme</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL NUEVA JORNADA */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-500/40 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Outfit'] font-black text-xl text-white">Asentar Jornada en Bitácora</h3>
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Condición Climática</label>
                  <select
                    value={clima}
                    onChange={(e) => setClima(e.target.value as ClimaJornada)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono"
                  >
                    <option value="SOLEADO">Soleado / Despejado</option>
                    <option value="NUBLADO">Nublado</option>
                    <option value="LLUVIOSO">Lluvia / Paralización Parcial</option>
                    <option value="VARIABLE">Variable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Cuadrillas Activas</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cuadrillas}
                    onChange={(e) => setCuadrillas(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Total Obreros en Sitio</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={obreros}
                    onChange={(e) => setObreros(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Equipos y Maquinaria en Operación</label>
                <input
                  type="text"
                  placeholder="Ej: 1 Retroexcavadora, 1 Trompo mezclador, vibradores..."
                  value={equipos}
                  onChange={(e) => setEquipos(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Descripción de Trabajos Ejecutados *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalles sobre zanjas excavadas, vaciado de concreto, asentamiento de bloques..."
                  value={trabajos}
                  onChange={(e) => setTrabajos(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Novedades, Ensayos de Probetas o Incidencias</label>
                <textarea
                  rows={2}
                  placeholder="Toma de cilindros a compresión, inspección de armaduras, observaciones..."
                  value={incidencias}
                  onChange={(e) => setIncidencias(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="px-4 py-2 rounded-xl text-white/70 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-black text-xs hover:brightness-110 cursor-pointer"
                >
                  Guardar en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}