import { Fragment, useEffect, useMemo, useState } from "react";
import {
  resumenEngordeGanaderia,
  obtenerCurvaPesoGanaderia,
  registrarPesoGanaderia,
  editarPesoGanaderia,
  eliminarPesoGanaderia,
  type FilaEngordeGanaderia,
  type RegistroPesoGanaderia,
} from "../api";
import { fechaLocalISO } from "./ReportesCampoGanaderia";

/**
 * Control de engorde del hato: GDP (ganancia diaria de peso) de cada animal activo,
 * registro de pesajes y corrección de pesajes mal digitados.
 */

/** Por debajo de esto el animal se considera estancado (kg/día). Referencia de ceba a pasto. */
const GDP_BAJA = 0.3;

interface Props {
  tenantId: number;
  puedeCorregir: boolean;
  notificar: (msg: string) => void;
  /** Tras registrar/corregir un pesaje, para refrescar el peso en el resto de Ganadería. */
  onCambio: () => void;
}

const fmt = (n: number | null | undefined, dec = 0) =>
  n == null ? "—" : Number(n).toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fechaCorta = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

function colorGdp(gdp: number | null) {
  if (gdp == null) return "text-slate-400";
  if (gdp < 0) return "text-rose-600";
  if (gdp < GDP_BAJA) return "text-amber-600";
  return "text-teal-700";
}

