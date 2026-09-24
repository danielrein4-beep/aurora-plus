import type { jsPDF } from "jspdf";

/**
 * Piezas de dibujo compartidas por los informes PDF del super-admin (reporte
 * por enfermedad, informe de vertical): misma cabecera, tarjetas, gráficas,
 * tablas paginadas y pie, para que todos se lean como una misma familia.
 * Hoja carta horizontal, unidades en mm.
 */

export type RGB = [number, number, number];

export const TINTA: RGB = [15, 23, 42];
export const GRIS: RGB = [100, 116, 139];
export const GRIS_CLARO: RGB = [203, 213, 225];
export const CIELO: RGB = [14, 165, 233];
export const ESMERALDA: RGB = [16, 185, 129];
export const VIOLETA: RGB = [168, 85, 247];
export const AMBAR: RGB = [245, 158, 11];
export const ROJO: RGB = [239, 68, 68];

export const MARGEN = 14;

/**
 * Colores con significado (los mismos de utils/coloresSignificado.ts): verde = dinero,
 * violeta = operaciones y cantidades, azul = negocios y personas, rojo/ámbar = alertas.
 * El color de cada vertical queda solo para su cabecera.
 */
export const DINERO: RGB = [63, 158, 120];
export const OPERACIONES: RGB = [126, 107, 196];
export const PERSONAS: RGB = [79, 124, 172];

