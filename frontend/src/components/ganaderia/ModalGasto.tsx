import { useState } from "react";
import { IconCoins } from "../../Icons";
import { crearGastoGanaderia, type GastoGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import { CATEGORIAS_GASTO_GANADERIA } from "./catalogos";
import type { MonedasConfig } from "./tipos";
import type { Notificar } from "./tipos";
import { num } from "./formato";

interface Props {
  tasaBCV: number;
  tasaCOP: number;
  monedasConfig: MonedasConfig;
  tenantId: number;
  notificar: Notificar;
  onRegistrado: (gasto: GastoGanaderia) => void;
  onCerrar: () => void;
}

/** Gasto operativo del hato (alimento, sanidad, mano de obra...), en USD con su equivalente. */
export default function ModalGasto({ tasaBCV, tasaCOP, monedasConfig, tenantId, notificar, onRegistrado, onCerrar }: Props) {
  const [formGasto, setFormGasto] = useState({
    categoria: "ALIMENTACION",
    descripcion: "",
    monto: "" as number | string,
    fecha: fechaLocalISO(),
  });

  // Manejador: Registrar Gasto Operativo del Hato
  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Number(formGasto.monto);
    if (!formGasto.descripcion.trim()) {
      notificar("Ingrese una descripción detallada del gasto.");
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      notificar("El monto del gasto debe ser mayor a cero.");
      return;
    }

    const catInfo = CATEGORIAS_GASTO_GANADERIA.find(c => c.id === formGasto.categoria);
    const catLabel = catInfo ? catInfo.label.split("/")[0].trim() : formGasto.categoria;

    try {
      const nuevo = await crearGastoGanaderia(tenantId, {
        categoria: formGasto.categoria,
        descripcion: formGasto.descripcion.trim(),
        monto: montoNum,
        fecha: formGasto.fecha || fechaLocalISO(),
      });
      onRegistrado(nuevo);
      onCerrar();
      notificar(`Gasto registrado: $${num(montoNum, 2)} USD en ${catLabel}`);
    } catch (err: any) {
      notificar(`Error al registrar gasto: ${err?.message || "revisa tu conexión e inténtalo de nuevo"}.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-['Inter']">
      <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-emerald-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400"><IconCoins size={24} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Registrar Gasto Operativo
              </h3>
              <p className="text-[11px] text-slate-400">
                Egreso de caja para insumos, alimentación, veterinario o jornales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleGuardarGasto} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              Categoría del Gasto *
            </label>
            <select
              value={formGasto.categoria}
              onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-emerald-500 focus:outline-none"
            >
              {CATEGORIAS_GASTO_GANADERIA.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              Descripción Detallada *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 10 sacos de sal mineralizada y 2 tambores de melaza..."
              value={formGasto.descripcion}
              onChange={e => setFormGasto({ ...formGasto, descripcion: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                Monto en Dólares (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-emerald-400 font-bold">$</span>
                <input
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formGasto.monto}
                  onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-white/15 text-emerald-400 tabular-nums font-bold text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                Fecha del Gasto *
              </label>
              <input
                type="date"
                required
                value={formGasto.fecha}
                onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white tabular-nums text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversión en vivo a monedas activas */}
          {Number(formGasto.monto) > 0 && (monedasConfig.VES || monedasConfig.COP) && (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-[11px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Equivalencia al cambio actual:</span>
              {monedasConfig.VES && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Bolívares (Tasa {num(tasaBCV, 2)}):</span>
                  <span className="tabular-nums font-bold text-emerald-300">
                    Bs. {num((Number(formGasto.monto) * tasaBCV), 2)}
                  </span>
                </div>
              )}
              {monedasConfig.COP && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Pesos Colombianos (Tasa {tasaCOP}):</span>
                  <span className="tabular-nums font-bold text-sky-300">
                    COP ${num(Math.round(Number(formGasto.monto) * tasaCOP), 0)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl btn-cyber-neon text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
              <span>Guardar Gasto Operativo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
