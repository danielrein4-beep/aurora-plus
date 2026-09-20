import React, { useState } from "react";
import { InsumoObra } from "./types";
import { IconPlus, IconClose, IconCheck, IconHardware, IconUsers } from "../../Icons";

interface Props {
  insumos: InsumoObra[];
  tasaBcv: number;
  onCrearInsumo: (insumo: InsumoObra) => void;
  onRegistrarConsumo: (insumoId: string, cantidad: number) => void;
}

export default function InsumosComprasObraView({
  insumos,
  tasaBcv,
  onCrearInsumo,
  onRegistrarConsumo,
}: Props) {
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | "MATERIAL" | "EQUIPO" | "MANO_OBRA">("TODOS");
  const [modalNuevo, setModalNuevo] = useState(false);

  // Form nuevo insumo
  const [codigo, setCodigo] = useState("MAT-");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"MATERIAL" | "EQUIPO" | "MANO_OBRA">("MATERIAL");
  const [unidad, setUnidad] = useState("saco");
  const [costoUnitario, setCostoUnitario] = useState(10);
  const [cantidadPresupuestada, setCantidadPresupuestada] = useState(100);
  const [proveedor, setProveedor] = useState("");

  const insumosFiltrados = insumos.filter((i) => tipoFiltro === "TODOS" || i.tipo === tipoFiltro);

  const totalPresupuestadoUSD = insumos.reduce((acc, i) => acc + i.cantidadPresupuestada * i.costoUnitarioUSD, 0);
  const totalConsumidoUSD = insumos.reduce((acc, i) => acc + i.cantidadConsumida * i.costoUnitarioUSD, 0);

  const handleGuardarInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    onCrearInsumo({
      id: `ins-${Date.now()}`,
      codigo: codigo.trim() || `INS-${Date.now().toString().slice(-4)}`,
      nombre: nombre.trim(),
      tipo,
      unidad,
      costoUnitarioUSD: Number(costoUnitario) || 0,
      cantidadPresupuestada: Number(cantidadPresupuestada) || 0,
      cantidadConsumida: 0,
      proveedor: proveedor.trim() || undefined,
    });

    setNombre("");
    setProveedor("");
    setModalNuevo(false);
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS RESUMEN DE INSUMOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="apple-glass rounded-2xl p-4 border border-white/10 bg-slate-900/40">
          <div className="text-white/50 text-xs font-mono uppercase">Insumos Controlados</div>
          <div className="text-2xl font-black text-white font-['Outfit'] mt-1">{insumos.length}</div>
          <div className="text-[11px] text-teal-400 mt-0.5">Materiales, equipos y cuadrillas</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-teal-500/20 bg-teal-500/5">
          <div className="text-teal-300 text-xs font-mono uppercase">Presupuestado en Insumos</div>
          <div className="text-2xl font-black text-teal-300 font-['Outfit'] mt-1">
            ${totalPresupuestadoUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-teal-200/70 mt-0.5">Cálculo de explosión de insumos</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="text-amber-300 text-xs font-mono uppercase">Consumo Real en Sitio</div>
          <div className="text-2xl font-black text-amber-400 font-['Outfit'] mt-1">
            ${totalConsumidoUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-300/70 mt-0.5">Ejecutado hasta la fecha</div>
        </div>

        <div className="apple-glass rounded-2xl p-4 border border-sky-500/20 bg-sky-500/5">
          <div className="text-sky-300 text-xs font-mono uppercase">Saldo por Ejecutar</div>
          <div className="text-2xl font-black text-sky-400 font-['Outfit'] mt-1">
            ${Math.max(0, totalPresupuestadoUSD - totalConsumidoUSD).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-sky-300/70 mt-0.5">Disponible en presupuesto</div>
        </div>
      </div>

      {/* CONTROLES Y FILTROS */}
      <div className="apple-glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          {(["TODOS", "MATERIAL", "EQUIPO", "MANO_OBRA"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipoFiltro === t
                  ? "bg-teal-500 text-black shadow-md font-black"
                  : "bg-white/5 hover:bg-white/10 text-white/70"
              }`}
            >
              {t === "TODOS" ? "Todos" : t === "MATERIAL" ? "Materiales" : t === "EQUIPO" ? "Equipos" : "Mano de Obra"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="btn-cyber-neon px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform cursor-pointer"
        >
          <IconPlus size={14} />
          <span>+ Registrar Insumo</span>
        </button>
      </div>

      {/* TABLA DE INSUMOS */}
      <div className="apple-glass rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/50 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Nombre del Insumo / Recurso</th>
                <th className="py-2.5 px-2 text-center">Tipo</th>
                <th className="py-2.5 px-2 text-center">Unidad</th>
                <th className="py-2.5 px-3 text-right">Costo Unitario</th>
                <th className="py-2.5 px-3 text-right">Presupuestado</th>
                <th className="py-2.5 px-3 text-right">Consumido</th>
                <th className="py-2.5 px-3 text-right">Saldo</th>
                <th className="py-2.5 px-3 text-center">Registrar Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {insumosFiltrados.map((ins) => {
                const saldo = ins.cantidadPresupuestada - ins.cantidadConsumida;
                const porcentaje = Math.min(100, (ins.cantidadConsumida / (ins.cantidadPresupuestada || 1)) * 100);

                return (
                  <tr key={ins.id} className="hover:bg-white/[0.02] text-white/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-300">{ins.codigo}</td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {ins.nombre}
                      {ins.proveedor && <span className="block text-[10px] text-white/40">{ins.proveedor}</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ins.tipo === "MATERIAL"
                          ? "bg-teal-500/20 text-teal-300"
                          : ins.tipo === "EQUIPO"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}>
                        {ins.tipo === "MATERIAL" ? "Material" : ins.tipo === "EQUIPO" ? "Equipo" : "Cuadrilla"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-teal-400 font-bold">{ins.unidad}</td>
                    <td className="py-2.5 px-3 text-right font-mono">${ins.costoUnitarioUSD.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{ins.cantidadPresupuestada}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                      {ins.cantidadConsumida} ({porcentaje.toFixed(0)}%)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {saldo}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const cant = prompt(`Registrar consumo para ${ins.nombre} (${ins.unidad}):`, "10");
                          if (cant && parseFloat(cant) > 0) {
                            onRegistrarConsumo(ins.id, parseFloat(cant));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-teal-500 hover:text-black text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        + Consumo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVO INSUMO */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-500/40 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-['Outfit'] font-black text-xl text-white">Nuevo Insumo de Obra</h3>
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarInsumo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Tipo de Recurso</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white"
                  >
                    <option value="MATERIAL">Material</option>
                    <option value="EQUIPO">Equipo / Maquinaria</option>
                    <option value="MANO_OBRA">Mano de Obra / Cuadrilla</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Nombre o Descripción</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cemento Gris Portland Tipo I (42.5 kg)"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Unidad</label>
                  <input
                    type="text"
                    required
                    placeholder="saco, m³, hora, día"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Costo Unit. ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-teal-300 font-mono text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Cant. Presupuestada</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={cantidadPresupuestada}
                    onChange={(e) => setCantidadPresupuestada(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Proveedor Habitual (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Cementos Catatumbo, Ferretería El Ancla..."
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
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
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}