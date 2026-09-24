import { jsPDF } from "jspdf";
import { construirDocCanalEndemico, type PuntoCanalPdf } from "./pdfReports";
import type { CanalEndemico, ReporteEnfermedad, MedicoReporteEnfermedad } from "../api";

/**
 * PDF del "Reporte por enfermedad" del super-admin.
 *
 * Página del canal: la genera construirDocCanalEndemico tal cual (la misma que
 * descarga el médico en Mediclinic; ese código no se toca). Alrededor se
 * agregan la portada con el resumen de la red y la tabla de todos los médicos,
 * con la misma paleta y tipografía para que se lea como un solo documento.
 */

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

type RGB = [number, number, number];
const CIELO: RGB = [14, 165, 233];
const ESMERALDA: RGB = [16, 185, 129];
const VIOLETA: RGB = [168, 85, 247];
const AMBAR: RGB = [245, 158, 11];
const ROJO: RGB = [239, 68, 68];
const TINTA: RGB = [15, 23, 42];
const GRIS: RGB = [100, 116, 139];
const GRIS_CLARO: RGB = [203, 213, 225];

export interface DatosPdfReporteEnfermedad {
  reporte: ReporteEnfermedad;
  descripcion: string;
  /** Médico elegido; sin él, el reporte es de toda la red. */
  medico?: MedicoReporteEnfermedad;
  /** Canal endémico del mismo alcance (red o médico), para su página. */
  canal: CanalEndemico | null;
}

export function generarPdfReporteEnfermedad(datos: DatosPdfReporteEnfermedad) {
  const { reporte, medico, canal } = datos;
  const fecha = new Date().toLocaleDateString("es-VE");
  const alcance = medico ? medico.medico : "Toda la red de médicos";

  // 1) Página del canal, idéntica a la de Mediclinic.
  let doc: jsPDF;
  if (canal) {
    const casosPorMes = new Map(canal.mesesAnioConsultado.map((p) => [p.mes, p.casos]));
    const puntos: PuntoCanalPdf[] = canal.corredorHistoricoMensual.map((b) => ({
      etiqueta: MESES[b.periodo - 1],
      casos: casosPorMes.get(b.periodo) ?? 0,
      minimo: b.minimo, q1: b.percentil25, mediana: b.mediana, q3: b.percentil75, maximo: b.maximo,
    }));
    doc = construirDocCanalEndemico({
      clinicaNombre: medico ? (medico.clinica || medico.medico) : "Red Aurora Plus — Vigilancia epidemiológica",
      doctorNombre: alcance,
      cie10: reporte.cie10,
      descripcionDiagnostico: datos.descripcion || undefined,
      granularidad: "Mensual",
      anio: reporte.anio,
      casosEsteAnio: canal.mesesAnioConsultado.reduce((s, p) => s + p.casos, 0),
      totalHistorico: canal.totalCasosHistorico,
      aniosUsados: canal.aniosHistoricosUsados,
      aniosExcluidos: canal.aniosExcluidosPorAtipicos,
      puntos,
      hayHistorial: canal.aniosHistoricosUsados > 0,
      fecha,
    });
    // 2) Portada delante del canal.
    doc.addPage("letter", "landscape");
    dibujarPortada(doc, datos, alcance, fecha);
    doc.movePage(doc.getNumberOfPages(), 1);
  } else {
    doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    dibujarPortada(doc, datos, alcance, fecha);
  }

  // 3) Todos los médicos.
  doc.addPage("letter", "landscape");
  dibujarTablaMedicos(doc, reporte, datos.descripcion, fecha, medico?.tenantId);

  numerarPaginas(doc);
  doc.save(`Reporte_${reporte.cie10}_${reporte.anio}_${medico ? "medico_" + medico.tenantId : "red"}.pdf`);
}

// ───────────────────────────── PORTADA ─────────────────────────────

