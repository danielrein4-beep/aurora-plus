import jsPDF from "jspdf";

export interface CobroItem {
  turno: number;
  pacienteNombre: string;
  identificacion: string;
  concepto: string;
  metodoPago: string;
  referencia: string;
  montoUSD: number;
  montoVES: number;
  hora: string;
}

export interface CierreCajaData {
  clinicaNombre: string;
  doctorNombre: string;
  fecha: string;
  horaCierre: string;
  tasaBCV: number;
  cobros: CobroItem[];
  totalUSD: number;
  totalVES: number;
  totalPacientes: number;
}

export interface ConsultaReportData {
  clinicaNombre: string;
  doctorNombre: string;
  especialidad: string;
  matriculaMPPS: string;
  colegioMedicos: string;
  paciente: {
    expediente: string;
    nombreCompleto: string;
    identificacion: string;
    edad: number | string;
    telefono: string;
    origen: string;
    fechaConsulta: string;
  };
  signosVitales: {
    ta: string; // Tensión arterial (ej. 120/80)
    fc: string; // Frecuencia cardíaca (ej. 75 lpm)
    fr: string; // Frecuencia respiratoria (ej. 18 rpm)
    temp: string; // Temperatura (ej. 36.8 °C)
    peso: string; // Peso (ej. 70 kg)
    talla: string; // Talla (ej. 1.72 m)
    imc: string; // IMC (ej. 23.6)
    satO2: string; // Saturación O2 (ej. 99%)
  };
  motivoConsulta: string;
  evolucionClinica: string;
  diagnosticoCIE10: string;
  planTratamiento: string;
  proximaCita?: string;
}

/**
 * Genera y descarga el PDF de Cierre de Caja Diario (Audit Report)
 */
export function generarPdfCierreCaja(data: CierreCajaData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── ENCABEZADO ──
  doc.setFillColor(14, 165, 233); // Sky Blue Header Banner
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(data.clinicaNombre.toUpperCase(), 14, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("REPORTE DE AUDITORÍA Y CIERRE DE CAJA DIARIA", 14, 19);
  doc.text(`Fecha: ${data.fecha} | Hora de Cierre: ${data.horaCierre}`, 14, 24);

  // ── CAJERO / DOCTOR & TASA BCV ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Médico / Administrador: ${data.doctorNombre}`, 14, 36);
  doc.text(`Tasa Oficial BCV: Bs. ${data.tasaBCV.toFixed(2)} / USD`, pageWidth - 14, 36, { align: "right" });

  // ── TARJETAS DE RESUMEN ──
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, 58, 20, 2, 2, "F");
  doc.roundedRect(79, 42, 58, 20, 2, 2, "F");
  doc.roundedRect(144, 42, 58, 20, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL EN DÓLARES", 18, 48);
  doc.text("TOTAL EN BOLÍVARES", 83, 48);
  doc.text("PACIENTES ATENDIDOS", 148, 48);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`$${data.totalUSD.toFixed(2)} USD`, 18, 57);

  doc.setTextColor(14, 165, 233); // Sky
  doc.text(`Bs. ${data.totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`, 83, 57);

  doc.setTextColor(15, 23, 42); // Dark
  doc.text(`${data.totalPacientes} Pacientes`, 148, 57);

  // ── TABLA DE COBROS ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle de Transacciones del Día", 14, 71);

  // Table header
  let y = 76;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, "F");

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("#", 16, y + 5);
  doc.text("Hora", 23, y + 5);
  doc.text("Paciente", 36, y + 5);
  doc.text("Cédula", 82, y + 5);
  doc.text("Método / Ref", 110, y + 5);
  doc.text("Monto USD", 156, y + 5, { align: "right" });
  doc.text("Monto VES", pageWidth - 16, y + 5, { align: "right" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  data.cobros.forEach((c, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6.5, "F");
    }
    doc.setTextColor(30, 41, 59);
    doc.text(String(c.turno), 16, y + 4.5);
    doc.text(c.hora, 23, y + 4.5);
    doc.text(c.pacienteNombre.slice(0, 24), 36, y + 4.5);
    doc.text(c.identificacion, 82, y + 4.5);
    doc.text(`${c.metodoPago}${c.referencia ? ` (${c.referencia.slice(0, 8)})` : ""}`.slice(0, 26), 110, y + 4.5);
    doc.text(`$${c.montoUSD.toFixed(2)}`, 156, y + 4.5, { align: "right" });
    doc.text(`Bs. ${c.montoVES.toFixed(2)}`, pageWidth - 16, y + 4.5, { align: "right" });
    y += 6.5;
  });

  // ── FIRMAS ──
  const signY = Math.max(y + 25, 225);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, signY, 85, signY);
  doc.line(125, signY, 185, signY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Firma del Médico Responsable", 55, signY + 5, { align: "center" });
  doc.text("Firma de Administración / Caja", 155, signY + 5, { align: "center" });

  const fileName = `Cierre_Caja_${data.fecha.replace(/-/g, "")}_${data.horaCierre.replace(/:/g, "")}.pdf`;
  doc.save(fileName);
}

/**
 * Genera y descarga el Informe Médico / Historia Clínica en PDF
 */
