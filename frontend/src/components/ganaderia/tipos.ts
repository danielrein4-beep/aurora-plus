/** Tipos compartidos por las pantallas y modales de Ganadería. */

/** Monedas que la finca tiene activas para mostrar montos (USD siempre). */
export interface MonedasConfig {
  USD: boolean;
  VES: boolean;
  COP: boolean;
}

/** Muestra un aviso al usuario en la barra de notificaciones de Ganadería. */
export type Notificar = (msg: string) => void;
