// Cola de sobrevivencia ante cortes de conexión — Horeca, Salón & Mesas.
//
// Alcance a propósito, NO es un "modo offline" completo: cubre únicamente
// las dos acciones más frecuentes durante un corte de wifi en plena
// operación (agregar un plato a una mesa YA abierta, y cobrar/cerrar esa
// mesa), reutilizando la infraestructura de "claveIdempotencia" que el
// backend ya tenía pensada para esto (ver comentarios en HorecaService:
// "el POS del mesón la genera ANTES de saber si hay conexión"). Abrir una
// mesa NUEVA o anular siguen requiriendo conexión — se decidió así porque
// esas acciones requieren resolver un ID real del servidor (o, en el caso
// de anular, confirmación en vivo) antes de poder seguir con seguridad, y
// forzarlo sin conexión abre más problemas (mesas duplicadas, choques de
// numeración) de los que resuelve.
//
// Cada acción encolada guarda su propia claveIdempotencia generada ANTES
// del primer intento — si se reintenta 1 o 50 veces, el backend la
// reconoce y devuelve el mismo resultado ya procesado en vez de duplicar
// la venta o el descuento de inventario.

const CLAVE_STORAGE = (tenantId: number) => `aurora_horeca_cola_offline_${tenantId}`;

export type TipoAccionPendiente = "agregar_item" | "cobrar_comanda";

export interface AccionPendienteAgregarItem {
  tipo: "agregar_item";
  id: string;
  claveIdempotencia: string;
  comandaId: number;
  descripcion: string;
  creadaEn: number;
  payload: {
    escandalloId?: number; articuloId?: number; fastBarTragoId?: number;
    nombrePlato?: string; estacionCocina?: string; cantidad: number; precioUnitario?: number; notas?: string;
  };
}

export interface AccionPendienteCobrarComanda {
  tipo: "cobrar_comanda";
  id: string;
  claveIdempotencia: string;
  comandaId: number;
  descripcion: string;
  creadaEn: number;
  payload: {
    pagos: { metodoPago: string; moneda: string; monto: number }[];
    monedaVuelto?: string;
  };
}

export type AccionPendiente = AccionPendienteAgregarItem | AccionPendienteCobrarComanda;

function leerCola(tenantId: number): AccionPendiente[] {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE(tenantId));
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    return [];
  }
}

function guardarCola(tenantId: number, cola: AccionPendiente[]) {
  try {
    localStorage.setItem(CLAVE_STORAGE(tenantId), JSON.stringify(cola));
  } catch {
    // localStorage lleno o bloqueado (modo privado) — la acción ya se
    // aplicó de forma optimista en memoria; en el peor caso, si se recarga
    // la página antes de reconectar, se pierde la cola (no la venta en sí,
    // que el mesero puede volver a intentar).
  }
}

/**
 * Un fallo "de conexión" (justifica encolar y reintentar solo) es tanto un
 * fetch que nunca llegó a ningún servidor (status undefined, ver api.ts)
 * como un 502/503/504 — el proxy/servidor de por medio SÍ respondió, pero
 * diciendo "no puedo comunicarme con el backend/está caído", que para el
 * mesero es exactamente lo mismo que "no hay conexión". Cualquier otro
 * status (400, 401, 409, etc.) es un rechazo real del negocio: reintentarlo
 * solo no lo va a arreglar.
 */
export function esFalloDeConexion(e: unknown): boolean {
  const status = (e as { status?: number } | undefined)?.status;
  return status === undefined || status === 502 || status === 503 || status === 504;
}

export function generarClaveIdempotencia(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function encolarAccion(tenantId: number, accion: AccionPendiente) {
  const cola = leerCola(tenantId);
  cola.push(accion);
  guardarCola(tenantId, cola);
}

export function listarPendientes(tenantId: number): AccionPendiente[] {
  return leerCola(tenantId);
}

function eliminarAccion(tenantId: number, id: string) {
  guardarCola(tenantId, leerCola(tenantId).filter((a) => a.id !== id));
}

export interface ResultadoSincronizacion {
  sincronizadas: AccionPendiente[];
  fallidasDefinitivo: { accion: AccionPendiente; mensaje: string }[];
  quedanPendientes: number;
}

/**
 * Procesa la cola en orden (FIFO). Se detiene apenas encuentra un fallo de
 * RED (seguimos sin conexión: no tiene caso seguir intentando las
 * siguientes ahora). Un fallo de NEGOCIO (el servidor respondió pero
 * rechazó, ej. "la comanda ya fue cerrada por otro dispositivo") saca esa
 * acción de la cola — reintentarla eternamente no la va a arreglar sola —
 * y se reporta para que el dueño la revise, pero se sigue con las demás.
 */
export async function procesarCola(
  tenantId: number,
  ejecutores: {
    agregar_item: (a: AccionPendienteAgregarItem) => Promise<unknown>;
    cobrar_comanda: (a: AccionPendienteCobrarComanda) => Promise<unknown>;
  },
): Promise<ResultadoSincronizacion> {
  const cola = leerCola(tenantId);
  const sincronizadas: AccionPendiente[] = [];
  const fallidasDefinitivo: { accion: AccionPendiente; mensaje: string }[] = [];

  for (const accion of cola) {
    try {
      if (accion.tipo === "agregar_item") await ejecutores.agregar_item(accion);
      else await ejecutores.cobrar_comanda(accion);
      eliminarAccion(tenantId, accion.id);
      sincronizadas.push(accion);
    } catch (e: unknown) {
      if (esFalloDeConexion(e)) {
        // Seguimos sin conexión — se detiene acá, lo que quede en la cola
        // (incluida esta acción) se reintenta en el próximo ciclo.
        break;
      }
      // El servidor respondió y rechazó: no es un problema de conexión.
      const mensaje = e instanceof Error ? e.message : "No se pudo sincronizar";
      eliminarAccion(tenantId, accion.id);
      fallidasDefinitivo.push({ accion, mensaje });
    }
  }

  return { sincronizadas, fallidasDefinitivo, quedanPendientes: leerCola(tenantId).length };
}
