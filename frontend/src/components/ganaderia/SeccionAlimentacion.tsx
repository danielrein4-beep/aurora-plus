import { useEffect, useMemo, useState } from "react";
import { IconWheat } from "../../Icons";
import {
  listarInsumosGanaderia, crearInsumoGanaderia, registrarCompraInsumoGanaderia, registrarRacionGanaderia, listarRacionesGanaderia,
  type AnimalGanaderia, type InsumoGanaderia, type PotreroGanaderia, type RacionGanaderia,
} from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import { aNumero, num, usd, verFecha } from "./formato";
import type { Notificar } from "./tipos";

/** Cantidad escrita a mano (acepta coma decimal); 0 si está vacía o no es número. */
const cifra = (v: string) => aNumero(v) ?? 0;

const TIPOS = [
  { valor: "SAL_MINERAL", etiqueta: "Sal mineral" },
  { valor: "SUPLEMENTO", etiqueta: "Suplemento (melaza, urea...)" },
  { valor: "BALANCEADO", etiqueta: "Alimento concentrado" },
  { valor: "SILO", etiqueta: "Silo" },
  { valor: "FARDO", etiqueta: "Heno o pacas" },
];

const UNIDADES = [
  { valor: "SACO", etiqueta: "Sacos" },
  { valor: "KG", etiqueta: "Kilos" },
  { valor: "TON", etiqueta: "Toneladas" },
  { valor: "PACA", etiqueta: "Pacas" },
  { valor: "LITRO", etiqueta: "Litros" },
  { valor: "UNIDAD", etiqueta: "Unidades" },
];

const nombreTipo = (t: string) => TIPOS.find(x => x.valor === t)?.etiqueta.split(" (")[0] ?? t;
const unidad = (u: string, cantidad = 2) => {
  const e = UNIDADES.find(x => x.valor === u)?.etiqueta.toLowerCase() ?? u.toLowerCase();
  return cantidad === 1 ? e.replace(/es$/, "").replace(/s$/, "") : e;
};

type Modal = "racion" | "compra" | "insumo" | null;

interface Props {
  potreros: PotreroGanaderia[];
  animales: AnimalGanaderia[];
  /** Dueño o administrador: compran y crean insumos (la compra sale de caja). */
  puedeComprar: boolean;
  notificar: Notificar;
}

/**
 * Alimento y sal mineral: lo que hay en el depósito, las compras y las raciones que se dan en
 * cada potrero. Cada ración entra al costo (margen) de los animales que estaban ahí ese día.
 */
