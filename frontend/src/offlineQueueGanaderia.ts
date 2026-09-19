// Cola de persistencia offline para operaciones de campo en Ganaderia
// Permite registrar pesajes en manga, rotaciones de potrero, ordeno y vacunas sin cobertura 3G/4G/WiFi.

const CLAVE_STORAGE = (tenantId: number) => `aurora_ganaderia_cola_offline_${tenantId}`;

export type TipoAccionGanaderia = 
  | "registrar_peso"
  | "rotar_potrero"
  | "registrar_ordeno"
  | "aplicar_vacuna";

export interface AccionPendientePeso {
  tipo: "registrar_peso";
  id: string;
  claveIdempotencia: string;
  descripcion: string;
  creadaEn: number;
  payload: {
    animalId: number;
    peso: number;
    nombreAnimal?: string;
    arete?: string;
  };
}

export interface AccionPendienteRotacion {
  tipo: "rotar_potrero";
  id: string;
  claveIdempotencia: string;
  descripcion: string;
  creadaEn: number;
  payload: {
    potreroOrigenId: number;
    potreroDestinoId: number;
    nombreOrigen?: string;
    nombreDestino?: string;
    animalIds?: number[];
  };
}

export interface AccionPendienteOrdeno {
  tipo: "registrar_ordeno";
  id: string;
  claveIdempotencia: string;
  descripcion: string;
  creadaEn: number;
  payload: {
    animalId: number;
    litros: number;
    sesion: string;
    arete?: string;
  };
}

export interface AccionPendienteVacuna {
  tipo: "aplicar_vacuna";
  id: string;
  claveIdempotencia: string;
  descripcion: string;
  creadaEn: number;
  payload: {
    vacunaId: number;
    animalId?: number;
    loteId?: number;
    dosis?: string;
    nombreVacuna?: string;
  };
}

export type AccionPendienteGanaderia = 
  | AccionPendientePeso 
  | AccionPendienteRotacion 
  | AccionPendienteOrdeno 
  | AccionPendienteVacuna;

export function generarClaveIdempotencia(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `offline-gan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function esFalloDeConexion(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }
  const status = (e as { status?: number } | undefined)?.status;
  return status === undefined || status === 0 || status === 502 || status === 503 || status === 504;
}

export function leerColaGanaderia(tenantId: number): AccionPendienteGanaderia[] {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE(tenantId));
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    return [];
  }
}

export function guardarColaGanaderia(tenantId: number, cola: AccionPendienteGanaderia[]) {
  try {
    localStorage.setItem(CLAVE_STORAGE(tenantId), JSON.stringify(cola));
  } catch {
    // Almacenamiento lleno o bloqueado
  }
}

export function encolarAccionGanaderia(tenantId: number, accion: AccionPendienteGanaderia) {
  const cola = leerColaGanaderia(tenantId);
  cola.push(accion);
  guardarColaGanaderia(tenantId, cola);
}

export function listarPendientesGanaderia(tenantId: number): AccionPendienteGanaderia[] {
  return leerColaGanaderia(tenantId);
}

export function contarPendientesGanaderia(tenantId: number): number {
  return leerColaGanaderia(tenantId).length;
}

export function eliminarAccionGanaderia(tenantId: number, id: string) {
  const cola = leerColaGanaderia(tenantId).filter((a) => a.id !== id);
  guardarColaGanaderia(tenantId, cola);
}

export interface ResultadoSincronizacionGanaderia {
  sincronizadas: AccionPendienteGanaderia[];
  fallidasDefinitivo: { accion: AccionPendienteGanaderia; mensaje: string }[];
  quedanPendientes: number;
}

export async function procesarColaGanaderia(
  tenantId: number,
  ejecutores: {
    registrar_peso: (a: AccionPendientePeso) => Promise<unknown>;
    rotar_potrero: (a: AccionPendienteRotacion) => Promise<unknown>;
    registrar_ordeno: (a: AccionPendienteOrdeno) => Promise<unknown>;
    aplicar_vacuna: (a: AccionPendienteVacuna) => Promise<unknown>;
  },
): Promise<ResultadoSincronizacionGanaderia> {
  const cola = leerColaGanaderia(tenantId);
  const sincronizadas: AccionPendienteGanaderia[] = [];
  const fallidasDefinitivo: { accion: AccionPendienteGanaderia; mensaje: string }[] = [];

  for (const accion of cola) {
    try {
      if (accion.tipo === "registrar_peso") {
        await ejecutores.registrar_peso(accion);
      } else if (accion.tipo === "rotar_potrero") {
        await ejecutores.rotar_potrero(accion);
      } else if (accion.tipo === "registrar_ordeno") {
        await ejecutores.registrar_ordeno(accion);
      } else if (accion.tipo === "aplicar_vacuna") {
        await ejecutores.aplicar_vacuna(accion);
      }
      eliminarAccionGanaderia(tenantId, accion.id);
      sincronizadas.push(accion);
    } catch (e: unknown) {
      if (esFalloDeConexion(e)) {
        // Red indisponible en campo: se detiene el lote para reintentar luego
        break;
      }
      const mensaje = e instanceof Error ? e.message : "Error al procesar registro en servidor";
      eliminarAccionGanaderia(tenantId, accion.id);
      fallidasDefinitivo.push({ accion, mensaje });
    }
  }

  return {
    sincronizadas,
    fallidasDefinitivo,
    quedanPendientes: leerColaGanaderia(tenantId).length,
  };
}