export function generarPdfInformeConsulta(data: ConsultaReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── MEMBRETE CLÍNICO ──
  doc.setFillColor(13, 148, 136); // Teal Medical Header
  doc.rect(0, 0, pageWidth, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(data.clinicaNombre.toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Dr(a). ${data.doctorNombre} — ${data.especialidad}`, 14, 18);
  doc.text(`MPPS: ${data.matriculaMPPS} | Col. Médicos: ${data.colegioMedicos}`, 14, 24);

  doc.setFont("helvetica", "bold");
  doc.text(`EXPEDIENTE: ${data.paciente.expediente}`, pageWidth - 14, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${data.paciente.fechaConsulta}`, pageWidth - 14, 24, { align: "right" });

  // ── DATOS DEL PACIENTE ──
  let y = 37;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 19, 2, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("PACIENTE:", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(data.paciente.nombreCompleto, 40, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("CÉDULA / DNI:", 120, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(data.paciente.identificacion, 150, y + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("EDAD:", 18, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.paciente.edad} años`, 32, y + 13);

  doc.setFont("helvetica", "bold");
  doc.text("TELÉFONO:", 70, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(data.paciente.telefono || "N/A", 92, y + 13);

  doc.setFont("helvetica", "bold");
  doc.text("ORIGEN:", 140, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(data.paciente.origen || "Local", 158, y + 13);

  // ── SIGNOS VITALES ──
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("SIGNOS VITALES & SOMATOMETRÍA", 14, y);

  y += 3;
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, "F");

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`T/A: ${data.signosVitales.ta || "—"}`, 18, y + 6);
  doc.text(`FC: ${data.signosVitales.fc || "—"}`, 55, y + 6);
  doc.text(`FR: ${data.signosVitales.fr || "—"}`, 90, y + 6);
  doc.text(`Temp: ${data.signosVitales.temp || "—"}`, 125, y + 6);
  doc.text(`SatO2: ${data.signosVitales.satO2 || "—"}`, 165, y + 6);

  doc.text(`Peso: ${data.signosVitales.peso || "—"}`, 18, y + 12);
  doc.text(`Talla: ${data.signosVitales.talla || "—"}`, 55, y + 12);
  doc.text(`IMC: ${data.signosVitales.imc || "—"}`, 90, y + 12);

  // ── MOTIVO DE CONSULTA & EVOLUCIÓN ──
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("MOTIVO DE CONSULTA:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.motivoConsulta, 14, y + 5, { maxWidth: pageWidth - 28 });

  y += 15;
  if (data.evolucionClinica) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("EXAMEN FÍSICO / EVOLUCIÓN CLÍNICA:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(data.evolucionClinica, 14, y + 5, { maxWidth: pageWidth - 28 });
    y += 18;
  }

  // ── DIAGNÓSTICO CIE-10 ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("DIAGNÓSTICO (CIE-10):", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.diagnosticoCIE10 || "Sin diagnóstico especificado", 14, y + 5, { maxWidth: pageWidth - 28 });

  // ── PLAN DE TRATAMIENTO & RECETA MÉDICA ──
  y += 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 48, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("PLAN DE TRATAMIENTO & INDICACIONES / RECETA (Rx):", 18, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.planTratamiento || "Indicaciones médicas no registradas", 18, y + 14, { maxWidth: pageWidth - 36 });

  if (data.proximaCita) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72);
    doc.text(`Próxima Cita / Control: ${data.proximaCita}`, 18, y + 42);
  }

  // ── SELLO Y FIRMA ──
  const signY = 240;
  doc.setDrawColor(148, 163, 184);
  doc.line(70, signY, 140, signY);

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(`Dr(a). ${data.doctorNombre}`, 105, signY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.especialidad} — MPPS: ${data.matriculaMPPS}`, 105, signY + 9, { align: "center" });

  const safeName = data.paciente.nombreCompleto.replace(/\s+/g, "_");
  const fileName = `Informe_${data.paciente.expediente}_${safeName}.pdf`;
  doc.save(fileName);
}

/**
 * Genera el texto formateado para compartir el informe de consulta por WhatsApp
 */
export function generarTextoWhatsAppConsulta(data: ConsultaReportData): string {
  const lineas = [
    `🏥 *${data.clinicaNombre}*`,
    `📋 *Informe de Consulta Médica*`,
    `━━━━━━━━━━━━━━━━━━`,
    `👤 *Paciente:* ${data.paciente.nombreCompleto}`,
    `🆔 *Cédula:* ${data.paciente.identificacion} | *Edad:* ${data.paciente.edad} años`,
    `📅 *Fecha:* ${data.paciente.fechaConsulta}`,
    `🩺 *Médico:* Dr(a). ${data.doctorNombre} (${data.especialidad})`,
    ``,
    `🔍 *Diagnóstico:* ${data.diagnosticoCIE10 || "Evaluación Médica"}`,
    ``,
    `💊 *Indicaciones y Tratamiento (Rx):*`,
    `${data.planTratamiento || "Seguir recomendaciones dadas en consulta."}`,
    data.proximaCita ? `\n🗓️ *Próximo Control:* ${data.proximaCita}` : "",
    `━━━━━━━━━━━━━━━━━━`,
    `_Conserve este mensaje para su control médico._`,
  ];
  return encodeURIComponent(lineas.filter(Boolean).join("\n"));
}
