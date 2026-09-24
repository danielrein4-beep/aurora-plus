import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listarProductosEstetica, crearProductoEstetica, actualizarProductoEstetica, entradaProductoEstetica, venderProductosEstetica,
  type ProductoEstetica, type Paciente, type ProfesionalEstetica,
} from "../../api";
import { IconEdit } from "../../Icons";
import { IconoPapelera } from "./iconos";
import {
  Aviso, Boton, Campo, Cargando, EncabezadoPagina, Insignia, Kpi, Modal, Tarjeta, Vacio, claseInput, formatearMonto, mensajeError,
} from "./comun";
import { FormularioPago, PAGO_INICIAL, claveIdempotencia, useTasaBs, type DatosPago } from "./Cobro";

const CATEGORIAS = ["Reventa", "Insumo de cabina"];

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

function stockBajo(p: ProductoEstetica): boolean {
  return p.stock_minimo !== null && p.stock_minimo !== undefined && num(p.stock_actual) <= num(p.stock_minimo);
}

export default function Productos({ clientas, profesionales, onCambio }: {
  clientas: Paciente[]; profesionales: ProfesionalEstetica[]; onCambio?: () => void;
}) {
  const [productos, setProductos] = useState<ProductoEstetica[]>([]);
  const [moneda, setMoneda] = useState("USD");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<{ p: ProductoEstetica | null } | null>(null);
  const [entrada, setEntrada] = useState<ProductoEstetica | null>(null);
  const [vendiendo, setVendiendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await listarProductosEstetica();
      setProductos(r.productos);
      setMoneda(r.moneda || "USD");
      setError(null);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los productos."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : productos;
  }, [productos, busqueda]);

  const bajos = productos.filter(stockBajo).length;
  const valorInventario = productos.reduce((s, p) => s + num(p.stock_actual) * num(p.costo_unitario), 0);
  const vendibles = productos.filter((p) => p.categoria !== "Insumo de cabina" && num(p.precio_venta) > 0 && num(p.stock_actual) > 0);

  return (
    <div>
      <EncabezadoPagina
        titulo="Productos"
        subtitulo="Lo que vendes y lo que usas en cabina, con su stock"
        acciones={
          <>
            <Boton tipo="secundario" onClick={() => setEditando({ p: null })}>Nuevo producto</Boton>
            <Boton onClick={() => setVendiendo(true)} disabled={vendibles.length === 0}>Vender</Boton>
          </>
        }
      />
      {error && <div className="mb-4"><Aviso onCerrar={() => setError(null)}>{error}</Aviso></div>}
      {ok && <div className="mb-4"><Aviso tipo="ok" onCerrar={() => setOk(null)}>{ok}</Aviso></div>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Kpi label="Productos" valor={String(productos.length)} color="#9E4A63" />
        <Kpi label="Con stock bajo" valor={String(bajos)} sub={bajos ? "Toca reponer" : "Todo en orden"} color={bajos ? "#f59e0b" : "#10b981"} />
        <Kpi label="Valor del inventario (costo)" valor={formatearMonto(valorInventario, moneda)} color="#64748b" />
      </div>

      <Tarjeta className="overflow-hidden">
        {productos.length > 0 && (
          <div className="p-3 border-b border-slate-100 dark:border-white/10">
            <input className={`${claseInput} sm:max-w-xs`} placeholder="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        )}
        {cargando ? (
          <Cargando />
        ) : productos.length === 0 ? (
          <Vacio
            titulo="Aún no tienes productos"
            texto="Carga los productos que vendes (cremas, protectores, sérums) y los insumos que usas en cabina. El stock baja solo al vender."
            accion={<Boton onClick={() => setEditando({ p: null })}>Nuevo producto</Boton>}
          />
        ) : filtrados.length === 0 ? (
          <Vacio titulo="Sin resultados" />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {filtrados.map((p) => (
              <li key={p.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 sm:px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.nombre}</span>
                    {p.categoria === "Insumo de cabina" && <Insignia>Insumo</Insignia>}
                    {stockBajo(p) && <Insignia color="ambar">Stock bajo</Insignia>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/50">
                    {p.sku} · costo {formatearMonto(p.costo_unitario, moneda)}{num(p.precio_venta) > 0 ? ` · venta ${formatearMonto(p.precio_venta, moneda)}` : ""}
                  </div>
                </div>
                <div className="text-right w-20">
                  <div className={`text-lg font-bold ${num(p.stock_actual) <= 0 ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>{num(p.stock_actual).toLocaleString("es-VE")}</div>
                  <div className="text-[11px] text-slate-400">en stock</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Boton tipo="secundario" className="!py-1.5 text-xs" onClick={() => setEntrada(p)}>+ Entrada</Boton>
                  <button onClick={() => setEditando({ p })} className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer" title="Editar">
                    <IconEdit size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {editando && (
        <FormularioProducto
          producto={editando.p}
          moneda={moneda}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar(); }}
        />
      )}
      {entrada && (
        <EntradaMercancia producto={entrada} moneda={moneda} onCerrar={() => setEntrada(null)} onGuardado={() => { setEntrada(null); cargar(); }} />
      )}
      {vendiendo && (
        <VentaProductos
          productos={vendibles}
          moneda={moneda}
          clientas={clientas}
          profesionales={profesionales.filter((p) => p.activo)}
          onCerrar={() => setVendiendo(false)}
          onVendido={(total) => { setVendiendo(false); setOk(`Venta registrada por ${formatearMonto(total, moneda)}.`); cargar(); onCambio?.(); }}
        />
      )}
    </div>
  );
}

function FormularioProducto({ producto, moneda, onCerrar, onGuardado }: {
  producto: ProductoEstetica | null; moneda: string; onCerrar: () => void; onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [sku, setSku] = useState(producto?.sku ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria && CATEGORIAS.includes(producto.categoria) ? producto.categoria : "Reventa");
  const [precio, setPrecio] = useState(producto ? String(num(producto.precio_venta)) : "");
  const [costo, setCosto] = useState(producto ? String(num(producto.costo_unitario)) : "");
  const [minimo, setMinimo] = useState(producto?.stock_minimo != null ? String(num(producto.stock_minimo)) : "");
  const [inicial, setInicial] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!nombre.trim()) { setError("Ponle nombre al producto."); return; }
    setGuardando(true);
    setError(null);
    const datos = {
      nombre: nombre.trim(), sku: sku.trim() || undefined, categoria,
      precioVenta: Number(precio) || 0, costoUnitario: Number(costo) || 0,
      stockMinimo: minimo === "" ? null : Number(minimo),
      stockInicial: !producto && inicial ? Number(inicial) : undefined,
    };
    try {
      if (producto) await actualizarProductoEstetica(producto.id, datos);
      else await crearProductoEstetica(datos);
      onGuardado();
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el producto."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={producto ? "Editar producto" : "Nuevo producto"} onCerrar={onCerrar}>
      <div className="space-y-3">
        <Campo label="Nombre"><input className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus placeholder="Protector solar FPS 50" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tipo">
            <select className={claseInput} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="Reventa">Para vender</option>
              <option value="Insumo de cabina">Insumo de cabina</option>
            </select>
          </Campo>
          <Campo label="Código (opcional)"><input className={claseInput} value={sku} onChange={(e) => setSku(e.target.value)} disabled={!!producto} /></Campo>
          <Campo label={`Costo (${moneda})`}><input type="number" min={0} step="0.01" className={claseInput} value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
          <Campo label={`Precio de venta (${moneda})`}>
            <input type="number" min={0} step="0.01" className={claseInput} value={precio} onChange={(e) => setPrecio(e.target.value)} disabled={categoria === "Insumo de cabina"} />
          </Campo>
          <Campo label="Avisar cuando queden" ayuda="Stock mínimo"><input type="number" min={0} className={claseInput} value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Campo>
          {!producto && <Campo label="Stock inicial"><input type="number" min={0} className={claseInput} value={inicial} onChange={(e) => setInicial(e.target.value)} /></Campo>}
        </div>
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Boton>
        </div>
      </div>
    </Modal>
  );
}

function EntradaMercancia({ producto, moneda, onCerrar, onGuardado }: { producto: ProductoEstetica; moneda: string; onCerrar: () => void; onGuardado: () => void }) {
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState(String(num(producto.costo_unitario)));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const c = Number(cantidad);
    if (!(c > 0)) { setError("Indica cuántas unidades llegaron."); return; }
    setGuardando(true);
    setError(null);
    try {
      await entradaProductoEstetica(producto.id, c, costo === "" ? undefined : Number(costo));
      onGuardado();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar la entrada."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Entrada: ${producto.nombre}`} onCerrar={onCerrar}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Hay {num(producto.stock_actual).toLocaleString("es-VE")} en stock.</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Unidades que llegaron"><input type="number" min={1} className={claseInput} value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus /></Campo>
          <Campo label={`Costo por unidad (${moneda})`}><input type="number" min={0} step="0.01" className={claseInput} value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
        </div>
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Registrar entrada"}</Boton>
        </div>
      </div>
    </Modal>
  );
}

function VentaProductos({ productos, moneda, clientas, profesionales, onCerrar, onVendido }: {
  productos: ProductoEstetica[]; moneda: string; clientas: Paciente[]; profesionales: ProfesionalEstetica[];
  onCerrar: () => void; onVendido: (total: number) => void;
}) {
  const { tasa } = useTasaBs();
  const [carrito, setCarrito] = useState<{ id: number; cantidad: number }[]>([]);
  const [agregar, setAgregar] = useState("");
  const [clientaId, setClientaId] = useState("");
  const [profesionalId, setProfesionalId] = useState("");
  const [pago, setPago] = useState<DatosPago>(PAGO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = useRef(claveIdempotencia());

  const porId = (id: number) => productos.find((p) => p.id === id)!;
  const total = carrito.reduce((s, it) => s + num(porId(it.id).precio_venta) * it.cantidad, 0);

  const sumar = (id: string) => {
    if (!id) return;
    const n = Number(id);
    setCarrito((c) => (c.some((x) => x.id === n) ? c.map((x) => (x.id === n ? { ...x, cantidad: x.cantidad + 1 } : x)) : [...c, { id: n, cantidad: 1 }]));
    setAgregar("");
  };
  const cambiarCantidad = (id: number, cantidad: number) =>
    setCarrito((c) => c.map((x) => (x.id === id ? { ...x, cantidad: Math.max(1, Math.min(cantidad, num(porId(id).stock_actual))) } : x)));

  const confirmar = async () => {
    if (carrito.length === 0) { setError("Agrega al menos un producto."); return; }
    if (pago.monedaPago !== moneda && !(moneda === "USD" && pago.monedaPago === "VES" && tasa)) {
      setError("No hay tasa registrada para cobrar en otra moneda. Cobra en la moneda del negocio o registra la tasa.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const r = await venderProductosEstetica({
        claveIdempotencia: clave.current,
        pacienteId: clientaId ? Number(clientaId) : undefined,
        profesionalId: profesionalId ? Number(profesionalId) : undefined,
        items: carrito.map((it) => ({ articuloId: it.id, cantidad: it.cantidad })),
        monedaPago: pago.monedaPago,
        montoRecibido: pago.monedaPago !== moneda && tasa ? Math.round(total * Number(tasa.tasa) * 100) / 100 : undefined,
        metodoPago: pago.metodo,
        referenciaPago: pago.referencia.trim() || undefined,
      });
      onVendido(Number(r.total));
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar la venta."));
      setGuardando(false);
    }
  };

  const disponibles = productos.filter((p) => !carrito.some((c) => c.id === p.id));

  return (
    <Modal titulo="Vender productos" onCerrar={onCerrar} ancho="max-w-xl">
      <div className="space-y-4">
        <Campo label="Agregar producto">
          <select className={claseInput} value={agregar} onChange={(e) => sumar(e.target.value)}>
            <option value="">{disponibles.length ? "Elegir producto…" : "Ya agregaste todos"}</option>
            {disponibles.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} · {formatearMonto(p.precio_venta, moneda)} · quedan {num(p.stock_actual)}</option>
            ))}
          </select>
        </Campo>

        {carrito.length > 0 && (
          <ul className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/10">
            {carrito.map((it) => {
              const p = porId(it.id);
              return (
                <li key={it.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 min-w-0 text-sm text-slate-800 dark:text-white truncate">{p.nombre}</span>
                  <input type="number" min={1} max={num(p.stock_actual)} className={`${claseInput} !w-16 !py-1 text-center`} value={it.cantidad} onChange={(e) => cambiarCantidad(it.id, Number(e.target.value) || 1)} />
                  <span className="w-20 text-right text-sm font-semibold">{formatearMonto(num(p.precio_venta) * it.cantidad, moneda)}</span>
                  <button onClick={() => setCarrito((c) => c.filter((x) => x.id !== it.id))} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Quitar"><IconoPapelera size={14} /></button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Clienta (opcional)">
            <select className={claseInput} value={clientaId} onChange={(e) => setClientaId(e.target.value)}>
              <option value="">Venta de mostrador</option>
              {[...clientas].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es")).map((c) => <option key={c.id} value={c.id}>{c.nombreCompleto}</option>)}
            </select>
          </Campo>
          <Campo label="Vendió (para comisión)">
            <select className={claseInput} value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)}>
              <option value="">Nadie en particular</option>
              {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
        </div>

        {total > 0 && <FormularioPago monto={total} moneda={moneda} valor={pago} onChange={setPago} tasa={tasa} />}
        {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
        <div className="flex justify-end gap-2">
          <Boton tipo="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={guardando || total <= 0}>{guardando ? "Cobrando…" : `Cobrar ${formatearMonto(total, moneda)}`}</Boton>
        </div>
      </div>
    </Modal>
  );
}
