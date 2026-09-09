import { useState } from "react";
import { createPortal } from "react-dom";
import {
  type ConsultaReportData,
  type CierreCajaData,
  type CotizacionData,
  generarPdfInformeConsulta,
  generarPdfCierreCaja,
  generarPdfCotizacion,
  generarTextoWhatsAppConsulta,
  generarTextoEmailConsulta,
  generarTextoWhatsAppCierre,
  generarTextoEmailCierre,
  generarTextoWhatsAppCotizacion,
  generarTextoEmailCotizacion,
  abrirWhatsAppDirecto,
  abrirWhatsAppWebDirecto,
  abrirWhatsAppAppDirecto,
  formatearTelefonoParaWhatsApp,
  obtenerArchivoPdfDocumento,
  obtenerBase64PdfDocumento,
  compartirNativoConArchivo,
} from "../utils/pdfReports";

export type TipoDocumento = "INFORME_MEDICO" | "CIERRE_CAJA" | "COTIZACION";

export interface DocumentoVisorPayload {
  tipo: TipoDocumento;
  data: ConsultaReportData | CierreCajaData | CotizacionData;
}

export default function DocumentoPreviewModal({
  payload,
  onClose,
}: {
  payload: DocumentoVisorPayload;
  onClose: () => void;
}) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [docData, setDocData] = useState<any>(JSON.parse(JSON.stringify(payload.data)));
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState<string>(
    payload.tipo === "INFORME_MEDICO"
      ? (payload.data as ConsultaReportData).paciente?.telefono || ""
      : payload.tipo === "COTIZACION"
      ? (payload.data as CotizacionData).pacienteTelefono || ""
      : ""
  );
  const [correoDestino, setCorreoDestino] = useState<string>(() => {
    if (payload.tipo === "INFORME_MEDICO") {
      return (payload.data as ConsultaReportData).paciente?.email || "";
    }
    if (payload.tipo === "COTIZACION") {
      return (payload.data as CotizacionData).pacienteEmail || "";
    }
    return "";
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalCompartir, setModalCompartir] = useState<"whatsapp" | "email" | null>(null);
  const [enviandoEmail, setEnviandoEmail] = useState<boolean>(false);

  const mostrarToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── IMPRIMIR DIRECTO CON CALIDAD PERFECTA ──
  const handleImprimir = () => {
    window.print();
  };

  // ── DESCARGAR PDF ──
  const handleDescargarPdf = () => {
    try {
      if (payload.tipo === "INFORME_MEDICO") {
        generarPdfInformeConsulta(docData as ConsultaReportData);
      } else if (payload.tipo === "CIERRE_CAJA") {
        generarPdfCierreCaja(docData as CierreCajaData);
      } else if (payload.tipo === "COTIZACION") {
        generarPdfCotizacion(docData as CotizacionData);
      }
      mostrarToast("Documento PDF generado y descargado con éxito");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al generar el PDF");
    }
  };

  // ── GENERAR TEXTO COMPLETO PARA COPIAR ──
  const obtenerTextoResumen = (): string => {
    try {
      if (payload.tipo === "INFORME_MEDICO") {
        return generarTextoWhatsAppConsulta(docData);
      } else if (payload.tipo === "CIERRE_CAJA") {
        return generarTextoWhatsAppCierre(docData);
      } else {
        return generarTextoWhatsAppCotizacion(docData);
      }
    } catch (err) {
      console.error("Error al generar resumen:", err);
      return "Informe médico generado por Mediclinic Pro.";
    }
  };

  const handleCopiarTexto = () => {
    const texto = obtenerTextoResumen();
    navigator.clipboard.writeText(texto);
    mostrarToast("Resumen copiado al portapapeles");
  };

  // ── ENVIAR POR WHATSAPP ──
  const handleEnviarWhatsApp = () => {
    handleDescargarPdf();
    const texto = obtenerTextoResumen();
    abrirWhatsAppDirecto(telefonoWhatsApp, texto);
    mostrarToast("📄 PDF descargado. Adjúntalo con el clip (📎) en WhatsApp.");
    setModalCompartir(null);
  };

  // ── GENERAR ASUNTO Y CUERPO DE CORREO ──
  const obtenerDatosEmail = (): { subject: string; body: string } => {
    if (payload.tipo === "INFORME_MEDICO") {
      return generarTextoEmailConsulta(docData as ConsultaReportData);
    } else if (payload.tipo === "CIERRE_CAJA") {
      return generarTextoEmailCierre(docData as CierreCajaData);
    } else {
      return generarTextoEmailCotizacion(docData as CotizacionData);
    }
  };

  // ── ENVIAR VÍA GMAIL WEB (DESCARGA PDF Y ABRE GMAIL CON DESTINATARIO Y MENSAJE) ──
  const handleEnviarGmail = () => {
    handleDescargarPdf();
    const { subject, body } = obtenerDatosEmail();
    const to = correoDestino.trim();
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    mostrarToast("📄 PDF descargado y Gmail abierto con destinatario y texto listos.");
    setModalCompartir(null);
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          PORTAL DE IMPRESIÓN DIRECTA (FUERA DEL DOM DE LA APP)
          Se renderiza en document.body para que NUNCA sufra por márgenes,
          scroll o layouts de modales. Al imprimir, es lo ÚNICO visible.
         ══════════════════════════════════════════════════════════════════ */}
      {createPortal(
        <div id="mediclinic-print-portal" className="print-only">
          <style>{`
            @media screen {
              #mediclinic-print-portal {
                display: none !important;
              }
            }
            @media print {
              @page {
                size: letter portrait;
                margin: 10mm 12mm 10mm 12mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Ocultar toda la aplicación normal y modales */
              body > *:not(#mediclinic-print-portal) {
                display: none !important;
              }
              #mediclinic-print-portal {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                background: white !important;
                color: #0f172a !important;
              }
              .print-avoid-break {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>
          <div className="print-content-sheet max-w-3xl mx-auto">
            <DocumentoContenidoImpreso tipo={payload.tipo} docData={docData} />
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL EN PANTALLA (INTERACTIVO / EDITABLE / ACCIONES)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
          
          {/* ── HEADER SUPERIOR DE ACCIONES ── */}
          <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span className="text-teal-400">
                  {payload.tipo === "INFORME_MEDICO"
                    ? "Informe Médico & Historia Clínica"
                    : payload.tipo === "CIERRE_CAJA"
                    ? "Auditoría & Cierre de Caja"
                    : "Presupuesto / Cotización Médica"}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {modoEdicion
                  ? "Modo de edición activo (puedes ajustar cualquier dato antes de imprimir o exportar)"
                  : "Vista previa oficial del documento"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Editar / Vista Previa */}
              <button
                onClick={() => setModoEdicion(!modoEdicion)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  modoEdicion
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700"
                }`}
                title="Modificar texto o campos del documento"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>{modoEdicion ? "Ver Vista Previa" : "Modo Editor"}</span>
              </button>

              {/* Imprimir Directo */}
              <button
                onClick={handleImprimir}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Imprimir documento oficial en impresora física o PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimir</span>
              </button>

              {/* Descargar PDF */}
              <button
                onClick={handleDescargarPdf}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Descargar archivo PDF con firma y membrete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>PDF</span>
              </button>

              {/* Compartir WhatsApp */}
              <button
                onClick={() => setModalCompartir("whatsapp")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Enviar por WhatsApp"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>WhatsApp</span>
              </button>

              {/* Compartir Correo */}
              <button
                onClick={() => setModalCompartir("email")}
                className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Enviar por Correo Electrónico"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Correo</span>
              </button>

              {/* Copiar Resumen */}
              <button
                onClick={handleCopiarTexto}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="Copiar texto resumen al portapapeles"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>

              {/* Botón Cerrar */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                title="Cerrar visor"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── TOAST DE NOTIFICACIÓN ── */}
          {toastMsg && (
            <div className="bg-emerald-500 text-white text-xs font-semibold py-1.5 px-4 text-center animate-fade-in">
              {toastMsg}
            </div>
          )}

          {/* ── CUERPO PRINCIPAL DEL VISOR (MODO EDICIÓN vs VISTA PREVIA) ── */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40">
            {modoEdicion ? (
              /* ══════════ FORMULARIO DE EDICIÓN RÁPIDA ══════════ */
              <div className="space-y-4 max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <h4 className="font-bold text-sm text-teal-400 border-b border-slate-800 pb-2">
                  Editar Datos del Documento
                </h4>

                {payload.tipo === "INFORME_MEDICO" && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Nombre de Clínica / Centro</label>
                        <input
                          type="text"
                          value={docData.clinicaNombre || ""}
                          onChange={(e) => setDocData({ ...docData, clinicaNombre: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Médico Tratante</label>
                        <input
                          type="text"
                          value={docData.doctorNombre || ""}
                          onChange={(e) => setDocData({ ...docData, doctorNombre: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Nombre del Paciente</label>
                        <input
                          type="text"
                          value={docData.paciente?.nombreCompleto || ""}
                          onChange={(e) =>
                            setDocData({
                              ...docData,
                              paciente: { ...docData.paciente, nombreCompleto: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Cédula / DNI</label>
                        <input
                          type="text"
                          value={docData.paciente?.identificacion || ""}
                          onChange={(e) =>
                            setDocData({
                              ...docData,
                              paciente: { ...docData.paciente, identificacion: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Motivo de Consulta</label>
                      <input
                        type="text"
                        value={docData.motivoConsulta || ""}
                        onChange={(e) => setDocData({ ...docData, motivoConsulta: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Diagnóstico (CIE-10)</label>
                      <input
                        type="text"
                        value={docData.diagnosticoCIE10 || ""}
                        onChange={(e) => setDocData({ ...docData, diagnosticoCIE10: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Plan de Tratamiento & Receta (Rx)</label>
                      <textarea
                        rows={5}
                        value={docData.planTratamiento || ""}
                        onChange={(e) => setDocData({ ...docData, planTratamiento: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                        placeholder="1. Medicamento dosis horario&#10;2. Indicaciones generales..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Próxima Cita / Control</label>
                      <input
                        type="text"
                        value={docData.proximaCita || ""}
                        onChange={(e) => setDocData({ ...docData, proximaCita: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        placeholder="Ej. En 15 días o 2026-09-22"
                      />
                    </div>
                  </div>
                )}

                {payload.tipo === "CIERRE_CAJA" && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Fecha del Cierre</label>
                        <input
                          type="text"
                          value={docData.fecha || ""}
                          onChange={(e) => setDocData({ ...docData, fecha: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Hora de Cierre</label>
                        <input
                          type="text"
                          value={docData.horaCierre || ""}
                          onChange={(e) => setDocData({ ...docData, horaCierre: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Responsable de Caja</label>
                      <input
                        type="text"
                        value={docData.responsableNombre || docData.doctorNombre || ""}
                        onChange={(e) => setDocData({ ...docData, responsableNombre: e.target.value, doctorNombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Total USD ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={docData.totalUSD || 0}
                          onChange={(e) => setDocData({ ...docData, totalUSD: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Total VES (Bs.)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={docData.totalVES || 0}
                          onChange={(e) => setDocData({ ...docData, totalVES: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Tasa BCV</label>
                        <input
                          type="number"
                          step="0.01"
                          value={docData.tasaBCV || 0}
                          onChange={(e) => setDocData({ ...docData, tasaBCV: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Observaciones del Cierre</label>
                      <textarea
                        rows={3}
                        value={docData.observaciones || ""}
                        onChange={(e) => setDocData({ ...docData, observaciones: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        placeholder="Anotaciones de balance o auditoría..."
                      />
                    </div>
                  </div>
                )}

                {payload.tipo === "COTIZACION" && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Nombre del Paciente</label>
                        <input
                          type="text"
                          value={docData.pacienteNombre || ""}
                          onChange={(e) => setDocData({ ...docData, pacienteNombre: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Cédula</label>
                        <input
                          type="text"
                          value={docData.pacienteCedula || ""}
                          onChange={(e) => setDocData({ ...docData, pacienteCedula: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Observaciones del Presupuesto</label>
                      <textarea
                        rows={3}
                        value={docData.observaciones || ""}
                        onChange={(e) => setDocData({ ...docData, observaciones: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        placeholder="Notas especiales, condiciones o instrucciones quirúrgicas..."
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setModoEdicion(false);
                      mostrarToast("Cambios reflejados en el visor");
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all"
                  >
                    Aplicar y Ver Documento
                  </button>
                </div>
              </div>
            ) : (
              /* ══════════ VISTA PREVIA EN PANTALLA ══════════ */
              <div className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-10 max-w-3xl mx-auto font-sans text-xs">
                <DocumentoContenidoImpreso tipo={payload.tipo} docData={docData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL PARA ENVIAR POR WHATSAPP ── */}
      {modalCompartir === "whatsapp" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full text-slate-100 space-y-4 shadow-2xl">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Enviar por WhatsApp</span>
            </h4>
            <p className="text-xs text-slate-400">
              Compatible con cualquier país. Puedes seleccionar el prefijo rápido o escribir el número con su código internacional (+58, +57, +34, +1, +54, etc.).
            </p>

            {/* Selector Rápido de País */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Prefijos Frecuentes:</span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { label: "Venezuela (+58)", code: "58" },
                  { label: "Colombia (+57)", code: "57" },
                  { label: "España (+34)", code: "34" },
                  { label: "EE.UU. (+1)", code: "1" },
                  { label: "Argentina (+54)", code: "54" },
                  { label: "México (+52)", code: "52" },
                  { label: "Chile (+56)", code: "56" },
                  { label: "Perú (+51)", code: "51" },
                ].map((pais) => (
                  <button
                    key={pais.code}
                    type="button"
                    onClick={() => {
                      const digitos = telefonoWhatsApp.replace(/\D/g, "");
                      // Quitar prefijo previo si existe
                      let base = digitos;
                      if (base.startsWith("58") || base.startsWith("57") || base.startsWith("34") || base.startsWith("54") || base.startsWith("52") || base.startsWith("56") || base.startsWith("51")) {
                        base = base.slice(2);
                      } else if (base.startsWith("549")) {
                        base = base.slice(3);
                      } else if (base.startsWith("1") && base.length === 11) {
                        base = base.slice(1);
                      }
                      if (base.startsWith("0")) base = base.slice(1);
                      setTelefonoWhatsApp(`+${pais.code} ${base}`);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {pais.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 uppercase font-bold mb-1">Número de Teléfono</label>
              <input
                type="text"
                value={telefonoWhatsApp}
                onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                placeholder="Ej. +58 424 7640913 o +34 612 345 678"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
              {telefonoWhatsApp && (
                <p className="text-[10px] text-emerald-400 font-mono mt-1">
                  ✓ Formato internacional destino: +{formatearTelefonoParaWhatsApp(telefonoWhatsApp)}
                </p>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
              {obtenerTextoResumen()}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopiarTexto}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                title="Copiar texto del documento"
              >
                Copiar Texto
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalCompartir(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDescargarPdf();
                    const texto = obtenerTextoResumen();
                    abrirWhatsAppAppDirecto(telefonoWhatsApp, texto);
                    mostrarToast("📄 PDF descargado. Adjúntalo con el clip (📎) en WhatsApp.");
                    setModalCompartir(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 cursor-pointer transition-colors"
                  title="Abrir a través de WhatsApp Desktop App"
                >
                  App Escritorio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDescargarPdf();
                    const texto = obtenerTextoResumen();
                    abrirWhatsAppWebDirecto(telefonoWhatsApp, texto);
                    mostrarToast("📄 PDF descargado. Adjúntalo con el clip (📎) en WhatsApp.");
                    setModalCompartir(null);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                  title="Abrir chat directo en WhatsApp Web (Navegador)"
                >
                  <span>WhatsApp Web</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PARA ENVIAR POR CORREO ── */}
      {modalCompartir === "email" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>Enviar por Correo Electrónico</span>
              </h4>
              {correoDestino && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
                  ✓ Detectado de la ficha
                </span>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 uppercase font-bold mb-1">Correo Electrónico Destino</label>
              <input
                type="email"
                value={correoDestino}
                onChange={(e) => setCorreoDestino(e.target.value)}
                placeholder="paciente@correo.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalCompartir(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarGmail}
                disabled={!correoDestino}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Descargar PDF y abrir redacción en Gmail Web con destinatario y texto listos"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>Abrir en Gmail Web</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PURO DE CONTENIDO OFICIAL IMPRESO & VISTA PREVIA
// Diseñado para caber exactamente en 1 hoja Letter / A4 bien centrada
// ══════════════════════════════════════════════════════════════════════════
function DocumentoContenidoImpreso({
  tipo,
  docData,
}: {
  tipo: TipoDocumento;
  docData: any;
}) {
  return (
    <div className="w-full space-y-4 text-slate-900 font-sans text-xs">
      
      {/* ── 1. INFORME MÉDICO OFICIAL ── */}
      {tipo === "INFORME_MEDICO" && (
        <div className="space-y-3.5">
          {/* Membrete Oficial */}
          <div className="border-b-2 border-teal-700 pb-3 flex items-start justify-between">
            <div>
              <h2 className="font-extrabold text-base tracking-wide uppercase text-teal-800">
                {docData.clinicaNombre || "Centro Médico Especializado"}
              </h2>
              <p className="text-xs text-slate-800 font-bold mt-0.5">
                Dr(a). {docData.doctorNombre || "Médico Tratante"} — {docData.especialidad || "Medicina General"}
              </p>
              <p className="text-[10px] text-slate-500">
                MPPS: {docData.matriculaMPPS || "—"} | Colegio Médico: {docData.colegioMedicos || "—"}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block font-mono font-bold text-xs bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 rounded">
                {docData.paciente?.expediente}
              </div>
              <div className="text-[10px] text-slate-600 font-medium mt-1">
                Fecha: {docData.paciente?.fechaConsulta}
              </div>
            </div>
          </div>

          {/* Título de Documento */}
          <div className="text-center py-0.5">
            <span className="font-extrabold tracking-wider uppercase text-xs text-slate-700 border-b border-slate-300 pb-0.5">
              Informe de Consulta Médica & Evolución Clínica
            </span>
          </div>

          {/* Ficha Paciente */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Paciente</span>
              <span className="font-bold text-slate-900 text-xs">{docData.paciente?.nombreCompleto}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Cédula / DNI</span>
              <span className="font-semibold text-slate-800">{docData.paciente?.identificacion}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Edad</span>
              <span className="text-slate-800">{docData.paciente?.edad} años</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Teléfono</span>
              <span className="text-slate-800">{docData.paciente?.telefono || "N/A"}</span>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="space-y-0.5">
            <h4 className="font-bold text-teal-800 uppercase text-[10px] border-b border-slate-200 pb-0.5">
              Diagnóstico Clínico (CIE-10)
            </h4>
            <p className="text-slate-900 font-bold text-xs">{docData.diagnosticoCIE10 || "Evaluación Médica"}</p>
          </div>

          {/* Plan de Tratamiento & Receta */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
            <h4 className="font-bold text-teal-800 uppercase text-[10px] flex items-center justify-between border-b border-slate-200 pb-1">
              <span>Plan de Tratamiento & Indicaciones Farmacológicas (Rx)</span>
              {docData.proximaCita && (
                <span className="text-rose-600 font-bold text-[10px]">
                  Próximo Control: {docData.proximaCita}
                </span>
              )}
            </h4>
            <p className="text-slate-800 whitespace-pre-line leading-relaxed font-mono text-[11px] pt-1">
              {docData.planTratamiento || "Indicaciones y recomendaciones según prescripción médica."}
            </p>
          </div>

          {/* Sello y Firma Centrada */}
          <div className="pt-8 flex justify-center text-center print-avoid-break">
            <div className="border-t border-slate-400 pt-1.5 w-60">
              <p className="font-bold text-slate-900 text-xs">Dr(a). {docData.doctorNombre}</p>
              <p className="text-[10px] text-slate-500">
                {docData.especialidad} — MPPS: {docData.matriculaMPPS}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. AUDITORÍA Y CIERRE DE CAJA ── */}
      {tipo === "CIERRE_CAJA" && (
        <div className="space-y-3.5">
          <div className="border-b-2 border-sky-700 pb-3 flex items-start justify-between">
            <div>
              <h2 className="font-extrabold text-base tracking-wide uppercase text-sky-900">
                {docData.clinicaNombre || "Centro Médico"}
              </h2>
              <p className="text-xs text-slate-700 font-medium">Auditoría y Reporte de Cierre de Caja Diaria</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fecha: {docData.fecha} | Hora: {docData.horaCierre} | Responsable: {docData.responsableNombre || docData.doctorNombre}
              </p>
            </div>
            <div className="text-right">
              <span className="bg-sky-50 border border-sky-200 text-sky-900 px-2 py-1 rounded font-mono font-bold text-xs">
                Tasa BCV: Bs. {(docData.tasaBCV || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Resumen Totales */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[9px] text-emerald-700 block font-bold">TOTAL USD</span>
              <span className="text-sm font-bold text-emerald-900 font-mono">
                ${(docData.totalUSD || 0).toFixed(2)} USD
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
              <span className="text-[9px] text-sky-700 block font-bold">TOTAL VES</span>
              <span className="text-sm font-bold text-sky-900 font-mono">
                Bs. {(docData.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {(docData.totalCOP || 0) > 0 ? (
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                <span className="text-[9px] text-purple-700 block font-bold">TOTAL COP</span>
                <span className="text-sm font-bold text-purple-900 font-mono">
                  ${(docData.totalCOP || 0).toLocaleString("es-CO")}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-slate-500 block font-bold">ESTADO CAJA</span>
                <span className="text-xs font-bold text-slate-700">Auditada</span>
              </div>
            )}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-[9px] text-amber-700 block font-bold">PACIENTES</span>
              <span className="text-sm font-bold text-amber-900">{docData.totalPacientes} Atendidos</span>
            </div>
          </div>

          {/* Desglose de Pagos */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 uppercase text-[10px] border-b border-slate-200 pb-0.5">
              Desglose de Cobros Registrados
            </h4>
            {(!docData.cobros || docData.cobros.length === 0) ? (
              <p className="text-slate-400 text-xs py-2">No hay cobros registrados en esta auditoría.</p>
            ) : (
              <table className="w-full text-[10px] divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-slate-600 font-bold bg-slate-50">
                    <th className="py-1 px-1.5">#</th>
                    <th className="py-1 px-1.5">Paciente</th>
                    <th className="py-1 px-1.5">Cédula</th>
                    <th className="py-1 px-1.5">Método / Ref</th>
                    <th className="py-1 px-1.5 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docData.cobros.map((c: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1 px-1.5 text-slate-400">{c.turno || idx + 1}</td>
                      <td className="py-1 px-1.5 font-bold text-slate-800">{c.pacienteNombre}</td>
                      <td className="py-1 px-1.5 text-slate-500">{c.identificacion}</td>
                      <td className="py-1 px-1.5 text-slate-600">{c.metodoPago} {c.referencia && c.referencia !== "N/A" ? `(${c.referencia})` : ""}</td>
                      <td className="py-1 px-1.5 text-right font-mono font-bold">
                        {c.moneda === "VES" || (c.montoVES && c.montoVES > 0) ? (
                          <span className="text-sky-700">Bs. {(c.montoVES || c.montoCobrado || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                        ) : c.moneda === "COP" || (c.montoCOP && c.montoCOP > 0) ? (
                          <span className="text-purple-700">${(c.montoCOP || c.montoCobrado || 0).toLocaleString("es-CO")} COP</span>
                        ) : (
                          <span className="text-emerald-700">${(c.montoUSD || c.montoCobrado || 0).toFixed(2)} USD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {docData.observaciones && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-[9px] font-bold text-slate-500 block uppercase mb-0.5">Observaciones de Auditoría</span>
              <p className="text-slate-700">{docData.observaciones}</p>
            </div>
          )}

          {/* Firmas */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print-avoid-break">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-900">Responsable de Caja</p>
              <p className="text-[10px] text-slate-500">{docData.responsableNombre || docData.doctorNombre}</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-bold text-slate-900">Dirección Médica / Auditoría</p>
              <p className="text-[10px] text-slate-500">Conforme & Auditado</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. COTIZACIÓN / PRESUPUESTO ── */}
      {tipo === "COTIZACION" && (
        <div className="space-y-3.5">
          <div className="border-b-2 border-teal-700 pb-3 flex items-start justify-between">
            <div>
              <h2 className="font-extrabold text-base tracking-wide uppercase text-teal-800">
                {docData.clinicaNombre || "Centro Médico"}
              </h2>
              <p className="text-xs text-slate-700 font-medium">Presupuesto de Procedimientos Médicos</p>
              <p className="text-[10px] text-slate-500">
                Fecha: {docData.fecha} {docData.fechaPlanificada ? `| Planificada: ${docData.fechaPlanificada}` : ""}
              </p>
            </div>
            <div className="text-right">
              <span className="bg-teal-50 border border-teal-200 text-teal-900 px-2 py-0.5 rounded font-mono font-bold text-xs">
                Dr(a). {docData.doctorNombre}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Paciente</span>
              <span className="font-bold text-slate-900">{docData.pacienteNombre}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Cédula / Identificación</span>
              <span className="font-semibold text-slate-800">{docData.pacienteCedula}</span>
            </div>
          </div>

          {/* Tabla Procedimientos */}
          <table className="w-full text-[11px] divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-slate-600 font-bold bg-slate-100">
                <th className="py-1.5 px-3">Procedimiento / Concepto</th>
                <th className="py-1.5 px-3 text-right">Costo Estimado (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(docData.items || []).map((it: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1.5 px-3 font-semibold text-slate-800">{it.nombre}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                    ${(it.costoUSD || 0).toFixed(2)} USD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-200 flex items-center justify-between">
            <span className="font-bold text-slate-900 uppercase text-xs">Total Estimado</span>
            <div className="text-sm font-mono font-extrabold text-teal-900">
              ${(docData.totalUSD || 0).toFixed(2)} USD
            </div>
          </div>

          {docData.observaciones && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-[9px] font-bold text-slate-500 block uppercase mb-0.5">Observaciones</span>
              <p className="text-slate-700">{docData.observaciones}</p>
            </div>
          )}

          <div className="pt-8 flex justify-center text-center text-xs print-avoid-break">
            <div className="border-t border-slate-400 pt-1.5 w-60">
              <p className="font-bold text-slate-900">Firma y Sello de la Clínica</p>
              <p className="text-[10px] text-slate-500">Dr(a). {docData.doctorNombre}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
