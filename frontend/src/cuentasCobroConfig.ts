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
  telefono: "0424-7643733",
  cedula: "V-26.407.131",
  titular: "DANIEL EDUARDO REINA PORRAS",
  tipoCuenta: "Cuenta Corriente / Pago Movil",
  binanceUsdt: "danielrein4@gmail.com (Binance Pay / Correo)",
  zelle: "danielrein4@gmail.com",
  instrucciones: "Realizar Pago Movil a la tasa oficial BCV del dia. Al transferir, reporta la referencia: verificamos el pago y activamos tu plan.",
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
