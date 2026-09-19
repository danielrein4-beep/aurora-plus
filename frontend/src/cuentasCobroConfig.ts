export interface SaasCuentasCobroConfig {
  banco: string;
  telefono: string;
  cedula: string;
  titular: string;
  tipoCuenta: string;
  binanceUsdt: string;
  zelle: string;
  instrucciones: string;
}

export const DEFAULT_SAAS_CUENTAS_COBRO: SaasCuentasCobroConfig = {
  banco: "Banesco (0134)",
  telefono: "0414-1234567",
  cedula: "V-28.123.456",
  titular: "Administrador Aurora Plus",
  tipoCuenta: "Corriente / Pago Movil",
  binanceUsdt: "TQ3j8K9vP2sL... (TRC-20)",
  zelle: "pagos@auroraplus.com",
  instrucciones: "Realizar Pago Movil a la tasa oficial BCV del dia. Al transferir, reportar la referencia bancaria para activacion inmediata.",
};

const STORAGE_KEY = "aurora_saas_cuentas_pago";

export function obtenerCuentasCobro(): SaasCuentasCobroConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SAAS_CUENTAS_COBRO, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SAAS_CUENTAS_COBRO;
}

export function guardarCuentasCobro(cfg: SaasCuentasCobroConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}
