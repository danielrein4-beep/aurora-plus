import { type AnimalGanaderia, type PotreroGanaderia, descargarReportePotrerosPdf } from "../../api";
import GanaderiaMapa from "../GanaderiaMapa";
import { BotonPdf } from "../ReportesCampoGanaderia";
import type { Notificar, SubPotreros } from "./tipos";
import { num } from "./formato";

interface Props {
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  notificar: Notificar;
  potreros: PotreroGanaderia[];
  subPotreros: SubPotreros;
  abrirEditarPotrero: (potrero: PotreroGanaderia) => void;
  abrirNuevoPotrero: () => void;
  handleGuardarPotreroTrazado: (datos: { poligono: [number, number][]; hectareas: number }) => void;
  setModalRotar: (potrero: PotreroGanaderia | null) => void;
  setSubPotreros: (sub: SubPotreros) => void;
  /** Potrero creado solo con nombre que se está ubicando en el mapa. */
  potreroAUbicar?: PotreroGanaderia | null;
  ubicarPotrero?: (potrero: PotreroGanaderia) => void;
  cancelarUbicar?: () => void;
}

/** Potreros: mapa satelital y tabla con área, pasto, animales y estado de descanso. */
export default function SeccionPotreros({
  animales, animalesActivos, notificar, potreros, subPotreros, abrirEditarPotrero,
  abrirNuevoPotrero, handleGuardarPotreroTrazado, setModalRotar, setSubPotreros,
  potreroAUbicar, ubicarPotrero, cancelarUbicar,
}: Props) {
  const sinUbicar = (p: PotreroGanaderia) => !p.poligono || p.poligono.length < 3;
  const cuantosSinUbicar = potreros.filter(sinUbicar).length;
  return (
    <div className="space-y-5 text-left">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Sistema de Pastoreo & Delimitación de Potreros
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/40">
            Visualización satelital en alta resolución, rotación Voisin y registro de forrajes.
          </p>
          {cuantosSinUbicar > 0 && (
            <p className="text-xs font-semibold text-amber-700 mt-1">
              {cuantosSinUbicar === 1 ? "1 potrero falta" : `${cuantosSinUbicar} potreros faltan`} por ubicar en el mapa. Búscalos en la lista y pulsa "Ubicar en el mapa".
            </p>
          )}
        </div>

        {/* Sub-selector: Mapa Satelital vs. Lista de Potreros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 text-xs whitespace-nowrap">
            <button
              onClick={() => setSubPotreros("lista")}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                subPotreros === "lista" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
              }`}>
              <span className="sm:hidden">Lista</span><span className="hidden sm:inline">Gestión de Potreros</span> ({potreros.length})
            </button>
            <button
              onClick={() => setSubPotreros("mapa")}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                subPotreros === "mapa" ? "bg-white text-black shadow-sm" : "text-slate-600 dark:text-white/60"
              }`}>
              <span className="sm:hidden">Mapa</span><span className="hidden sm:inline">Mapa Satelital</span>
            </button>
          </div>

          <BotonPdf etiqueta="PDF de potreros" obtener={descargarReportePotrerosPdf} notificar={notificar} />
          <button
            onClick={abrirNuevoPotrero}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer whitespace-nowrap">
            + Agregar Potrero
          </button>
        </div>
      </div>

      {subPotreros === "mapa" ? (
        <GanaderiaMapa
          potreros={potreros}
          animales={animales}
          onRotarHato={(pot) => setModalRotar(pot)}
          onCrearPotrero={abrirNuevoPotrero}
          onEditarPotrero={abrirEditarPotrero}
          onGuardarPotreroTrazado={handleGuardarPotreroTrazado}
          potreroAUbicar={potreroAUbicar}
          onCancelarUbicar={cancelarUbicar}
        />
      ) : (
        (() => {
          // Días desde una fecha ISO (inicio de uso o de descanso).
          const diasDesde = (iso?: string) => {
            if (!iso) return null;
            const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
            if (isNaN(d.getTime())) return null;
            return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
          };
          const animalesEn = (potId: number) => animalesActivos.filter(a => a.potrero?.id === potId);
          const sinPotrero = animalesActivos.filter(a => !a.potrero).length;
          const haTotal = potreros.reduce((s, p) => s + (Number(p.areaHectareas) || 0), 0);
          if (potreros.length === 0) {
            return (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
                <p className="text-sm text-slate-600">Todavía no hay potreros registrados.</p>
                <button onClick={abrirNuevoPotrero} className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                  + Agregar el primer potrero
                </button>
              </div>
            );
          }
          return (
            <div className="space-y-3">
              {/* Teléfono: una tarjeta por potrero en vez de la tabla que había que deslizar de lado */}
              <div className="sm:hidden space-y-2">
                {potreros.map(pot => {
                  const enDescanso = pot.estado === "EN_DESCANSO";
                  const dias = diasDesde(enDescanso ? pot.fechaInicioDescanso : pot.fechaInicioUso);
                  const ocupantes = animalesEn(pot.id).length;
                  const area = Number(pot.areaHectareas) || 0;
                  const sobrecargado = pot.capacidadAnimales != null && ocupantes > pot.capacidadAnimales;
                  return (
                    <div key={pot.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color || "#94A3B8" }} />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{pot.nombre}</div>
                            <div className="text-[11px] text-slate-500">{area > 0 ? `${area} ha` : "Sin área"} · {pot.tipoPasto || "Pasto sin definir"}</div>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${enDescanso ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-teal-50 text-teal-800 border border-teal-200"}`}>
                          {enDescanso ? "Descanso" : "En uso"}{dias != null ? ` · ${dias} d` : ""}
                        </span>
                      </div>
                      <div className={`text-sm ${sobrecargado ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                        {ocupantes} {ocupantes === 1 ? "animal" : "animales"}{pot.capacidadAnimales != null ? ` de ${pot.capacidadAnimales}` : ""}
                      </div>
                      {sinUbicar(pot) && (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                          <span>Falta ubicar en el mapa</span>
                          {ubicarPotrero && (
                            <button type="button" onClick={() => ubicarPotrero(pot)} className="font-bold underline cursor-pointer">Ubicar</button>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => abrirEditarPotrero(pot)} className="py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                          Editar
                        </button>
                        {!enDescanso && ocupantes > 0 ? (
                          <button onClick={() => setModalRotar(pot)} className="py-2.5 rounded-xl bg-teal-700 !text-white text-xs font-bold cursor-pointer">
                            Rotar ganado
                          </button>
                        ) : <span />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Potrero</th>
                      <th className="p-3 text-right">Área</th>
                      <th className="p-3">Pasto</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Animales hoy</th>
                      <th className="p-3 text-right">Capacidad</th>
                      <th className="p-3 text-right">Carga</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {potreros.map(pot => {
                      const enDescanso = pot.estado === "EN_DESCANSO";
                      const enMantenimiento = pot.estado === "EN_MANTENIMIENTO";
                      const dias = diasDesde(enDescanso ? pot.fechaInicioDescanso : pot.fechaInicioUso);
                      const listo = enDescanso && dias != null && pot.diasDescansoMinimo != null && dias >= pot.diasDescansoMinimo;
                      const ocupantes = animalesEn(pot.id).length;
                      const area = Number(pot.areaHectareas) || 0;
                      const sobrecargado = pot.capacidadAnimales != null && ocupantes > pot.capacidadAnimales;
                      return (
                        <tr key={pot.id} className="hover:bg-slate-50/70">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color || "#94A3B8" }} />
                              <div>
                                <div className="font-semibold text-slate-900">{pot.nombre}</div>
                                <div className="tabular-nums text-[10px] text-slate-400">{pot.codigo || `POT-${pot.id}`}</div>
                                {sinUbicar(pot) && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Falta ubicar en el mapa</span>
                                    {ubicarPotrero && (
                                      <button type="button" onClick={() => ubicarPotrero(pot)} className="text-[10px] font-bold text-teal-700 underline cursor-pointer">
                                        Ubicar en el mapa
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right tabular-nums text-slate-800">{area > 0 ? `${area} ha` : "—"}</td>
                          <td className="p-3 text-slate-700">{pot.tipoPasto || <span className="text-slate-400">Sin definir</span>}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              enDescanso ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : enMantenimiento ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-teal-50 text-teal-800 border border-teal-200"
                            }`}>
                              {enDescanso ? "En descanso" : enMantenimiento ? "Mantenimiento" : "En uso"}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {dias != null ? `${dias} día${dias === 1 ? "" : "s"}` : "Sin fecha"}
                              {enDescanso && pot.diasDescansoMinimo != null && ` de ${pot.diasDescansoMinimo} mínimos`}
                              {listo && <span className="ml-1 font-semibold text-teal-700">· listo para usar</span>}
                            </div>
                          </td>
                          <td className={`p-3 text-right tabular-nums font-bold ${sobrecargado ? "text-rose-600" : "text-slate-900"}`}>
                            {ocupantes}
                          </td>
                          <td className="p-3 text-right tabular-nums text-slate-600">{pot.capacidadAnimales ?? "—"}</td>
                          <td className="p-3 text-right tabular-nums text-slate-600">{area > 0 ? `${num((ocupantes / area), 2)} cab/ha` : "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => abrirEditarPotrero(pot)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer">
                                Editar
                              </button>
                              {!enDescanso && ocupantes > 0 && (
                                <button
                                  onClick={() => setModalRotar(pot)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 !text-white font-semibold cursor-pointer">
                                  Rotar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-[11px] font-bold text-slate-700">
                    <tr>
                      <td className="p-3">Total ({potreros.length} potreros)</td>
                      <td className="p-3 text-right tabular-nums">{num(haTotal, 1)} ha</td>
                      <td className="p-3" colSpan={2}>
                        {potreros.filter(p => p.estado === "EN_DESCANSO").length} en descanso
                      </td>
                      <td className="p-3 text-right tabular-nums">{animalesActivos.length - sinPotrero}</td>
                      <td className="p-3" />
                      <td className="p-3 text-right tabular-nums">{haTotal > 0 ? `${num(((animalesActivos.length - sinPotrero) / haTotal), 2)} cab/ha` : "—"}</td>
                      <td className="p-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {sinPotrero > 0 && (
                <p className="text-[11px] text-amber-700">
                  {sinPotrero} animal(es) activos no tienen potrero asignado. Asígnelos desde su ficha o al importar el hato.
                </p>
              )}
            </div>
          );
        })()
      )}

    </div>
  );
}
