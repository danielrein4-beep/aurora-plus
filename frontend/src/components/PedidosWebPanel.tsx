import React, { useState, useEffect, useMemo } from "react";

function SvgSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SvgRefresh({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SvgShoppingBag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function SvgWhatsApp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.031 2c-5.522 0-9.998 4.476-9.998 9.998 0 1.764.46 3.486 1.332 5.006l-1.417 5.176 5.305-1.391a9.948 9.948 0 004.778 1.209h.004c5.52 0 9.997-4.476 9.997-9.998 0-2.67-1.04-5.18-2.929-7.07A9.924 9.924 0 0012.031 2zm0 18.292c-1.498 0-2.966-.402-4.246-1.163l-.305-.181-3.153.827.842-3.076-.198-.315a8.27 8.27 0 01-1.268-4.386c0-4.59 3.736-8.326 8.328-8.326 2.224 0 4.316.866 5.889 2.439a8.267 8.267 0 012.441 5.889c0 4.59-3.737 8.326-8.33 8.326zm4.566-6.233c-.25-.125-1.479-.73-1.708-.813-.23-.083-.396-.125-.563.125-.166.25-.646.813-.792.979-.146.167-.292.188-.542.063s-1.057-.39-2.014-1.244c-.744-.664-1.246-1.484-1.392-1.734-.146-.25-.016-.385.109-.51.112-.112.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.021-.438s-.563-1.354-.771-1.854c-.203-.488-.41-.422-.563-.43-.146-.008-.313-.01-.479-.01s-.438.063-.667.313c-.229.25-.875.854-.875 2.083s.896 2.417 1.021 2.583c.125.167 1.764 2.694 4.274 3.777.597.258 1.064.412 1.428.528.6.191 1.146.164 1.578.1.481-.072 1.479-.604 1.688-1.188.208-.583.208-1.083.146-1.188-.063-.104-.229-.167-.479-.292z" />
    </svg>
  );
}

function SvgTruck({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm11 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zm0 0h5l3 3v2h-8v-5z" />
    </svg>
  );
}

function SvgStore({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3-3V3zm1 7v10a1 1 0 001 1h14a1 1 0 001-1V10" />
    </svg>
  );
}

function SvgCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SvgArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

export interface PedidoWeb {
  id: number;
  tenantId: number;
  numeroPedido: string;
  clienteNombre: string;
  clienteTelefono: string;
  tipoEntrega: string;
  direccionEntrega: string;
  metodoPago: string;
  estado: "PENDIENTE" | "COMPLETADO" | "CANCELADO";
  totalUsd: number;
  totalBs: number;
  tasaCambio: number;
  itemsJson: string;
  notas: string;
  fechaCreacion: string;
}

interface Props {
  tenantId: number;
  tasaVes: number;
  onCargarAlPos: (pedido: PedidoWeb) => void;
  onVerQrModal: () => void;
}

