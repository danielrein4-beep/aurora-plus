/**
 * Formato único de Ganadería: números al estilo venezolano (1.234,56), fechas dd/mm/aaaa
 * y conversión de lo que el usuario escribe en los campos numéricos.
 */

const formatos = new Map<number, Intl.NumberFormat>();

function formateador(decimales: number) {
  let f = formatos.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat("es-VE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    formatos.set(decimales, f);
  }
  return f;
}

/** 1234.5 -> "1.234,50" (con 2 decimales). Vacío o inválido -> "—". */
export function num(valor: number | string | null | undefined, decimales = 0): string {
  const n = typeof valor === "string" ? Number(valor.replace(",", ".")) : valor;
  if (n == null || !Number.isFinite(n)) return "—";
  return formateador(decimales).format(n);
}

export const usd = (v: number | null | undefined) => `$${num(v ?? 0, 2)}`;
export const bs = (v: number | null | undefined) => `Bs. ${num(v ?? 0, 2)}`;
export const cop = (v: number | null | undefined) => `COP ${num(v ?? 0, 0)}`;
export const kg = (v: number | null | undefined, decimales = 0) => (v == null ? "—" : `${num(v, decimales)} kg`);
export const litros = (v: number | null | undefined, decimales = 1) => (v == null ? "—" : `${num(v, decimales)} L`);

/** "2026-09-12" (o con hora) -> "12/09/2026". Vacío -> "—". */
export function verFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

const TURNOS: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", DOBLE: "Doble" };
export const verTurno = (t: string | null | undefined) => (t ? TURNOS[t] ?? t : "—");

/**
 * Lo escrito en un campo numérico: acepta coma decimal; vacío -> undefined
 * (así no se guarda un 0 inventado cuando el dato no se conoce).
 */
export function aNumero(valor: string | number | null | undefined): number | undefined {
  if (valor == null) return undefined;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : undefined;
  const limpio = valor.trim().replace(",", ".");
  if (limpio === "") return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

/** Peso vivo de una unidad ganadera (UG): 450 kg. */
export const KG_POR_UG = 450;

export type TonoAviso = "exito" | "aviso" | "error";

/**
 * Tono de un aviso según su texto: los errores en rojo, las validaciones del formulario en
 * ámbar y el resto como éxito (verde). Evita que un "No se pudo…" salga con check verde.
 */
export function tonoAviso(mensaje: string): TonoAviso {
  const m = mensaje.trim().toLowerCase();
  if (/^(no se pudo|error|no hay |stock insuficiente)|fall[óo]|rechaz|inválid|revisa tu conexión|revise la conexión/.test(m)) return "error";
  if (/^(debe|debes|indique|indica|selecciona|seleccione|ingrese|ingresa|el monto|la cantidad|ningún|no se ingresaron|demasiados)|¡atención!/.test(m)) return "aviso";
  return "exito";
}
