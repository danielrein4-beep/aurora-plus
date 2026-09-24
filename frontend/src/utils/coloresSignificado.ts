/**
 * Colores con significado del super-admin (pantalla y PDF). Cada color dice
 * QUÉ se está midiendo, siempre igual en todas las verticales:
 *
 * - dinero:      ventas, ingresos, cobros, cartera.
 * - operaciones: cantidades de actividad (consultas, comandas, ordeños, litros, platos, animales).
 * - personas:    negocios y personas (usuarios, pacientes, negocios nuevos o en uso). Único azul.
 * - alerta/atencion: solo para problemas (en riesgo, suspendidos) y avisos (por vencer, por cobrar).
 *
 * El color propio de cada vertical se usa solo en su identidad (cabecera, ícono, pestañas).
 */
export const COLOR = {
  dinero: "#3F9E78",
  operaciones: "#7E6BC4",
  personas: "#4F7CAC",
  alerta: "#E05252",
  atencion: "#D99A2B",
  neutro: "#94A3B8",
} as const;

/** Clases de texto de Tailwind para los mismos colores (valores fijos para que Tailwind las genere). */
export const TEXTO = {
  dinero: "text-[#3F9E78]",
  operaciones: "text-[#7E6BC4]",
  personas: "text-[#4F7CAC]",
  alerta: "text-[#E05252]",
  atencion: "text-[#D99A2B]",
} as const;

/** Qué color le toca a una métrica según lo que mide. */
export function colorDeMetrica(m: { clave: string; unidadSuma: string | null }): string {
  if (m.unidadSuma === "USD") return COLOR.dinero;
  if (["pacientes", "usuarios"].includes(m.clave)) return COLOR.personas;
  return COLOR.operaciones;
}
