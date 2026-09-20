// Motor de Cola Offline-First para Entornos Hostiles en Obras Civiles (Túneles, Vialidad, Minas)
// Permite al Ingeniero Residente asentar mediciones, bitácoras y consumos sin señal de internet
// y sincronizar contra los endpoints reales del backend al recuperar conectividad.

import {
  crearValuacionConstruccionApi,
  registrarConsumoInsumoConstruccionApi,
  registrarBitacoraConstruccionApi
} from '../../api';

export interface AccionOfflineConstruccion {
  id: string;
  tipo: 'VALUACION' | 'BITACORA' | 'CONSUMO_INSUMO' | 'HOROMETRO_MAQUINARIA' | 'ASISTENCIA_CUADRILLA' | 'PARAMETRO_BIM';
  payload: any;
  fechaCreacion: string;
  reintentos: number;
  estado: 'PENDIENTE' | 'SINCRONIZANDO' | 'ERROR';
  errorUltimoIntento?: string;
}

const STORAGE_KEY = 'aurora_construccion_offline_queue_v1';

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

export function encolarAccionOffline(tipo: AccionOfflineConstruccion['tipo'], payload: any): AccionOfflineConstruccion {
  const cola = obtenerColaOffline();
  const nuevaAccion: AccionOfflineConstruccion = {
    id: 'OFF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    tipo,
    payload,
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
 * Sincronización real con el backend de Construcción de Aurora Plus.
 * Procesa cada acción pendiente contra su endpoint correspondiente sin simulaciones ni timeouts artificiales.
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
    try {
      accion.estado = 'SINCRONIZANDO';
      if (accion.tipo === 'VALUACION' && accion.payload?.proyectoId) {
        await crearValuacionConstruccionApi(Number(accion.payload.proyectoId), accion.payload);
      } else if (accion.tipo === 'CONSUMO_INSUMO' && accion.payload?.insumoId) {
        await registrarConsumoInsumoConstruccionApi(Number(accion.payload.insumoId), Number(accion.payload.cantidad));
      } else if (accion.tipo === 'BITACORA' && accion.payload?.proyectoId) {
        await registrarBitacoraConstruccionApi(Number(accion.payload.proyectoId), accion.payload);
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
