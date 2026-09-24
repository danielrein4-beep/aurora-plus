import { jsPDF } from "jspdf";
import { construirDocCanalEndemico, type PuntoCanalPdf } from "./pdfReports";
import type { CanalEndemico, ReporteEnfermedad, MedicoReporteEnfermedad } from "../api";
import {
  type RGB, AMBAR, ROJO, GRIS, GRIS_CLARO, TINTA, MARGEN, OPERACIONES, PERSONAS,
  encabezado, pie, numerarPaginas, tarjetas, tituloSeccion, barrasMensuales, tabla, vinetas, recortar,
} from "./pdfComun";

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
const PIE = "Generado automáticamente por Aurora Plus — Vigilancia epidemiológica de la red Mediclinic. Referencia estadística; no reemplaza el criterio clínico.";

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

  const y0 = encabezado(doc, "REPORTE EPIDEMIOLÓGICO POR ENFERMEDAD",
    `${reporte.cie10}${datos.descripcion ? " — " + datos.descripcion : ""}`,
    `Año ${reporte.anio}  ·  Alcance: ${alcance}  ·  Generado: ${fecha}`);

  // Tarjetas: del médico elegido o de toda la red.
  const casos = medico ? medico.casosAnio : reporte.totalAnio;
  const anterior = medico ? medico.casosAnioAnterior : reporte.totalAnioAnterior;
  const variacion = anterior > 0 ? Math.round(((casos - anterior) / anterior) * 100) : null;
  tarjetas(doc, y0, [
    { label: `CASOS EN ${reporte.anio}`, val: String(casos), color: OPERACIONES, nota: `${anterior} en ${reporte.anio - 1}` },
    {
      label: "VARIACIÓN VS AÑO ANTERIOR",
      val: variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`,
      color: variacion === null ? GRIS : variacion > 0 ? ROJO : TINTA,
      nota: variacion === null ? "sin casos el año anterior" : variacion > 0 ? "más casos" : "menos casos",
    },
    medico
      ? { label: "PARTICIPACIÓN EN LA RED", val: `${medico.participacionPct}%`, color: OPERACIONES, nota: `de ${reporte.totalAnio} casos de la red` }
      : { label: "MÉDICOS CON CASOS", val: String(reporte.medicosConCasos), color: PERSONAS, nota: `${reporte.medicos.length} con historial` },
    { label: "PACIENTES DISTINTOS", val: String(medico ? medico.pacientesDistintos : reporte.pacientesDistintos), color: PERSONAS, nota: "consultas registradas" },
  ]);

  // Gráfico de barras por mes.
  const serieActual = medico ? medico.porMes : reporte.porMes;
  const serieAnterior = medico ? null : reporte.porMesAnterior;
  const chartX = 22, chartY = y0 + 34, chartW = W * 0.58, chartH = H - chartY - 30;
  tituloSeccion(doc, medico ? `Casos por mes en ${reporte.anio} — ${alcance}` : `Casos por mes: ${reporte.anio} contra ${reporte.anio - 1}`, MARGEN, chartY - 5);
  barrasMensuales(doc, serieActual, serieAnterior, chartX, chartY, chartW, chartH, OPERACIONES, MESES);
  leyenda(doc, chartX, chartY + chartH + 11, [[OPERACIONES, `Casos ${reporte.anio}`], ...(serieAnterior ? [[GRIS_CLARO, `Casos ${reporte.anio - 1}`] as [RGB, string]] : [])]);

  // Hallazgos en palabras.
  const hx = chartX + chartW + 12;
  const hw = W - hx - MARGEN;
  tituloSeccion(doc, "Hallazgos principales", hx, chartY - 5);
  let hy = vinetas(doc, hallazgos(datos), hx, chartY, hw);

  // Los 5 médicos con más casos (vista de red).
  if (!medico && reporte.medicos.length > 0) {
    hy += 2;
    tituloSeccion(doc, `Médicos con más casos en ${reporte.anio}`, hx, hy);
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
      doc.setFillColor(...OPERACIONES);
      if (m.casosAnio > 0) doc.roundedRect(bx, hy, Math.max(1.5, (bw * m.casosAnio) / max), 3.6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.text(String(m.casosAnio), hx + hw, hy + 3, { align: "right" });
      hy += 6;
    });
  }

  pie(doc, PIE);
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
  salida.push({ texto: `Mes con más casos: ${MESES_LARGOS[pico]}, con ${serie[pico]} caso(s) (${Math.round((serie[pico] * 100) / total)}% del año).`, color: OPERACIONES });

  const casos = medico ? medico.casosAnio : reporte.totalAnio;
  const anterior = medico ? medico.casosAnioAnterior : reporte.totalAnioAnterior;
  if (anterior > 0) {
    const v = Math.round(((casos - anterior) / anterior) * 100);
    salida.push({
      texto: v === 0 ? `Mismo número de casos que en ${reporte.anio - 1}.`
        : `${v > 0 ? "Aumento" : "Disminución"} del ${Math.abs(v)}% frente a ${reporte.anio - 1} (${anterior} caso(s)).`,
      color: v > 0 ? ROJO : TINTA,
    });
  }

  if (medico) {
    const posicion = reporte.medicos.findIndex((m) => m.tenantId === medico.tenantId) + 1;
    salida.push({ texto: `Ocupa el puesto ${posicion} de ${reporte.medicos.length} médicos de la red en casos de esta enfermedad (${medico.participacionPct}% del total).`, color: PERSONAS });
  } else {
    const conCasos = reporte.medicos.filter((m) => m.casosAnio > 0);
    if (conCasos.length > 0) {
      let acumulado = 0, n = 0;
      for (const m of conCasos) { acumulado += m.casosAnio; n++; if (acumulado * 2 >= reporte.totalAnio) break; }
      salida.push({ texto: `La mitad de los casos se concentra en ${n} de ${conCasos.length} médico(s) con casos.`, color: PERSONAS });
    }
    const conCinco = conCasos.filter((m) => m.casosAnio >= 5).length;
    salida.push({ texto: `${conCinco} médico(s) registran 5 casos o más en el año.`, color: AMBAR });
  }
  salida.push({ texto: "La página siguiente muestra el canal endémico: dónde cae cada mes frente al comportamiento histórico.", color: GRIS });
  return salida;
}

function leyenda(doc: jsPDF, x: number, y: number, items: [RGB, string][]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  for (const [color, etiqueta] of items) {
    doc.setFillColor(...color);
    doc.rect(x, y - 3, 3.5, 3.5, "F");
    doc.setTextColor(71, 85, 105);
    doc.text(etiqueta, x + 5, y);
    x += doc.getTextWidth(etiqueta) + 14;
  }
}

// ─────────────────────────── TABLA DE MÉDICOS ───────────────────────────

function dibujarTablaMedicos(doc: jsPDF, reporte: ReporteEnfermedad, descripcion: string, fecha: string, resaltarTenant?: number) {
  const H = doc.internal.pageSize.getHeight();
  const cabeceraPagina = () => encabezado(doc, "MÉDICOS DE LA RED — CASOS POR ENFERMEDAD",
    `${reporte.cie10}${descripcion ? " — " + descripcion : ""}`,
    `Año ${reporte.anio}  ·  ${reporte.medicos.length} médico(s) con casos registrados  ·  Generado: ${fecha}`);
  const yInicio = cabeceraPagina();

  if (reporte.medicos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text("Ningún médico ha registrado casos de esta enfermedad.", MARGEN, yInicio + 8);
    pie(doc, PIE);
    return;
  }

  const y = tabla(doc, [
    { titulo: "#", ancho: 8, alinear: "center" },
    { titulo: "MÉDICO", ancho: 56 },
    { titulo: "ESPECIALIDAD", ancho: 32 },
    { titulo: "CLÍNICA", ancho: 42 },
    { titulo: `CASOS ${reporte.anio}`, ancho: 20, alinear: "right" },
    { titulo: `${reporte.anio - 1}`, ancho: 14, alinear: "right" },
    { titulo: "VARIACIÓN", ancho: 18, alinear: "right" },
    { titulo: "PACIENTES", ancho: 17, alinear: "right" },
    { titulo: "ÚLTIMO CASO", ancho: 21, alinear: "center" },
    { titulo: "PARTICIPACIÓN", ancho: 0, alinear: "right" },
  ], reporte.medicos.map((m, i) => {
    const variacion = m.casosAnioAnterior > 0 ? Math.round(((m.casosAnio - m.casosAnioAnterior) / m.casosAnioAnterior) * 100) : null;
    const colores: Record<number, RGB> = {};
    if (variacion !== null) colores[6] = variacion > 0 ? ROJO : variacion < 0 ? TINTA : GRIS;
    if (m.casosAnio >= 5) colores[4] = AMBAR;
    return {
      celdas: [
        String(i + 1), m.medico, m.especialidad || "—", m.clinica || "—", String(m.casosAnio), String(m.casosAnioAnterior),
        variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`, String(m.pacientesDistintos),
        m.ultimoCaso ? new Date(m.ultimoCaso).toLocaleDateString("es-VE") : "—", `${m.participacionPct}%`,
      ],
      negrita: [1, 4],
      colores,
      resaltar: m.tenantId === resaltarTenant,
    };
  }), yInicio, () => { pie(doc, PIE); doc.addPage("letter", "landscape"); return cabeceraPagina(); });

  if (y + 12 < H - 16) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Casos en ámbar: 5 o más en el año. Variación en rojo: más casos que el año anterior; en verde: menos. Incluye consultas y casos históricos importados.", MARGEN, y + 7);
  }
  doc.setTextColor(...TINTA);
  pie(doc, PIE);
}
