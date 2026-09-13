import { useEffect, useRef } from "react";

// Un lector láser envía cada carácter del código en unos pocos milisegundos —
// un humano tecleando a mano deja típicamente >100-150ms entre tecla y tecla.
// Si el hueco entre dos teclas supera este umbral, se descarta el buffer
// acumulado: lo que sigue es tecleo humano nuevo, no la cola de un escaneo.
const INTERVALO_MAX_ENTRE_TECLAS_MS = 50;

// Por debajo de esto es más probable un Enter suelto en medio de tecleo
// normal que un código de barras real (los más cortos, EAN-8, ya tienen 8).
const LARGO_MINIMO_CODIGO = 6;

export interface CodigoBarrasPesado {
  prefijo: string;
  plu: string; // código interno del producto (para cruzar contra el SKU/código de parte del catálogo)
  pesoKg: number;
}

/**
 * Decodifica el formato interno de "código con peso incorporado" que usan las
 * balanzas de charcutería/víveres: prefijo 20-29 (2 dígitos, estándar de la
 * industria para códigos internos "no GS1") + PLU de 5 dígitos + peso en
 * gramos de 5 dígitos + dígito verificador = 13 dígitos en total. Si el
 * código no calza con ese patrón, devuelve null — es un código normal
 * (EAN-13/UPC de fábrica), no uno de balanza.
 */
export function decodificarCodigoPesado(codigo: string): CodigoBarrasPesado | null {
  if (!/^\d{13}$/.test(codigo)) return null;
  const prefijoNum = Number(codigo.slice(0, 2));
  if (prefijoNum < 20 || prefijoNum > 29) return null;
  const plu = codigo.slice(2, 7);
  const pesoGramos = Number(codigo.slice(7, 12));
  if (!Number.isFinite(pesoGramos) || pesoGramos <= 0) return null;
  return { prefijo: codigo.slice(0, 2), plu, pesoKg: pesoGramos / 1000 };
}

/**
 * Hook "zero-click" para el POS: escucha el teclado a nivel de documento, sin
 * importar dónde esté el foco — el cajero no necesita clickear el buscador
 * antes de escanear. Distingue un lector de un humano por la VELOCIDAD entre
 * teclas (ver INTERVALO_MAX_ENTRE_TECLAS_MS), no por dónde está el cursor.
 *
 * onScan recibe el código crudo tal como llegó; decodificarCodigoPesado
 * arriba se usa aparte para saber si además trae un peso incorporado.
 */
export function useBarcodeScanner(onScan: (codigo: string) => void, activo: boolean = true) {
  const bufferRef = useRef("");
  const ultimaTeclaRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan; // evita reenganchar el listener en cada render por un onScan nuevo

  useEffect(() => {
    if (!activo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const ahora = Date.now();
      const transcurrido = ahora - ultimaTeclaRef.current;
      ultimaTeclaRef.current = ahora;

      if (transcurrido > INTERVALO_MAX_ENTRE_TECLAS_MS && bufferRef.current.length > 0) {
        // Demasiado lento para ser el lector — es tecleo humano nuevo, se descarta lo anterior.
        bufferRef.current = "";
      }

      if (e.key === "Enter") {
        const codigo = bufferRef.current;
        bufferRef.current = "";
        if (codigo.length >= LARGO_MINIMO_CODIGO && /^\d+$/.test(codigo)) {
          onScanRef.current(codigo);
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        bufferRef.current += e.key;
      } else if (e.key.length === 1) {
        // Cualquier otro carácter imprimible invalida el buffer — los códigos
        // de barra son numéricos, así que esto es tecleo humano normal.
        bufferRef.current = "";
      }
    };

    // Captura (tercer argumento true) para ver la tecla ANTES que cualquier
    // input enfocado, sin por eso bloquear el tecleo normal de ese input.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [activo]);
}
