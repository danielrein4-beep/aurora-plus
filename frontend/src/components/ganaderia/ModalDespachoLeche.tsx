import { useState } from "react";
import { IconCheckCircle, IconDownload, IconTruck } from "../../Icons";
import { registrarDespachoLecheTanque, tasaVigente, actualizarTasa, descargarNotaEntregaDespachoLechePdf, type TanqueLeche, type VentaLecheTanque } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { MonedasConfig, Notificar } from "./tipos";

interface Props {
  tanqueLeche: TanqueLeche | null;
  precioLecheUSD: number;
  tasaBCV: number;
  tasaCOP: number;
  monedasConfig: MonedasConfig;
  tenantId: number;
  notificar: Notificar;
  /** Despacho guardado: tanque con el stock nuevo y la venta registrada. */
  onDespachado: (tanque: TanqueLeche, venta: VentaLecheTanque) => void;
  onCerrar: () => void;
}

/**
 * Despacho de leche del tanque a un comprador o planta, cobrado en USD, Bs o COP
 * (con lo recibido de verdad en caja), y su nota de entrega en PDF.
 */
export default function ModalDespachoLeche({ tanqueLeche, precioLecheUSD, tasaBCV, tasaCOP, monedasConfig, tenantId, notificar, onDespachado, onCerrar }: Props) {
  const [formVentaLeche, setFormVentaLeche] = useState({
    fecha: fechaLocalISO(),
    litrosVendidos: 0,
    precioLitroUSD: precioLecheUSD,
    compradorOPlanta: "",
    monedaPago: "USD",
    // Lo cobrado en Bs/COP; vacío = el equivalente a la tasa configurada.
    montoRecibido: "",
    notas: "",
  });
  const [ultimoDespachoLecheId, setUltimoDespachoLecheId] = useState<number | null>(null);

  /** Garantiza que el backend tenga la tasa USD→moneda que el usuario ve en pantalla. */
  const asegurarTasaEnBackend = async (moneda: "VES" | "COP") => {
    try {
      await tasaVigente(tenantId, "USD", moneda);
    } catch {
      const tasa = moneda === "VES" ? tasaBCV : tasaCOP;
      if (tasa > 0) await actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: moneda, tasa, origen: "PERSONALIZADA" });
    }
  };

  // Equivalente del despacho en la moneda de cobro, a la tasa configurada.
  const equivalenteDespachoLeche = () => {
    const totalUSD = formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD;
    if (formVentaLeche.monedaPago === "VES") return Math.round(totalUSD * tasaBCV * 100) / 100;
    if (formVentaLeche.monedaPago === "COP") return Math.round(totalUSD * tasaCOP);
    return totalUSD;
  };

  // Manejador: Despacho / Venta de Leche desde el Tanque
  const handleGuardarVentaLeche = async (e: React.FormEvent) => {
    e.preventDefault();
    const litros = Number(formVentaLeche.litrosVendidos);
    const precio = Number(formVentaLeche.precioLitroUSD);
    const stockActual = Number(tanqueLeche?.stockActualLitros) || 0;

    if (litros <= 0) {
      notificar("La cantidad de litros a despachar debe ser mayor a cero.");
      return;
    }
    if (litros > stockActual) {
      notificar(`Stock insuficiente en el tanque (${stockActual.toFixed(1)} L disponibles). No se pueden despachar ${litros} L.`);
      return;
    }
    if (!formVentaLeche.compradorOPlanta.trim()) {
      notificar("Debe indicar el comprador o planta receptora.");
      return;
    }

    // Cobrado en Bs o COP: el backend necesita lo que entró de verdad a caja.
    let montoRecibido: number | undefined;
    if (formVentaLeche.monedaPago !== "USD") {
      montoRecibido = Number(String(formVentaLeche.montoRecibido).replace(",", ".")) || equivalenteDespachoLeche();
      if (!montoRecibido || montoRecibido <= 0) {
        notificar(`Indique el monto recibido en ${formVentaLeche.monedaPago}.`);
        return;
      }
    }

    try {
      if (formVentaLeche.monedaPago === "VES" || formVentaLeche.monedaPago === "COP") {
        await asegurarTasaEnBackend(formVentaLeche.monedaPago);
      }
      const res = await registrarDespachoLecheTanque(tenantId, {
        fecha: formVentaLeche.fecha,
        litrosVendidos: litros,
        precioLitroUSD: precio,
        compradorOPlanta: formVentaLeche.compradorOPlanta.trim(),
        monedaPago: formVentaLeche.monedaPago,
        montoRecibido,
        notas: formVentaLeche.notas,
      });

      onDespachado(res.tanque, res.venta);
      setUltimoDespachoLecheId(res.venta?.id ?? null);
      notificar(`Despacho registrado: ${litros} L entregados a ${formVentaLeche.compradorOPlanta} por $${(litros * precio).toFixed(2)} USD.`);
      setFormVentaLeche({
        fecha: fechaLocalISO(),
        litrosVendidos: 0,
        precioLitroUSD: precioLecheUSD,
        compradorOPlanta: "",
        monedaPago: "USD",
        montoRecibido: "",
        notas: "",
      });
    } catch (err: any) {
      notificar(`Error al despachar leche: ${err.message || "revisa la conexión"}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-sky-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white font-['Inter']">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-sky-400"><IconTruck size={22} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Despacho de Leche en Tanque
              </h3>
              <p className="text-[11px] text-slate-400">
                Venta de cisterna a receptoría, planta pasteurizadora o quesera
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onCerrar(); setUltimoDespachoLecheId(null); }}
            className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {ultimoDespachoLecheId ? (
          <div className="space-y-4 text-xs text-center py-4">
            <div className="text-emerald-400 flex flex-col items-center gap-2">
              <IconCheckCircle size={36} />
              <span className="font-bold text-sm text-white">Despacho registrado correctamente</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const blob = await descargarNotaEntregaDespachoLechePdf(tenantId, ultimoDespachoLecheId);
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank");
                  setTimeout(() => URL.revokeObjectURL(url), 30000);
                } catch (e) {
                  notificar("No se pudo descargar la nota de entrega");
                }
              }}
              className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2">
              <IconDownload size={14} />
              Descargar Nota de Entrega (PDF)
            </button>
            <div>
              <button
                type="button"
                onClick={() => { onCerrar(); setUltimoDespachoLecheId(null); }}
                className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        ) : (
        <>
        {/* Alerta de Stock Actual Disponible en Tanque */}
        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-sky-400">Stock Actual en Tanque</span>
            <div className="font-mono font-black text-xl text-white">
              {(tanqueLeche?.stockActualLitros ?? 0).toLocaleString()} <span className="text-xs text-slate-400">L disponibles</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormVentaLeche({ ...formVentaLeche, litrosVendidos: Number(tanqueLeche?.stockActualLitros) || 0 })}
            className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-bold border border-sky-500/30 transition-all cursor-pointer">
            Despachar Todo
          </button>
        </div>

        <form onSubmit={handleGuardarVentaLeche} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Fecha de Despacho *</label>
              <input
                type="date"
                required
                value={formVentaLeche.fecha}
                onChange={e => setFormVentaLeche({ ...formVentaLeche, fecha: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Litros a Despachar *</label>
              <input
                type="number"
                step="1"
                min="1"
                max={Number(tanqueLeche?.stockActualLitros) || 999999}
                required
                value={formVentaLeche.litrosVendidos || ""}
                onChange={e => setFormVentaLeche({ ...formVentaLeche, litrosVendidos: Number(e.target.value) })}
                onFocus={e => e.target.select()}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-sky-400 font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Comprador / Planta Receptora *</label>
            <input
              type="text"
              required
              placeholder="Ej: Planta Lácteos San Simón, Camión Cisterna #04, Quesera Don Luis"
              value={formVentaLeche.compradorOPlanta}
              onChange={e => setFormVentaLeche({ ...formVentaLeche, compradorOPlanta: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Precio x Litro (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-emerald-400 font-bold">$</span>
                <input
                  type="number"
                  onFocus={e => e.target.select()}
                  step="0.0001"
                  min="0.0001"
                  required
                  value={formVentaLeche.precioLitroUSD}
                  onChange={e => setFormVentaLeche({ ...formVentaLeche, precioLitroUSD: Number(e.target.value) })}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-white/15 text-emerald-400 font-mono font-bold text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Moneda de Pago</label>
              <select
                value={formVentaLeche.monedaPago}
                onChange={e => setFormVentaLeche({ ...formVentaLeche, monedaPago: e.target.value, montoRecibido: "" })}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-sky-500 focus:outline-none">
                <option value="USD">USD ($ Dólares)</option>
                {monedasConfig.VES && <option value="VES">VES (Bs. Bolívares)</option>}
                {monedasConfig.COP && <option value="COP">COP ($ Pesos Colombianos)</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Notas / Guía de Movilización (Opcional)</label>
            <input
              type="text"
              placeholder="Número de guía INSAI / chofer / precinto de cisterna..."
              value={formVentaLeche.notas}
              onChange={e => setFormVentaLeche({ ...formVentaLeche, notas: e.target.value })}
              className="w-full p-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Liquidación Total en Tiempo Real */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-xs">Total Facturado (USD):</span>
              <span className="font-mono font-black text-xl text-emerald-400">
                ${(formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD).toFixed(2)} USD
              </span>
            </div>
            {monedasConfig.VES && formVentaLeche.monedaPago === "VES" && (
              <div className="flex items-center justify-between text-[11px] text-emerald-300">
                <span>Equivalente en Bolívares:</span>
                <span className="font-mono font-bold">
                  Bs. {((formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD) * tasaBCV).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {monedasConfig.COP && formVentaLeche.monedaPago === "COP" && (
              <div className="flex items-center justify-between text-[11px] text-sky-300">
                <span>Equivalente en Pesos:</span>
                <span className="font-mono font-bold">
                  COP ${Math.round((formVentaLeche.litrosVendidos * formVentaLeche.precioLitroUSD) * tasaCOP).toLocaleString()}
                </span>
              </div>
            )}
            {formVentaLeche.monedaPago !== "USD" && (
              <div className="pt-2 mt-1 border-t border-emerald-500/20 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-white/50 block">
                  Monto recibido en {formVentaLeche.monedaPago === "VES" ? "Bolívares" : "Pesos"} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formVentaLeche.montoRecibido}
                  placeholder={equivalenteDespachoLeche().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  onChange={e => setFormVentaLeche({ ...formVentaLeche, montoRecibido: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300/80 dark:border-white/15 text-sm font-mono text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-500 dark:text-white/40">
                  Vacío = equivalente a la tasa configurada. Escriba lo que pagó la planta si fue otra tasa.
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl btn-cyber-neon text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5"><IconTruck size={14} /> Confirmar Despacho & Descontar Stock</span>
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
