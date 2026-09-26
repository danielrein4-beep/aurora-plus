import React, { useEffect, useState } from "react";
import { obtenerTasaVigente, procesarCobro, type NuevoCobro, type TasaCambioResponse, type CobroConsulta } from "../../api";
import { Campo, claseInput, formatearMonto } from "./comun";

export type MetodoPago = NuevoCobro["metodoPago"];

export interface DatosPago {
  metodo: MetodoPago;
  monedaPago: "USD" | "VES";
  referencia: string;
}

export const PAGO_INICIAL: DatosPago = { metodo: "EFECTIVO", monedaPago: "USD", referencia: "" };

const METODOS: { v: MetodoPago; t: string }[] = [
  { v: "EFECTIVO", t: "Efectivo" },
  { v: "PAGO_MOVIL", t: "Pago móvil" },
  { v: "TRANSFERENCIA", t: "Transferencia" },
  { v: "PUNTO_VENTA", t: "Punto de venta" },
  { v: "ZELLE", t: "Zelle" },
  { v: "OTRO", t: "Otro" },
];

export const NOMBRE_METODO: Record<string, string> = Object.fromEntries(METODOS.map((m) => [m.v, m.t]));

/** Tasa USD→VES vigente del negocio. Null si no hay ninguna: nunca se inventa una. */
export function useTasaBs(): { tasa: TasaCambioResponse | null; cargando: boolean } {
  const [tasa, setTasa] = useState<TasaCambioResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let activo = true;
    obtenerTasaVigente("USD", "VES")
      .then((t) => activo && setTasa(t && Number(t.tasa) > 0 ? t : null))
      .catch(() => activo && setTasa(null))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);
  return { tasa, cargando };
}

export function FormularioPago({ monto, moneda, valor, onChange, tasa }: {
  monto: number; moneda: string; valor: DatosPago; onChange: (d: DatosPago) => void; tasa: TasaCambioResponse | null;
}) {
  const equivalenteBs = moneda === "USD" && tasa ? monto * Number(tasa.tasa) : null;
  const pideReferencia = valor.metodo !== "EFECTIVO";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Método de pago">
          <select className={claseInput} value={valor.metodo} onChange={(e) => onChange({ ...valor, metodo: e.target.value as MetodoPago })}>
            {METODOS.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
          </select>
        </Campo>
        <Campo label="Paga en">
          <select className={claseInput} value={valor.monedaPago} onChange={(e) => onChange({ ...valor, monedaPago: e.target.value as "USD" | "VES" })}>
            <option value="USD">Dólares</option>
            <option value="VES">Bolívares</option>
          </select>
        </Campo>
      </div>
      {pideReferencia && (
        <Campo label="Referencia">
          <input className={claseInput} value={valor.referencia} onChange={(e) => onChange({ ...valor, referencia: e.target.value })} placeholder="Últimos dígitos de la operación" />
        </Campo>
      )}
      <div className="rounded-xl bg-slate-50 dark:bg-white/5 px-3.5 py-2.5 text-sm flex items-center justify-between">
        <span className="text-slate-500 dark:text-white/50">A cobrar</span>
        <span className="text-right">
          <span className="font-bold text-slate-900 dark:text-white">{formatearMonto(monto, moneda)}</span>
          {valor.monedaPago === "VES" && moneda === "USD" && (
            <span className="block text-xs text-slate-500 dark:text-white/50">
              {equivalenteBs !== null
                ? `${formatearMonto(equivalenteBs, "VES")} a tasa ${Number(tasa!.tasa).toFixed(2)}`
                : "Sin tasa registrada: cobra en dólares o registra la tasa primero"}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function claveIdempotencia(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `estetica-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Registra el cobro en la caja de salud. La clave se genera una vez por intento, así que un doble
 * clic o un reintento de red nunca duplica el ingreso.
 */
export async function cobrar(params: {
  pacienteId?: number; concepto: string; monto: number; moneda: string; pago: DatosPago; tasa: TasaCambioResponse | null; clave?: string;
}): Promise<CobroConsulta> {
  const { pacienteId, concepto, monto, moneda, pago, tasa } = params;
  if (!(monto > 0)) throw new Error("El monto a cobrar debe ser mayor a cero.");
  let montoRecibido = monto;
  if (pago.monedaPago !== moneda) {
    if (moneda === "USD" && pago.monedaPago === "VES") {
      if (!tasa) throw new Error("No hay tasa del dólar registrada. Cobra en dólares o registra la tasa primero.");
      montoRecibido = Math.round(monto * Number(tasa.tasa) * 100) / 100;
    } else {
      throw new Error("Combinación de monedas no soportada.");
    }
  }
  return procesarCobro(
    {
      pacienteId,
      concepto,
      montoTotal: monto,
      monedaCobrada: moneda,
      montoRecibido,
      monedaPago: pago.monedaPago,
      metodoPago: pago.metodo,
      referenciaPago: pago.referencia.trim() || undefined,
    },
    params.clave ?? claveIdempotencia(),
  );
}

export { claveIdempotencia };
