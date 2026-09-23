import { useEffect, useMemo, useState } from "react";
import {
  listarSociedadesCeba,
  crearSociedadCeba,
  asignarAnimalesSociedadCeba,
  corregirPesoEntradaSociedadCeba,
  quitarAnimalSociedadCeba,
  cerrarSociedadCeba,
  type AnimalGanaderia,
  type ResumenSociedadCeba,
} from "../api";
import { fechaLocalISO } from "./ReportesCampoGanaderia";

/**
 * Ceba en sociedad con reparto de kilos ganados: el socio aporta animales, la finca
 * los engorda y los kilos que ganan se reparten según el porcentaje acordado.
 */

interface Props {
  animales: AnimalGanaderia[];
  puedeGestionar: boolean;
  notificar: (msg: string) => void;
  onCambio: () => void;
}

const kg = (n: number | null | undefined, dec = 0) =>
  n == null ? "—" : `${Number(n).toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec })} kg`;
const usd = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${Number(n).toLocaleString("es-VE", { maximumFractionDigits: 2 })}%`;
const fechaCorta = (iso?: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const campo = "px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-teal-600 focus:outline-none";
const btnPrimario = "px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 !text-white text-xs font-bold cursor-pointer disabled:opacity-50";

export default function SociedadesCeba({ animales, puedeGestionar, notificar, onCambio }: Props) {
  const [sociedades, setSociedades] = useState<ResumenSociedadCeba[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombreSocio: "", documentoSocio: "", telefonoSocio: "", porcentajeFinca: "50", fechaInicio: fechaLocalISO(), notas: "" });
  const [busqueda, setBusqueda] = useState("");
  const [marcados, setMarcados] = useState<number[]>([]);
  const [fechaEntrada, setFechaEntrada] = useState(fechaLocalISO());
  const [pesoEditando, setPesoEditando] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState(false);

  const cargar = async () => {
    try {
      setSociedades(await listarSociedadesCeba());
    } catch (e) {
      notificar(`No se pudieron cargar las sociedades: ${e instanceof Error ? e.message : "revise la conexión"}`);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const ejecutar = async (accion: () => Promise<unknown>, ok: string) => {
    setOcupado(true);
    try {
      await accion();
      await cargar();
      onCambio();
      notificar(ok);
      return true;
    } catch (e) {
      notificar(e instanceof Error ? e.message : "No se pudo completar la operación");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const crear = async () => {
    const p = Number(form.porcentajeFinca.replace(",", "."));
    if (!form.nombreSocio.trim()) { notificar("Indique el nombre del socio."); return; }
    if (!(p >= 0 && p <= 100)) { notificar("El porcentaje de la finca debe estar entre 0 y 100."); return; }
    const ok = await ejecutar(() => crearSociedadCeba({ ...form, nombreSocio: form.nombreSocio.trim(), porcentajeFinca: p }), "Sociedad creada.");
    if (ok) {
      setCreando(false);
      setForm({ nombreSocio: "", documentoSocio: "", telefonoSocio: "", porcentajeFinca: "50", fechaInicio: fechaLocalISO(), notas: "" });
    }
  };

  const actual = sociedades.find(s => s.sociedad.id === seleccionada) || null;

  // Animales propios y activos que se pueden ingresar a una sociedad
  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return animales.filter(a =>
      (a.estado === "ACTIVO" || !a.estado) && !a.sociedadCebaId &&
      (!q || a.arete.toLowerCase().includes(q) || (a.nombre || "").toLowerCase().includes(q) || (a.tipoAnimal || "").toLowerCase().includes(q)));
  }, [animales, busqueda]);

  // ── Detalle de una sociedad ──
  if (actual) {
    const s = actual.sociedad;
    const activa = s.estado === "ACTIVA";
    return (
      <div className="space-y-5 text-left">
        <button onClick={() => { setSeleccionada(null); setMarcados([]); }} className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer">← Todas las sociedades</button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Sociedad con {s.nombreSocio}</h3>
            <p className="text-xs text-slate-500">
              Reparto de kilos ganados: finca {pct(s.porcentajeFinca)} · socio {pct(actual.porcentajeSocio)} · desde {fechaCorta(s.fechaInicio)}
              {s.documentoSocio ? ` · ${s.documentoSocio}` : ""}{s.telefonoSocio ? ` · ${s.telefonoSocio}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${activa ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
              {activa ? "Activa" : `Cerrada ${fechaCorta(s.fechaCierre)}`}
            </span>
            {activa && puedeGestionar && (
              <button
                disabled={ocupado}
                onClick={() => window.confirm(`¿Cerrar la sociedad con ${s.nombreSocio}? Ya no se podrán ingresar animales.`) && ejecutar(() => cerrarSociedadCeba(s.id), "Sociedad cerrada.")}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer">
                Cerrar sociedad
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ["Animales", `${actual.animalesActivos} activos · ${actual.animalesVendidos} vendidos`],
            ["Kilos ganados", kg(actual.kilosGanadosTotal)],
            [`Kilos finca (${pct(s.porcentajeFinca)})`, kg(actual.kilosFincaTotal)],
            [`Kilos socio (${pct(actual.porcentajeSocio)})`, kg(actual.kilosSocioTotal)],
            ["Vendidos: finca / socio", `${usd(actual.montoFincaVendidosUSD)} / ${usd(actual.montoSocioVendidosUSD)}`],
          ].map(([t, v]) => (
            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t}</div>
              <div className="font-mono font-black text-base mt-1 text-slate-900">{v}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3">Animal</th>
                <th className="p-3 text-right">Entrada</th>
                <th className="p-3 text-right">Peso actual / venta</th>
                <th className="p-3 text-right">Ganados</th>
                <th className="p-3 text-right">GDP</th>
                <th className="p-3 text-right">Finca</th>
                <th className="p-3 text-right">Socio (total)</th>
                <th className="p-3 text-right">Venta</th>
                <th className="p-3 text-right">Finca / Socio USD</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actual.lineas.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-slate-500">Todavía no hay animales en esta sociedad.</td></tr>
              )}
              {actual.lineas.map(l => {
                const vendido = l.estado === "VENDIDO";
                const editando = pesoEditando[l.animalId];
                return (
                  <tr key={l.animalId} className={vendido ? "bg-slate-50/60" : ""}>
                    <td className="p-3">
                      <span className="font-mono font-semibold text-teal-800">{l.arete}</span>
                      <span className="ml-2 text-slate-700">{l.nombre || l.tipoAnimal || ""}</span>
                      {vendido && <span className="ml-2 text-[10px] font-bold text-slate-500">VENDIDO</span>}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {editando != null ? (
                        <span className="inline-flex items-center gap-1">
                          <input type="number" min="0" step="0.5" value={editando} onChange={e => setPesoEditando(p => ({ ...p, [l.animalId]: e.target.value }))} className={`${campo} w-20 text-right`} />
                          <button
                            disabled={ocupado}
                            onClick={async () => {
                              const ok = await ejecutar(() => corregirPesoEntradaSociedadCeba(s.id, l.animalId, Number(editando.replace(",", "."))), "Peso de entrada corregido.");
                              if (ok) setPesoEditando(p => { const n = { ...p }; delete n[l.animalId]; return n; });
                            }}
                            className="px-2 py-1 rounded-lg bg-teal-700 !text-white text-[10px] font-bold cursor-pointer">OK</button>
                        </span>
                      ) : (
                        <button
                          disabled={!activa || !puedeGestionar}
                          onClick={() => setPesoEditando(p => ({ ...p, [l.animalId]: String(l.pesoEntrada ?? "") }))}
                          title={activa && puedeGestionar ? "Corregir peso de entrada" : undefined}
                          className="text-slate-800 enabled:hover:underline enabled:cursor-pointer">
                          {kg(l.pesoEntrada, 1)}
                        </button>
                      )}
                      <div className="text-[10px] text-slate-400">{fechaCorta(l.fechaEntrada)}{l.diasEnFinca != null ? ` · ${l.diasEnFinca} d` : ""}</div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900">{kg(l.pesoActual, 1)}</td>
                    <td className={`p-3 text-right font-mono font-bold ${l.kilosGanados != null && l.kilosGanados < 0 ? "text-rose-600" : "text-teal-700"}`}>{kg(l.kilosGanados, 1)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{l.gdpKgDia != null ? Number(l.gdpKgDia).toFixed(3) : "—"}</td>
                    <td className="p-3 text-right font-mono text-slate-800">{kg(l.kilosFinca, 1)}</td>
                    <td className="p-3 text-right font-mono text-slate-800">
                      {kg(l.kilosSocio, 1)}
                      <div className="text-[10px] text-slate-400">total {kg(l.kilosTotalesSocio, 1)}</div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">{vendido ? usd(l.precioVentaUSD) : "—"}</td>
                    <td className="p-3 text-right font-mono text-slate-700">{vendido ? `${usd(l.montoFincaUSD)} / ${usd(l.montoSocioUSD)}` : "—"}</td>
                    <td className="p-3 text-right">
                      {activa && puedeGestionar && !vendido && (
                        <button
                          disabled={ocupado}
                          onClick={() => window.confirm(`¿Sacar ${l.arete} de la sociedad? Vuelve a ser un animal propio.`) && ejecutar(() => quitarAnimalSociedadCeba(s.id, l.animalId), `${l.arete} salió de la sociedad.`)}
                          className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer">
                          Sacar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">
          Ganados = peso actual (o de venta) − peso de entrada. El socio recibe su peso de entrada más su parte de lo ganado. En los vendidos, el reparto en dinero usa el precio por kilo de esa venta.
        </p>

        {activa && puedeGestionar && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-slate-900">Ingresar animales a la sociedad</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Fecha de entrada</span>
                <input type="date" max={fechaLocalISO()} value={fechaEntrada} onChange={e => setFechaEntrada(e.target.value)} className={campo} />
              </div>
            </div>
            <input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar animal propio por arete, nombre o tipo..." className={`${campo} w-full`} />
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-1.5 space-y-0.5">
              {disponibles.length === 0 && <div className="p-3 text-center text-[11px] text-slate-500">No hay animales propios disponibles con ese filtro.</div>}
              {disponibles.map(a => (
                <label key={a.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[11px] cursor-pointer ${marcados.includes(a.id) ? "bg-teal-50 font-semibold" : "hover:bg-slate-50"}`}>
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={marcados.includes(a.id)} onChange={e => setMarcados(p => e.target.checked ? [...p, a.id] : p.filter(x => x !== a.id))} className="accent-teal-700" />
                    <span className="font-mono text-teal-800">{a.arete}</span>
                    <span className="text-slate-700">{a.nombre || a.tipoAnimal}{a.raza ? ` · ${a.raza}` : ""}</span>
                  </span>
                  <span className={`font-mono ${a.pesoActual ? "text-slate-600" : "text-rose-600"}`}>{a.pesoActual ? kg(a.pesoActual) : "sin peso"}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Se toma el peso actual de cada animal como peso de entrada (se puede corregir después).</span>
              <button
                disabled={ocupado || marcados.length === 0}
                onClick={async () => {
                  const ok = await ejecutar(() => asignarAnimalesSociedadCeba(s.id, marcados, fechaEntrada), `${marcados.length} animal(es) ingresados a la sociedad.`);
                  if (ok) setMarcados([]);
                }}
                className={btnPrimario}>
                Ingresar {marcados.length || ""} a la sociedad
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Listado de sociedades ──
  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Ceba en Sociedad</h3>
          <p className="text-xs text-slate-500">Animales de socios que se engordan en la finca; los kilos ganados se reparten según el porcentaje acordado.</p>
        </div>
        {puedeGestionar && !creando && (
          <button onClick={() => setCreando(true)} className={btnPrimario}>+ Nueva sociedad</button>
        )}
      </div>

      {creando && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-bold text-slate-900">Nueva sociedad</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <input value={form.nombreSocio} onChange={e => setForm({ ...form, nombreSocio: e.target.value })} placeholder="Nombre del socio *" className={campo} />
            <input value={form.documentoSocio} onChange={e => setForm({ ...form, documentoSocio: e.target.value })} placeholder="Cédula / RIF" className={campo} />
            <input value={form.telefonoSocio} onChange={e => setForm({ ...form, telefonoSocio: e.target.value })} placeholder="Teléfono" className={campo} />
          </div>
          <div className="grid sm:grid-cols-3 gap-2 items-center">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              % de lo ganado para la finca
              <input type="number" min="0" max="100" step="1" value={form.porcentajeFinca} onChange={e => setForm({ ...form, porcentajeFinca: e.target.value })} className={`${campo} w-20`} />
            </label>
            <span className="text-xs text-slate-500">Socio: {pct(100 - (Number(form.porcentajeFinca) || 0))}</span>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Inicio
              <input type="date" max={fechaLocalISO()} value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} className={campo} />
            </label>
          </div>
          <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Notas del acuerdo (opcional)" rows={2} className={`${campo} w-full`} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreando(false)} className="px-3 py-2 text-xs text-slate-500 cursor-pointer">Cancelar</button>
            <button disabled={ocupado} onClick={crear} className={btnPrimario}>Crear sociedad</button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-xs text-slate-500">Cargando...</p>
      ) : sociedades.length === 0 && !creando ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No hay sociedades de ceba registradas.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sociedades.map(r => (
            <button
              key={r.sociedad.id}
              onClick={() => setSeleccionada(r.sociedad.id)}
              className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-300 transition-colors cursor-pointer space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-slate-900">{r.sociedad.nombreSocio}</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.sociedad.estado === "ACTIVA" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>
                  {r.sociedad.estado === "ACTIVA" ? "Activa" : "Cerrada"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">Finca {pct(r.sociedad.porcentajeFinca)} · Socio {pct(r.porcentajeSocio)} · desde {fechaCorta(r.sociedad.fechaInicio)}</div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div><div className="text-slate-400">Animales</div><div className="font-mono font-bold text-slate-900">{r.animalesActivos}</div></div>
                <div><div className="text-slate-400">Ganados</div><div className="font-mono font-bold text-teal-700">{kg(r.kilosGanadosTotal)}</div></div>
                <div><div className="text-slate-400">Finca</div><div className="font-mono font-bold text-slate-900">{kg(r.kilosFincaTotal)}</div></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
