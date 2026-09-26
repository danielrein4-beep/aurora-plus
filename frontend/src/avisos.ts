// Avisos de la app (reemplazan a window.alert, que bloquea la pantalla, se ve distinto en cada
// navegador y no se puede diseñar). Cualquier pantalla llama avisar(...) y <AvisosGlobales />,
// montado una sola vez en App.tsx, los muestra abajo y los cierra solos.

export type TipoAviso = "exito" | "error" | "info";

export interface Aviso {
  id: number;
  mensaje: string;
  tipo: TipoAviso;
}

export const EVENTO_AVISO = "aurora-aviso";

let siguienteId = 1;

/** Si no se indica el tipo, se deduce del texto: un "no se pudo…" o "debe…" se muestra como error. */
function deducirTipo(mensaje: string): TipoAviso {
  if (/no se pudo|error|fall[óo]|inv[áa]lid|debe|obligatori|no hay|seleccion|ingres[ae]|complet[ae]|no puede|excede|insuficiente/i.test(mensaje)) {
    return "error";
  }
  if (/guardad|registrad|cread|actualizad|enviad|listo|exitos|copiad|aplicad/i.test(mensaje)) return "exito";
  return "info";
}

export function avisar(mensaje: unknown, tipo?: TipoAviso): void {
  const texto = String(mensaje ?? "");
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Aviso>(EVENTO_AVISO, {
    detail: { id: siguienteId++, mensaje: texto, tipo: tipo ?? deducirTipo(texto) },
  }));
}
