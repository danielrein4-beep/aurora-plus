import jsPDF from "jspdf";

export interface CobroItem {
  turno: number;
  pacienteNombre: string;
  identificacion: string;
  concepto: string;
  metodoPago: string;
  referencia: string;
  moneda?: "USD" | "VES" | "COP";
  montoCobrado?: number;
  montoUSD?: number;
  montoVES?: number;
  montoCOP?: number;
  hora: string;
}

export interface CierreCajaData {
  clinicaNombre: string;
  doctorNombre: string;
  fecha: string;
  horaCierre: string;
  tasaBCV: number;
  tasaCOP?: number;
  cobros: CobroItem[];
  totalUSD: number;
  totalVES: number;
  totalCOP?: number;
  totalPacientes: number;
  observaciones?: string;
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
  observaciones?: string;
}

export interface CotizacionItem {
  nombre: string;
  costoUSD: number;
  costoVES: number;
  costoCOP: number;
}

export interface CotizacionData {
  clinicaNombre: string;
  doctorNombre: string;
  pacienteNombre: string;
  pacienteCedula: string;
  pacienteTelefono?: string;
  fecha: string;
  fechaPlanificada?: string;
  items: CotizacionItem[];
  tasaBCV: number;
  tasaCOP: number;
  totalUSD: number;
  totalVES: number;
  totalCOP: number;
  observaciones?: string;
}