function dibujarPortada(doc: jsPDF, datos: DatosPdfReporteEnfermedad, alcance: string, fecha: string) {
  const { reporte, medico } = datos;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  encabezado(doc, "REPORTE EPIDEMIOLÓGICO POR ENFERMEDAD",
    `${reporte.cie10}${datos.descripcion ? " — " + datos.descripcion : ""}`,
    `Año ${reporte.anio}  ·  Alcance: ${alcance}  ·  Generado: ${fecha}`);

  // Tarjetas: del médico elegido o de toda la red.
  const casos = medico ? medico.casosAnio : reporte.totalAnio;
  const anterior = medico ? medico.casosAnioAnterior : reporte.totalAnioAnterior;
  const variacion = anterior > 0 ? Math.round(((casos - anterior) / anterior) * 100) : null;
  const tarjetas: { label: string; val: string; color: RGB; nota?: string }[] = [
    { label: `CASOS EN ${reporte.anio}`, val: String(casos), color: CIELO, nota: `${anterior} en ${reporte.anio - 1}` },
    {
      label: "VARIACIÓN VS AÑO ANTERIOR",
      val: variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`,
      color: variacion === null ? GRIS : variacion > 0 ? ROJO : ESMERALDA,
      nota: variacion === null ? "sin casos el año anterior" : variacion > 0 ? "más casos" : "menos casos",
    },
    medico
      ? { label: "PARTICIPACIÓN EN LA RED", val: `${medico.participacionPct}%`, color: VIOLETA, nota: `de ${reporte.totalAnio} casos de la red` }
      : { label: "MÉDICOS CON CASOS", val: String(reporte.medicosConCasos), color: VIOLETA, nota: `${reporte.medicos.length} con historial` },
    { label: "PACIENTES DISTINTOS", val: String(medico ? medico.pacientesDistintos : reporte.pacientesDistintos), color: ESMERALDA, nota: "consultas registradas" },
  ];
  const y0 = 32;
  const cardW = (W - 28 - 3 * 6) / 4;
  tarjetas.forEach((t, i) => {
    const x = 14 + i * (cardW + 6);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y0, cardW, 20, 2, 2, "F");
    doc.setFillColor(...t.color);
    doc.rect(x, y0 + 2, 1.2, 16, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(t.label, x + 5, y0 + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...t.color);
    doc.text(t.val, x + 5, y0 + 14);
    if (t.nota) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...GRIS);
      doc.text(t.nota, x + 5, y0 + 18.2);
    }
  });

  // Gráfico de barras por mes.
  const serieActual = medico ? medico.porMes : reporte.porMes;
  const serieAnterior = medico ? null : reporte.porMesAnterior;
  const chartX = 22, chartY = y0 + 34, chartW = W * 0.58, chartH = H - chartY - 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TINTA);
  doc.text(medico ? `Casos por mes en ${reporte.anio} — ${alcance}` : `Casos por mes: ${reporte.anio} contra ${reporte.anio - 1}`, 14, chartY - 5);
  dibujarBarrasMensuales(doc, serieActual, serieAnterior, chartX, chartY, chartW, chartH);

  // Leyenda del gráfico.
  const ly = chartY + chartH + 11;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setFillColor(...CIELO);
  doc.rect(chartX, ly - 3, 3.5, 3.5, "F");
  doc.setTextColor(71, 85, 105);
  doc.text(`Casos ${reporte.anio}`, chartX + 5, ly);
  if (serieAnterior) {
    doc.setFillColor(...GRIS_CLARO);
    doc.rect(chartX + 30, ly - 3, 3.5, 3.5, "F");
    doc.text(`Casos ${reporte.anio - 1}`, chartX + 35, ly);
  }

  // Hallazgos en palabras.
  const hx = chartX + chartW + 12;
  const hw = W - hx - 14;
  let hy = chartY - 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TINTA);
  doc.text("Hallazgos principales", hx, hy);
  hy += 5;
  for (const h of hallazgos(datos)) {
    doc.setFillColor(...h.color);
    doc.circle(hx + 1.2, hy + 1.3, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const lineas = doc.splitTextToSize(h.texto, hw - 5);
    doc.text(lineas, hx + 4, hy + 2.3);
    hy += lineas.length * 3.8 + 3.5;
  }

  // Los 5 médicos con más casos (vista de red).
  if (!medico && reporte.medicos.length > 0) {
    hy += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TINTA);
    doc.text(`Médicos con más casos en ${reporte.anio}`, hx, hy);
    hy += 4;
    const max = Math.max(1, ...reporte.medicos.slice(0, 5).map((m) => m.casosAnio));
    reporte.medicos.slice(0, 5).forEach((m, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${i + 1}. ${recortar(doc, m.medico, hw * 0.55)}`, hx, hy + 3);
      const bx = hx + hw * 0.58, bw = hw * 0.3;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(bx, hy, bw, 3.6, 1, 1, "F");
      doc.setFillColor(...CIELO);
      if (m.casosAnio > 0) doc.roundedRect(bx, hy, Math.max(1.5, (bw * m.casosAnio) / max), 3.6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.text(String(m.casosAnio), hx + hw, hy + 3, { align: "right" });
      hy += 6;
    });
  }

  pie(doc);
}

