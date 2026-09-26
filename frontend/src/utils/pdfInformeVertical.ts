import { jsPDF } from "jspdf";
import type {
  DetalleVertical, MetricaVertical, OperacionRestaurantes, ProduccionGanaderia, ClinicaOdontologia,
} from "../api";
import {
  type RGB, AMBAR, ROJO, GRIS, TINTA, MARGEN, DINERO, OPERACIONES, PERSONAS, leyendaColores,
  hexARgb, encabezado, pie, numerarPaginas, tarjetas, tituloSeccion, barrasMensuales, barrasHorizontales, tabla, vinetas,
} from "./pdfComun";
import { colorDeMetrica } from "./coloresSignificado";

/**
 * "Informe de <vertical>" del super-admin: portada con números clave y
 * hallazgos, métricas con su evolución, la operación propia de la vertical
 * (si la tiene) y la lista completa de negocios.
 */

export interface DatosPdfInformeVertical {
  detalle: DetalleVertical;
  nombre: string;
  descripcion: string;
  colorHex: string;
  periodoLabel: string;
  restaurantes?: OperacionRestaurantes | null;
  ganaderia?: ProduccionGanaderia | null;
  odontologia?: ClinicaOdontologia | null;
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const PIE = "Generado automáticamente por Aurora Plus — Administración de la plataforma. Documento interno; contiene datos de clientes.";

const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });
const dinero = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (v: number) => `$${dinero.format(v)}`;

function etiquetaMes(yyyyMm: string) {
  const [a, m] = yyyyMm.split("-");
  return `${MESES_CORTOS[Number(m) - 1]} ${a.slice(2)}`;
}

function nombreMes(yyyyMm: string) {
  const [a, m] = yyyyMm.split("-");
  return `${MESES_LARGOS[Number(m) - 1]} ${a}`;
}

function suma(valor: number | null | undefined, unidad: string | null) {
  if (valor == null) return "—";
  return unidad === "USD" ? usd(Number(valor)) : `${numero.format(Number(valor))} ${unidad ?? ""}`.trim();
}

/** Métrica principal: la primera con serie por mes. */
function principal(d: DetalleVertical): MetricaVertical | undefined {
  return d.metricas.find((m) => m.serie);
}

