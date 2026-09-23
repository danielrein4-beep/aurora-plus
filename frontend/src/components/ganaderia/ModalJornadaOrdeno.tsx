import { useState } from "react";
import { IconBolt, IconMilk } from "../../Icons";
import { registrarOrdenoGanaderia, type AnimalGanaderia, type RegistroOrdenoGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { MonedasConfig, Notificar } from "./tipos";

/** Vacas y novillas del hato activo: las que entran en la jornada de ordeño. */
export function vacasDeOrdeno(animalesActivos: AnimalGanaderia[]) {
  return animalesActivos.filter(a => a.sexo === "HEMBRA" && (a.tipoAnimal === "VACA" || a.tipoAnimal === "NOVILLA"));
}

interface Props {
  animalesActivos: AnimalGanaderia[];
  tenantId: number;
  precioLecheUSD: number;
  tasaBCV: number;
  tasaCOP: number;
  monedasConfig: MonedasConfig;
  notificar: Notificar;
  /** Ordeños ya guardados y litros que entraron al tanque (0 si fue venta directa). */
  onJornadaGuardada: (ordenos: RegistroOrdenoGanaderia[], litrosAlTanque: number) => void;
  onCerrar: () => void;
}

/**
 * Modo vaquera rápida: la jornada de ordeño de todo el rebaño en una sola tabla,
 * litros de mañana y tarde por vaca, con las de mastitis fuera de la leche comercial.
 */
export default function ModalJornadaOrdeno({
  animalesActivos, tenantId, precioLecheUSD, tasaBCV, tasaCOP, monedasConfig, notificar, onJornadaGuardada, onCerrar,
}: Props) {
  const [busquedaVaquera, setBusquedaVaquera] = useState("");
  const [vaqueraFecha, setVaqueraFecha] = useState(fechaLocalISO());
  const [vaqueraTurno, setVaqueraTurno] = useState<"MANANA" | "TARDE" | "DOBLE">("MANANA");
  const [vaqueraPrecioUSD, setVaqueraPrecioUSD] = useState<number>(precioLecheUSD);
  const [vaqueraTasaVES, setVaqueraTasaVES] = useState<number>(tasaBCV);
  const [vaqueraFilas, setVaqueraFilas] = useState<Array<{
    animalId: number;
    arete: string;
    nombre: string;
    litrosManana: number | string;
    litrosTarde: number | string;
    estado: "NORMAL" | "MASTITIS" | "CALOSTRO" | "SECA";
    notas: string;
  }>>(() => vacasDeOrdeno(animalesActivos).map(v => ({
    animalId: v.id,
    arete: v.arete,
    nombre: v.nombre || `Vaca ${v.arete}`,
    litrosManana: "",
    litrosTarde: "",
    estado: "NORMAL" as const,
    notas: "",
  })));
  const [vaqueraDestino, setVaqueraDestino] = useState<"TANQUE" | "VENTA_DIRECTA">("TANQUE");

  // Guardar Jornada de Ordeño en Lote desde Modo Vaquera Rápida
  const guardarJornadaVaquera = async () => {
    const filasValidas = vaqueraFilas.filter(f => Number(f.litrosManana) > 0 || Number(f.litrosTarde) > 0);
    if (filasValidas.length === 0) {
      notificar("No se ingresaron litros en ninguna vaca.");
      return;
    }

    let mastitisCount = 0;
    let litrosComercialesTotal = 0;
    const nuevosOrdenos: RegistroOrdenoGanaderia[] = [];
    const fallidas: string[] = [];

    for (const f of filasValidas) {
      const litrosTotales = (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0);
      const esComercial = f.estado !== "MASTITIS";

      try {
        const reg = await registrarOrdenoGanaderia(tenantId, {
          animalId: f.animalId,
          fecha: vaqueraFecha,
          turno: vaqueraTurno === "DOBLE" ? "MANANA" : vaqueraTurno,
          cantidadLitros: litrosTotales,
          precioVentaLitro: vaqueraPrecioUSD,
          porcentajeGrasa: 3.8,
          porcentajeProteina: 3.2,
          destino: vaqueraDestino,
        });
        nuevosOrdenos.push(reg);
        if (f.estado === "MASTITIS") {
          mastitisCount++;
        } else {
          litrosComercialesTotal += litrosTotales;
        }
      } catch {
        fallidas.push(f.arete);
      }
    }

    onJornadaGuardada(nuevosOrdenos, vaqueraDestino === "TANQUE" ? litrosComercialesTotal : 0);

  onCerrar();

    const ingresoUSD = (litrosComercialesTotal * vaqueraPrecioUSD).toFixed(2);
    const destinoLabel = vaqueraDestino === "TANQUE" ? "almacenados en tanque" : "venta directa";

    if (fallidas.length > 0) {
      notificar(`Se guardaron ${nuevosOrdenos.length} de ${filasValidas.length} registros. No se pudo registrar: ${fallidas.join(", ")} — revisa tu conexión e inténtalo de nuevo con esas vacas.`);
    } else if (mastitisCount > 0) {
      notificar(`Jornada guardada: ${litrosComercialesTotal.toFixed(1)} L comerciales (${destinoLabel}). ¡Atención! ${mastitisCount} vaca(s) aislada(s) con Mastitis.`);
    } else {
      notificar(`Jornada registrada: ${litrosComercialesTotal.toFixed(1)} L recolectados (${destinoLabel}) por $${ingresoUSD} USD.`);
    }
  };

    const totalVacasFila = vaqueraFilas.length;
    const vacasConLitros = vaqueraFilas.filter(f => Number(f.litrosManana) > 0 || Number(f.litrosTarde) > 0).length;
    const totalLitrosTodos = vaqueraFilas.reduce((s, f) => s + (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0), 0);
    const litrosMastitis = vaqueraFilas
      .filter(f => f.estado === "MASTITIS")
      .reduce((s, f) => s + (Number(f.litrosManana) || 0) + (Number(f.litrosTarde) || 0), 0);
    const litrosComerciales = Math.max(0, totalLitrosTodos - litrosMastitis);
    const promedioPorVaca = vacasConLitros > 0 ? (totalLitrosTodos / vacasConLitros) : 0;
    const ingresoUSD = (litrosComerciales * vaqueraPrecioUSD).toFixed(2);
    const ingresoVES = (litrosComerciales * vaqueraPrecioUSD * vaqueraTasaVES).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
        <div className="apple-glass rounded-3xl p-5 sm:p-7 max-w-5xl w-full border border-emerald-500/40 bg-slate-950/95 shadow-2xl text-left space-y-5 my-auto max-h-[92vh] flex flex-col font-['Inter']">
        
          {/* Cabecera del Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                <span>Modo Vaquera Rápida • Carga Masiva</span>
              </div>
              <h3 className="font-['Outfit'] font-black text-xl sm:text-2xl text-white mt-1">
                Pesaje Diario de Leche
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Usa las teclas <strong>ENTER</strong> o <strong>TAB</strong> para registrar vaca tras vaca sin despegar las manos del teclado.
              </p>
            </div>

            <button
              onClick={() => onCerrar()}
              className="w-8 h-8 rounded-full apple-glass border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
              ✕
            </button>
          </div>

          {/* Barra Superior de Parámetros Económicos y de Jornada */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <div>
              <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Fecha</label>
              <input
                type="date"
                value={vaqueraFecha}
                onChange={e => setVaqueraFecha(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Turno</label>
              <div className="flex gap-1">
                {(["MANANA", "TARDE", "DOBLE"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setVaqueraTurno(t)}
                    className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      vaqueraTurno === t ? "bg-emerald-500 text-slate-950 font-black shadow-md" : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}>
                    {t === "MANANA" ? "AM" : t === "TARDE" ? "PM" : "Doble"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Destino Leche</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setVaqueraDestino("TANQUE")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    vaqueraDestino === "TANQUE" ? "bg-sky-500 text-slate-950 font-black shadow-md" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}>
                  <span className="inline-flex items-center gap-1"><IconMilk size={11} /> Tanque</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVaqueraDestino("VENTA_DIRECTA")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    vaqueraDestino === "VENTA_DIRECTA" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}>
                  <span className="inline-flex items-center gap-1"><IconBolt size={11} /> Directa</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Precio Leche ($/L)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-emerald-400 font-bold">$</span>
                <input
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.01"
                  value={vaqueraPrecioUSD}
                  onChange={e => setVaqueraPrecioUSD(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 pl-7 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                {monedasConfig.VES ? "Tasa Cambio (Bs.)" : monedasConfig.COP ? "Tasa Cambio (COP)" : "Moneda Base"}
              </label>
              {monedasConfig.VES ? (
                <div className="relative">
                  <span className="absolute left-3 top-2 text-purple-400 font-bold">Bs.</span>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="0.5"
                    value={vaqueraTasaVES}
                    onChange={e => setVaqueraTasaVES(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 pl-9 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                  />
                </div>
              ) : monedasConfig.COP ? (
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sky-400 font-bold text-[10px]">COP</span>
                  <input
                    type="number"
                    onFocus={e => e.target.select()}
                    step="10"
                    value={tasaCOP}
                    readOnly
                    className="w-full p-2 pl-11 rounded-xl bg-slate-900 border border-white/15 text-white font-mono font-bold text-xs"
                  />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-slate-900 border border-white/15 text-slate-400 font-mono text-xs">
                  USD ($) Fijo
                </div>
              )}
            </div>
          </div>

          {/* Tarjetas de Totales en Tiempo Real (Apple Liquid Glass) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase block">Vacas Ordeñadas</span>
              <div className="font-['Outfit'] font-bold text-xl text-white">
                {vacasConLitros} <span className="text-slate-500 text-xs font-normal">/ {totalVacasFila}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-sky-500/30 space-y-0.5">
              <span className="text-sky-400 text-[10px] uppercase block font-bold">Litros Comerciales</span>
              <div className="font-['Outfit'] font-black text-xl text-sky-400">
                {litrosComerciales.toFixed(1)} L
              </div>
              {litrosMastitis > 0 && (
                <span className="text-[10px] text-red-400 font-bold block">
                  −{litrosMastitis.toFixed(1)} L descarte (Mastitis)
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase block">Destino Asignado</span>
              <div className="font-['Outfit'] font-bold text-lg text-white">
                {vaqueraDestino === "TANQUE" ? "Al Tanque" : "Venta Directa"}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Prom. {promedioPorVaca.toFixed(1)} L/vaca
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
              <span className="text-emerald-400 text-[10px] uppercase block font-bold">Ingreso Proyectado</span>
              <div className="font-['Outfit'] font-black text-xl text-emerald-400">
                ${ingresoUSD}
              </div>
              {monedasConfig.VES && (
                <span className="text-[10px] text-emerald-300/80 font-mono block">
                  Bs. {ingresoVES}
                </span>
              )}
              {monedasConfig.COP && (
                <span className="text-[10px] text-sky-300/80 font-mono block">
                  COP ${Math.round(Number(ingresoUSD) * tasaCOP).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Buscador de vaca: filtra filas sin perder lo ya digitado en las demás */}
          <input
            type="search"
            value={busquedaVaquera}
            onChange={e => setBusquedaVaquera(e.target.value)}
            placeholder="Buscar vaca por número de arete o nombre..."
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-600 focus:outline-none"
          />

          {/* Tabla de Entrada Ultrarrápida por Teclado */}
          <div className="flex-1 overflow-y-auto max-h-72 rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-bold z-10">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Arete / Vaca</th>
                  {(vaqueraTurno === "MANANA" || vaqueraTurno === "DOBLE") && (
                    <th className="p-3 w-28">Litros AM</th>
                  )}
                  {(vaqueraTurno === "TARDE" || vaqueraTurno === "DOBLE") && (
                    <th className="p-3 w-28">Litros PM</th>
                  )}
                  <th className="p-3 w-24">Total</th>
                  <th className="p-3 w-36">Estatus de Ubre</th>
                  <th className="p-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vaqueraFilas.map((fila, idx) => {
                  const q = busquedaVaquera.trim().toLowerCase();
                  if (q && !String(fila.arete || "").toLowerCase().includes(q) && !String(fila.nombre || "").toLowerCase().includes(q)) {
                    return null;
                  }
                  const totalFila = (Number(fila.litrosManana) || 0) + (Number(fila.litrosTarde) || 0);
                  const esMastitis = fila.estado === "MASTITIS";
                  const esCalostro = fila.estado === "CALOSTRO";

                  return (
                    <tr
                      key={fila.animalId || idx}
                      className={`transition-colors ${
                        esMastitis
                          ? "bg-red-500/10 hover:bg-red-500/15"
                          : esCalostro
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : "hover:bg-white/5"
                      }`}>
                      <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    
                      <td className="p-3">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                            {fila.arete}
                          </span>
                          <span>{fila.nombre}</span>
                        </div>
                      </td>

                      {(vaqueraTurno === "MANANA" || vaqueraTurno === "DOBLE") && (
                        <td className="p-2">
                          <input
                            id={`vaquera-input-am-${idx}`}
                            type="number"
                            onFocus={e => e.target.select()}
                            step="0.1"
                            placeholder="0.0"
                            value={fila.litrosManana}
                            onChange={e => {
                              const val = e.target.value;
                              setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, litrosManana: val } : f));
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const nextInput = document.getElementById(
                                  vaqueraTurno === "DOBLE"
                                    ? `vaquera-input-pm-${idx}`
                                    : `vaquera-input-am-${idx + 1}`
                                );
                                if (nextInput) nextInput.focus();
                              }
                            }}
                            className="w-full p-2 rounded-xl bg-slate-950 border border-white/20 focus:border-emerald-400 focus:bg-emerald-950/20 text-white font-mono font-bold text-sm text-center outline-none transition-all shadow-inner"
                          />
                        </td>
                      )}

                      {(vaqueraTurno === "TARDE" || vaqueraTurno === "DOBLE") && (
                        <td className="p-2">
                          <input
                            id={`vaquera-input-pm-${idx}`}
                            type="number"
                            onFocus={e => e.target.select()}
                            step="0.1"
                            placeholder="0.0"
                            value={fila.litrosTarde}
                            onChange={e => {
                              const val = e.target.value;
                              setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, litrosTarde: val } : f));
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const nextInput = document.getElementById(`vaquera-input-am-${idx + 1}`);
                                if (nextInput) nextInput.focus();
                              }
                            }}
                            className="w-full p-2 rounded-xl bg-slate-950 border border-white/20 focus:border-emerald-400 focus:bg-emerald-950/20 text-white font-mono font-bold text-sm text-center outline-none transition-all shadow-inner"
                          />
                        </td>
                      )}

                      <td className="p-3 font-mono font-black text-sm text-white">
                        {totalFila > 0 ? `${totalFila.toFixed(1)} L` : "-"}
                      </td>

                      <td className="p-2">
                        <select
                          value={fila.estado}
                          onChange={e => {
                            const nuevoEstado = e.target.value as any;
                            setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, estado: nuevoEstado } : f));
                          }}
                          className={`w-full p-1.5 rounded-xl border text-xs font-bold ${
                            esMastitis
                              ? "bg-red-500/20 border-red-500 text-red-400"
                              : esCalostro
                              ? "bg-amber-500/20 border-amber-500 text-amber-400"
                              : "bg-slate-900 border-white/15 text-slate-300"
                          }`}>
                          <option value="NORMAL">Normal</option>
                          <option value="MASTITIS">Mastitis (Descarte)</option>
                          <option value="CALOSTRO">Calostro (Cría)</option>
                          <option value="SECA">Vaca Seca</option>
                        </select>
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Observación..."
                          value={fila.notas}
                          onChange={e => {
                            const val = e.target.value;
                            setVaqueraFilas(prev => prev.map((f, i) => i === idx ? { ...f, notas: val } : f));
                          }}
                          className="w-full p-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Barra de Acciones del Modal */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                const idNuevo = Date.now();
                setVaqueraFilas(prev => [
                  ...prev,
                  {
                    animalId: idNuevo,
                    arete: `V-${prev.length + 101}`,
                    nombre: `Vaca ${prev.length + 1}`,
                    litrosManana: "",
                    litrosTarde: "",
                    estado: "NORMAL",
                    notas: "",
                  }
                ]);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold cursor-pointer">
              + Agregar Fila de Vaca
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onCerrar()}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer">
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarJornadaVaquera}
                className="btn-cyber-neon text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg hover:scale-105 cursor-pointer transition-all">
                Guardar Jornada ({litrosComerciales.toFixed(1)} L • ${ingresoUSD})
              </button>
            </div>
          </div>

        </div>
      </div>
    );
}