export default function EngordeGanadero({ tenantId, puedeCorregir, notificar, onCambio }: Props) {
  const [filas, setFilas] = useState<FilaEngordeGanaderia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPotrero, setFiltroPotrero] = useState("");
  const [filtroLote, setFiltroLote] = useState("");
  const [orden, setOrden] = useState<"arete" | "gdp_asc" | "gdp_desc">("arete");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [historial, setHistorial] = useState<RegistroPesoGanaderia[]>([]);
  const [edicion, setEdicion] = useState<Record<number, { pesoKg: string; fecha: string }>>({});
  const [nuevo, setNuevo] = useState<{ pesoKg: string; fecha: string }>({ pesoKg: "", fecha: fechaLocalISO() });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      setFilas(await resumenEngordeGanaderia());
    } catch (e) {
      notificar(`No se pudo cargar el engorde: ${e instanceof Error ? e.message : "revise la conexión"}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirHistorial = async (animalId: number) => {
    if (expandido === animalId) { setExpandido(null); return; }
    setExpandido(animalId);
    setHistorial([]);
    setEdicion({});
    setNuevo({ pesoKg: "", fecha: fechaLocalISO() });
    try {
      setHistorial(await obtenerCurvaPesoGanaderia(animalId));
    } catch (e) {
      notificar(`No se pudo cargar el historial: ${e instanceof Error ? e.message : "revise la conexión"}`);
    }
  };

  const refrescar = async (animalId: number) => {
    setHistorial(await obtenerCurvaPesoGanaderia(animalId));
    await cargar();
    onCambio();
  };

  const registrarPesaje = async (animalId: number) => {
    const peso = Number(nuevo.pesoKg.replace(",", "."));
    if (!(peso > 0)) { notificar("Escriba un peso mayor a cero."); return; }
    setGuardando(true);
    try {
      await registrarPesoGanaderia(tenantId, animalId, peso, nuevo.fecha);
      setNuevo({ pesoKg: "", fecha: fechaLocalISO() });
      await refrescar(animalId);
      notificar("Pesaje registrado.");
    } catch (e) {
      notificar(`No se pudo registrar el pesaje: ${e instanceof Error ? e.message : "revise la conexión"}`);
    } finally {
      setGuardando(false);
    }
  };

  const guardarCorreccion = async (animalId: number, registro: RegistroPesoGanaderia) => {
    const cambio = edicion[registro.id];
    if (!cambio) return;
    const peso = Number(cambio.pesoKg.replace(",", "."));
    if (!(peso > 0)) { notificar("El peso debe ser mayor a cero."); return; }
    setGuardando(true);
    try {
      await editarPesoGanaderia(registro.id, { pesoKg: peso, fecha: cambio.fecha });
      setEdicion(prev => { const n = { ...prev }; delete n[registro.id]; return n; });
      await refrescar(animalId);
      notificar("Pesaje corregido.");
    } catch (e) {
      notificar(`No se pudo corregir: ${e instanceof Error ? e.message : "revise la conexión"}`);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (animalId: number, registro: RegistroPesoGanaderia) => {
    if (!window.confirm(`¿Eliminar el pesaje de ${fmt(registro.pesoKg)} kg del ${fechaCorta(registro.fecha)}?`)) return;
    setGuardando(true);
    try {
      await eliminarPesoGanaderia(registro.id);
      await refrescar(animalId);
      notificar("Pesaje eliminado.");
    } catch (e) {
      notificar(`No se pudo eliminar: ${e instanceof Error ? e.message : "revise la conexión"}`);
    } finally {
      setGuardando(false);
    }
  };

  const potreros = useMemo(() => [...new Set(filas.map(f => f.potrero).filter(Boolean))].sort() as string[], [filas]);
  const lotes = useMemo(() => [...new Set(filas.map(f => f.lote).filter(Boolean))].sort() as string[], [filas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const r = filas.filter(f =>
      (!q || f.arete.toLowerCase().includes(q) || (f.nombre || "").toLowerCase().includes(q)) &&
      (!filtroPotrero || (filtroPotrero === "__sin__" ? !f.potrero : f.potrero === filtroPotrero)) &&
      (!filtroLote || f.lote === filtroLote));
    if (orden !== "arete") {
      const dir = orden === "gdp_asc" ? 1 : -1;
      r.sort((a, b) => {
        if (a.gdpKgDia == null) return 1;
        if (b.gdpKgDia == null) return -1;
        return (a.gdpKgDia - b.gdpKgDia) * dir;
      });
    }
    return r;
  }, [filas, busqueda, filtroPotrero, filtroLote, orden]);

  const conGdp = visibles.filter(f => f.gdpKgDia != null);
  const gdpPromedio = conGdp.length ? conGdp.reduce((s, f) => s + Number(f.gdpKgDia), 0) / conGdp.length : null;
  const estancados = visibles.filter(f => f.gdpUltimoPeriodoKgDia != null && f.gdpUltimoPeriodoKgDia < GDP_BAJA).length;
  const sinDatos = visibles.filter(f => f.gdpKgDia == null).length;

  const campo = "px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-600 focus:outline-none";

  return (
    <div className="space-y-5 text-left">
      <div>
        <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Engorde del Hato</h3>
        <p className="text-xs text-slate-500">
          Ganancia diaria de peso (GDP) de cada animal activo, entre su primer y su último pesaje. El último tramo muestra si se estancó.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { etiqueta: "GDP promedio", valor: gdpPromedio == null ? "—" : `${fmt(gdpPromedio, 3)} kg/día`, clase: colorGdp(gdpPromedio) },
          { etiqueta: "Animales con GDP", valor: `${conGdp.length} de ${visibles.length}`, clase: "text-slate-900" },
          { etiqueta: `Estancados (< ${GDP_BAJA} kg/día último tramo)`, valor: String(estancados), clase: estancados ? "text-amber-600" : "text-slate-900" },
          { etiqueta: "Sin pesajes suficientes", valor: String(sinDatos), clase: "text-slate-900" },
        ].map(k => (
          <div key={k.etiqueta} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{k.etiqueta}</div>
            <div className={`font-mono font-black text-xl mt-1 ${k.clase}`}>{k.valor}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por arete o nombre..." className={`${campo} w-64`} />
        <select value={filtroPotrero} onChange={e => setFiltroPotrero(e.target.value)} className={campo}>
          <option value="">Todos los potreros</option>
          {potreros.map(p => <option key={p} value={p}>{p}</option>)}
          <option value="__sin__">Sin potrero</option>
        </select>
        <select value={filtroLote} onChange={e => setFiltroLote(e.target.value)} className={campo}>
          <option value="">Todos los lotes</option>
          {lotes.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={orden} onChange={e => setOrden(e.target.value as typeof orden)} className={campo}>
          <option value="arete">Ordenar por arete</option>
          <option value="gdp_asc">Menor GDP primero</option>
          <option value="gdp_desc">Mayor GDP primero</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="p-3">Animal</th>
              <th className="p-3">Potrero / Lote</th>
              <th className="p-3 text-right">Peso inicial</th>
              <th className="p-3 text-right">Último peso</th>
              <th className="p-3 text-right">Días</th>
              <th className="p-3 text-right">Ganancia</th>
              <th className="p-3 text-right">GDP</th>
              <th className="p-3 text-right">Último tramo</th>
              <th className="p-3 text-right">Pesajes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando && (
              <tr><td colSpan={9} className="p-6 text-center text-slate-500">Cargando...</td></tr>
            )}
            {!cargando && visibles.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-slate-500">Ningún animal coincide con el filtro.</td></tr>
            )}
            {visibles.map(f => (
              <Fragment key={f.animalId}>
                <tr
                  onClick={() => abrirHistorial(f.animalId)}
                  className={`cursor-pointer ${expandido === f.animalId ? "bg-teal-50/60" : "hover:bg-slate-50"}`}
                  title="Ver, registrar y corregir pesajes"
                >
                  <td className="p-3">
                    <span className="font-mono font-semibold text-teal-800">{f.arete}</span>
                    <span className="ml-2 text-slate-700">{f.nombre || f.tipoAnimal || ""}</span>
                    {f.raza && <span className="ml-1 text-slate-400">· {f.raza}</span>}
                  </td>
                  <td className="p-3 text-slate-600">{f.potrero || "—"}{f.lote ? <span className="text-slate-400"> · {f.lote}</span> : null}</td>
                  <td className="p-3 text-right font-mono text-slate-700">
                    {f.pesoInicial != null ? `${fmt(f.pesoInicial)} kg` : "—"}
                    {f.fechaInicial && <div className="text-[10px] text-slate-400">{fechaCorta(f.fechaInicial)}</div>}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-900">
                    {f.pesoUltimo != null ? `${fmt(f.pesoUltimo)} kg` : "—"}
                    {f.fechaUltimo && <div className="text-[10px] text-slate-400">{fechaCorta(f.fechaUltimo)}</div>}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-600">{fmt(f.dias)}</td>
                  <td className="p-3 text-right font-mono text-slate-700">{f.gananciaTotalKg != null ? `${f.gananciaTotalKg >= 0 ? "+" : ""}${fmt(f.gananciaTotalKg)} kg` : "—"}</td>
                  <td className={`p-3 text-right font-mono font-bold ${colorGdp(f.gdpKgDia)}`}>
                    {f.gdpKgDia != null ? `${fmt(f.gdpKgDia, 3)}` : "—"}
                  </td>
                  <td className={`p-3 text-right font-mono ${colorGdp(f.gdpUltimoPeriodoKgDia)}`}>
                    {f.gdpUltimoPeriodoKgDia != null ? `${fmt(f.gdpUltimoPeriodoKgDia, 3)}` : "—"}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-600">{f.cantidadPesajes}</td>
                </tr>
                {expandido === f.animalId && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={9} className="p-4">
                      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                              <tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-right">Peso (kg)</th><th className="p-2 text-right">Acciones</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {historial.length === 0 && (
                                <tr><td colSpan={3} className="p-3 text-center text-slate-500">Sin pesajes registrados.</td></tr>
                              )}
                              {historial.map(r => {
                                const ed = edicion[r.id];
                                return (
                                  <tr key={r.id}>
                                    <td className="p-2">
                                      {ed ? (
                                        <input type="date" max={fechaLocalISO()} value={ed.fecha} onChange={e => setEdicion(p => ({ ...p, [r.id]: { ...ed, fecha: e.target.value } }))} className={campo} />
                                      ) : fechaCorta(r.fecha)}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                      {ed ? (
                                        <input type="number" min="0" step="0.5" value={ed.pesoKg} onChange={e => setEdicion(p => ({ ...p, [r.id]: { ...ed, pesoKg: e.target.value } }))} className={`${campo} w-24 text-right`} />
                                      ) : fmt(r.pesoKg, 1)}
                                    </td>
                                    <td className="p-2 text-right whitespace-nowrap">
                                      {!puedeCorregir ? null : ed ? (
                                        <>
                                          <button disabled={guardando} onClick={() => guardarCorreccion(f.animalId, r)} className="px-2 py-1 rounded-lg bg-teal-700 !text-white font-semibold cursor-pointer disabled:opacity-50">Guardar</button>
                                          <button onClick={() => setEdicion(p => { const n = { ...p }; delete n[r.id]; return n; })} className="ml-1 px-2 py-1 rounded-lg text-slate-500 cursor-pointer">Cancelar</button>
                                        </>
                                      ) : (
                                        <>
                                          <button onClick={() => setEdicion(p => ({ ...p, [r.id]: { pesoKg: String(r.pesoKg), fecha: r.fecha.slice(0, 10) } }))} className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold cursor-pointer">Corregir</button>
                                          <button disabled={guardando} onClick={() => borrar(f.animalId, r)} className="ml-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer">Eliminar</button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Registrar pesaje</div>
                          <input type="date" max={fechaLocalISO()} value={nuevo.fecha} onChange={e => setNuevo({ ...nuevo, fecha: e.target.value })} className={`${campo} w-full`} />
                          <input type="number" min="0" step="0.5" placeholder="Peso en kg" value={nuevo.pesoKg} onChange={e => setNuevo({ ...nuevo, pesoKg: e.target.value })} className={`${campo} w-full`} />
                          <button disabled={guardando} onClick={() => registrarPesaje(f.animalId)} className="w-full px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 !text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                            Guardar pesaje
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