export function generarPdfInformeVertical(datos: DatosPdfInformeVertical) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const color = hexARgb(datos.colorHex);
  const fecha = new Date().toLocaleDateString("es-VE");

  portada(doc, datos, color, fecha);

  doc.addPage("letter", "landscape");
  metricasYEvolucion(doc, datos, color, fecha);

  if (datos.restaurantes) { doc.addPage("letter", "landscape"); operacionRestaurantes(doc, datos, datos.restaurantes, color, fecha); }
  if (datos.ganaderia) { doc.addPage("letter", "landscape"); produccionGanaderia(doc, datos, datos.ganaderia, color, fecha); }
  if (datos.odontologia) { doc.addPage("letter", "landscape"); clinicaOdontologia(doc, datos, datos.odontologia, color, fecha); }

  doc.addPage("letter", "landscape");
  negocios(doc, datos, color, fecha);

  numerarPaginas(doc);
  doc.save(`Informe_${datos.detalle.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ───────────────────────────── PORTADA ─────────────────────────────

function portada(doc: jsPDF, datos: DatosPdfInformeVertical, color: RGB, fecha: string) {
  const { detalle: d } = datos;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const k = d.kpis;

  const y0 = encabezado(doc, `INFORME DE ${datos.nombre.toUpperCase()}`, datos.descripcion,
    `Período: ${datos.periodoLabel}  ·  ${k.negocios} negocio(s)  ·  Generado: ${fecha}`, color);

  tarjetas(doc, y0, [
    { label: "NEGOCIOS", val: numero.format(k.negocios), color: TINTA, nota: `${k.activos} activos · ${k.suspendidos} suspendidos` },
    { label: "USÁNDOLO DE VERDAD", val: numero.format(k.conActividad), color: PERSONAS, nota: `de ${k.activos} activos` },
    { label: "EN RIESGO DE ABANDONO", val: numero.format(k.enRiesgo), color: k.enRiesgo > 0 ? ROJO : GRIS, nota: "sin uso en 14+ días" },
    { label: "POR VENCER", val: numero.format(k.porVencer), color: k.porVencer > 0 ? AMBAR : GRIS, nota: "próximos 7 días" },
    { label: "INGRESOS DEL PERÍODO", val: usd(Number(k.ingresosPeriodo)), color: DINERO, nota: `${usd(Number(k.ingresosHistorico))} históricos` },
    { label: "USUARIOS", val: numero.format(k.usuarios), color: PERSONAS, nota: `${k.altasPeriodo} negocio(s) nuevo(s)` },
  ]);

  const m = principal(d);
  const chartX = 24, chartY = y0 + 34, chartW = W * 0.56, chartH = H - chartY - 28;
  if (m?.serie) {
    const usarSuma = !!m.serieSuma;
    const valores = (usarSuma ? m.serieSuma! : m.serie).map(Number);
    tituloSeccion(doc, `${m.etiqueta} por mes${usarSuma ? ` (${m.unidadSuma === "USD" ? "monto en dólares" : m.unidadSuma})` : ""} — últimos 12 meses`, MARGEN, chartY - 5);
    barrasMensuales(doc, valores, null, chartX, chartY, chartW, chartH, hexARgb(colorDeMetrica(m)), d.meses.map(etiquetaMes),
      (v) => (usarSuma && m.unidadSuma === "USD" ? `$${numero.format(v)}` : numero.format(v)));
  } else {
    tituloSeccion(doc, "Esta vertical todavía no tiene métricas con fecha.", MARGEN, chartY - 5);
  }

  const hx = chartX + chartW + 12;
  tituloSeccion(doc, "Hallazgos principales", hx, chartY - 5);
  vinetas(doc, hallazgos(datos), hx, chartY, W - hx - MARGEN);
  leyendaColores(doc, MARGEN, H - 16);
  pie(doc, PIE);
}

function hallazgos(datos: DatosPdfInformeVertical): { texto: string; color: RGB }[] {
  const d = datos.detalle;
  const k = d.kpis;
  const salida: { texto: string; color: RGB }[] = [];
  if (k.negocios === 0) return [{ texto: "Todavía no hay negocios en esta vertical.", color: GRIS }];

  const adopcion = k.activos > 0 ? Math.round((k.conActividad / k.activos) * 100) : 0;
  salida.push({ texto: `Adopción: ${k.conActividad} de ${k.activos} negocios activos (${adopcion}%) registraron operaciones en el período.`, color: adopcion >= 60 ? PERSONAS : adopcion >= 30 ? AMBAR : ROJO });

  if (k.enRiesgo > 0) {
    const nombres = d.negocios.filter((n) => n.enRiesgo).slice(0, 3).map((n) => n.nombre).join(", ");
    salida.push({ texto: `${k.enRiesgo} negocio(s) activos sin uso en 14 días o más${nombres ? ` (entre ellos ${nombres})` : ""}. Conviene contactarlos.`, color: ROJO });
  }
  if (k.porVencer > 0) salida.push({ texto: `${k.porVencer} licencia(s) vencen en los próximos 7 días.`, color: AMBAR });

  const m = principal(d);
  if (m?.serie) {
    const valores = (m.serieSuma ?? m.serie).map(Number);
    const max = Math.max(...valores);
    if (max > 0) {
      const i = valores.indexOf(max);
      salida.push({ texto: `Mes con más ${m.etiqueta.toLowerCase()}: ${nombreMes(d.meses[i])} (${m.serieSuma ? suma(max, m.unidadSuma) : numero.format(max)}).`, color: hexARgb(colorDeMetrica(m)) });
    }
    // El mes en curso va a medias: se compara el último mes completo contra el anterior.
    const ultimo = valores[10], previo = valores[9];
    if (previo > 0) {
      const v = Math.round(((ultimo - previo) / previo) * 100);
      salida.push({ texto: `${m.etiqueta} en ${nombreMes(d.meses[10])} (último mes completo): ${v >= 0 ? "+" : ""}${v}% frente a ${nombreMes(d.meses[9])}.`, color: v >= 0 ? hexARgb(colorDeMetrica(m)) : AMBAR });
    }
  }

  const top = [...d.negocios]
    .map((n) => ({ n, uso: Object.values(n.metricas).reduce((s, x) => s + (x.periodo ?? 0), 0) }))
    .sort((a, b) => b.uso - a.uso)[0];
  if (top && top.uso > 0) salida.push({ texto: `El negocio más activo es ${top.n.nombre}, con ${numero.format(top.uso)} registros en el período.`, color: PERSONAS });

  salida.push({ texto: `Ingresos de suscripciones: ${usd(Number(k.ingresosPeriodo))} en el período y ${usd(Number(k.ingresosHistorico))} en total.`, color: DINERO });
  return salida;
}

// ─────────────────────── MÉTRICAS Y EVOLUCIÓN ───────────────────────

function metricasYEvolucion(doc: jsPDF, datos: DatosPdfInformeVertical, color: RGB, fecha: string) {
  const d = datos.detalle;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cabecera = () => encabezado(doc, `${datos.nombre.toUpperCase()} — MÉTRICAS Y EVOLUCIÓN`, datos.descripcion, `Período: ${datos.periodoLabel}  ·  Generado: ${fecha}`, color);
  let y = cabecera();

  const mesAct = d.meses[11], mesAnt = d.meses[10];
  y = tabla(doc, [
    { titulo: "MÉTRICA", ancho: 62 },
    { titulo: "EN EL PERÍODO", ancho: 28, alinear: "right" },
    { titulo: "MONTO PERÍODO", ancho: 32, alinear: "right" },
    { titulo: "HISTÓRICO", ancho: 26, alinear: "right" },
    { titulo: "MONTO HISTÓRICO", ancho: 34, alinear: "right" },
    { titulo: etiquetaMes(mesAnt).toUpperCase(), ancho: 22, alinear: "right" },
    { titulo: etiquetaMes(mesAct).toUpperCase(), ancho: 22, alinear: "right" },
    { titulo: "VARIACIÓN", ancho: 0, alinear: "right" },
  ], d.metricas.map((m) => {
    const ant = m.serie ? Number(m.serie[10]) : null;
    const act = m.serie ? Number(m.serie[11]) : null;
    const v = ant && act != null ? Math.round(((act - ant) / ant) * 100) : null;
    return {
      celdas: [
        m.etiqueta,
        m.conFecha ? numero.format(Number(m.periodo ?? 0)) : "—",
        m.unidadSuma ? suma(m.sumaPeriodo, m.unidadSuma) : "—",
        numero.format(Number(m.total)),
        m.unidadSuma ? suma(m.sumaTotal, m.unidadSuma) : "—",
        ant == null ? "—" : numero.format(ant),
        act == null ? "—" : numero.format(act),
        v == null ? "—" : `${v >= 0 ? "+" : ""}${v}%`,
      ],
      negrita: [0, 1],
      colores: (v == null ? {} : { 7: v >= 0 ? TINTA : ROJO }) as Record<number, RGB>,
    };
  }), y, () => { pie(doc, PIE); doc.addPage("letter", "landscape"); return cabecera(); });

  // Ingresos y altas por mes.
  const alto = H - y - 40;
  if (alto > 40) {
    const w = (W - 2 * MARGEN - 30) / 2;
    const cy = y + 14;
    tituloSeccion(doc, "Ingresos de suscripciones por mes (USD)", MARGEN, cy - 5);
    if (d.serieIngresos.some((v) => Number(v) > 0)) {
      barrasMensuales(doc, d.serieIngresos.map(Number), null, MARGEN + 10, cy, w, alto, DINERO, d.meses.map(etiquetaMes), (v) => `$${numero.format(v)}`);
    } else {
      notaVacia(doc, "No se registraron pagos de suscripción de esta vertical en los últimos 12 meses.", MARGEN, cy + 4);
    }
    const x2 = MARGEN + w + 30;
    tituloSeccion(doc, "Negocios nuevos por mes", x2 - 10, cy - 5);
    if (d.serieAltas.some((v) => Number(v) > 0)) {
      barrasMensuales(doc, d.serieAltas.map(Number), null, x2, cy, w, alto, PERSONAS, d.meses.map(etiquetaMes));
    } else {
      notaVacia(doc, "No hubo negocios nuevos en los últimos 12 meses.", x2 - 10, cy + 4);
    }
  }
  pie(doc, PIE);
}

// ───────────────────────── OPERACIÓN PROPIA ─────────────────────────

function operacionRestaurantes(doc: jsPDF, datos: DatosPdfInformeVertical, op: OperacionRestaurantes, color: RGB, fecha: string) {
  const W = doc.internal.pageSize.getWidth();
  const y0 = encabezado(doc, "RESTAURANTES — OPERACIÓN", "Horas pico, días, canales, métodos de pago y platos", `Período: ${datos.periodoLabel}  ·  Generado: ${fecha}`, color);
  const pico = op.porHora.indexOf(Math.max(...op.porHora));
  tarjetas(doc, y0, [
    { label: "COMANDAS", val: numero.format(op.comandas), color: OPERACIONES, nota: "sin anuladas" },
    { label: "VENTAS DE LOS RESTAURANTES", val: usd(Number(op.ventas)), color: DINERO, nota: "consumo registrado" },
    { label: "TICKET PROMEDIO", val: usd(Number(op.ticketPromedio)), color: DINERO, nota: "por comanda" },
    { label: "HORA PICO", val: op.comandas ? `${String(pico).padStart(2, "0")}:00` : "—", color: TINTA, nota: op.comandas ? `${op.porHora[pico]} comandas` : "sin comandas" },
  ]);
  const cy = y0 + 34, ch = 44;
  const w1 = (W - 2 * MARGEN) * 0.62;
  tituloSeccion(doc, "Comandas por hora del día", MARGEN, cy - 5);
  barrasMensuales(doc, op.porHora.map(Number), null, MARGEN + 8, cy, w1 - 8, ch, OPERACIONES, op.porHora.map((_, h) => String(h)));
  const x2 = MARGEN + w1 + 14;
  tituloSeccion(doc, "Por día de la semana", x2 - 6, cy - 5);
  barrasMensuales(doc, op.porDiaSemana.map(Number), null, x2, cy, W - x2 - MARGEN, ch, OPERACIONES, DIAS_SEMANA);

  const ry = cy + ch + 14;
  const cw = (W - 2 * MARGEN - 2 * 10) / 3;
  tituloSeccion(doc, "Canales de venta", MARGEN, ry);
  barrasHorizontales(doc, op.canales.map((c) => ({ etiqueta: c.etiqueta, valor: Number(c.n) })), MARGEN, ry + 3, cw, OPERACIONES, 5);
  tituloSeccion(doc, "Métodos de pago", MARGEN + cw + 10, ry);
  barrasHorizontales(doc, op.metodosPago.map((c) => ({ etiqueta: c.etiqueta, valor: Number(c.n) })), MARGEN + cw + 10, ry + 3, cw, OPERACIONES, 5);
  tituloSeccion(doc, "Platos más vendidos", MARGEN + 2 * (cw + 10), ry);
  barrasHorizontales(doc, op.topPlatos.map((p) => ({ etiqueta: p.nombre, valor: Number(p.cantidad), texto: `${numero.format(Number(p.cantidad))} · ${usd(Number(p.ventas))}` })), MARGEN + 2 * (cw + 10), ry + 3, cw, OPERACIONES, 5);
  pie(doc, PIE);
}

function produccionGanaderia(doc: jsPDF, datos: DatosPdfInformeVertical, op: ProduccionGanaderia, color: RGB, fecha: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const y0 = encabezado(doc, "GANADERÍA — PRODUCCIÓN Y HATO", "Leche, calidad, hato y fincas", `Período: ${datos.periodoLabel}  ·  Generado: ${fecha}`, color);
  const hato = op.hatoPorEstado.reduce((s, x) => s + Number(x.n), 0);
  tarjetas(doc, y0, [
    { label: "LECHE ORDEÑADA", val: `${numero.format(Number(op.litros))} L`, color: OPERACIONES, nota: "en el período" },
    { label: "ORDEÑOS", val: numero.format(op.ordenos), color: OPERACIONES, nota: `${op.vacasOrdenadas} vaca(s)` },
    { label: "PROMEDIO POR ORDEÑO", val: `${numero.format(Number(op.promedioPorOrdeno))} L`, color: OPERACIONES },
    { label: "GRASA / PROTEÍNA", val: `${numero.format(Number(op.grasaPromedio))}% / ${numero.format(Number(op.proteinaPromedio))}%`, color: OPERACIONES, nota: "promedio" },
    { label: "ANIMALES EN HATO", val: numero.format(hato), color: OPERACIONES, nota: "todas las fincas" },
  ]);
  const leche = datos.detalle.metricas.find((m) => m.clave === "leche");
  const cy = y0 + 34, ch = 50;
  if (leche?.serieSuma) {
    tituloSeccion(doc, "Litros de leche por mes — últimos 12 meses", MARGEN, cy - 5);
    barrasMensuales(doc, leche.serieSuma.map(Number), null, MARGEN + 10, cy, W - 2 * MARGEN - 10, ch, OPERACIONES, datos.detalle.meses.map(etiquetaMes), (v) => numero.format(v));
  }
  const ry = cy + ch + 14;
  const cw = (W - 2 * MARGEN - 3 * 10) / 4;
  const col = (i: number) => MARGEN + i * (cw + 10);
  tituloSeccion(doc, "Hato por estado", col(0), ry);
  barrasHorizontales(doc, op.hatoPorEstado.map((c) => ({ etiqueta: c.etiqueta, valor: Number(c.n) })), col(0), ry + 3, cw, OPERACIONES, 5);
  tituloSeccion(doc, "Hato por tipo", col(1), ry);
  barrasHorizontales(doc, op.hatoPorTipo.map((c) => ({ etiqueta: c.etiqueta, valor: Number(c.n) })), col(1), ry + 3, cw, OPERACIONES, 5);
  tituloSeccion(doc, "Hato por sexo", col(2), ry);
  barrasHorizontales(doc, op.hatoPorSexo.map((c) => ({ etiqueta: c.etiqueta, valor: Number(c.n) })), col(2), ry + 3, cw, OPERACIONES, 5);
  tituloSeccion(doc, "Fincas con más producción", col(3), ry);
  barrasHorizontales(doc, op.topFincas.map((f) => ({ etiqueta: f.nombre, valor: Number(f.litros), texto: `${numero.format(Number(f.litros))} L` })), col(3), ry + 3, cw, OPERACIONES, Math.floor((H - ry - 20) / 9));
  pie(doc, PIE);
}

function clinicaOdontologia(doc: jsPDF, datos: DatosPdfInformeVertical, op: ClinicaOdontologia, color: RGB, fecha: string) {
  const W = doc.internal.pageSize.getWidth();
  const y0 = encabezado(doc, "ODONTOLOGÍA — TRATAMIENTOS Y CARTERA", "Planes de tratamiento, cobros y procedimientos", `Período: ${datos.periodoLabel}  ·  Generado: ${fecha}`, color);
  const pendiente = Math.max(0, Number(op.carteraTotal) - Number(op.carteraPagada));
  tarjetas(doc, y0, [
    { label: "PLANES DE TRATAMIENTO", val: numero.format(op.planesPorEstado.reduce((s, p) => s + Number(p.n), 0)), color: OPERACIONES },
    { label: "CARTERA TOTAL", val: usd(Number(op.carteraTotal)), color: DINERO },
    { label: "COBRADO", val: usd(Number(op.carteraPagada)), color: DINERO },
    { label: "POR COBRAR", val: usd(pendiente), color: pendiente > 0 ? AMBAR : GRIS },
  ]);
  const ry = y0 + 34;
  const cw = (W - 2 * MARGEN - 12) / 2;
  tituloSeccion(doc, "Planes por estado", MARGEN, ry);
  barrasHorizontales(doc, op.planesPorEstado.map((p) => ({ etiqueta: p.etiqueta, valor: Number(p.n), texto: `${p.n} · ${usd(Number(p.monto))}` })), MARGEN, ry + 3, cw, OPERACIONES, 10);
  tituloSeccion(doc, "Procedimientos más realizados (período)", MARGEN + cw + 12, ry);
  barrasHorizontales(doc, op.topProcedimientos.map((p) => ({ etiqueta: p.etiqueta, valor: Number(p.n) })), MARGEN + cw + 12, ry + 3, cw, OPERACIONES, 10);
  pie(doc, PIE);
}

// ───────────────────────────── NEGOCIOS ─────────────────────────────

function negocios(doc: jsPDF, datos: DatosPdfInformeVertical, color: RGB, fecha: string) {
  const d = datos.detalle;
  const H = doc.internal.pageSize.getHeight();
  const cabecera = () => encabezado(doc, `${datos.nombre.toUpperCase()} — NEGOCIOS`, `${d.negocios.length} negocio(s) · en rojo claro los que están en riesgo de abandono`, `Período: ${datos.periodoLabel}  ·  Generado: ${fecha}`, color);
  const y0 = cabecera();
  const metricas = d.metricas.filter((m) => m.conFecha).slice(0, 3);
  const y = tabla(doc, [
    { titulo: "ID", ancho: 10, alinear: "center" },
    { titulo: "NEGOCIO", ancho: 54 },
    { titulo: "PLAN", ancho: 22 },
    { titulo: "ESTADO", ancho: 24 },
    { titulo: "USUARIOS", ancho: 15, alinear: "right" },
    ...metricas.map((m) => ({ titulo: m.etiqueta.toUpperCase(), ancho: 26, alinear: "right" as const })),
    { titulo: "PAGADO", ancho: 20, alinear: "right" },
    { titulo: "ÚLTIMA ACTIVIDAD", ancho: 0, alinear: "center" },
  ], d.negocios.map((n) => {
    const estado = !n.activa ? "Suspendido" : n.diasRestantes != null && n.diasRestantes < 0 ? "Vencido"
      : n.diasRestantes != null && n.diasRestantes <= 7 ? `Vence en ${n.diasRestantes} d` : "Activo";
    const colores: Record<number, RGB> = {};
    if (estado !== "Activo") colores[3] = estado.startsWith("Vence") ? AMBAR : ROJO;
    return {
      celdas: [
        String(n.tenantId), n.nombre, n.plan, estado, String(n.usuarios),
        ...metricas.map((m) => {
          const v = n.metricas[m.clave];
          if (!v?.periodo) return "0";
          return m.unidadSuma && v.sumaPeriodo ? `${numero.format(v.periodo)} · ${suma(v.sumaPeriodo, m.unidadSuma)}` : numero.format(v.periodo);
        }),
        usd(Number(n.ingresosHistorico)),
        n.ultimaActividad ? new Date(n.ultimaActividad).toLocaleDateString("es-VE") : "Nunca",
      ],
      negrita: [1],
      colores,
      resaltar: n.enRiesgo,
    };
  }), y0, () => { pie(doc, PIE); doc.addPage("letter", "landscape"); return cabecera(); });
  if (y + 10 < H - 16) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Las columnas de métricas muestran lo registrado en el período elegido. \"Pagado\" es el total histórico de suscripciones confirmadas.", MARGEN, y + 7);
  }
  pie(doc, PIE);
}

function notaVacia(doc: jsPDF, texto: string, x: number, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(texto, x, y);
}