export default function SeccionAlimentacion({ potreros, animales, puedeComprar, notificar }: Props) {
  const [insumos, setInsumos] = useState<InsumoGanaderia[]>([]);
  const [raciones, setRaciones] = useState<RacionGanaderia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [guardando, setGuardando] = useState(false);

  const [racion, setRacion] = useState({ insumoId: 0, potreroId: 0, fecha: fechaLocalISO(), cantidad: "" });
  const [compra, setCompra] = useState({ insumoId: 0, cantidad: "", costoTotal: "", motivo: "" });
  const [nuevo, setNuevo] = useState({ nombre: "", tipo: "SAL_MINERAL", unidadMedida: "SACO" });

  const cargar = () => {
    setCargando(true);
    Promise.all([listarInsumosGanaderia(), listarRacionesGanaderia(90)])
      .then(([i, r]) => { setInsumos(i); setRaciones(r); })
      .catch(err => notificar(`No se pudo cargar el alimento: ${err instanceof Error ? err.message : "revisa tu conexión"}`))
      .finally(() => setCargando(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, []);

  const animalesPorPotrero = useMemo(() => {
    const m = new Map<number, number>();
    animales.filter(a => (a.estado === "ACTIVO" || !a.estado) && a.potrero?.id)
      .forEach(a => m.set(a.potrero!.id, (m.get(a.potrero!.id) ?? 0) + 1));
    return m;
  }, [animales]);

  const costoRacion = (r: RacionGanaderia) => Number(r.cantidad) * Number(r.insumo?.costoUnitario ?? 0);

  // Lo que se ha dado en cada potrero los últimos 30 días.
  const porPotrero = useMemo(() => {
    const desde = fechaLocalISO(new Date(Date.now() - 30 * 86_400_000));
    const m = new Map<number, { nombre: string; raciones: number; costo: number }>();
    raciones.filter(r => r.fecha >= desde).forEach(r => {
      const p = m.get(r.potrero.id) ?? { nombre: r.potrero.nombre, raciones: 0, costo: 0 };
      p.raciones++;
      p.costo += costoRacion(r);
      m.set(r.potrero.id, p);
    });
    return [...m.entries()].map(([id, p]) => ({ id, ...p, animales: animalesPorPotrero.get(id) ?? 0 }))
      .sort((a, b) => b.costo - a.costo);
  }, [raciones, animalesPorPotrero]);

  const valorDeposito = insumos.reduce((s, i) => s + Number(i.stockActual) * Number(i.costoUnitario ?? 0), 0);

  const insumoRacion = insumos.find(i => i.id === racion.insumoId);
  const cantidadRacion = cifra(racion.cantidad);
  const animalesRacion = animalesPorPotrero.get(racion.potreroId) ?? 0;
  const costoEstimado = insumoRacion && cantidadRacion > 0 ? cantidadRacion * Number(insumoRacion.costoUnitario ?? 0) : 0;

  const abrir = (m: Modal, insumoId = 0) => {
    if (m === "racion") setRacion(r => ({ ...r, insumoId: insumoId || r.insumoId, cantidad: "" }));
    if (m === "compra") setCompra({ insumoId: insumoId || compra.insumoId, cantidad: "", costoTotal: "", motivo: "" });
    if (m === "insumo") setNuevo({ nombre: "", tipo: "SAL_MINERAL", unidadMedida: "SACO" });
    setModal(m);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (modal === "insumo") {
        if (!nuevo.nombre.trim()) { notificar("Escribe el nombre del insumo."); return; }
        const creado = await crearInsumoGanaderia({ ...nuevo, nombre: nuevo.nombre.trim() });
        setInsumos(prev => [...prev, creado]);
        notificar(`${creado.nombre} agregado. Registra la compra para cargar lo que hay en el depósito.`);
        abrir("compra", creado.id);
        return;
      }
      if (modal === "compra") {
        const cantidad = cifra(compra.cantidad), costo = cifra(compra.costoTotal);
        if (!compra.insumoId || cantidad <= 0 || costo <= 0) { notificar("Indica el insumo, la cantidad y lo que costó."); return; }
        const actualizado = await registrarCompraInsumoGanaderia({ insumoId: compra.insumoId, cantidad, costoTotal: costo, motivo: compra.motivo.trim() || undefined });
        setInsumos(prev => prev.map(i => (i.id === actualizado.id ? actualizado : i)));
        notificar(`Compra registrada: ${num(cantidad, 2)} ${unidad(actualizado.unidadMedida, cantidad)} de ${actualizado.nombre} por ${usd(costo)}.`);
      } else if (modal === "racion") {
        if (!racion.insumoId || !racion.potreroId || cantidadRacion <= 0) { notificar("Indica el insumo, el potrero y la cantidad."); return; }
        const r = await registrarRacionGanaderia({ insumoId: racion.insumoId, potreroId: racion.potreroId, fecha: racion.fecha, cantidad: cantidadRacion });
        setRaciones(prev => [r, ...prev]);
        setInsumos(prev => prev.map(i => (i.id === r.insumo.id ? { ...i, stockActual: Number(i.stockActual) - cantidadRacion } : i)));
        notificar(`Ración registrada en ${r.potrero.nombre}: ${num(cantidadRacion, 2)} ${unidad(r.insumo.unidadMedida, cantidadRacion)} de ${r.insumo.nombre}.`);
      }
      setModal(null);
    } catch (err) {
      notificar(`No se pudo guardar: ${err instanceof Error ? err.message : "revisa tu conexión"}`);
    } finally {
      setGuardando(false);
    }
  };

  const campo = "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-600 focus:outline-none";
  const etiqueta = "text-xs font-semibold text-slate-600 block mb-1";
  const boton = "px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer";

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Alimento y sal mineral</h3>
          <p className="text-xs text-slate-500 max-w-2xl">
            Lo que hay en el depósito y lo que se le da a cada potrero. Cada ración entra al costo de los animales que estaban en ese potrero ese día.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => abrir("racion")} disabled={insumos.length === 0}
            className={`${boton} bg-teal-700 hover:bg-teal-800 !text-white disabled:opacity-50`}>
            Dar ración a un potrero
          </button>
          {puedeComprar && (
            <>
              <button onClick={() => abrir("compra")} disabled={insumos.length === 0}
                className={`${boton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50`}>
                Registrar compra
              </button>
              <button onClick={() => abrir("insumo")} className={`${boton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
                + Nuevo insumo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Depósito */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">En el depósito</h4>
          {insumos.length > 0 && <span className="text-xs text-slate-500">Valor en depósito: <b className="text-slate-800">{usd(valorDeposito)}</b></span>}
        </div>
        {cargando && <div className="text-xs text-slate-500">Cargando...</div>}
        {!cargando && insumos.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-1">
            <span className="text-teal-700 flex justify-center"><IconWheat size={26} /></span>
            <div className="text-sm font-bold text-slate-800">Todavía no hay insumos</div>
            <p className="text-xs text-slate-500">
              {puedeComprar ? "Agrega la sal mineral, la melaza o el alimento que usas y registra la compra." : "El dueño o el administrador debe agregar los insumos de la finca."}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {insumos.map(i => {
            const agotado = Number(i.stockActual) <= 0;
            return (
              <div key={i.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{i.nombre}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{nombreTipo(i.tipo)}</div>
                  </div>
                  {agotado && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Agotado</span>}
                </div>
                <div className={`tabular-nums font-black text-xl ${agotado ? "text-rose-600" : "text-slate-900"}`}>
                  {num(i.stockActual, 2)} <span className="text-xs font-semibold text-slate-500">{unidad(i.unidadMedida, Number(i.stockActual))}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {i.costoUnitario ? `${usd(i.costoUnitario)} por ${unidad(i.unidadMedida, 1)}` : "Sin costo: registra una compra"}
                </div>
                <div className="flex gap-3 pt-1">
                  {!agotado && (
                    <button onClick={() => abrir("racion", i.id)} className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer">Dar ración</button>
                  )}
                  {puedeComprar && (
                    <button onClick={() => abrir("compra", i.id)} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">Registrar compra</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Por potrero */}
      {porPotrero.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Por potrero, últimos 30 días</h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-3">Potrero</th>
                  <th className="p-3 text-right">Animales hoy</th>
                  <th className="p-3 text-right">Raciones</th>
                  <th className="p-3 text-right">Costo</th>
                  <th className="p-3 text-right">Por animal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {porPotrero.map(p => (
                  <tr key={p.id}>
                    <td className="p-3 font-semibold text-slate-900">{p.nombre}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{p.animales}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{p.raciones}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-slate-900">{usd(p.costo)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{p.animales > 0 ? usd(p.costo / p.animales) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimas raciones */}
      {raciones.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">Últimas raciones</h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-[26rem] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider sticky top-0">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Potrero</th>
                  <th className="p-3">Insumo</th>
                  <th className="p-3 text-right">Cantidad</th>
                  <th className="p-3 text-right">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {raciones.slice(0, 60).map(r => (
                  <tr key={r.id}>
                    <td className="p-3 text-slate-600">{verFecha(r.fecha)}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.potrero.nombre}</td>
                    <td className="p-3 text-slate-700">{r.insumo.nombre}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{num(r.cantidad, 2)} {unidad(r.insumo.unidadMedida, Number(r.cantidad))}</td>
                    <td className="p-3 text-right tabular-nums text-slate-900">{usd(costoRacion(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">El costo usa el precio promedio de lo comprado de cada insumo.</p>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <form onSubmit={guardar} className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-6 space-y-4 text-left my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center"><IconWheat size={18} /></span>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900">
                    {modal === "racion" ? "Dar ración a un potrero" : modal === "compra" ? "Compra de alimento o sal" : "Nuevo insumo"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modal === "racion" ? "Sale del depósito y se carga a los animales del potrero."
                      : modal === "compra" ? "Entra al depósito y sale de caja como gasto."
                      : "Sal mineral, melaza, concentrado, silo o pacas."}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Cerrar">✕</button>
            </div>

            {modal === "insumo" && (
              <>
                <div>
                  <label className={etiqueta}>Nombre *</label>
                  <input required value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Ej. Sal mineral 8%" className={campo} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={etiqueta}>Tipo *</label>
                    <select value={nuevo.tipo} onChange={e => setNuevo({ ...nuevo, tipo: e.target.value })} className={campo}>
                      {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={etiqueta}>Se cuenta en *</label>
                    <select value={nuevo.unidadMedida} onChange={e => setNuevo({ ...nuevo, unidadMedida: e.target.value })} className={campo}>
                      {UNIDADES.map(u => <option key={u.valor} value={u.valor}>{u.etiqueta}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {modal === "compra" && (
              <>
                <div>
                  <label className={etiqueta}>Insumo *</label>
                  <select required value={compra.insumoId || ""} onChange={e => setCompra({ ...compra, insumoId: Number(e.target.value) })} className={campo}>
                    <option value="">Selecciona...</option>
                    {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={etiqueta}>Cantidad * {compra.insumoId ? `(${unidad(insumos.find(i => i.id === compra.insumoId)?.unidadMedida ?? "")})` : ""}</label>
                    <input required inputMode="decimal" value={compra.cantidad} onChange={e => setCompra({ ...compra, cantidad: e.target.value })} placeholder="Ej. 20" className={campo} />
                  </div>
                  <div>
                    <label className={etiqueta}>Costó en total (USD) *</label>
                    <input required inputMode="decimal" value={compra.costoTotal} onChange={e => setCompra({ ...compra, costoTotal: e.target.value })} placeholder="Ej. 400" className={campo} />
                  </div>
                </div>
                <div>
                  <label className={etiqueta}>Proveedor o nota</label>
                  <input value={compra.motivo} onChange={e => setCompra({ ...compra, motivo: e.target.value })} placeholder="Ej. Agropecuaria El Llano, factura 1234" className={campo} />
                </div>
                {cifra(compra.cantidad) > 0 && cifra(compra.costoTotal) > 0 && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    Sale a {usd(cifra(compra.costoTotal) / cifra(compra.cantidad))} cada uno.
                  </p>
                )}
              </>
            )}

            {modal === "racion" && (
              <>
                <div>
                  <label className={etiqueta}>Insumo *</label>
                  <select required value={racion.insumoId || ""} onChange={e => setRacion({ ...racion, insumoId: Number(e.target.value) })} className={campo}>
                    <option value="">Selecciona...</option>
                    {insumos.map(i => (
                      <option key={i.id} value={i.id} disabled={Number(i.stockActual) <= 0}>
                        {i.nombre} · quedan {num(i.stockActual, 2)} {unidad(i.unidadMedida, Number(i.stockActual))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={etiqueta}>Potrero *</label>
                  <select required value={racion.potreroId || ""} onChange={e => setRacion({ ...racion, potreroId: Number(e.target.value) })} className={campo}>
                    <option value="">Selecciona...</option>
                    {potreros.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} · {animalesPorPotrero.get(p.id) ?? 0} animales</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={etiqueta}>Fecha *</label>
                    <input type="date" required max={fechaLocalISO()} value={racion.fecha} onChange={e => setRacion({ ...racion, fecha: e.target.value })} className={campo} />
                  </div>
                  <div>
                    <label className={etiqueta}>Cantidad * {insumoRacion ? `(${unidad(insumoRacion.unidadMedida)})` : ""}</label>
                    <input required inputMode="decimal" value={racion.cantidad} onChange={e => setRacion({ ...racion, cantidad: e.target.value })} placeholder="Ej. 2" className={campo} />
                  </div>
                </div>
                {insumoRacion && cantidadRacion > Number(insumoRacion.stockActual) && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                    Solo quedan {num(insumoRacion.stockActual, 2)} {unidad(insumoRacion.unidadMedida, Number(insumoRacion.stockActual))} en el depósito.
                  </p>
                )}
                {costoEstimado > 0 && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    Cuesta unos {usd(costoEstimado)}{animalesRacion > 0 ? `, ${usd(costoEstimado / animalesRacion)} por animal entre los ${animalesRacion} del potrero` : ""}.
                  </p>
                )}
                {racion.potreroId > 0 && animalesRacion === 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    Ese potrero no tiene animales hoy: si la fecha es de hoy, el costo se reparte entre todo el hato.
                  </p>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-700 hover:bg-teal-800 !text-white cursor-pointer disabled:opacity-50">
                {guardando ? "Guardando..." : modal === "insumo" ? "Agregar" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
