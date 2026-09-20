// Motor de Cola Offline-First para Entornos Hostiles en Obras Civiles (Túneles, Vialidad, Minas)
// Permite al Ingeniero Residente asentar mediciones, bitácoras y consumos sin señal de internet
// y sincronizar contra los endpoints reales del backend al recuperar conectividad con IdempotencyKey.

import {
  crearValuacionConstruccionApi,
  registrarConsumoInsumoConstruccionApi,
  registrarBitacoraConstruccionApi
} from '../../api';

export type TipoAccionConstruccion = 'VALUACION' | 'BITACORA' | 'CONSUMO_INSUMO';

export interface AccionOfflineConstruccion {
  id: string;
  idempotencyKey: string;
  tipo: TipoAccionConstruccion;
  payload: any;
  fechaCreacion: string;
  reintentos: number;
  estado: 'PENDIENTE' | 'SINCRONIZANDO' | 'ERROR';
  errorUltimoIntento?: string;
}

const STORAGE_KEY = 'aurora_construccion_offline_queue_v1';
const TIPOS_SOPORTADOS: readonly string[] = ['VALUACION', 'BITACORA', 'CONSUMO_INSUMO'];

export function obtenerColaOffline(): AccionOfflineConstruccion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error al leer cola offline de construcción:', e);
    return [];
  }
}

export function guardarColaOffline(cola: AccionOfflineConstruccion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cola));
  } catch (e) {
    console.error('Error al guardar cola offline de construcción:', e);
  }
}

export function encolarAccionOffline(tipo: TipoAccionConstruccion, payload: any): AccionOfflineConstruccion {
  // Rechazo explícito de tipos desconocidos
  if (!TIPOS_SOPORTADOS.includes(tipo)) {
    throw new Error(`Tipo de acción offline desconocido o no soportado: ${tipo}`);
  }

  const idempotencyKey = 'IK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9);
  const cola = obtenerColaOffline();
  const nuevaAccion: AccionOfflineConstruccion = {
    id: 'OFF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    idempotencyKey,
    tipo,
    payload: {
      ...payload,
      idempotencyKey
    },
    fechaCreacion: new Date().toISOString(),
    reintentos: 0,
    estado: 'PENDIENTE'
  };
  cola.push(nuevaAccion);
  guardarColaOffline(cola);
  return nuevaAccion;
}

export function contarPendientesOffline(): number {
  return obtenerColaOffline().filter(a => a.estado === 'PENDIENTE').length;
}

export function limpiarCompletadosOffline(): void {
  const cola = obtenerColaOffline().filter(a => a.estado !== 'PENDIENTE');
  guardarColaOffline(cola);
}

/**
 * Sincronización real e idempotente con el backend de Construcción de Aurora Plus.
 * Procesa cada acción pendiente enviando Idempotency-Key única para evitar duplicados en reintentos.
 */
export async function sincronizarColaOfflineConServidor(): Promise<{ sincronizados: number; errores: number }> {
  if (!navigator.onLine) {
    return { sincronizados: 0, errores: 0 };
  }

  const cola = obtenerColaOffline();
  const pendientes = cola.filter(a => a.estado === 'PENDIENTE');
  if (pendientes.length === 0) return { sincronizados: 0, errores: 0 };

  let sincronizados = 0;
  let errores = 0;

  for (const accion of pendientes) {
    // Rechazar explícitamente si por alguna razón llegó un tipo desconocido
    if (!TIPOS_SOPORTADOS.includes(accion.tipo)) {
      accion.estado = 'ERROR';
      accion.errorUltimoIntento = `Tipo de acción offline no soportado: ${accion.tipo}`;
      errores++;
      continue;
    }

    try {
      accion.estado = 'SINCRONIZANDO';
      const ik = accion.idempotencyKey || accion.payload?.idempotencyKey;
      if (accion.tipo === 'VALUACION' && accion.payload?.proyectoId) {
        await crearValuacionConstruccionApi(Number(accion.payload.proyectoId), accion.payload, ik);
      } else if (accion.tipo === 'CONSUMO_INSUMO' && accion.payload?.insumoId) {
        await registrarConsumoInsumoConstruccionApi(Number(accion.payload.insumoId), Number(accion.payload.cantidad), ik);
      } else if (accion.tipo === 'BITACORA' && accion.payload?.proyectoId) {
        await registrarBitacoraConstruccionApi(Number(accion.payload.proyectoId), accion.payload, ik);
      }
      sincronizados++;
      const index = cola.findIndex(c => c.id === accion.id);
      if (index !== -1) cola.splice(index, 1);
    } catch (err: any) {
      accion.estado = 'ERROR';
      accion.reintentos += 1;
      accion.errorUltimoIntento = err?.message || 'Error de sincronización con el servidor';
      errores++;
    }
  }

  guardarColaOffline(cola);
  return { sincronizados, errores };
}
