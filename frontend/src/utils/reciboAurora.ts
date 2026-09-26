import jsPDF from "jspdf";
import type { EstadoSuscripcion, PagoSuscripcionVista } from "../api";

const METODO: Record<string, string> = {
  PAGO_MOVIL: "Pago Móvil",
  TRANSFERENCIA_VES: "Transferencia en bolívares",
  EFECTIVO_USD: "Efectivo en divisas",
  BINANCE_USDT: "Binance Pay (USDT)",
  ZELLE: "Zelle",
  CORTESIA: "Cortesía de Aurora",
};

/**
 * Recibo en PDF de un pago de suscripción que el equipo de Aurora ya verificó y registró.
 * Solo se ofrece para pagos confirmados en el servidor; los reportes en revisión no tienen recibo.
 */
export function descargarReciboPagoAurora(pago: PagoSuscripcionVista, estado: EstadoSuscripcion) {
  const doc = new jsPDF();
  const numero = `R-${String(pago.id).padStart(6, "0")}`;
  const fecha = new Date(pago.fecha);
  const monto = `${Number(pago.monto).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${pago.moneda}`;

  // Encabezado
  doc.setFillColor(13, 59, 61);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Aurora Plus", 14, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("Software administrativo · auroraplussoftware@gmail.com", 14, 23);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("RECIBO DE PAGO", 196, 15, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`N° ${numero}`, 196, 22, { align: "right" });

  // Cliente
  doc.setTextColor(30, 41, 59);
  let y = 48;
  doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text("RECIBIMOS DE", 14, y);
  doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
  doc.text(estado.nombreEmpresa || "Cliente", 14, y + 7);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  if (estado.rif) doc.text(`RIF / C.I.: ${estado.rif}`, 14, y + 13);
  doc.text(`Fecha del pago: ${fecha.toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })}`, 196, y + 7, { align: "right" });

  // Detalle
  y = 76;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 58, 3, 3, "FD");
  const fila = (etiqueta: string, valor: string, yy: number) => {
    doc.setTextColor(100, 116, 139); doc.setFontSize(9); doc.text(etiqueta, 20, yy);
    doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.text(valor, 190, yy, { align: "right" });
  };
  const periodo = pago.mesesPagados && pago.mesesPagados > 0
    ? `${pago.mesesPagados} ${pago.mesesPagados === 1 ? "mes" : "meses"}`
    : pago.diasAcreditados ? `${pago.diasAcreditados} días` : "—";
  const plan = estado.planSolicitado === "full" ? "Aurora Full" : estado.planSolicitado === "basico" ? "Aurora Básico" : "Aurora Plus";
  fila("Concepto", `Suscripción ${plan}`, y + 10);
  fila("Tiempo acreditado", periodo, y + 20);
  fila("Método de pago", METODO[pago.metodoPago] || pago.metodoPago || "—", y + 30);
  fila("Referencia", pago.referencia || "—", y + 40);
  doc.setDrawColor(203, 213, 225); doc.line(20, y + 45, 190, y + 45);
  doc.setFont("helvetica", "bold");
  fila("Monto recibido", monto, y + 52);
  doc.setFont("helvetica", "normal");

  // Estado
  y = 146;
  doc.setTextColor(4, 120, 87); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Pago verificado por el equipo de Aurora Plus", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  if (estado.fechaVencimiento) {
    const vence = new Date(estado.fechaVencimiento + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Tu acceso está vigente hasta el ${vence} (a la fecha de emisión de este recibo).`, 14, y + 7);
  }

  doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text(`Emitido el ${new Date().toLocaleString("es-VE")} · Este recibo no sustituye una factura fiscal.`, 14, 285);

  doc.save(`Recibo_Aurora_${numero}.pdf`);
}
