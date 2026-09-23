import React, { useEffect, useMemo, useState } from "react";
import { crearArticulo, entradaArticulo, leerSesion, listarArticulos, type Articulo } from "../api";

interface InsumoKit {
  nombre: string;
  cantidad: number;
  unidad: string;
  articuloId: number | null;
}

interface Kit {
  id: number;
  nombre_kit: string;
  palabras_clave: string;
  insumos_json: string;
}

interface KitEditable {
  id: number | null;
  nombreKit: string;
  palabrasClave: string;
  insumos: InsumoKit[];
}

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${leerSesion()?.token || ""}` };
}

function leerInsumos(json: string): InsumoKit[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v)
      ? v.map((i) => ({ nombre: i.nombre || "", cantidad: Number(i.cantidad) || 0, unidad: i.unidad || "", articuloId: i.articuloId ?? null }))
      : [];
  } catch {
    return [];
  }
}

const insumoVacio = (): InsumoKit => ({ nombre: "", cantidad: 1, unidad: "Unidad", articuloId: null });

export default function KitsInsumosOdontologia() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [editando, setEditando] = useState<KitEditable | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Alta rapida de insumo y compra (entrada de stock)
  const [nuevoInsumo, setNuevoInsumo] = useState({ nombre: "", unidad: "Unidad", stockMinimo: "", cantidad: "", costo: "" });
  const [compra, setCompra] = useState<{ articuloId: number; cantidad: string; costo: string; metodoPago: string } | null>(null);

  const avisar = (tipo: "ok" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4500);
  };

  const cargar = async () => {
    try {
      const res = await fetch("/api/salud/odontologia/kits", { headers: authHeaders() });
      if (res.ok) setKits(await res.json());
    } catch {
      setKits([]);
    }
    listarArticulos().then(setArticulos).catch(() => setArticulos([]));
  };

  useEffect(() => {
    cargar();
  }, []);

  const articulosPorId = useMemo(() => {
    const m: Record<number, Articulo> = {};
    articulos.forEach((a) => (m[a.id] = a));
    return m;
  }, [articulos]);

  const guardarKit = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      const url = editando.id ? `/api/salud/odontologia/kits/${editando.id}` : "/api/salud/odontologia/kits";
      const res = await fetch(url, {
        method: editando.id ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          nombreKit: editando.nombreKit,
          palabrasClave: editando.palabrasClave,
          insumos: editando.insumos.filter((i) => i.nombre.trim() && i.cantidad > 0),
        }),
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        throw new Error(cuerpo?.message || `error ${res.status}`);
      }
      setEditando(null);
      avisar("ok", "Kit guardado.");
      cargar();
    } catch (e) {
      avisar("error", `No se pudo guardar el kit: ${e instanceof Error ? e.message : "fallo de conexion"}.`);
    } finally {
      setGuardando(false);
    }
  };

  const desactivarKit = async (id: number) => {
    try {
      const res = await fetch(`/api/salud/odontologia/kits/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error(`error ${res.status}`);
      avisar("ok", "Kit desactivado.");
      cargar();
    } catch (e) {
      avisar("error", `No se pudo desactivar el kit: ${e instanceof Error ? e.message : "fallo de conexion"}.`);
    }
  };

  const crearInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoInsumo.nombre.trim()) return;
    try {
      const cantidad = Number(nuevoInsumo.cantidad);
      await crearArticulo({
        sku: `ODO-${Date.now().toString(36).toUpperCase()}`,
        nombre: nuevoInsumo.nombre.trim(),
        unidadMedida: nuevoInsumo.unidad.trim() || "Unidad",
        categoria: "Insumos odontologicos",
        costoUnitario: nuevoInsumo.costo ? Number(nuevoInsumo.costo) : 0,
        stockMinimo: nuevoInsumo.stockMinimo ? Number(nuevoInsumo.stockMinimo) : undefined,
        // Sin metodo de pago: carga el stock inicial sin registrar un egreso en caja.
        cantidadInicial: cantidad > 0 ? cantidad : undefined,
      });
      setNuevoInsumo({ nombre: "", unidad: "Unidad", stockMinimo: "", cantidad: "", costo: "" });
      avisar("ok", "Insumo agregado al inventario.");
      cargar();
    } catch (e) {
      avisar("error", `No se pudo crear el insumo: ${e instanceof Error ? e.message : "fallo de conexion"}.`);
    }
  };

  const registrarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compra) return;
    const cantidad = Number(compra.cantidad);
    if (!(cantidad > 0)) return;
    try {
      await entradaArticulo(compra.articuloId, {
        cantidad,
        costoUnitario: compra.costo ? Number(compra.costo) : undefined,
        motivo: "Compra de insumos odontologicos",
        metodoPago: compra.metodoPago || undefined,
      });
      setCompra(null);
      avisar("ok", compra.metodoPago ? "Compra registrada: stock actualizado y egreso en caja." : "Stock actualizado.");
      cargar();
    } catch (e) {
      avisar("error", `No se pudo registrar la compra: ${e instanceof Error ? e.message : "fallo de conexion"}.`);
    }
  };

  const actualizarInsumo = (idx: number, cambios: Partial<InsumoKit>) => {
    if (!editando) return;
    setEditando({ ...editando, insumos: editando.insumos.map((i, n) => (n === idx ? { ...i, ...cambios } : i)) });
  };

  const inputCls = "w-full p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15";

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 text-left text-xs">
      {mensaje && (
        <div
          className={`p-3 rounded-2xl font-bold ${
            mensaje.tipo === "ok"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Kits */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Kits por procedimiento</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Al marcar un procedimiento como realizado se descuentan del inventario los insumos del kit cuya palabra clave aparezca en su nombre.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditando({ id: null, nombreKit: "", palabrasClave: "", insumos: [insumoVacio()] })}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
          >
            Nuevo kit
          </button>
        </div>

        {editando && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-emerald-500/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">Nombre del kit *</span>
                <input className={inputCls} value={editando.nombreKit} onChange={(e) => setEditando({ ...editando, nombreKit: e.target.value })} />
              </label>
              <label className="block">
                <span className="block text-slate-500 dark:text-slate-400 mb-1">Palabras clave del procedimiento * (separadas por coma)</span>
                <input
                  className={inputCls}
                  placeholder="resina, restauracion"
                  value={editando.palabrasClave}
                  onChange={(e) => setEditando({ ...editando, palabrasClave: e.target.value })}
                />
              </label>
            </div>

            <div className="space-y-2">
              {editando.insumos.map((ins, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <label className="col-span-12 sm:col-span-5 block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Articulo del inventario</span>
                    <select
                      className={inputCls}
                      value={ins.articuloId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        const a = id ? articulosPorId[id] : undefined;
                        actualizarInsumo(idx, {
                          articuloId: id,
                          nombre: a ? a.nombre : ins.nombre,
                          unidad: a?.unidadMedida || ins.unidad,
                        });
                      }}
                    >
                      <option value="">Sin vincular (no descuenta stock)</option>
                      {articulos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} (stock {Number(a.stockActual)} {a.unidadMedida || ""})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-5 sm:col-span-3 block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Nombre</span>
                    <input className={inputCls} value={ins.nombre} onChange={(e) => actualizarInsumo(idx, { nombre: e.target.value })} />
                  </label>
                  <label className="col-span-3 sm:col-span-2 block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Cantidad</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={inputCls}
                      value={ins.cantidad}
                      onChange={(e) => actualizarInsumo(idx, { cantidad: Number(e.target.value) })}
                    />
                  </label>
                  <label className="col-span-3 sm:col-span-1 block">
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Unidad</span>
                    <input className={inputCls} value={ins.unidad} onChange={(e) => actualizarInsumo(idx, { unidad: e.target.value })} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditando({ ...editando, insumos: editando.insumos.filter((_, n) => n !== idx) })}
                    className="col-span-1 p-2 rounded-xl text-rose-600 hover:bg-rose-500/10 font-bold"
                    aria-label="Quitar insumo"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditando({ ...editando, insumos: [...editando.insumos, insumoVacio()] })}
                className="font-semibold text-emerald-700 dark:text-emerald-300"
              >
                + Agregar insumo
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditando(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 font-semibold">
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarKit}
                disabled={guardando || !editando.nombreKit.trim() || !editando.palabrasClave.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar kit"}
              </button>
            </div>
          </div>
        )}

        {kits.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No hay kits configurados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kits.map((k) => {
              const insumos = leerInsumos(k.insumos_json);
              const sinVincular = insumos.filter((i) => !i.articuloId).length;
              return (
                <div key={k.id} className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{k.nombre_kit}</div>
                      <div className="text-slate-500 dark:text-slate-400">Se aplica a: {k.palabras_clave || "sin palabras clave"}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditando({ id: k.id, nombreKit: k.nombre_kit, palabrasClave: k.palabras_clave || "", insumos })}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/15 font-semibold"
                      >
                        Editar
                      </button>
                      <button type="button" onClick={() => desactivarKit(k.id)} className="px-2.5 py-1 rounded-lg text-rose-600 font-semibold hover:bg-rose-500/10">
                        Quitar
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-0.5">
                    {insumos.map((i, n) => {
                      const a = i.articuloId ? articulosPorId[i.articuloId] : undefined;
                      return (
                        <li key={n} className="flex justify-between gap-2">
                          <span>
                            {i.nombre} x{i.cantidad} {i.unidad}
                          </span>
                          <span className={a ? "text-slate-500 dark:text-slate-400" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                            {a ? `stock ${Number(a.stockActual)}` : "sin vincular"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {sinVincular > 0 && (
                    <p className="text-amber-600 dark:text-amber-400 font-semibold">
                      {sinVincular} insumo(s) sin articulo del inventario: no se descontaran.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inventario de insumos */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Insumos en inventario</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Stock real de la clinica; los kits descuentan de aqui.</p>
        </div>

        <form onSubmit={crearInsumo} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <label className="col-span-2 block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Nuevo insumo *</span>
            <input className={inputCls} value={nuevoInsumo.nombre} onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })} placeholder="Ej: Carpule Lidocaina 2%" />
          </label>
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Unidad</span>
            <input className={inputCls} value={nuevoInsumo.unidad} onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, unidad: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Stock inicial</span>
            <input type="number" min="0" step="0.01" className={inputCls} value={nuevoInsumo.cantidad} onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, cantidad: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-slate-500 dark:text-slate-400 mb-1">Stock minimo</span>
            <input type="number" min="0" step="0.01" className={inputCls} value={nuevoInsumo.stockMinimo} onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, stockMinimo: e.target.value })} />
          </label>
          <button type="submit" disabled={!nuevoInsumo.nombre.trim()} className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold disabled:opacity-50">
            Agregar
          </button>
        </form>

        {compra && (
          <form onSubmit={registrarCompra} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-emerald-500/30">
            <div className="col-span-2 md:col-span-1 font-bold">{articulosPorId[compra.articuloId]?.nombre}</div>
            <label className="block">
              <span className="block text-slate-500 dark:text-slate-400 mb-1">Cantidad *</span>
              <input type="number" min="0.01" step="0.01" required className={inputCls} value={compra.cantidad} onChange={(e) => setCompra({ ...compra, cantidad: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-slate-500 dark:text-slate-400 mb-1">Costo unitario</span>
              <input type="number" min="0" step="0.01" className={inputCls} value={compra.costo} onChange={(e) => setCompra({ ...compra, costo: e.target.value })} />
            </label>
            <label className="block">
              <span className="block text-slate-500 dark:text-slate-400 mb-1">Pagado con</span>
              <select className={inputCls} value={compra.metodoPago} onChange={(e) => setCompra({ ...compra, metodoPago: e.target.value })}>
                <option value="">No registrar pago</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="PAGO_MOVIL">Pago movil</option>
                <option value="PUNTO_VENTA">Punto de venta</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCompra(null)} className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-white/15 font-semibold">
                Cancelar
              </button>
              <button type="submit" className="flex-1 p-2 rounded-xl bg-emerald-600 text-white font-bold">
                Guardar
              </button>
            </div>
          </form>
        )}

        {articulos.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">El inventario esta vacio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                  <th className="py-2 pr-2 font-semibold">Insumo</th>
                  <th className="py-2 pr-2 font-semibold text-right">Stock</th>
                  <th className="py-2 pr-2 font-semibold text-right">Minimo</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {articulos.map((a) => {
                  const bajo = a.stockMinimo != null && Number(a.stockActual) < Number(a.stockMinimo);
                  return (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-white/5">
                      <td className="py-2 pr-2">{a.nombre}</td>
                      <td className={`py-2 pr-2 text-right font-mono font-bold ${bajo ? "text-rose-600 dark:text-rose-400" : ""}`}>
                        {Number(a.stockActual)} {a.unidadMedida || ""}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono text-slate-500">{a.stockMinimo ?? "-"}</td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setCompra({ articuloId: a.id, cantidad: "", costo: String(a.costoUnitario || ""), metodoPago: "" })}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/15 font-semibold"
                        >
                          Registrar compra
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