function hallazgos(datos: DatosPdfReporteEnfermedad): { texto: string; color: RGB }[] {
  const { reporte, medico } = datos;
  const salida: { texto: string; color: RGB }[] = [];
  const serie = medico ? medico.porMes : reporte.porMes;
  const total = serie.reduce((a, b) => a + b, 0);
  if (total === 0) {
    salida.push({ texto: `No hay casos registrados de ${reporte.cie10} en ${reporte.anio}.`, color: GRIS });
    return salida;
  }
  const pico = serie.indexOf(Math.max(...serie));
  salida.push({ texto: `Mes con más casos: ${MESES_LARGOS[pico]}, con ${serie[pico]} caso(s) (${Math.round((serie[pico] * 100) / total)}% del año).`, color: CIELO });

  const casos = medico ? medico.casosAnio : reporte.totalAnio;
  const anterior = medico ? medico.casosAnioAnterior : reporte.totalAnioAnterior;
  if (anterior > 0) {
    const v = Math.round(((casos - anterior) / anterior) * 100);
    salida.push({
      texto: v === 0 ? `Mismo número de casos que en ${reporte.anio - 1}.`
        : `${v > 0 ? "Aumento" : "Disminución"} del ${Math.abs(v)}% frente a ${reporte.anio - 1} (${anterior} caso(s)).`,
      color: v > 0 ? ROJO : ESMERALDA,
    });
  }

  if (medico) {
    const posicion = reporte.medicos.findIndex((m) => m.tenantId === medico.tenantId) + 1;
    salida.push({ texto: `Ocupa el puesto ${posicion} de ${reporte.medicos.length} médicos de la red en casos de esta enfermedad (${medico.participacionPct}% del total).`, color: VIOLETA });
  } else {
    const conCasos = reporte.medicos.filter((m) => m.casosAnio > 0);
    if (conCasos.length > 0) {
      let acumulado = 0, n = 0;
      for (const m of conCasos) { acumulado += m.casosAnio; n++; if (acumulado * 2 >= reporte.totalAnio) break; }
      salida.push({ texto: `La mitad de los casos se concentra en ${n} de ${conCasos.length} médico(s) con casos.`, color: VIOLETA });
    }
    const conCinco = conCasos.filter((m) => m.casosAnio >= 5).length;
    salida.push({ texto: `${conCinco} médico(s) registran 5 casos o más en el año.`, color: AMBAR });
  }
  salida.push({ texto: "La página siguiente muestra el canal endémico: dónde cae cada mes frente al comportamiento histórico.", color: GRIS });
  return salida;
}

