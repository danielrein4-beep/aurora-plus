/** Tipos compartidos por las pantallas y modales de Ganadería. */

/** Monedas que la finca tiene activas para mostrar montos (USD siempre). */
export interface MonedasConfig {
  USD: boolean;
  VES: boolean;
  COP: boolean;
}

/** Muestra un aviso al usuario en la barra de notificaciones de Ganadería. */
export type Notificar = (msg: string) => void;

/** Secciones del menú lateral de Ganadería. */
export type TabGanaderia =
  | "resumen" | "potreros" | "inventario" | "engorde" | "sociedades"
  | "sanidad" | "eventos" | "produccion" | "reportes" | "personal" | "auditoria";

export type SubPotreros = "mapa" | "lista";
export type SubInventario = "matriz" | "fichas" | "distribucion";
export type SubSanidad = "individual" | "lotes";
