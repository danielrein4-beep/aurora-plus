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
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3-3V3zm1 7v10a1 1 0 001 1h14a1 1 0 001-1V10" />
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

function SvgShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function SvgSparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function SvgCopy({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function SvgEye({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

// Silueta abstracta moderna para representar monturas/lentes/productos de lujo
function SvgGlassesSilhouette({ className = "w-36 h-20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 30C16 30 10 37 10 46C10 56 18 64 30 64C42 64 50 56 52 46C53 41 51 36 48 33C43 28 32 30 24 30Z"
        fill="#171717"
      />
      <path
        d="M136 30C144 30 150 37 150 46C150 56 142 64 130 64C118 64 110 56 108 46C107 41 109 36 112 33C117 28 128 30 136 30Z"
        fill="#171717"
      />
      <path
        d="M52 42C60 38 68 37 80 37C92 37 100 38 108 42"
        stroke="#171717"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M12 40L2 34M148 40L158 34"
        stroke="#171717"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="31" cy="47" r="14" fill="#262626" opacity="0.85" />
      <circle cx="129" cy="47" r="14" fill="#262626" opacity="0.85" />
    </svg>
  );
}

interface ProductoCatalogo {
  id: string;
  codigo: string;
  oem?: string;
  nombre: string;
  categoria: string;
  marca?: string;
  precioUsd: number;
  precioBs: number;
  stock: number;
  unidad?: string;
  descripcion?: string;
  tallas?: string[];
  imagenUrl?: string;
  esNuevo?: boolean;
}

interface DatosTienda {
  tenantId: number;
  nombreTienda: string;
  moduloPrincipal?: string;
  telefonoWhatsapp?: string;
  emailContacto?: string;
  logoBase64?: string;
  tasaVes: number;
  domicilioFiscal?: string;
  pagoMovil?: {
    activo: boolean;
    banco: string;
    telefono: string;
    documento: string;
    titular: string;
  };
  productos: ProductoCatalogo[];
}

interface ItemCarrito {
  producto: ProductoCatalogo;
  tallaSeleccionada: string;
  cantidad: number;
}

// Productos de muestra inspirados en la referencia de alta gama
const PRODUCTOS_MUESTRA_LUJO: Omit<ProductoCatalogo, "precioBs">[] = [
  {
    id: "demo-opt-01",
    codigo: "BV-01",
    nombre: "SARDINE OVAL",
    marca: "BOTTEGA VENETA",
    categoria: "LENTES DE SOL",
    precioUsd: 500.00,
    stock: 12,
    unidad: "Pieza",
    esNuevo: true,
    tallas: ["52mm", "54mm", "Estándar"],
    descripcion: "Montura metálica dorada de diseño aerodinámico con terminales esculturales y cristales con filtro UV400 de máxima nitidez."
  },
  {
    id: "demo-opt-02",
    codigo: "MM-02",
    nombre: "SMU B09",
    marca: "MIU MIU",
    categoria: "FORMULA",
    precioUsd: 380.00,
    stock: 15,
    unidad: "Pieza",
    esNuevo: false,
    tallas: ["50mm", "52mm"],
    descripcion: "Silueta ovalada en acetato negro pulido con logo dorado en bajo relieve en las patillas y soporte ergonómico."
  },
  {
    id: "demo-opt-03",
    codigo: "FD-03",
    nombre: "FE40140U",
    marca: "FENDI",
    categoria: "LENTES DE SOL",
    precioUsd: 380.00,
    stock: 8,
    unidad: "Pieza",
    esNuevo: false,
    tallas: ["53mm", "55mm"],
    descripcion: "Diseño rectangular contemporáneo con detalle Fendi Baguette esmaltado en metal dorado y cristales tintados oscuros."
  },
  {
    id: "demo-opt-04",
    codigo: "FD-04",
    nombre: "FENDI ROMA",
    marca: "FENDI",
    categoria: "AI GLASSES",
    precioUsd: 400.00,
    stock: 10,
    unidad: "Pieza",
    esNuevo: true,
    tallas: ["54mm", "56mm"],
    descripcion: "Montura cuadrada oversize en acetato negro azabache de alta densidad con bisagras reforzadas y protección antirreflejo."
  },
  {
    id: "demo-opt-05",
    codigo: "GC-05",
    nombre: "HORSEBIT SQUARE",
    marca: "GUCCI",
    categoria: "LENTES DE SOL",
    precioUsd: 450.00,
    stock: 6,
    unidad: "Pieza",
    esNuevo: false,
    tallas: ["54mm", "Estándar"],
    descripcion: "Montura geométrica con icónico detalle Horsebit dorado e inserciones esmaltadas exclusivas de la colección italiana."
  },
  {
    id: "demo-opt-06",
    codigo: "CT-06",
    nombre: "PANTHERE RIMLESS",
    marca: "CARTIER",
    categoria: "FORMULA",
    precioUsd: 620.00,
    stock: 4,
    unidad: "Pieza",
    esNuevo: true,
    tallas: ["55mm", "57mm"],
    descripcion: "Gafas al aire en acabado platino brillante con cabezas de pantera esculpidas a mano en el puente y patillas biseladas."
  }
];

export default function CatalogoPublico() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [tienda, setTienda] = useState<DatosTienda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moneda, setMoneda] = useState<"USD" | "VES">("USD");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODOS");

  // Modo muestra interactiva
  const [mostrarDemo, setMostrarDemo] = useState(false);

  // Modal de Detalle de Producto seleccionado
  const [productoDetalle, setProductoDetalle] = useState<ProductoCatalogo | null>(null);
  const [tallaModal, setTallaModal] = useState<string>("");
  const [cantidadModal, setCantidadModal] = useState<number>(1);
  const [agregadoAnim, setAgregadoAnim] = useState<boolean>(false);

  // Carrito de compras
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [copiadoPagoMovil, setCopiadoPagoMovil] = useState(false);

  // Formulario del cliente y checkout
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [metodoPago, setMetodoPago] = useState("PAGO_MOVIL");
  const [numeroReferencia, setNumeroReferencia] = useState("");
  const [notas, setNotas] = useState("");

  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{
    numeroPedido: string;
    whatsappUrl: string;
    esDirecto: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchCatalogo = async () => {
      setCargando(true);
      setError(null);
      try {
        const tid = tenantId || "2";
        const res = await fetch(`/api/public/catalogo/${tid}`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el catálogo de la tienda.");
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

  const tasa = tienda?.tasaVes && tienda.tasaVes > 0 ? tienda.tasaVes : 50;

  // Lista activa de productos: productos reales de la tienda o catálogo de muestra
  const productosActivos = useMemo<ProductoCatalogo[]>(() => {
    if (!tienda) return [];
    if (tienda.productos && tienda.productos.length > 0) {
      return tienda.productos.map((p) => ({
        ...p,
        marca: p.categoria || "Colección",
        tallas: ["S", "M", "L", "Estándar"]
      }));
    }
    if (mostrarDemo) {
      return PRODUCTOS_MUESTRA_LUJO.map((item) => ({
        ...item,
        precioBs: Number((item.precioUsd * tasa).toFixed(2))
      }));
    }
    return [];
  }, [tienda, mostrarDemo, tasa]);

  // Lista de categorías únicas para las píldoras superiores
  const categorias = useMemo(() => {
    if (!productosActivos || productosActivos.length === 0) return ["TODOS"];
    const setCat = new Set<string>();
    productosActivos.forEach((p) => {
      if (p.categoria) setCat.add(p.categoria.toUpperCase());
    });
    return ["TODOS", ...Array.from(setCat)];
  }, [productosActivos]);

  // Productos filtrados según categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    return productosActivos.filter((p) => {
      const cumpleCat =
        categoriaSeleccionada === "TODOS" ||
        p.categoria.toUpperCase() === categoriaSeleccionada;
      const q = busqueda.toLowerCase().trim();
      const cumpleBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.marca && p.marca.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q));
      return cumpleCat && cumpleBusqueda;
    });
  }, [productosActivos, categoriaSeleccionada, busqueda]);

  // Abrir modal de detalle al hacer clic en un producto
  const abrirDetalle = (prod: ProductoCatalogo) => {
    setProductoDetalle(prod);
    const primeraTalla = prod.tallas && prod.tallas.length > 0 ? prod.tallas[0] : "Estándar";
    setTallaModal(primeraTalla);
    setCantidadModal(1);
    setAgregadoAnim(false);
  };

  const cerrarDetalle = () => {
    setProductoDetalle(null);
  };

  // Operaciones de Carrito
  const agregarAlCarritoConTalla = (prod: ProductoCatalogo, talla: string, cant: number = 1) => {
    if (prod.stock <= 0) return;
    setCarrito((prev) => {
      const idx = prev.findIndex(
        (it) => it.producto.id === prod.id && it.tallaSeleccionada === talla
      );
      if (idx >= 0) {
        const nuevaCant = Math.min(prev[idx].cantidad + cant, prod.stock);
        const nuevo = [...prev];
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevaCant };
        return nuevo;
      }
      return [...prev, { producto: prod, tallaSeleccionada: talla, cantidad: cant }];
    });

    setAgregadoAnim(true);
    setTimeout(() => setAgregadoAnim(false), 1500);
  };

  const modificarCantidad = (id: string, talla: string, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.producto.id === id && item.tallaSeleccionada === talla) {
            const nuevaCantidad = Math.min(item.cantidad + delta, item.producto.stock);
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[];
    });
  };

  const eliminarDelCarrito = (id: string, talla: string) => {
    setCarrito((prev) =>
      prev.filter((it) => !(it.producto.id === id && it.tallaSeleccionada === talla))
    );
  };

  const totalUsd = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.producto.precioUsd * item.cantidad, 0);
  }, [carrito]);

  const totalBs = useMemo(() => {
    return totalUsd * tasa;
  }, [totalUsd, tasa]);

  const totalItems = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.cantidad, 0);
  }, [carrito]);

  const handleCopiarPagoMovil = () => {
    if (!tienda?.pagoMovil) return;
    const txt = `Pago Móvil:\nBanco: ${tienda.pagoMovil.banco}\nTeléfono: ${tienda.pagoMovil.telefono}\nRIF: ${tienda.pagoMovil.documento}\nTitular: ${tienda.pagoMovil.titular}\nMonto: ${totalBs.toFixed(2)} Bs.`;
    navigator.clipboard.writeText(txt);
    setCopiadoPagoMovil(true);
    setTimeout(() => setCopiadoPagoMovil(false), 2500);
  };

  // Enviar pedido (Checkout Directo o vía WhatsApp)
  const procesarPedido = async (directoAWhatsApp: boolean) => {
    if (carrito.length === 0) return;
    if (!nombreCliente.trim()) {
      alert("Por favor ingrese su nombre y apellido");
      return;
    }
    if (!telefonoCliente.trim()) {
      alert("Por favor ingrese su número de teléfono o WhatsApp");
      return;
    }
    if (tipoEntrega === "DELIVERY" && !direccionEntrega.trim()) {
      alert("Por favor ingrese la dirección exacta de entrega");
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
        numeroReferencia: numeroReferencia.trim(),
        totalUsd,
        totalBs,
        tasaCambio: tasa,
        notas: notas.trim(),
        items: carrito.map((item) => ({
          productoId: item.producto.id,
          codigo: item.producto.codigo,
          nombre: `${item.producto.nombre} (Talla/Medida: ${item.tallaSeleccionada})`,
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

      let numPedido = "PED-" + Math.floor(1000 + Math.random() * 9000);
      let waUrl = "";

      if (res.ok) {
        const data = await res.json();
        numPedido = data.numeroPedido;
        waUrl = data.whatsappUrl;
      }

      // Si no devolvio waUrl o fue modo de prueba, generar mensaje estructurado de WhatsApp
      if (!waUrl) {
        const lineas = carrito
          .map(
            (it) =>
              `- ${it.cantidad}x ${it.producto.nombre} [${it.tallaSeleccionada}] ($${(it.producto.precioUsd * it.cantidad).toFixed(2)})`
          )
          .join("\n");

        const refText = numeroReferencia.trim() ? `\nReferencia Pago: ${numeroReferencia.trim()}` : "";
        const mensajeWa = `*NUEVO PEDIDO - ${tienda?.nombreTienda.toUpperCase()}*\nPedido: #${numPedido}\nCliente: ${nombreCliente.trim()}\nTeléfono: ${telefonoCliente.trim()}\nEntrega: ${tipoEntrega === "DELIVERY" ? "Delivery (" + direccionEntrega.trim() + ")" : "Retiro en tienda"}\nMétodo de Pago: ${metodoPago}${refText}\n\n*Artículos:*\n${lineas}\n\nTotal USD: $${totalUsd.toFixed(2)}\nTotal Bs.: ${totalBs.toFixed(2)} Bs. (Tasa BCV ${tasa.toFixed(2)})\nNotas: ${notas.trim() || "Sin observaciones"}`;
        const phone = tienda?.telefonoWhatsapp?.replace(/\D/g, "") || "584141234567";
        waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensajeWa)}`;
      }

      setPedidoConfirmado({
        numeroPedido: numPedido,
        whatsappUrl: waUrl,
        esDirecto: !directoAWhatsApp
      });

      if (directoAWhatsApp && waUrl) {
        window.open(waUrl, "_blank");
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
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center text-neutral-600">
        <div className="w-10 h-10 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold tracking-widest uppercase text-neutral-800">Cargando Catálogo</p>
      </div>
    );
  }

  if (error || !tienda) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center text-neutral-800">
        <div className="w-16 h-16 rounded-3xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4 shadow-sm">
          <SvgStore className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-neutral-900 mb-2">Tienda no disponible</h2>
        <p className="text-xs text-neutral-500 max-w-md mb-6">{error || "No se ha encontrado la tienda solicitada."}</p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold tracking-wider uppercase transition-all hover:bg-neutral-800"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  const phoneHref = tienda.telefonoWhatsapp
    ? `https://wa.me/${tienda.telefonoWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola, me comunico desde el catálogo de ${tienda.nombreTienda} para realizar una consulta.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* 1. Header Minimalista de Alta Gama con Marca y Controles */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo del Comercio / Identidad */}
          <div className="flex items-center gap-3.5 min-w-0">
            {tienda.logoBase64 ? (
              <img
                src={tienda.logoBase64}
                alt={tienda.nombreTienda}
                className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[200px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-black text-sm tracking-widest shadow-sm">
                  {tienda.nombreTienda.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-neutral-950 uppercase leading-none">
                    {tienda.nombreTienda}
                  </h1>
                  <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">
                    Catálogo Oficial
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Selector de Moneda y Carrito */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Tasa BCV Pill */}
            <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-mono font-semibold text-neutral-600">
              BCV: {tasa.toFixed(2)} Bs/$
            </div>

            {/* Toggle de Moneda */}
            <div className="flex items-center p-1 rounded-full bg-neutral-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMoneda("USD")}
                className={`px-3 py-1 rounded-full transition-all text-xs ${
                  moneda === "USD"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setMoneda("VES")}
                className={`px-3 py-1 rounded-full transition-all text-xs ${
                  moneda === "VES"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                VES (Bs.)
              </button>
            </div>

            {/* Botón Carrito */}
            <button
              type="button"
              onClick={() => setDrawerAbierto(true)}
              className="relative w-11 h-11 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Ver Bolsa de Pedido"
            >
              <SvgBag className="w-5 h-5 text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-md animate-scale-up">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Barra Superior de Píldoras de Categorías (Exacto como la referencia) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none border-t border-neutral-100/80">
          <div className="flex items-center gap-2 flex-shrink-0">
            {categorias.map((cat) => {
              const active = categoriaSeleccionada === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`px-5 py-2 rounded-full text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                    active
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-950"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Buscador Integrado */}
          <div className="relative w-48 sm:w-64 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <SvgSearch className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar artículo..."
              className="w-full pl-9 pr-7 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-900"
              >
                <SvgClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Banner de Tienda / Estado Vacío si no hay productos cargados */}
        {productosActivos.length === 0 && (
          <div className="my-10 p-10 sm:p-16 rounded-[2.5rem] bg-white border border-neutral-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto mb-6">
              <SvgStore className="w-10 h-10" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold tracking-widest uppercase mb-3">
              Actualización de Stock
            </span>

            <h3 className="text-2xl sm:text-3xl font-black text-neutral-950 uppercase tracking-tight">
              Catálogo en Preparación
            </h3>

            <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
              <strong className="text-neutral-900">{tienda.nombreTienda}</strong> está cargando su inventario oficial. Puedes solicitar información directa o explorar la vista previa con productos de muestra.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {phoneHref && (
                <a
                  href={phoneHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95"
                >
                  <SvgWhatsApp className="w-4 h-4" />
                  <span>Consultar por WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setMostrarDemo(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs tracking-wider uppercase transition-all active:scale-95"
              >
                <SvgSparkles className="w-4 h-4 text-neutral-700" />
                <span>Ver Catálogo de Muestra</span>
              </button>
            </div>
          </div>
        )}

        {/* Banner Informativo si el modo muestra está activo */}
        {mostrarDemo && (
          <div className="mb-8 p-4 rounded-3xl bg-white border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0">
                <SvgSparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-neutral-950">Modo Vista Previa de Demostración</h4>
                <p className="text-xs text-neutral-500">
                  Explora el catálogo interactivo: haz clic en cualquier artículo para ver detalles y tallas, agrégalo al carrito y prueba el flujo de checkout.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarDemo(false)}
              className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider transition-colors self-start sm:self-center"
            >
              Cerrar Muestra
            </button>
          </div>
        )}

        {/* 3. Grid de Tarjetas de Producto Ultra Minimalistas (Idéntico a la referencia del usuario) */}
        {productosFiltrados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {productosFiltrados.map((prod) => {
              const pUsd = prod.precioUsd;
              const pBs = Number((pUsd * tasa).toFixed(2));
              const tallaDefault = prod.tallas && prod.tallas.length > 0 ? prod.tallas[0] : "Estándar";

              return (
                <div
                  key={prod.id}
                  className="group relative bg-white rounded-[2.25rem] p-6 sm:p-7 border border-neutral-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Fila Superior: Marca en pequeño o insignia NUEVO */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">
                      {prod.marca || prod.categoria || "EXCLUSIVE"}
                    </span>

                    {prod.esNuevo && (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-white text-[9px] font-black tracking-widest uppercase">
                        Nuevo
                      </span>
                    )}
                  </div>

                  {/* Imagen / Silueta Central del Producto */}
                  <div
                    onClick={() => abrirDetalle(prod)}
                    className="h-48 sm:h-56 w-full flex items-center justify-center p-4 cursor-pointer relative group-hover:scale-102 transition-transform duration-300"
                  >
                    {prod.imagenUrl ? (
                      <img
                        src={prod.imagenUrl}
                        alt={prod.nombre}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <SvgGlassesSilhouette className="w-40 sm:w-44 h-auto drop-shadow-sm opacity-90 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[9px] font-mono text-neutral-300 mt-2 tracking-widest uppercase">
                          {prod.codigo}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Información del Producto */}
                  <div className="mt-2">
                    <span className="block text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-0.5">
                      {prod.marca || "DESIGNER"}
                    </span>
                    <h3
                      onClick={() => abrirDetalle(prod)}
                      className="text-lg sm:text-xl font-black text-neutral-950 uppercase tracking-tight italic line-clamp-1 cursor-pointer hover:text-neutral-700 transition-colors"
                    >
                      {prod.nombre}
                    </h3>
                  </div>

                  {/* Precios y Botón de Acción */}
                  <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                    <div>
                      {moneda === "USD" ? (
                        <>
                          <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-none">
                            ${pUsd.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-medium text-neutral-400 font-mono mt-1">
                            {pBs.toFixed(2)} Bs.
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight leading-none">
                            {pBs.toFixed(2)} Bs.
                          </div>
                          <div className="text-[10px] font-medium text-neutral-400 font-mono mt-1">
                            ${pUsd.toFixed(2)} USD
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => agregarAlCarritoConTalla(prod, tallaDefault, 1)}
                      className="w-11 h-11 rounded-2xl bg-neutral-100 hover:bg-neutral-900 text-neutral-800 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-90"
                      title="Añadir a la bolsa"
                    >
                      <SvgBag className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. MODAL DE DETALLE DE PRODUCTO (Al hacer clic en un item) */}
      {productoDetalle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={cerrarDetalle}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors z-10"
            >
              <SvgClose className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Imagen Grande / Visual */}
              <div className="bg-neutral-50 rounded-3xl h-64 sm:h-80 flex flex-col items-center justify-center p-6 relative">
                {productoDetalle.imagenUrl ? (
                  <img
                    src={productoDetalle.imagenUrl}
                    alt={productoDetalle.nombre}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <SvgGlassesSilhouette className="w-48 sm:w-56 h-auto" />
                )}
                <span className="absolute bottom-4 text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                  SKU: {productoDetalle.codigo}
                </span>
              </div>

              {/* Información y Especificaciones */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-neutral-400 tracking-widest uppercase">
                    {productoDetalle.marca || productoDetalle.categoria}
                  </span>
                  <h3 className="text-2xl font-black text-neutral-950 uppercase tracking-tight italic mt-0.5">
                    {productoDetalle.nombre}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                      ${productoDetalle.precioUsd.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono font-medium text-neutral-400">
                      ({(productoDetalle.precioUsd * tasa).toFixed(2)} Bs. BCV)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {productoDetalle.descripcion ||
                    "Artículo exclusivo con materiales seleccionados de alto rendimiento, acabados de primera calidad y ajuste ergonómico."}
                </p>

                {/* Selector de Tallas / Medidas */}
                {productoDetalle.tallas && productoDetalle.tallas.length > 0 && (
                  <div>
                    <span className="block text-[11px] font-black text-neutral-900 tracking-wider uppercase mb-1.5">
                      Seleccionar Medida / Talla
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {productoDetalle.tallas.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTallaModal(t)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            tallaModal === t
                              ? "bg-neutral-900 text-white shadow-sm"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selector de Cantidad */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center border border-neutral-200 rounded-xl p-1 bg-neutral-50">
                    <button
                      type="button"
                      onClick={() => setCantidadModal((c) => Math.max(1, c - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-white"
                    >
                      <SvgMinus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-black font-mono min-w-[28px] text-center">
                      {cantidadModal}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCantidadModal((c) => Math.min(c + 1, productoDetalle.stock))
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-white"
                    >
                      <SvgPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {productoDetalle.stock > 0 ? "Disponible en Inventario" : "Agotado"}
                  </span>
                </div>

                {/* Botón Añadir al Carrito */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      agregarAlCarritoConTalla(productoDetalle, tallaModal, cantidadModal);
                      setTimeout(() => cerrarDetalle(), 700);
                    }}
                    className={`w-full py-3.5 rounded-full font-black text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                      agregadoAnim
                        ? "bg-emerald-600 text-white shadow-emerald-500/25"
                        : "bg-neutral-900 hover:bg-neutral-800 text-white shadow-neutral-900/20"
                    }`}
                  >
                    <SvgBag className="w-4 h-4" />
                    <span>{agregadoAnim ? "Añadido a la Bolsa" : "Añadir a la Bolsa"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DRAWER DE CARRITO COMPLETO & PASARELA DE PAGO */}
      {drawerAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div
            className="relative w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Carrito */}
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SvgBag className="w-5 h-5 text-neutral-900" />
                <h3 className="text-base font-black uppercase tracking-tight text-neutral-900">
                  Bolsa de Compras ({totalItems})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerAbierto(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <SvgClose className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Carrito */}
            {pedidoConfirmado ? (
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <SvgCheckCircle className="w-10 h-10" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                  Pedido Confirmado
                </span>
                <h4 className="text-2xl font-black text-neutral-950 font-mono mt-1">
                  #{pedidoConfirmado.numeroPedido}
                </h4>
                <p className="text-xs text-neutral-500 mt-2 max-w-xs leading-relaxed">
                  Tu orden ha quedado registrada con los datos de entrega y monto oficial. Puedes abrir el chat de WhatsApp para recibir actualizaciones de despacho en tiempo real.
                </p>

                <div className="w-full mt-6 space-y-3">
                  <a
                    href={pedidoConfirmado.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <SvgWhatsApp className="w-5 h-5" />
                    <span>Abrir en WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setPedidoConfirmado(null);
                      setDrawerAbierto(false);
                    }}
                    className="w-full py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-700 transition-colors"
                  >
                    Hacer otro pedido
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Lista de Artículos */}
                {carrito.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400">
                    <SvgBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold text-neutral-700">Tu bolsa está vacía</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Selecciona artículos del catálogo para comenzar tu compra.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block">
                      Artículos en la bolsa
                    </span>
                    <div className="space-y-3">
                      {carrito.map((item) => {
                        const subUsd = item.producto.precioUsd * item.cantidad;
                        return (
                          <div
                            key={`${item.producto.id}-${item.tallaSeleccionada}`}
                            className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-black uppercase text-neutral-900 truncate">
                                {item.producto.nombre}
                              </h5>
                              <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2">
                                <span className="font-bold bg-white px-2 py-0.5 rounded border border-neutral-200">
                                  {item.tallaSeleccionada}
                                </span>
                                <span className="font-mono text-rose-600 font-bold">
                                  ${item.producto.precioUsd.toFixed(2)} c/u
                                </span>
                              </div>
                            </div>

                            {/* Controles */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    modificarCantidad(item.producto.id, item.tallaSeleccionada, -1)
                                  }
                                  className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900"
                                >
                                  <SvgMinus className="w-3 h-3" />
                                </button>
                                <span className="px-2 text-xs font-mono font-bold min-w-[20px] text-center">
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    modificarCantidad(item.producto.id, item.tallaSeleccionada, 1)
                                  }
                                  className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-900"
                                >
                                  <SvgPlus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  eliminarDelCarrito(item.producto.id, item.tallaSeleccionada)
                                }
                                className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-rose-600 transition-colors"
                              >
                                <SvgTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Formulario de Envío y Pago */}
                {carrito.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-neutral-100">
                    <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block">
                      Método de Despacho
                    </span>

                    {/* Selector Delivery / Pickup */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega("DELIVERY")}
                        className={`py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          tipoEntrega === "DELIVERY"
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        <SvgTruck className="w-4 h-4" />
                        <span>Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEntrega("PICKUP")}
                        className={`py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          tipoEntrega === "PICKUP"
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        <SvgStore className="w-4 h-4" />
                        <span>Retiro en Local</span>
                      </button>
                    </div>

                    {/* Campos de Contacto */}
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                          Nombre y Apellido *
                        </label>
                        <input
                          type="text"
                          required
                          value={nombreCliente}
                          onChange={(e) => setNombreCliente(e.target.value)}
                          placeholder="Ej: Daniel Reina"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                          Teléfono o WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={telefonoCliente}
                          onChange={(e) => setTelefonoCliente(e.target.value)}
                          placeholder="Ej: 04141234567"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                        />
                      </div>

                      {tipoEntrega === "DELIVERY" && (
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                            Dirección Exacta de Delivery *
                          </label>
                          <input
                            type="text"
                            required
                            value={direccionEntrega}
                            onChange={(e) => setDireccionEntrega(e.target.value)}
                            placeholder="Calle, Residencia, Piso, Punto de Referencia"
                            className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                          />
                        </div>
                      )}

                      {/* Método de Pago */}
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                          Método de Pago
                        </label>
                        <select
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-900 focus:bg-white"
                        >
                          <option value="PAGO_MOVIL">Pago Móvil (Bolívares al BCV)</option>
                          <option value="BINANCE">Binance Pay (USDT sin comisión)</option>
                          <option value="EFECTIVO_USD">Efectivo Divisas ($ USD)</option>
                          <option value="EFECTIVO_BS">Efectivo Bolívares (Bs.)</option>
                          <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                          <option value="ZELLE">Zelle</option>
                        </select>
                      </div>

                      {/* Caja de Datos de Pago Móvil con Botón de Copiar y Referencia */}
                      {metodoPago === "PAGO_MOVIL" && tienda.pagoMovil?.activo && (
                        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span>Datos Oficiales Pago Móvil</span>
                            <span className="font-mono text-rose-600 font-bold">
                              {totalBs.toFixed(2)} Bs.
                            </span>
                          </div>

                          <div className="text-[11px] text-neutral-600 font-mono space-y-0.5">
                            <div>
                              <span className="text-neutral-400 font-sans">Banco:</span>{" "}
                              {tienda.pagoMovil.banco}
                            </div>
                            <div>
                              <span className="text-neutral-400 font-sans">Teléfono:</span>{" "}
                              {tienda.pagoMovil.telefono}
                            </div>
                            <div>
                              <span className="text-neutral-400 font-sans">RIF:</span>{" "}
                              {tienda.pagoMovil.documento}
                            </div>
                            {tienda.pagoMovil.titular && (
                              <div>
                                <span className="text-neutral-400 font-sans">Titular:</span>{" "}
                                {tienda.pagoMovil.titular}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleCopiarPagoMovil}
                            className="w-full py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-[11px] font-bold text-neutral-800 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <SvgCopy className="w-3.5 h-3.5" />
                            <span>
                              {copiadoPagoMovil
                                ? "Datos Copiados al Portapapeles"
                                : "Copiar Datos de Pago Móvil"}
                            </span>
                          </button>

                          <div className="pt-2">
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                              Número de Referencia Bancaria (Opcional)
                            </label>
                            <input
                              type="text"
                              value={numeroReferencia}
                              onChange={(e) => setNumeroReferencia(e.target.value)}
                              placeholder="Últimos 4 o 6 dígitos de la transferencia"
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {metodoPago === "BINANCE" && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                          <span className="font-bold text-amber-900 block">
                            Binance Pay (USDT Cero Comisiones)
                          </span>
                          <p className="text-[11px] text-amber-800">
                            Paga exactamente <strong className="text-black">${totalUsd.toFixed(2)} USDT</strong>.
                            Al enviar el pedido, recibirás el Pay ID directo para la transferencia instantánea.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                          Notas o Instrucciones Especiales
                        </label>
                        <input
                          type="text"
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Ej: Empaque para regalo / Entregar después de las 2pm"
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 font-medium focus:outline-none focus:border-neutral-900 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer con Totales y Botones de Checkout */}
            {carrito.length > 0 && !pedidoConfirmado && (
              <div className="p-6 border-t border-neutral-100 bg-neutral-50/70 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Subtotal Divisas:</span>
                    <span className="font-bold text-neutral-900">${totalUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Total Bolívares (BCV {tasa.toFixed(2)}):</span>
                    <span className="font-black text-rose-600 text-sm">{totalBs.toFixed(2)} Bs.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => procesarPedido(false)}
                    disabled={enviandoPedido}
                    className="w-full py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {enviandoPedido ? "Procesando..." : "Confirmar Pedido"}
                  </button>

                  <button
                    type="button"
                    onClick={() => procesarPedido(true)}
                    disabled={enviandoPedido}
                    className="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <SvgWhatsApp className="w-4 h-4" />
                    <span>Pedir por WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Botón Flotante de WhatsApp en la esquina inferior derecha */}
      {phoneHref && (
        <a
          href={phoneHref}
          target="_blank"
          rel="noopener noreferrer"
          title="Atención directa por WhatsApp"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all duration-300"
        >
          <SvgWhatsApp className="w-7 h-7" />
        </a>
      )}
    </div>
  );
}