function dibujarBarrasMensuales(doc: jsPDF, actual: number[], anterior: number[] | null, x: number, y: number, w: number, h: number) {
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
    doc.text(String(v), x - 2, gy + 1, { align: "right" });
  }

  const grupo = w / 12;
  const anchoBarra = anterior ? grupo * 0.32 : grupo * 0.55;
  for (let i = 0; i < 12; i++) {
    const gx = x + i * grupo + grupo / 2;
    if (anterior) {
      barra(doc, gx - anchoBarra - 0.4, y, h, anchoBarra, anterior[i] / tope, GRIS_CLARO);
      barra(doc, gx + 0.4, y, h, anchoBarra, actual[i] / tope, CIELO);
    } else {
      barra(doc, gx - anchoBarra / 2, y, h, anchoBarra, actual[i] / tope, CIELO);
    }
    if (actual[i] > 0) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...CIELO);
      const bx = anterior ? gx + 0.4 + anchoBarra / 2 : gx;
      doc.text(String(actual[i]), bx, y + h - (actual[i] / tope) * h - 1.2, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(MESES[i], gx, y + h + 4.5, { align: "center" });
  }
}

function barra(doc: jsPDF, x: number, y: number, h: number, w: number, fraccion: number, color: RGB) {
  if (fraccion <= 0) return;
  const alto = Math.max(0.6, fraccion * h);
  doc.setFillColor(...color);
  doc.roundedRect(x, y + h - alto, w, alto, 0.6, 0.6, "F");
}

function escalaBonita(max: number): number {
  const bruto = max / 5;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / potencia;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * potencia);
}

// ─────────────────────────── TABLA DE MÉDICOS ───────────────────────────