export default function PedidosWebPanel({ tenantId, tasaVes, onCargarAlPos, onVerQrModal }: Props) {
  const [pedidos, setPedidos] = useState<PedidoWeb[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "PENDIENTE" | "COMPLETADO">("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [actualizandoId, setActualizandoId] = useState<number | null>(null);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/public/catalogo/${tenantId}/pedidos`);
      if (res.ok) {
        const data = await res.json();
        setPedidos(data || []);
      }
    } catch (err) {
      console.warn("No se pudieron consultar pedidos web:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    const interval = setInterval(cargarPedidos, 15000); // Polling cada 15s
    return () => clearInterval(interval);
  }, [tenantId]);

  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    setActualizandoId(id);
    try {
      const res = await fetch(`/api/public/catalogo/${tenantId}/pedidos/${id}/estado?estado=${nuevoEstado}`, {
        method: "POST"
      });
      if (res.ok) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado as any } : p))
        );
      }
    } catch (err) {
      console.error("Error al actualizar estado del pedido", err);
    } finally {
      setActualizandoId(null);
    }
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const matchEstado = filtroEstado === "TODOS" || p.estado === filtroEstado;
      const q = busqueda.toLowerCase().trim();
      const matchBusqueda =
        !q ||
        p.numeroPedido.toLowerCase().includes(q) ||
        p.clienteNombre.toLowerCase().includes(q) ||
        p.clienteTelefono.toLowerCase().includes(q) ||
        (p.itemsJson && p.itemsJson.toLowerCase().includes(q));
      return matchEstado && matchBusqueda;
    });
  }, [pedidos, filtroEstado, busqueda]);

  const pendientesCount = useMemo(() => {
    return pedidos.filter((p) => p.estado === "PENDIENTE").length;
  }, [pedidos]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      {/* Header del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center">
              <SvgShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                Pedidos Web & WhatsApp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solicitudes de compra generadas desde su catálogo digital público
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVerQrModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <span>Ver Catálogo Online & QR</span>
          </button>

          <button
            type="button"
            onClick={cargarPedidos}
            disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors"
          >
            <SvgRefresh className={`w-3.5 h-3.5 ${cargando ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFiltroEstado("TODOS")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === "TODOS"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Todos ({pedidos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("PENDIENTE")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === "PENDIENTE"
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Pendientes</span>
            {pendientesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {pendientesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("COMPLETADO")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filtroEstado === "COMPLETADO"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Completados
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <SvgSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o #pedido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-400">
          <SvgShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            No hay pedidos en esta vista
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Los clientes que envíen pedidos desde el catálogo online aparecerán aquí en tiempo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pedidosFiltrados.map((p) => {
            const esPendiente = p.estado === "PENDIENTE";
            const cleanPhone = (p.clienteTelefono || "").replace(/[^0-9]/g, "");
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith("0") ? "58" + cleanPhone.substring(1) : cleanPhone}` : null;

            return (
              <div
                key={p.id}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                  esPendiente
                    ? "bg-white dark:bg-slate-900 border-amber-500/30 shadow-md shadow-amber-500/5"
                    : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-90"
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      #{p.numeroPedido}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        esPendiente
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {p.estado}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>

                {/* Info del Cliente */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {p.clienteNombre}
                    </span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <SvgWhatsApp className="w-3.5 h-3.5" />
                        <span>{p.clienteTelefono}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      {p.tipoEntrega === "DELIVERY" ? (
                        <>
                          <SvgTruck className="w-3 h-3 text-teal-400" />
                          <span>Delivery</span>
                        </>
                      ) : (
                        <>
                          <SvgStore className="w-3 h-3 text-teal-400" />
                          <span>Retiro en Tienda</span>
                        </>
                      )}
                    </span>
                    <span>•</span>
                    <span className="font-medium">{p.metodoPago}</span>
                  </div>

                  {p.tipoEntrega === "DELIVERY" && p.direccionEntrega && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5">
                      Dirección: {p.direccionEntrega}
                    </p>
                  )}
                  {p.notas && (
                    <p className="text-[10px] text-slate-500 italic pt-0.5">
                      Notas: {p.notas}
                    </p>
                  )}
                </div>

                {/* Items del Pedido */}
                <div className="text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Artículos:
                  </span>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-slate-100/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                    {p.itemsJson || "No especificado"}
                  </div>
                </div>

                {/* Totales y Acciones */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black font-mono text-teal-600 dark:text-teal-400">
                      ${Number(p.totalUsd).toFixed(2)} USD
                    </div>
                    {Number(p.totalBs) > 0 && (
                      <div className="text-[10px] font-mono text-slate-400">
                        {Number(p.totalBs).toFixed(2)} Bs.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {esPendiente && (
                      <button
                        type="button"
                        onClick={() => onCargarAlPos(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95"
                      >
                        <span>Cargar al POS</span>
                        <SvgArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actualizandoId === p.id}
                      onClick={() => cambiarEstado(p.id, esPendiente ? "COMPLETADO" : "PENDIENTE")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        esPendiente
                          ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      }`}
                    >
                      {esPendiente ? "Listo / Despachado" : "Reabrir"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
