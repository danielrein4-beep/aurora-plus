import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";

// Iconos nativos SVG de alto rendimiento y cero dependencias
function SvgBag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function SvgSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SvgClose({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SvgCheck({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SvgCheckCircle({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SvgPlus({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SvgMinus({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

function SvgTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SvgStore({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3V3zm1 7v10a1 1 0 001 1h14a1 1 0 001-1V10" />
    </svg>
  );
}

function SvgTruck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm11 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zm0 0h5l3 3v2h-8v-5z" />
    </svg>
  );
}

function SvgWhatsApp({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.031 2c-5.522 0-9.998 4.476-9.998 9.998 0 1.764.46 3.486 1.332 5.006l-1.417 5.176 5.305-1.391a9.948 9.948 0 004.778 1.209h.004c5.52 0 9.997-4.476 9.997-9.998 0-2.67-1.04-5.18-2.929-7.07A9.924 9.924 0 0012.031 2zm0 18.292c-1.498 0-2.966-.402-4.246-1.163l-.305-.181-3.153.827.842-3.076-.198-.315a8.27 8.27 0 01-1.268-4.386c0-4.59 3.736-8.326 8.328-8.326 2.224 0 4.316.866 5.889 2.439a8.267 8.267 0 012.441 5.889c0 4.59-3.737 8.326-8.33 8.326zm4.566-6.233c-.25-.125-1.479-.73-1.708-.813-.23-.083-.396-.125-.563.125-.166.25-.646.813-.792.979-.146.167-.292.188-.542.063s-1.057-.39-2.014-1.244c-.744-.664-1.246-1.484-1.392-1.734-.146-.25-.016-.385.109-.51.112-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.021-.438s-.563-1.354-.771-1.854c-.203-.488-.41-.422-.563-.43-.146-.008-.313-.01-.479-.01s-.438.063-.667.313c-.229.25-.875.854-.875 2.083s.896 2.417 1.021 2.583c.125.167 1.764 2.694 4.274 3.777.597.258 1.064.412 1.428.528.6.191 1.146.164 1.578.1.481-.072 1.479-.604 1.688-1.188.208-.583.208-1.083.146-1.188-.063-.104-.229-.167-.479-.292z" />
    </svg>
  );
}

interface ProductoCatalogo {
  id: string;
  codigo: string;
  oem?: string;
  nombre: string;
  categoria: string;
  precioUsd: number;
  precioBs: number;
  stock: number;
  unidad?: string;
}

interface DatosTienda {
  tenantId: number;
  nombreTienda: string;
  moduloPrincipal: string;
  telefonoWhatsapp: string;
  emailContacto?: string;
  logoBase64?: string;
  tasaVes: number;
  productos: ProductoCatalogo[];
}

interface ItemCarrito {
  producto: ProductoCatalogo;
  cantidad: number;
}

export default function CatalogoPublico() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [tienda, setTienda] = useState<DatosTienda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moneda, setMoneda] = useState<"USD" | "VES">("USD");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODOS");

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // Formulario del cliente
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [metodoPago, setMetodoPago] = useState("PAGO_MOVIL");
  const [notas, setNotas] = useState("");

  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{
    numeroPedido: string;
    whatsappUrl: string;
  } | null>(null);

  useEffect(() => {
    const fetchCatalogo = async () => {
      setCargando(true);
      setError(null);
      try {
        const tid = tenantId || "2";
        const res = await fetch(`/api/public/catalogo/${tid}`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el catalogo de la tienda.");
        }
        const data = await res.json();
        setTienda(data);
      } catch (err: any) {
        setError(err.message || "Error al conectar con la tienda.");
      } finally {
        setCargando(false);
      }
    };

    fetchCatalogo();
  }, [tenantId]);

  // Lista de categorias unicas
  const categorias = useMemo(() => {
    if (!tienda?.productos) return ["TODOS"];
    const setCat = new Set<string>();
    tienda.productos.forEach((p) => {
      if (p.categoria) setCat.add(p.categoria.toUpperCase());
    });
    return ["TODOS", ...Array.from(setCat)];
  }, [tienda]);

  // Productos filtrados
  const productosFiltrados = useMemo(() => {
    if (!tienda?.productos) return [];
    return tienda.productos.filter((p) => {
      const cumpleCat =
        categoriaSeleccionada === "TODOS" ||
        p.categoria.toUpperCase() === categoriaSeleccionada;
      const q = busqueda.toLowerCase().trim();
      const cumpleBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.categoria && p.categoria.toLowerCase().includes(q));
      return cumpleCat && cumpleBusqueda;
    });
  }, [tienda, categoriaSeleccionada, busqueda]);

  // Operaciones del carrito
  const agregarAlCarrito = (producto: ProductoCatalogo) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((item) => item.producto.id === producto.id);
      if (idx >= 0) {
        const nuevo = [...prev];
        nuevo[idx].cantidad += 1;
        return nuevo;
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id: string, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.producto.id === id) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[];
    });
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== id));
  };

  const totalUsd = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.producto.precioUsd * item.cantidad, 0);
  }, [carrito]);

  const tasa = tienda?.tasaVes || 50;
  const totalBs = useMemo(() => {
    return totalUsd * tasa;
  }, [totalUsd, tasa]);

  const totalItems = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.cantidad, 0);
  }, [carrito]);

  // Enviar pedido
  const handleEnviarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrito.length === 0) return;
    if (!nombreCliente.trim()) {
      alert("Por favor ingrese su nombre y apellido");
      return;
    }
    if (!telefonoCliente.trim()) {
      alert("Por favor ingrese su numero de telefono / WhatsApp");
      return;
    }
    if (tipoEntrega === "DELIVERY" && !direccionEntrega.trim()) {
      alert("Por favor ingrese la direccion de entrega");
      return;
    }

    setEnviandoPedido(true);
    try {
      const tid = tienda?.tenantId || 2;
      const payload = {
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoCliente.trim(),
        tipoEntrega,
        direccionEntrega: tipoEntrega === "DELIVERY" ? direccionEntrega.trim() : "Retiro en tienda",
        metodoPago,
        totalUsd,
        totalBs,
        tasaCambio: tasa,
        notas: notas.trim(),
        items: carrito.map((item) => ({
          productoId: item.producto.id,
          codigo: item.producto.codigo,
          nombre: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitarioUsd: item.producto.precioUsd,
          subtotalUsd: Number((item.producto.precioUsd * item.cantidad).toFixed(2))
        }))
      };

      const res = await fetch(`/api/public/catalogo/${tid}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("No se pudo registrar el pedido.");
      }

      const data = await res.json();
      setPedidoConfirmado({
        numeroPedido: data.numeroPedido,
        whatsappUrl: data.whatsappUrl
      });

      // Abrir WhatsApp en nueva pestana
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }
      setCarrito([]);
    } catch (err: any) {
      alert(err.message || "Error al procesar el pedido.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide">Cargando catalogo digital...</p>
      </div>
    );
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
        <SvgStore className="w-12 h-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Tienda no disponible</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || "No se ha encontrado la tienda solicitada."}</p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors"
        >
          Volver a Aurora Plus
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Barra Superior Minimalista */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-sm">
              {tienda.nombreTienda.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                  {tienda.nombreTienda}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Abierto
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Catálogo Online</span>
                <span className="text-slate-600">•</span>
                <span>Tasa BCV: {tasa.toFixed(2)} Bs/$</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Toggle de Moneda */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMoneda("USD")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  moneda === "USD"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setMoneda("VES")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  moneda === "VES"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                VES (Bs.)
              </button>
            </div>

            {/* Boton del Carrito */}
            <button
              type="button"
              onClick={() => setDrawerAbierto(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-emerald-950/40"
            >
              <SvgBag className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Pedido</span>
              {totalItems > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold">
                  {totalItems}
                </span>
              )}
              {totalUsd > 0 && (
                <span className="font-mono text-emerald-200">
                  {moneda === "USD" ? `$${totalUsd.toFixed(2)}` : `${totalBs.toFixed(2)} Bs.`}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Presentacion de la Tienda */}
      <div className="border-b border-slate-900 bg-gradient-to-b from-slate-900/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Productos disponibles para pedido inmediato
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Seleccione sus artículos y envíe su pedido directamente a nuestro WhatsApp y a nuestro sistema de facturación y despacho.
              </p>
            </div>

            {/* Buscador */}
            <div className="relative w-full md:w-72">
              <SvgSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar repuesto, tornillo, producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-xs sm:text-sm text-slate-200 placeholder-slate-500 transition-colors"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <SvgClose className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Categorias Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-5 scrollbar-none">
            {categorias.map((cat) => {
              const activa = categoriaSeleccionada === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activa
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <SvgSearch className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No se encontraron productos coincidentes.</p>
            <p className="text-slate-600 text-xs mt-1">Pruebe ajustando el término de búsqueda o la categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productosFiltrados.map((prod) => {
              const itemEnCarrito = carrito.find((it) => it.producto.id === prod.id);
              const enCarrito = Boolean(itemEnCarrito);

              const pUsd = prod.precioUsd;
              const pBs = prod.precioBs || pUsd * tasa;

              return (
                <div
                  key={prod.id}
                  className="group flex flex-col justify-between bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-emerald-950/20"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-700/50">
                        {prod.categoria || "General"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {prod.codigo}
                      </span>
                    </div>

                    {/* Titulo */}
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                      {prod.nombre}
                    </h3>

                    {/* Stock y Unidad */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium">
                        <SvgCheck className="w-3 h-3 text-emerald-400" />
                        En stock
                      </span>
                      {prod.unidad && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {prod.unidad}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Precios y Boton de Agregar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-end justify-between gap-3">
                    <div>
                      {moneda === "USD" ? (
                        <>
                          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                            ${pUsd.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {pBs.toFixed(2)} Bs.
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                            {pBs.toFixed(2)} Bs.
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            ${pUsd.toFixed(2)} USD
                          </div>
                        </>
                      )}
                    </div>

                    {enCarrito ? (
                      <div className="flex items-center gap-1 bg-slate-800 border border-emerald-500/40 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => modificarCantidad(prod.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <SvgMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-emerald-300 font-mono min-w-[20px] text-center">
                          {itemEnCarrito?.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => modificarCantidad(prod.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                        >
                          <SvgPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(prod)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 border border-slate-700/80 text-slate-200 text-xs font-semibold transition-all duration-150 active:scale-95"
                      >
                        <SvgPlus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Barra Flotante Inferior en Pantallas Pequeñas */}
      {totalItems > 0 && !drawerAbierto && (
        <div className="fixed bottom-4 inset-x-4 z-40 sm:hidden">
          <button
            type="button"
            onClick={() => setDrawerAbierto(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold shadow-xl shadow-emerald-950/60 transition-all active:scale-98"
          >
            <div className="flex items-center gap-2">
              <SvgBag className="w-5 h-5 text-slate-950" />
              <span className="text-sm">Ver Pedido ({totalItems})</span>
            </div>
            <span className="font-mono text-sm">
              {moneda === "USD" ? `$${totalUsd.toFixed(2)} USD` : `${totalBs.toFixed(2)} Bs.`}
            </span>
          </button>
        </div>
      )}

      {/* Drawer / Modal del Carrito & Confirmación */}
      {drawerAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity">
          <div
            className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Drawer */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SvgBag className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Detalle de su Pedido</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerAbierto(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <SvgClose className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Drawer */}
            {pedidoConfirmado ? (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <SvgCheckCircle className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Pedido Registrado
                </span>
                <h4 className="text-xl font-extrabold text-white mt-1">
                  #{pedidoConfirmado.numeroPedido}
                </h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">
                  Su solicitud ha ingresado al sistema de la tienda y se ha generado su mensaje de confirmación para WhatsApp.
                </p>

                <div className="w-full mt-6 space-y-3">
                  <a
                    href={pedidoConfirmado.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    <SvgWhatsApp className="w-5 h-5" />
                    Abrir en WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setPedidoConfirmado(null);
                      setDrawerAbierto(false);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Hacer otro pedido
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Lista de Items */}
                {carrito.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <SvgBag className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                    <p className="text-sm">El carrito está vacío</p>
                    <p className="text-xs text-slate-600 mt-1">Agregue productos desde el catálogo.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Artículos seleccionados ({totalItems})
                    </span>
                    <div className="space-y-2">
                      {carrito.map((it) => (
                        <div
                          key={it.producto.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate">
                              {it.producto.nombre}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>${it.producto.precioUsd.toFixed(2)} c/u</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-400 font-bold">
                                ${(it.producto.precioUsd * it.cantidad).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => modificarCantidad(it.producto.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white"
                            >
                              <SvgMinus className="w-3 h-3" />
                            </button>
                            <span className="px-1.5 text-xs font-bold text-white font-mono min-w-[16px] text-center">
                              {it.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => modificarCantidad(it.producto.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-emerald-400 hover:text-emerald-300"
                            >
                              <SvgPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => eliminarDelCarrito(it.producto.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 transition-colors"
                          >
                            <SvgTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulario de Checkout */}
                {carrito.length > 0 && (
                  <form id="form-pedido" onSubmit={handleEnviarPedido} className="space-y-4 pt-2">
                    {/* Modalidad de Entrega */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Modalidad de Entrega
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTipoEntrega("DELIVERY")}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            tipoEntrega === "DELIVERY"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <SvgTruck className="w-4 h-4" />
                          Delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoEntrega("PICKUP")}
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            tipoEntrega === "PICKUP"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <SvgStore className="w-4 h-4" />
                          Retiro en Tienda
                        </button>
                      </div>
                    </div>

                    {/* Datos del Cliente */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Su Nombre y Apellido *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Carlos Pérez"
                          value={nombreCliente}
                          onChange={(e) => setNombreCliente(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-xs text-white placeholder-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Teléfono / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ej: 04121234567"
                          value={telefonoCliente}
                          onChange={(e) => setTelefonoCliente(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-xs text-white placeholder-slate-600"
                        />
                      </div>

                      {tipoEntrega === "DELIVERY" && (
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Dirección de Entrega *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Calle, Edificio, Casa, Punto de referencia"
                            value={direccionEntrega}
                            onChange={(e) => setDireccionEntrega(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-xs text-white placeholder-slate-600"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Método de Pago Preferido
                        </label>
                        <select
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-xs text-white"
                        >
                          <option value="PAGO_MOVIL">Pago Móvil (Bs.)</option>
                          <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                          <option value="EFECTIVO_USD">Efectivo Divisas ($ USD)</option>
                          <option value="EFECTIVO_BS">Efectivo Bolívares (Bs.)</option>
                          <option value="ZELLE">Zelle</option>
                          <option value="PUNTO_VENTA">Punto de Venta al retirar/entregar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Observaciones o Notas (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Si no hay marca A traer marca B"
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:outline-none text-xs text-white placeholder-slate-600"
                        />
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Footer con Totales y Botón de Enviar */}
            {carrito.length > 0 && !pedidoConfirmado && (
              <div className="p-5 border-t border-slate-800/80 bg-slate-950/80">
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Total USD:</span>
                    <span className="font-bold text-white">${totalUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Total Bolívares (BCV {tasa.toFixed(2)}):</span>
                    <span className="font-bold text-emerald-400">{totalBs.toFixed(2)} Bs.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  form="form-pedido"
                  disabled={enviandoPedido}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
                >
                  <SvgWhatsApp className="w-5 h-5" />
                  <span>{enviandoPedido ? "Procesando Pedido..." : "Enviar Pedido por WhatsApp"}</span>
                </button>
                <p className="text-[10px] text-center text-slate-500 mt-2">
                  El pedido se enviará a la tienda por WhatsApp y quedará registrado en su sistema POS.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