// ══════════════════════════════════════════════════════════════════════════
// 1. CONSTRUCCIÓN DE PDF: CIERRE DE CAJA & AUDITORÍA
// ══════════════════════════════════════════════════════════════════════════
export function construirDocCierreCaja(data: CierreCajaData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── ENCABEZADO ──
  doc.setFillColor(14, 165, 233); // Sky Blue Header Banner
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text((data.clinicaNombre || "CENTRO MÉDICO").toUpperCase(), 14, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("REPORTE DE AUDITORÍA Y CIERRE DE CAJA DIARIA", 14, 19);
  doc.text(`Fecha: ${data.fecha} | Hora de Cierre: ${data.horaCierre}`, 14, 24);

  // ── CAJERO / DOCTOR & TASA BCV ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Médico / Administrador: ${data.doctorNombre || "Dr. Médico"}`, 14, 36);
  doc.text(`Tasa Oficial BCV: Bs. ${(data.tasaBCV || 0).toFixed(2)} / USD`, pageWidth - 14, 36, { align: "right" });

  // ── TARJETAS DE RESUMEN POR MONEDA RECIBIDA ──
  const tieneCOP = (data.totalCOP || 0) > 0;
  const cardW = tieneCOP ? 42 : 58;
  const gap = tieneCOP ? 6 : 7;
  let startX = 14;

  // Card 1: USD
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(startX, 42, cardW, 20, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DÓLARES EN CAJA (USD)", startX + 4, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`$${(data.totalUSD || 0).toFixed(2)} USD`, startX + 4, 57);

  // Card 2: VES
  startX += cardW + gap;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(startX, 42, cardW, 20, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("BOLÍVARES EN CAJA (VES)", startX + 4, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233); // Sky
  doc.text(`Bs. ${(data.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`, startX + 4, 57);

  // Card 3: COP (si aplica)
  if (tieneCOP) {
    startX += cardW + gap;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(startX, 42, cardW, 20, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PESOS EN CAJA (COP)", startX + 4, 48);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(168, 85, 247); // Purple
    doc.text(`$${(data.totalCOP || 0).toLocaleString("es-CO")}`, startX + 4, 57);
  }

  // Card 4: Total Pacientes
  startX += cardW + gap;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(startX, 42, cardW, 20, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PACIENTES ATENDIDOS", startX + 4, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`${data.totalPacientes || 0} Pacientes`, startX + 4, 57);

  // ── TABLA DE AUDITORÍA DETALLADA ──
  let y = 70;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("DESGLOSE DE TRANSACCIONES AUDITADAS", 14, y);

  // Cabecera de tabla
  y += 4;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, "F");

  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", 18, y + 4.5);
  doc.text("PACIENTE", 36, y + 4.5);
  doc.text("IDENTIFICACIÓN", 86, y + 4.5);
  doc.text("MÉTODO DE PAGO / REF.", 116, y + 4.5);
  doc.text("MONTO RECIBIDO", pageWidth - 16, y + 4.5, { align: "right" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  if (!data.cobros || data.cobros.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text("No se registraron transacciones de cobro en esta auditoría.", 14, y + 8);
    y += 15;
  } else {
    data.cobros.forEach((c, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 6.5, "F");
      }

      doc.setTextColor(30, 41, 59);
      doc.text(String(c.turno || idx + 1), 18, y + 4.5);
      doc.text(String(c.pacienteNombre || "").slice(0, 25), 36, y + 4.5);
      doc.text(String(c.identificacion || ""), 86, y + 4.5);
      doc.text(`${c.metodoPago || ""}${c.referencia && c.referencia !== "N/A" ? ` (${c.referencia})` : ""}`.slice(0, 30), 116, y + 4.5);

      let textoMonto = "";
      if (c.moneda === "USD" || (!c.moneda && (c.montoUSD || 0) > 0)) {
        textoMonto = `$${(c.montoUSD || c.montoCobrado || 0).toFixed(2)} USD`;
        doc.setTextColor(16, 185, 129);
      } else if (c.moneda === "VES" || (c.montoVES && c.montoVES > 0)) {
        textoMonto = `Bs. ${(c.montoVES || c.montoCobrado || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
        doc.setTextColor(14, 165, 233);
      } else if (c.moneda === "COP" || (c.montoCOP && c.montoCOP > 0)) {
        textoMonto = `$${(c.montoCOP || c.montoCobrado || 0).toLocaleString("es-CO")} COP`;
        doc.setTextColor(168, 85, 247);
      } else {
        textoMonto = `$${(c.montoUSD || 0).toFixed(2)} USD`;
      }

      doc.setFont("helvetica", "bold");
      doc.text(textoMonto, pageWidth - 16, y + 4.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6.5;
    });
  }

  // Observaciones si existen
  if (data.observaciones) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Observaciones de Auditoría:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.observaciones, 14, y + 4, { maxWidth: pageWidth - 28 });
    y += 10;
  }

  // ── FIRMAS ──
  const signY = Math.max(y + 20, 235);
  doc.setDrawColor(148, 163, 184);
  doc.line(25, signY, 85, signY);
  doc.line(125, signY, 185, signY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Firma del Médico Responsable", 55, signY + 5, { align: "center" });
  doc.text("Firma de Administración / Caja", 155, signY + 5, { align: "center" });

  return doc;
}

export function generarPdfCierreCaja(data: CierreCajaData) {
  const doc = construirDocCierreCaja(data);
  const ts = Date.now() % 100000;
  const fileName = `Cierre_Caja_${data.fecha.replace(/-/g, "")}_${data.horaCierre.replace(/:/g, "")}_${ts}.pdf`;
  doc.save(fileName);
}

// ══════════════════════════════════════════════════════════════════════════
// 2. CONSTRUCCIÓN DE PDF: INFORME MÉDICO / HISTORIA CLÍNICA
// ══════════════════════════════════════════════════════════════════════════
export function construirDocInformeConsulta(data: ConsultaReportData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── MEMBRETE CLÍNICO ──
  doc.setFillColor(13, 148, 136); // Teal Medical Header
  doc.rect(0, 0, pageWidth, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text((data.clinicaNombre || "CENTRO MÉDICO ESPECIALIZADO").toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Dr(a). ${data.doctorNombre || "Médico Especialista"} — ${data.especialidad || "Medicina General"}`, 14, 18);
  doc.text(`MPPS: ${data.matriculaMPPS || "N/A"} | Col. Médicos: ${data.colegioMedicos || "N/A"}`, 14, 24);

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
  doc.text(`T/A: ${data.signosVitales?.ta || "—"}`, 18, y + 6);
  doc.text(`FC: ${data.signosVitales?.fc || "—"}`, 55, y + 6);
  doc.text(`FR: ${data.signosVitales?.fr || "—"}`, 90, y + 6);
  doc.text(`Temp: ${data.signosVitales?.temp || "—"}`, 125, y + 6);
  doc.text(`SatO2: ${data.signosVitales?.satO2 || "—"}`, 165, y + 6);

  doc.text(`Peso: ${data.signosVitales?.peso || "—"}`, 18, y + 12);
  doc.text(`Talla: ${data.signosVitales?.talla || "—"}`, 55, y + 12);
  doc.text(`IMC: ${data.signosVitales?.imc || "—"}`, 90, y + 12);

  // ── MOTIVO DE CONSULTA & EVOLUCIÓN ──
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("MOTIVO DE CONSULTA:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.motivoConsulta || "Consulta médica general", 14, y + 5, { maxWidth: pageWidth - 28 });

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
  doc.text(data.planTratamiento || "Indicaciones médicas según evaluación.", 18, y + 14, { maxWidth: pageWidth - 36 });

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

  return doc;
}

export function generarPdfInformeConsulta(data: ConsultaReportData) {
  const doc = construirDocInformeConsulta(data);
  const safeName = (data.paciente.nombreCompleto || "Paciente").replace(/\s+/g, "_");
  const ts = Date.now() % 100000;
  const fileName = `Informe_${data.paciente.expediente}_${safeName}_${ts}.pdf`;
  doc.save(fileName);
}

// ══════════════════════════════════════════════════════════════════════════
// 3. CONSTRUCCIÓN DE PDF: PRESUPUESTO & COTIZACIÓN
// ══════════════════════════════════════════════════════════════════════════
export function construirDocCotizacion(data: CotizacionData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text((data.clinicaNombre || "CENTRO MÉDICO ESPECIALIZADO").toUpperCase(), 14, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PRESUPUESTO / COTIZACIÓN DE PROCEDIMIENTOS MÉDICOS", 14, 19);
  doc.text(`Fecha de Emisión: ${data.fecha} | Validez: 15 días`, 14, 24);

  // Datos paciente
  let y = 36;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Paciente: ${data.pacienteNombre} (C.I: ${data.pacienteCedula})`, 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Tasas: 1 USD = Bs. ${(data.tasaBCV || 0).toFixed(2)} | 1 USD = $${(data.tasaCOP || 0).toLocaleString()} COP`, pageWidth - 14, y, { align: "right" });

  // Tabla
  y += 7;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, "F");

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Procedimiento / Concepto", 18, y + 5);
  doc.text("Precio USD", 110, y + 5, { align: "right" });
  doc.text("Precio VES (Bs.)", 150, y + 5, { align: "right" });
  doc.text("Precio COP", pageWidth - 16, y + 5, { align: "right" });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  (data.items || []).forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6.5, "F");
    }
    doc.setTextColor(30, 41, 59);
    doc.text(item.nombre || "Procedimiento", 18, y + 4.5);
    doc.text(`$${(item.costoUSD || 0).toFixed(2)}`, 110, y + 4.5, { align: "right" });
    doc.text(`Bs. ${(item.costoVES || 0).toFixed(2)}`, 150, y + 4.5, { align: "right" });
    doc.text(`$${(item.costoCOP || 0).toLocaleString("es-CO")}`, pageWidth - 16, y + 4.5, { align: "right" });
    y += 6.5;
  });

  // Totales
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL ESTIMADO:", 20, y + 14);

  doc.setTextColor(16, 185, 129); // USD
  doc.text(`$${(data.totalUSD || 0).toFixed(2)} USD`, 80, y + 14);

  doc.setTextColor(14, 165, 233); // VES
  doc.text(`Bs. ${(data.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`, 125, y + 14);

  doc.setTextColor(139, 92, 246); // COP
  doc.text(`$${(data.totalCOP || 0).toLocaleString("es-CO")} COP`, pageWidth - 20, y + 14, { align: "right" });

  if (data.observaciones) {
    y += 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Observaciones:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.observaciones, 14, y + 4, { maxWidth: pageWidth - 28 });
  }

  // Pie y firma
  const signY = 230;
  doc.setDrawColor(148, 163, 184);
  doc.line(70, signY, 140, signY);

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(`Dr(a). ${data.doctorNombre || "Médico Responsable"}`, 105, signY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Firma y Sello de la Clínica", 105, signY + 9, { align: "center" });

  return doc;
}

export function generarPdfCotizacion(data: CotizacionData) {
  const doc = construirDocCotizacion(data);
  const ts = Date.now() % 100000;
  const fileName = `Presupuesto_${(data.pacienteNombre || "Paciente").replace(/\s+/g, "_")}_${ts}.pdf`;
  doc.save(fileName);
}

// ══════════════════════════════════════════════════════════════════════════
// 4. GENERADORES DE TEXTO PARA WHATSAPP & CORREO
// ══════════════════════════════════════════════════════════════════════════
export function generarTextoWhatsAppConsulta(data: ConsultaReportData): string {
  const lineas = [
    `🏥 *${data.clinicaNombre || "Centro Médico Especializado"}*`,
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
  return lineas.filter(Boolean).join("\n");
}

export function generarTextoEmailConsulta(data: ConsultaReportData): { subject: string; body: string } {
  const subject = `Informe Médico - ${data.paciente.nombreCompleto} (${data.paciente.expediente})`;
  const body = `Estimado(a) ${data.paciente.nombreCompleto},\n\nAdjuntamos el resumen de su informe de consulta médica realizada en ${data.clinicaNombre}:\n\n` +
    `• Fecha: ${data.paciente.fechaConsulta}\n` +
    `• Especialista: Dr(a). ${data.doctorNombre} (${data.especialidad})\n` +
    `• Diagnóstico: ${data.diagnosticoCIE10 || "Evaluación Médica"}\n` +
    `• Indicaciones / Tratamiento: ${data.planTratamiento || "Según prescripción médica"}\n` +
    (data.proximaCita ? `• Próxima Cita / Control: ${data.proximaCita}\n` : "") +
    `\nSaludos cordiales,\n${data.clinicaNombre}`;
  return { subject, body };
}

export function generarTextoWhatsAppCierre(data: CierreCajaData): string {
  const lineas = [
    `🏥 *${data.clinicaNombre || "Centro Médico"}*`,
    `📊 *Auditoría y Cierre de Caja Diario*`,
    `━━━━━━━━━━━━━━━━━━`,
    `📅 *Fecha:* ${data.fecha} | ⏰ *Hora:* ${data.horaCierre}`,
    `👨‍⚕️ *Responsable:* ${data.doctorNombre}`,
    `👥 *Total Pacientes:* ${data.totalPacientes}`,
    `━━━━━━━━━━━━━━━━━━`,
    `💵 *Dólares en Caja:* $${(data.totalUSD || 0).toFixed(2)} USD`,
    `🇻🇪 *Bolívares en Caja:* Bs. ${(data.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
    (data.totalCOP || 0) > 0 ? `🇨🇴 *Pesos COP en Caja:* $${(data.totalCOP || 0).toLocaleString("es-CO")} COP` : "",
    `📌 *Tasa BCV Aplicada:* Bs. ${(data.tasaBCV || 0).toFixed(2)}`,
    data.observaciones ? `\n📝 *Observaciones:* ${data.observaciones}` : "",
    `━━━━━━━━━━━━━━━━━━`,
    `_Cierre de caja generado automáticamente._`,
  ];
  return lineas.filter(Boolean).join("\n");
}

export function generarTextoEmailCierre(data: CierreCajaData): { subject: string; body: string } {
  const subject = `Auditoría y Cierre de Caja - ${data.fecha} (${data.horaCierre})`;
  const body = `Resumen de Cierre de Caja Diario - ${data.clinicaNombre}\n\n` +
    `• Fecha: ${data.fecha} (${data.horaCierre})\n` +
    `• Responsable: ${data.doctorNombre}\n` +
    `• Total Pacientes Atendidos: ${data.totalPacientes}\n` +
    `• Total USD: $${(data.totalUSD || 0).toFixed(2)} USD\n` +
    `• Total VES: Bs. ${(data.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}\n` +
    ((data.totalCOP || 0) > 0 ? `• Total COP: $${(data.totalCOP || 0).toLocaleString("es-CO")} COP\n` : "") +
    `• Tasa Oficial BCV: Bs. ${(data.tasaBCV || 0).toFixed(2)}\n\n` +
    (data.observaciones ? `Observaciones: ${data.observaciones}\n\n` : "") +
    `Administración - ${data.clinicaNombre}`;
  return { subject, body };
}

export function generarTextoWhatsAppCotizacion(data: CotizacionData): string {
  const itemsTexto = (data.items || [])
    .map((it) => `• *${it.nombre}*: $${(it.costoUSD || 0).toFixed(2)} USD / Bs. ${(it.costoVES || 0).toFixed(2)}`)
    .join("\n");

  const lineas = [
    `🏥 *${data.clinicaNombre || "Centro Médico"}*`,
    `📄 *Presupuesto de Procedimientos Médicos*`,
    `━━━━━━━━━━━━━━━━━━`,
    `👤 *Paciente:* ${data.pacienteNombre} (C.I: ${data.pacienteCedula})`,
    `📅 *Fecha de Emisión:* ${data.fecha}`,
    data.fechaPlanificada ? `🗓️ *Fecha Planificada:* ${data.fechaPlanificada}` : "",
    `━━━━━━━━━━━━━━━━━━`,
    `🔬 *Procedimientos:*`,
    itemsTexto,
    `━━━━━━━━━━━━━━━━━━`,
    `💵 *Total Estimado (USD):* $${(data.totalUSD || 0).toFixed(2)} USD`,
    `🇻🇪 *Total Estimado (VES):* Bs. ${(data.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
    (data.totalCOP || 0) > 0 ? `🇨🇴 *Total Estimado (COP):* $${(data.totalCOP || 0).toLocaleString("es-CO")} COP` : "",
    `📌 *Tasa BCV:* Bs. ${(data.tasaBCV || 0).toFixed(2)}`,
    data.observaciones ? `\n📝 *Observaciones:* ${data.observaciones}` : "",
    `━━━━━━━━━━━━━━━━━━`,
    `_Validez del presupuesto: 15 días continuos._`,
  ];
  return lineas.filter(Boolean).join("\n");
}

export function generarTextoEmailCotizacion(data: CotizacionData): { subject: string; body: string } {
  const subject = `Presupuesto Médico - ${data.pacienteNombre}`;
  const body = `Estimado(a) ${data.pacienteNombre},\n\nLe enviamos el presupuesto detallado de procedimientos en ${data.clinicaNombre}:\n\n` +
    `• Fecha de Emisión: ${data.fecha}\n` +
    `• Especialista: Dr(a). ${data.doctorNombre}\n` +
    `• Total USD: $${(data.totalUSD || 0).toFixed(2)} USD\n` +
    `• Total VES: Bs. ${(data.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}\n` +
    ((data.totalCOP || 0) > 0 ? `• Total COP: $${(data.totalCOP || 0).toLocaleString("es-CO")} COP\n` : "") +
    `• Tasa Oficial BCV: Bs. ${(data.tasaBCV || 0).toFixed(2)}\n\n` +
    (data.observaciones ? `Observaciones: ${data.observaciones}\n\n` : "") +
    `Validez de la cotización: 15 días.\n\nSaludos cordiales,\n${data.clinicaNombre}`;
  return { subject, body };
}
