import { useState } from "react";
import { IconBolt, IconMilk } from "../../Icons";
import { registrarOrdenoGanaderia, type AnimalGanaderia, type RegistroOrdenoGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { MonedasConfig } from "./tipos";
import type { Notificar } from "./tipos";

interface Props {
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  precioLecheUSD: number;
  tasaBCV: number;
  tasaCOP: number;
  monedasConfig: MonedasConfig;
  tenantId: number;
  notificar: Notificar;
  /** Ordeño guardado y litros que entraron al tanque (0 si fue venta directa). */
  onRegistrado: (ordeno: RegistroOrdenoGanaderia, litrosAlTanque: number) => void;
  onCerrar: () => void;
}

/** Ordeño de una sola vaca (para la jornada completa está el modo vaquera rápida). */
export default function ModalOrdeno({
  animales, animalesActivos, precioLecheUSD, tasaBCV, tasaCOP, monedasConfig, tenantId, notificar, onRegistrado, onCerrar,
}: Props) {
  // Formulario ordeño rápido
  const [formOrdeno, setFormOrdeno] = useState({
    animalId: animalesActivos[0]?.id ?? 0,
    turno: "MANANA",
    cantidadLitros: 12.5,
    precioVentaLitro: precioLecheUSD,
    porcentajeGrasa: 3.8,
    porcentajeProteina: 3.2,
    destino: "TANQUE" as "TANQUE" | "VENTA_DIRECTA",
  });

  // Manejador: Registrar ordeño individual
  const handleGuardarOrdeno = async (e: React.FormEvent) => {
    e.preventDefault();
    const animalSeleccionado = animales.find(a => a.id === Number(formOrdeno.animalId)) || animales[0];

    try {
      const nuevoReg = await registrarOrdenoGanaderia(tenantId, {
        animalId: Number(formOrdeno.animalId),
        fecha: fechaLocalISO(),
        turno: formOrdeno.turno,
        cantidadLitros: Number(formOrdeno.cantidadLitros),
        precioVentaLitro: Number(formOrdeno.precioVentaLitro),
        porcentajeGrasa: Number(formOrdeno.porcentajeGrasa),
        porcentajeProteina: Number(formOrdeno.porcentajeProteina),
        destino: formOrdeno.destino,
      });
      onRegistrado(nuevoReg, formOrdeno.destino === "TANQUE" ? Number(formOrdeno.cantidadLitros) : 0);
    } catch {
      notificar(`No se pudo registrar el ordeño de ${animalSeleccionado.nombre || animalSeleccionado.arete} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    const destinoTexto = formOrdeno.destino === "TANQUE" ? "almacenados en tanque de leche" : "registrados como venta directa";
    notificar(`${formOrdeno.cantidadLitros} L ${destinoTexto} para ${animalSeleccionado.nombre || animalSeleccionado.arete}.`);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-sky-500/30 text-left space-y-4">
        <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
          Registrar Ordeño
        </h3>

        <form onSubmit={handleGuardarOrdeno} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Vaca / Hembra</label>
            <select
              value={formOrdeno.animalId}
              onChange={e => setFormOrdeno({ ...formOrdeno, animalId: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
              {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                <option key={a.id} value={a.id}>{a.arete} - {a.nombre || "Sin nombre"}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Turno</label>
              <select
                value={formOrdeno.turno}
                onChange={e => setFormOrdeno({ ...formOrdeno, turno: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                <option value="MANANA">Mañana</option>
                <option value="TARDE">Tarde</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Litros Ordeñados *</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.1"
                required
                value={formOrdeno.cantidadLitros}
                onChange={e => setFormOrdeno({ ...formOrdeno, cantidadLitros: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-sky-400 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">% Grasa</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.1"
                value={formOrdeno.porcentajeGrasa}
                onChange={e => setFormOrdeno({ ...formOrdeno, porcentajeGrasa: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Precio x Litro (USD)</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.01"
                value={formOrdeno.precioVentaLitro}
                onChange={e => setFormOrdeno({ ...formOrdeno, precioVentaLitro: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-emerald-400 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Destino de la Leche *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormOrdeno({ ...formOrdeno, destino: "TANQUE" })}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formOrdeno.destino === "TANQUE"
                    ? "bg-sky-500/20 border-sky-400 text-sky-400 shadow-md shadow-sky-500/20"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}>
                <span className="inline-flex items-center gap-1.5"><IconMilk size={13} /> Al Tanque (Stock)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormOrdeno({ ...formOrdeno, destino: "VENTA_DIRECTA" })}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formOrdeno.destino === "VENTA_DIRECTA"
                    ? "bg-amber-500/20 border-amber-400 text-amber-400 shadow-md shadow-amber-500/20"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}>
                <span className="inline-flex items-center gap-1.5"><IconBolt size={13} /> Venta Directa</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {formOrdeno.destino === "TANQUE"
                ? "Suma los litros al tanque refrigerado de la finca para posterior despacho a cisterna."
                : "Ingreso inmediato por venta directa a pie de vaca o despacho sin almacenamiento."}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Liquidación estimada:</span>
            <span className="font-mono font-bold text-emerald-400">
              ${(formOrdeno.cantidadLitros * formOrdeno.precioVentaLitro).toFixed(2)} USD
              {monedasConfig.VES && ` • Bs. ${((formOrdeno.cantidadLitros * formOrdeno.precioVentaLitro) * tasaBCV).toFixed(2)}`}
              {monedasConfig.COP && ` • COP $${Math.round((formOrdeno.cantidadLitros * formOrdeno.precioVentaLitro) * tasaCOP).toLocaleString()}`}
            </span>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
              Guardar Ordeño
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