export function hexARgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Banda de color superior con título, subtítulo y detalle. Devuelve la Y donde empieza el contenido. */
export function encabezado(doc: jsPDF, titulo: string, subtitulo: string, detalle: string, color: RGB = CIELO): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
  doc.rect(0, 0, W, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(recortar(doc, titulo, W - 2 * MARGEN), MARGEN, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(recortar(doc, subtitulo, W - 2 * MARGEN), MARGEN, 17);
  doc.text(recortar(doc, detalle, W - 2 * MARGEN), MARGEN, 22);
  return 32;
}

export function pie(doc: jsPDF, texto: string) {
  const H = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(texto, MARGEN, H - 8);
}

export function numerarPaginas(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${total}`, W - MARGEN, H - 8, { align: "right" });
  }
}

export interface TarjetaPdf { label: string; val: string; color: RGB; nota?: string }

/** Fila de tarjetas con acento de color a la izquierda. Devuelve la Y bajo las tarjetas. */
export function tarjetas(doc: jsPDF, y0: number, lista: TarjetaPdf[]): number {
  const W = doc.internal.pageSize.getWidth();
  const gap = 5;
  const cardW = (W - 2 * MARGEN - (lista.length - 1) * gap) / lista.length;
  lista.forEach((t, i) => {
    const x = MARGEN + i * (cardW + gap);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y0, cardW, 20, 2, 2, "F");
    doc.setFillColor(...t.color);
    doc.rect(x, y0 + 2, 1.2, 16, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(recortar(doc, t.label, cardW - 7), x + 5, y0 + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(lista.length > 5 ? 13 : 15);
    doc.setTextColor(...t.color);
    doc.text(recortar(doc, t.val, cardW - 7), x + 5, y0 + 14);
    if (t.nota) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...GRIS);
      doc.text(recortar(doc, t.nota, cardW - 7), x + 5, y0 + 18.2);
    }
  });
  return y0 + 20;
}

export function tituloSeccion(doc: jsPDF, texto: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TINTA);
  doc.text(texto, x, y);
}

/**
 * Barras verticales por período. Con `anterior`, dibuja dos barras por grupo
 * (anterior en gris, actual en color). Los valores del actual se rotulan arriba.
 */
export function barrasMensuales(
  doc: jsPDF, actual: number[], anterior: number[] | null, x: number, y: number, w: number, h: number,
  color: RGB = CIELO, etiquetas: string[], formato: (v: number) => string = (v) => String(Math.round(v * 10) / 10),
) {
  const max = Math.max(1, ...actual, ...(anterior ?? []));
  const paso = escalaBonita(max);
  const tope = Math.ceil(max / paso) * paso;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRIS);
  for (let v = 0; v <= tope; v += paso) {
    const gy = y + h - (v / tope) * h;
    doc.line(x, gy, x + w, gy);
    doc.text(formato(v), x - 2, gy + 1, { align: "right" });
  }

  const n = actual.length;
  const grupo = w / n;
  const anchoBarra = anterior ? grupo * 0.32 : grupo * 0.55;
  for (let i = 0; i < n; i++) {
    const gx = x + i * grupo + grupo / 2;
    if (anterior) {
      barra(doc, gx - anchoBarra - 0.4, y, h, anchoBarra, anterior[i] / tope, GRIS_CLARO);
      barra(doc, gx + 0.4, y, h, anchoBarra, actual[i] / tope, color);
    } else {
      barra(doc, gx - anchoBarra / 2, y, h, anchoBarra, actual[i] / tope, color);
    }
    if (actual[i] > 0) {
      doc.setFontSize(5.8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      const bx = anterior ? gx + 0.4 + anchoBarra / 2 : gx;
      doc.text(formato(actual[i]), bx, y + h - (actual[i] / tope) * h - 1.2, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(n > 14 ? 5.5 : 7);
    doc.setTextColor(71, 85, 105);
    doc.text(etiquetas[i] ?? "", gx, y + h + 4.5, { align: "center" });
  }
}

function barra(doc: jsPDF, x: number, y: number, h: number, w: number, fraccion: number, color: RGB) {
  if (!(fraccion > 0)) return;
  const alto = Math.max(0.6, fraccion * h);
  doc.setFillColor(...color);
  doc.roundedRect(x, y + h - alto, w, alto, 0.6, 0.6, "F");
}

function escalaBonita(max: number): number {
  const bruto = max / 5;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / potencia;
  return Math.max(bruto < 1 ? 0.1 : 1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * potencia);
}

/** Ranking con barras horizontales. Devuelve la Y final. */
export function barrasHorizontales(
  doc: jsPDF, filas: { etiqueta: string; valor: number; texto?: string }[], x: number, y: number, w: number,
  color: RGB = OPERACIONES, maxFilas = 8,
): number {
  if (filas.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text("Sin datos en el período.", x, y + 3);
    return y + 6;
  }
  const max = Math.max(1, ...filas.map((f) => f.valor));
  for (const f of filas.slice(0, maxFilas)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(recortar(doc, f.etiqueta, w * 0.62), x, y + 3);
    doc.setFont("helvetica", "bold");
    doc.text(f.texto ?? String(f.valor), x + w, y + 3, { align: "right" });
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y + 4.4, w, 2, 1, 1, "F");
    if (f.valor > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(x, y + 4.4, Math.max(1.2, (w * f.valor) / max), 2, 1, 1, "F");
    }
    y += 9;
  }
  return y;
}

export interface ColumnaPdf { titulo: string; ancho: number; alinear?: "right" | "center" }
export interface FilaPdf { celdas: string[]; negrita?: number[]; colores?: Record<number, RGB>; resaltar?: boolean }

/**
 * Tabla con cabecera oscura, filas cebra y salto de página automático
 * (`nuevaPagina` agrega la hoja y devuelve la Y donde empezar). La última
 * columna con ancho 0 toma el espacio que sobra.
 */
export function tabla(doc: jsPDF, columnas: ColumnaPdf[], filas: FilaPdf[], yInicio: number, nuevaPagina: () => number): number {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const anchoTotal = W - 2 * MARGEN;
  const fijo = columnas.reduce((s, c) => s + c.ancho, 0);
  const cols = columnas.map((c) => ({ ...c, ancho: c.ancho || Math.max(10, anchoTotal - fijo) }));
  const alto = 7;

  const cabecera = (y: number) => {
    doc.setFillColor(...TINTA);
    doc.roundedRect(MARGEN, y, anchoTotal, alto, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.setTextColor(255, 255, 255);
    let cx = MARGEN;
    for (const c of cols) {
      texto(doc, recortar(doc, c.titulo, c.ancho - 2), cx, y + 4.6, c.ancho, c.alinear);
      cx += c.ancho;
    }
    return y + alto + 1;
  };

  let y = cabecera(yInicio);
  filas.forEach((f, i) => {
    if (y + alto > H - 16) y = cabecera(nuevaPagina());
    if (f.resaltar) doc.setFillColor(254, 242, 242);
    else if (i % 2 === 0) doc.setFillColor(248, 250, 252);
    else doc.setFillColor(255, 255, 255);
    doc.rect(MARGEN, y, anchoTotal, alto, "F");
    let cx = MARGEN;
    f.celdas.forEach((v, j) => {
      const c = cols[j];
      doc.setFont("helvetica", f.negrita?.includes(j) ? "bold" : "normal");
      doc.setFontSize(7);
      doc.setTextColor(...(f.colores?.[j] ?? ([30, 41, 59] as RGB)));
      texto(doc, recortar(doc, v, c.ancho - 3), cx, y + 4.7, c.ancho, c.alinear);
      cx += c.ancho;
    });
    y += alto;
  });
  return y;
}

export function texto(doc: jsPDF, valor: string, x: number, y: number, ancho: number, alinear?: "right" | "center") {
  if (alinear === "right") doc.text(valor, x + ancho - 1.5, y, { align: "right" });
  else if (alinear === "center") doc.text(valor, x + ancho / 2, y, { align: "center" });
  else doc.text(valor, x + 1.5, y);
}

export function recortar(doc: jsPDF, valor: string, ancho: number): string {
  if (doc.getTextWidth(valor) <= ancho) return valor;
  let v = valor;
  while (v.length > 1 && doc.getTextWidth(v + "…") > ancho) v = v.slice(0, -1);
  return v + "…";
}

/** Viñetas de texto con punto de color, con salto de línea. Devuelve la Y final. */
export function vinetas(doc: jsPDF, items: { texto: string; color: RGB }[], x: number, y: number, w: number): number {
  for (const it of items) {
    doc.setFillColor(...it.color);
    doc.circle(x + 1.2, y + 1.3, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const lineas = doc.splitTextToSize(it.texto, w - 5);
    doc.text(lineas, x + 4, y + 2.3);
    y += lineas.length * 3.8 + 3.5;
  }
  return y;
}

/** Línea que explica qué significa cada color. */
export function leyendaColores(doc: jsPDF, x: number, y: number) {
  const items: [RGB, string][] = [[DINERO, "Dinero"], [OPERACIONES, "Operaciones y cantidades"], [PERSONAS, "Negocios y personas"], [ROJO, "Alertas"]];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text("COLORES:", x, y);
  x += doc.getTextWidth("COLORES:") + 4;
  doc.setFont("helvetica", "normal");
  for (const [c, t] of items) {
    doc.setFillColor(...c);
    doc.circle(x + 1.1, y - 1, 1.1, "F");
    doc.text(t, x + 3.5, y);
    x += doc.getTextWidth(t) + 10;
  }
}
