// Impresión térmica por estación de cocina (Web Serial) — cada zona
// (COCINA, PARRILLA, BAR...) se puede vincular a SU PROPIA impresora física,
// para que el chef de parrilla no tenga que leer una tablet ni depender de
// que alguien le imprima el pedido a mano.
//
// Web Serial exige un gesto real del usuario (clic) la PRIMERA vez que se
// autoriza un puerto — después de eso, el navegador recuerda el permiso y
// `navigator.serial.getPorts()` lo devuelve sin volver a preguntar, mientras
// sea el mismo origen (localhost:8445 / el dominio de producción). Por eso
// solo hace falta "vincular" una vez por estación, no en cada impresión.

export interface ImpresoraGuardada {
  estacion: string;
  vendorId: number;
  productId: number;
  etiqueta: string;
}

interface NavigatorSerial extends Navigator {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
    getPorts: () => Promise<SerialPortLike[]>;
  };
}
interface SerialPortLike {
  getInfo: () => { usbVendorId?: number; usbProductId?: number };
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}

const CLAVE_STORAGE = (tenantId: number) => `aurora_horeca_impresoras_${tenantId}`;

export function listarImpresoras(tenantId: number): ImpresoraGuardada[] {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE(tenantId));
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    return [];
  }
}

function guardarLista(tenantId: number, lista: ImpresoraGuardada[]) {
  try { localStorage.setItem(CLAVE_STORAGE(tenantId), JSON.stringify(lista)); } catch { /* localStorage lleno/bloqueado */ }
}

export function eliminarImpresora(tenantId: number, estacion: string) {
  guardarLista(tenantId, listarImpresoras(tenantId).filter((i) => i.estacion !== estacion));
}

function soportaWebSerial(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as NavigatorSerial).serial;
}

/**
 * Pide al usuario elegir el puerto de la impresora de ESTA estación (un
 * clic, una vez) y lo recuerda. Se debe llamar directo desde el handler de
 * un clic real — Web Serial rechaza requestPort() si no viene de un gesto
 * del usuario.
 */
export async function vincularImpresora(tenantId: number, estacion: string): Promise<ImpresoraGuardada> {
  const nav = navigator as NavigatorSerial;
  if (!nav.serial) throw new Error("Este navegador no soporta impresión térmica directa (Web Serial) — usa Chrome o Edge.");
  const puerto = await nav.serial.requestPort();
  const info = puerto.getInfo();
  if (info.usbVendorId == null || info.usbProductId == null) {
    throw new Error("No se pudo identificar la impresora seleccionada — intenta con otro puerto.");
  }
  const guardada: ImpresoraGuardada = { estacion, vendorId: info.usbVendorId, productId: info.usbProductId, etiqueta: `USB ${info.usbVendorId.toString(16)}:${info.usbProductId.toString(16)}` };
  guardarLista(tenantId, [...listarImpresoras(tenantId).filter((i) => i.estacion !== estacion), guardada]);
  try { await puerto.close(); } catch { /* puede que ni se haya abierto */ }
  return guardada;
}

/** Busca entre los puertos YA autorizados por el navegador uno que coincida con lo guardado para esta estación — sin volver a preguntar. */
async function resolverPuertoGuardado(tenantId: number, estacion: string): Promise<SerialPortLike | null> {
  const nav = navigator as NavigatorSerial;
  if (!nav.serial) return null;
  const guardada = listarImpresoras(tenantId).find((i) => i.estacion === estacion);
  if (!guardada) return null;
  const puertos = await nav.serial.getPorts();
  return puertos.find((p) => {
    const info = p.getInfo();
    return info.usbVendorId === guardada.vendorId && info.usbProductId === guardada.productId;
  }) || null;
}

// ESC/POS mínimo: inicializar, texto plano línea por línea, avance y corte.
// Suficiente para un chit de cocina (nombre del plato, mesa, notas) — no
// necesita logos ni códigos de barra como el ticket de cobro al cliente.
function construirTicketEscPos(lineas: string[]): Uint8Array {
  const ESC = 0x1b, GS = 0x1d;
  const partes: number[] = [ESC, 0x40]; // ESC @ — reset de la impresora
  const encoder = new TextEncoder();
  for (const linea of lineas) {
    partes.push(...encoder.encode(linea));
    partes.push(0x0a); // salto de línea
  }
  partes.push(0x0a, 0x0a, 0x0a);
  partes.push(GS, 0x56, 0x42, 0x00); // GS V 66 0 — corte parcial
  return new Uint8Array(partes);
}

export interface ItemParaImprimir {
  cantidad: number;
  nombrePlato: string;
  numeroMesa: number | null;
  mesero: string | null;
  notas: string | null;
}

/**
 * Imprime el chit de UNA estación con los platos pendientes de esa zona —
 * agrupados por mesa para que el cocinero vea de un vistazo qué va junto.
 * Si la estación no tiene impresora vinculada todavía, pide elegirla en el
 * momento (debe llamarse desde un clic real del usuario).
 */
export async function imprimirEnEstacion(tenantId: number, estacion: string, nombreLocal: string, items: ItemParaImprimir[]): Promise<void> {
  if (!soportaWebSerial()) {
    throw new Error("Este navegador no soporta impresión térmica directa (Web Serial) — usa Chrome o Edge.");
  }
  if (items.length === 0) {
    throw new Error("No hay platos pendientes en esta estación para imprimir.");
  }

  let puerto = await resolverPuertoGuardado(tenantId, estacion);
  if (!puerto) {
    await vincularImpresora(tenantId, estacion);
    puerto = await resolverPuertoGuardado(tenantId, estacion);
    if (!puerto) throw new Error("No se pudo conectar con la impresora recién vinculada — intenta de nuevo.");
  }

  const porMesa = new Map<string, ItemParaImprimir[]>();
  for (const it of items) {
    const clave = it.numeroMesa != null ? `Mesa ${it.numeroMesa}` : "Sin mesa";
    porMesa.set(clave, [...(porMesa.get(clave) || []), it]);
  }

  const lineas: string[] = [
    nombreLocal.toUpperCase(),
    `COCINA · ${estacion.replace(/_/g, " ")}`,
    new Date().toLocaleString("es-VE"),
    "--------------------------------",
  ];
  for (const [mesa, itemsMesa] of porMesa) {
    lineas.push(`${mesa}${itemsMesa[0].mesero ? ` (${itemsMesa[0].mesero})` : ""}`);
    for (const it of itemsMesa) {
      lineas.push(`  ${it.cantidad}x ${it.nombrePlato}`);
      if (it.notas) lineas.push(`    -> ${it.notas}`);
    }
    lineas.push("");
  }

  const bytes = construirTicketEscPos(lineas);
  await puerto.open({ baudRate: 9600 });
  const writer = puerto.writable!.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
    await puerto.close();
  }
}
