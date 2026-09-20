import React, { useState } from "react";
import { TransaccionCobroPeluqueria, Especialista, ServicioPeluqueria, MetodoPagoBelleza } from "./types";
import { IconCard, IconCheck, IconClose, IconPlus, IconPrinter, IconSparkles } from "../../Icons";

interface Props {
  transacciones: TransaccionCobroPeluqueria[];
  especialistas: Especialista[];
  servicios: ServicioPeluqueria[];
  tasaBcv: number;
  onRegistrarCobro: (cobro: Omit<TransaccionCobroPeluqueria, "id">) => void;
}

const METODOS_PAGO_OPCIONES: { id: MetodoPagoBelleza; label: string }[] = [
  { id: "PAGO_MOVIL", label: "Pago Móvil (Bs)" },
  { id: "EFECTIVO_USD", label: "Efectivo USD ($)" },
  { id: "PUNTO_VENTA", label: "Punto de Venta / Débito" },
  { id: "ZELLE", label: "Zelle ($)" },
  { id: "BINANCE", label: "Binance USDT" },
  { id: "EFECTIVO_BS", label: "Efectivo Bolívares" },
];

export default function CobroCajaPeluqueria({
  transacciones,
  especialistas,
  servicios,
  tasaBcv,
  onRegistrarCobro,
}: Props) {
  // Form nuevo cobro directo en caja
  const [clienteNombre, setClienteNombre] = useState("");
  const [especialistaId, setEspecialistaId] = useState(especialistas[0]?.id || "");
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<{ nombre: string; precioUSD: number }[]>([
    { nombre: servicios[0]?.nombre || "Corte de Dama", precioUSD: servicios[0]?.precioUSD || 25 },
  ]);
  const [servicioAAgregar, setServicioAAgregar] = useState(servicios[1]?.id || "");
  const [descuentoUSD, setDescuentoUSD] = useState<number>(0);
  const [propinaUSD, setPropinaUSD] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoBelleza>("PAGO_MOVIL");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobanteModal, setComprobanteModal] = useState<TransaccionCobroPeluqueria | null>(null);

  const especialistaActual = especialistas.find((e) => e.id === especialistaId) || especialistas[0];

  const subtotalUSD = serviciosSeleccionados.reduce((acc, s) => acc + s.precioUSD, 0);
  const totalUSD = Math.max(0, subtotalUSD - descuentoUSD) + propinaUSD;
  const montoBs = totalUSD * tasaBcv;

  const pctComision = especialistaActual?.porcentajeComision || 40;
  const montoComisionUSD = (subtotalUSD - descuentoUSD) * (pctComision / 100);
  const gananciaSalonUSD = (subtotalUSD - descuentoUSD) - montoComisionUSD;

  const handleAgregarServicio = () => {
    const srv = servicios.find((s) => s.id === servicioAAgregar);
    if (!srv) return;
    setServiciosSeleccionados([...serviciosSeleccionados, { nombre: srv.nombre, precioUSD: srv.precioUSD }]);
  };

  const handleQuitarServicio = (index: number) => {
    setServiciosSeleccionados(serviciosSeleccionados.filter((_, i) => i !== index));
  };

  const handleSubmitCobro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || serviciosSeleccionados.length === 0) return;

    const nuevaTx: Omit<TransaccionCobroPeluqueria, "id"> = {
      clienteNombre: clienteNombre.trim(),
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 5),
      servicios: serviciosSeleccionados,
      subtotalUSD,
      descuentoUSD,
      propinaUSD,
      totalUSD,
      tasaBcv,
      montoBs,
      metodoPago,
      referenciaPago: referenciaPago.trim() || undefined,
      especialistaId: especialistaActual.id,
      especialistaNombre: especialistaActual.nombre,
      porcentajeComision: pctComision,
      montoComisionUSD,
      estado: "COBRADO",
    };

    onRegistrarCobro(nuevaTx);

    // Reset
    setClienteNombre("");
    setReferenciaPago("");
    setPropinaUSD(0);
    setDescuentoUSD(0);
    setServiciosSeleccionados([{ nombre: servicios[0]?.nombre || "Corte", precioUSD: servicios[0]?.precioUSD || 25 }]);
  };

  const totalFacturadoHoyUSD = transacciones.filter((t) => t.estado === "COBRADO").reduce((acc, t) => acc + t.totalUSD, 0);
  const totalComisionesHoyUSD = transacciones.filter((t) => t.estado === "COBRADO").reduce((acc, t) => acc + t.montoComisionUSD, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner de Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="apple-glass rounded-2xl p-5 border border-white/10 bg-slate-900/40">
          <div className="text-white/50 text-xs font-mono uppercase">Ventas del Día (Caja)</div>
          <div className="text-3xl font-black text-emerald-400 font-['Outfit'] mt-1">
            ${totalFacturadoHoyUSD.toFixed(2)} USD
          </div>
          <div className="text-xs font-mono text-white/60 mt-1">
            Bs {(totalFacturadoHoyUSD * tasaBcv).toFixed(2)} (Tasa BCV: {tasaBcv.toFixed(2)})
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-purple-500/20 bg-purple-500/5">
          <div className="text-purple-300 text-xs font-mono uppercase">Comisiones por Pagar</div>
          <div className="text-3xl font-black text-purple-400 font-['Outfit'] mt-1">
            ${totalComisionesHoyUSD.toFixed(2)} USD
          </div>
          <div className="text-xs text-purple-300/70 mt-1">
            A liquidar a los especialistas hoy
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-5 border border-teal-500/20 bg-teal-500/5">
          <div className="text-teal-300 text-xs font-mono uppercase">Margen Neto del Salón</div>
          <div className="text-3xl font-black text-teal-400 font-['Outfit'] mt-1">
            ${(totalFacturadoHoyUSD - totalComisionesHoyUSD).toFixed(2)} USD
          </div>
          <div className="text-xs text-teal-300/70 mt-1">
            Libre tras comisiones de profesionales
          </div>
        </div>
      </div>

      {/* Grid: Terminal de Cobro a la Izquierda, Historial a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Terminal de Cobro (7 cols) */}
        <div className="lg:col-span-7 apple-glass rounded-3xl p-6 sm:p-8 border border-white/15 shadow-xl relative overflow-hidden space-y-5">
          <div className="line-aurora absolute top-0 left-0 right-0" />

          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider">
                <IconCard size={14} />
                <span>Punto de Cobro & Facturación</span>
              </div>
              <h3 className="font-['Outfit'] font-black text-2xl text-white mt-0.5">
                Cobrar Servicios al Cliente
              </h3>
            </div>
            <span className="font-mono text-xs text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/30">
              BCV: {tasaBcv.toFixed(2)} Bs/$
            </span>
          </div>

          <form onSubmit={handleSubmitCobro} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Génesis Rivas"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Especialista que Atendió</label>
                <select
                  value={especialistaId}
                  onChange={(e) => setEspecialistaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:border-teal-400 focus:outline-none"
                >
                  {especialistas.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nombre} ({esp.porcentajeComision}% comisión)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selector de Servicios Añadidos */}
            <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/60 uppercase">Servicios Realizados</span>
                <div className="flex items-center gap-2">
                  <select
                    value={servicioAAgregar}
                    onChange={(e) => setServicioAAgregar(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                  >
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} (${s.precioUSD})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAgregarServicio}
                    className="px-2.5 py-1 rounded-lg bg-teal-500 text-black text-xs font-bold hover:bg-teal-400"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                {serviciosSeleccionados.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 bg-black/20 rounded-lg">
                    <span className="text-white">{item.nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-teal-300">${item.precioUSD.toFixed(2)}</span>
                      {serviciosSeleccionados.length > 1 && (
                        <button type="button" onClick={() => handleQuitarServicio(idx)} className="text-red-400 hover:text-red-300 p-0.5 rounded transition-colors" title="Quitar servicio"><IconClose size={14} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ajustes de Descuento y Propina */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Descuento ($ USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={descuentoUSD || ""}
                  onChange={(e) => setDescuentoUSD(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Propina para Estilista ($ USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={propinaUSD || ""}
                  onChange={(e) => setPropinaUSD(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono text-emerald-300"
                />
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Método de Pago</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {METODOS_PAGO_OPCIONES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      metodoPago === m.id
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Referencia si es digital */}
            {(metodoPago === "PAGO_MOVIL" || metodoPago === "ZELLE" || metodoPago === "BINANCE" || metodoPago === "PUNTO_VENTA") && (
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Número de Referencia / Comprobante</label>
                <input
                  type="text"
                  placeholder="ej. 883921"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
                />
              </div>
            )}

            {/* Resumen de Liquidación de Comisiones */}
            <div className="bg-gradient-to-r from-teal-500/10 via-slate-900/60 to-purple-500/10 p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-white/70">
                <span>Subtotal de Servicios:</span>
                <span className="font-mono text-white">${subtotalUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-xs text-purple-300">
                <span>Comisión Estilista ({pctComision}% para {especialistaActual.nombre}):</span>
                <span className="font-mono font-bold">${montoComisionUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-xs text-teal-300">
                <span>Ingreso Salón:</span>
                <span className="font-mono font-bold">${gananciaSalonUSD.toFixed(2)} USD</span>
              </div>
              {propinaUSD > 0 && (
                <div className="flex justify-between text-xs text-emerald-300">
                  <span>Propina Directa (100% Especialista):</span>
                  <span className="font-mono font-bold">+${propinaUSD.toFixed(2)} USD</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-black text-white">
                <span>TOTAL A COBRAR:</span>
                <div className="text-right">
                  <div className="font-mono text-emerald-400 text-xl">${totalUSD.toFixed(2)} USD</div>
                  <div className="font-mono text-xs text-white/60">Bs {montoBs.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500 text-black font-black text-sm hover:brightness-110 shadow-xl transition-transform hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <IconCheck size={18} />
              <span>Confirmar Cobro en Caja (${totalUSD.toFixed(2)} USD)</span>
            </button>
          </form>
        </div>

        {/* Historial de Transacciones (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="font-['Outfit'] font-bold text-base text-white flex items-center justify-between">
            <span>Últimos Cobros Realizados</span>
            <span className="text-xs font-mono text-white/40">{transacciones.length} registros</span>
          </h4>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {transacciones.map((tx) => (
              <div
                key={tx.id}
                className="apple-glass rounded-2xl p-4 border border-white/10 hover:border-emerald-400/40 transition-all space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{tx.clienteNombre}</span>
                  <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ${tx.totalUSD.toFixed(2)} USD
                  </span>
                </div>

                <div className="text-[11px] text-white/50 space-y-0.5">
                  <div>Especialista: <strong className="text-white/80">{tx.especialistaNombre}</strong></div>
                  <div>Método: <strong className="text-teal-300">{tx.metodoPago}</strong> {tx.referenciaPago ? `(${tx.referenciaPago})` : ""}</div>
                  <div>Comisión pagada: <span className="text-purple-300 font-mono font-bold">${tx.montoComisionUSD.toFixed(2)} USD</span></div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
                  <span>{tx.fecha} • {tx.hora}</span>
                  <button
                    onClick={() => setComprobanteModal(tx)}
                    className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
                  >
                    <IconPrinter size={12} /> Ver Recibo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Comprobante / Recibo */}
      {comprobanteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-white/20 shadow-2xl space-y-4 bg-slate-950 text-white font-mono text-xs">
            <div className="text-center pb-3 border-b border-white/15 space-y-1">
              <div className="text-sm font-black tracking-widest uppercase">AURORA BEAUTY SALON</div>
              <div className="text-[11px] text-white/60">Recibo Digital de Atención</div>
              <div className="text-[10px] text-white/40">{comprobanteModal.fecha} • {comprobanteModal.hora}</div>
            </div>

            <div className="space-y-1 border-b border-white/10 pb-2">
              <div className="flex justify-between">
                <span className="text-white/50">Cliente:</span>
                <span className="font-bold text-white">{comprobanteModal.clienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Atendido por:</span>
                <span className="text-white">{comprobanteModal.especialistaNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Método:</span>
                <span className="text-teal-300">{comprobanteModal.metodoPago}</span>
              </div>
            </div>

            <div className="space-y-1 border-b border-white/10 pb-2">
              <span className="text-white/50 block mb-1">Servicios:</span>
              {comprobanteModal.servicios.map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate pr-2">{s.nombre}</span>
                  <span className="font-bold">${s.precioUSD.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1 text-sm font-black">
              <div className="flex justify-between text-emerald-400">
                <span>TOTAL:</span>
                <span>${comprobanteModal.totalUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-xs font-normal text-white/60">
                <span>Total en Bolívares:</span>
                <span>Bs {comprobanteModal.montoBs.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                onClick={() => setComprobanteModal(null)}
                className="w-full py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