function dibujarTablaMedicos(doc: jsPDF, reporte: ReporteEnfermedad, descripcion: string, fecha: string, resaltarTenant?: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const columnas: { titulo: string; ancho: number; alinear?: "right" | "center" }[] = [
    { titulo: "#", ancho: 8, alinear: "center" },
    { titulo: "MÉDICO", ancho: 52 },
    { titulo: "ESPECIALIDAD", ancho: 30 },
    { titulo: "CLÍNICA", ancho: 38 },
    { titulo: `CASOS ${reporte.anio}`, ancho: 20, alinear: "right" },
    { titulo: `${reporte.anio - 1}`, ancho: 14, alinear: "right" },
    { titulo: "VARIACIÓN", ancho: 18, alinear: "right" },
    { titulo: "PACIENTES", ancho: 16, alinear: "right" },
    { titulo: "ÚLTIMO CASO", ancho: 21, alinear: "center" },
    { titulo: "PARTICIPACIÓN", ancho: 0 },
  ];
  const x0 = 14;
  columnas[columnas.length - 1].ancho = W - 28 - columnas.slice(0, -1).reduce((s, c) => s + c.ancho, 0);

  const alto = 7;
  let y = 0;
  const nuevaPagina = (primera: boolean) => {
    if (!primera) doc.addPage("letter", "landscape");
    encabezado(doc, "MÉDICOS DE LA RED — CASOS POR ENFERMEDAD",
      `${reporte.cie10}${descripcion ? " — " + descripcion : ""}`,
      `Año ${reporte.anio}  ·  ${reporte.medicos.length} médico(s) con casos registrados  ·  Generado: ${fecha}`);
    y = 32;
    doc.setFillColor(...TINTA);
    doc.roundedRect(x0, y, W - 28, alto, 1.5, 1.5, "F");
    let cx = x0;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    for (const c of columnas) {
      texto(doc, c.titulo, cx, y + 4.6, c.ancho, c.alinear);
      cx += c.ancho;
    }
    y += alto + 1;
  };
  nuevaPagina(true);

  if (reporte.medicos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text("Ningún médico ha registrado casos de esta enfermedad.", x0, y + 8);
  }

  const maxCasos = Math.max(1, ...reporte.medicos.map((m) => m.casosAnio));
  reporte.medicos.forEach((m, i) => {
    if (y + alto > H - 16) nuevaPagina(false);
    const resaltado = m.tenantId === resaltarTenant;
    if (resaltado) doc.setFillColor(224, 242, 254);
    else if (i % 2 === 0) doc.setFillColor(248, 250, 252);
    else doc.setFillColor(255, 255, 255);
    doc.rect(x0, y, W - 28, alto, "F");

    const variacion = m.casosAnioAnterior > 0 ? Math.round(((m.casosAnio - m.casosAnioAnterior) / m.casosAnioAnterior) * 100) : null;
    const valores = [
      String(i + 1),
      m.medico,
      m.especialidad || "—",
      m.clinica || "—",
      String(m.casosAnio),
      String(m.casosAnioAnterior),
      variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`,
      String(m.pacientesDistintos),
      m.ultimoCaso ? new Date(m.ultimoCaso).toLocaleDateString("es-VE") : "—",
    ];
    let cx = x0;
    valores.forEach((v, j) => {
      const c = columnas[j];
      doc.setFont("helvetica", j === 1 || j === 4 ? "bold" : "normal");
      doc.setFontSize(7.2);
      if (j === 6 && variacion !== null) doc.setTextColor(...(variacion > 0 ? ROJO : variacion < 0 ? ESMERALDA : GRIS));
      else if (j === 4 && m.casosAnio >= 5) doc.setTextColor(...AMBAR);
      else doc.setTextColor(30, 41, 59);
      texto(doc, recortar(doc, v, c.ancho - 3), cx, y + 4.7, c.ancho, c.alinear);
      cx += c.ancho;
    });
    // Barra de participación.
    const c = columnas[columnas.length - 1];
    const bw = c.ancho - 16;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(cx + 1.5, y + 2.2, bw, 2.6, 1, 1, "F");
    if (m.casosAnio > 0) {
      doc.setFillColor(...CIELO);
      doc.roundedRect(cx + 1.5, y + 2.2, Math.max(1.2, (bw * m.casosAnio) / maxCasos), 2.6, 1, 1, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(`${m.participacionPct}%`, cx + c.ancho - 1, y + 4.7, { align: "right" });
    y += alto;
  });

  // Nota de lectura.
  if (y + 12 < H - 16) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Casos en ámbar: 5 o más en el año. Variación en rojo: más casos que el año anterior; en verde: menos. Incluye consultas y casos históricos importados.", x0, y + 7);
  }
  pie(doc);
}

// ───────────────────────────── UTILIDADES ─────────────────────────────

function encabezado(doc: jsPDF, titulo: string, subtitulo: string, detalle: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...CIELO);
  doc.rect(0, 0, W, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(titulo, 14, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(recortar(doc, subtitulo, W - 28), 14, 17);
  doc.text(detalle, 14, 22);
}

function pie(doc: jsPDF) {
  const H = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Generado automáticamente por Aurora Plus — Vigilancia epidemiológica de la red Mediclinic. Referencia estadística; no reemplaza el criterio clínico.",
    14,
    H - 8
  );
}

function numerarPaginas(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${total}`, W - 14, H - 8, { align: "right" });
  }
}

function texto(doc: jsPDF, valor: string, x: number, y: number, ancho: number, alinear?: "right" | "center") {
  if (alinear === "right") doc.text(valor, x + ancho - 1.5, y, { align: "right" });
  else if (alinear === "center") doc.text(valor, x + ancho / 2, y, { align: "center" });
  else doc.text(valor, x + 1.5, y);
}

function recortar(doc: jsPDF, valor: string, ancho: number): string {
  if (doc.getTextWidth(valor) <= ancho) return valor;
  let v = valor;
  while (v.length > 1 && doc.getTextWidth(v + "…") > ancho) v = v.slice(0, -1);
  return v + "…";
}
