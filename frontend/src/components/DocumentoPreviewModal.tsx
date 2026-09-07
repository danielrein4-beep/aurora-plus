import { useState, useId } from "react";
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
  const [correoDestino, setCorreoDestino] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalCompartir, setModalCompartir] = useState<"whatsapp" | "email" | null>(null);

  const printId = useId().replace(/:/g, "_");

  const mostrarToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── IMPRIMIR DIRECTO ──
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
    if (payload.tipo === "INFORME_MEDICO") {
      return generarTextoWhatsAppConsulta(docData as ConsultaReportData);
    } else if (payload.tipo === "CIERRE_CAJA") {
      return generarTextoWhatsAppCierre(docData as CierreCajaData);
    } else {
      return generarTextoWhatsAppCotizacion(docData as CotizacionData);
    }
  };

  const handleCopiarTexto = () => {
    const texto = obtenerTextoResumen();
    navigator.clipboard.writeText(texto);
    mostrarToast("Resumen copiado al portapapeles");
  };

  // ── ENVIAR POR WHATSAPP ──
  const handleEnviarWhatsApp = () => {
    const texto = obtenerTextoResumen();
    const telLimpio = telefonoWhatsApp.replace(/\D/g, "");
    const url = telLimpio
      ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
    setModalCompartir(null);
  };

  // ── ENVIAR POR CORREO ──
  const handleEnviarEmail = () => {
    let subject = "";
    let body = "";

    if (payload.tipo === "INFORME_MEDICO") {
      const res = generarTextoEmailConsulta(docData as ConsultaReportData);
      subject = res.subject;
      body = res.body;
    } else if (payload.tipo === "CIERRE_CAJA") {
      const res = generarTextoEmailCierre(docData as CierreCajaData);
      subject = res.subject;
      body = res.body;
    } else {
      const res = generarTextoEmailCotizacion(docData as CotizacionData);
      subject = res.subject;
      body = res.body;
    }

    const mailto = `mailto:${correoDestino.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setModalCompartir(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* CSS para impresión profesional: solo imprime el documento oficial */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area-${printId}, #print-area-${printId} * {
            visibility: visible !important;
          }
          #print-area-${printId} {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

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
              {modoEdicion ? "Modo de edición activo (puedes ajustar cualquier dato antes de exportar)" : "Vista previa oficial del documento"}
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
              {modoEdicion ? "Ver Vista Previa" : "Editar Datos"}
            </button>

            {/* Imprimir */}
            <button
              onClick={handleImprimir}
              className="px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir documento directamente"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>

            {/* Descargar PDF */}
            <button
              onClick={handleDescargarPdf}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Descargar archivo PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar PDF
            </button>

            {/* Compartir WhatsApp */}
            <button
              onClick={() => setModalCompartir("whatsapp")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Enviar por WhatsApp"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              WhatsApp
            </button>

            {/* Compartir Correo */}
            <button
              onClick={() => setModalCompartir("email")}
              className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Enviar por Correo Electrónico"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Correo
            </button>

            {/* Copiar Resumen */}
            <button
              onClick={handleCopiarTexto}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Copiar texto resumen"
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
                      <label className="block text-slate-400 mb-1">Cédula / Identificación</label>
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
                    <textarea
                      rows={2}
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
                    <label className="block text-slate-400 mb-1">Plan de Tratamiento / Receta (Rx)</label>
                    <textarea
                      rows={4}
                      value={docData.planTratamiento || ""}
                      onChange={(e) => setDocData({ ...docData, planTratamiento: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Próxima Cita / Control</label>
                    <input
                      type="text"
                      value={docData.proximaCita || ""}
                      onChange={(e) => setDocData({ ...docData, proximaCita: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      placeholder="Ej: 15 días o 20/09/2026"
                    />
                  </div>
                </div>
              )}

              {payload.tipo === "CIERRE_CAJA" && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Nombre de Clínica</label>
                      <input
                        type="text"
                        value={docData.clinicaNombre || ""}
                        onChange={(e) => setDocData({ ...docData, clinicaNombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Médico / Administrador</label>
                      <input
                        type="text"
                        value={docData.doctorNombre || ""}
                        onChange={(e) => setDocData({ ...docData, doctorNombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Observaciones de Auditoría</label>
                    <textarea
                      rows={3}
                      value={docData.observaciones || ""}
                      onChange={(e) => setDocData({ ...docData, observaciones: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      placeholder="Comentarios adicionales sobre el arqueo de caja..."
                    />
                  </div>
                </div>
              )}

              {payload.tipo === "COTIZACION" && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Paciente</label>
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
            /* ══════════ VISTA PREVIA IMPRESA / OFICIAL ══════════ */
            <div
              id={`print-area-${printId}`}
              className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-10 max-w-3xl mx-auto space-y-6 font-sans text-xs"
            >
              {/* ── INFORME MÉDICO PREVIEW ── */}
              {payload.tipo === "INFORME_MEDICO" && (
                <div className="space-y-5">
                  {/* Membrete */}
                  <div className="bg-teal-700 text-white p-5 rounded-xl flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-lg tracking-wide uppercase">{docData.clinicaNombre}</h2>
                      <p className="text-xs text-teal-100 font-medium">
                        Dr(a). {docData.doctorNombre} — {docData.especialidad}
                      </p>
                      <p className="text-[10px] text-teal-200">
                        MPPS: {docData.matriculaMPPS} | Col. Médicos: {docData.colegioMedicos}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs bg-teal-800/80 px-2 py-0.5 rounded">
                        {docData.paciente?.expediente}
                      </div>
                      <div className="text-[10px] text-teal-100 mt-1">
                        Fecha: {docData.paciente?.fechaConsulta}
                      </div>
                    </div>
                  </div>

                  {/* Ficha Paciente */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Paciente</span>
                      <span className="font-bold text-slate-900">{docData.paciente?.nombreCompleto}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Cédula / DNI</span>
                      <span className="font-semibold text-slate-800">{docData.paciente?.identificacion}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Edad</span>
                      <span className="text-slate-800">{docData.paciente?.edad} años</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Teléfono</span>
                      <span className="text-slate-800">{docData.paciente?.telefono || "N/A"}</span>
                    </div>
                  </div>

                  {/* Signos Vitales */}
                  {docData.signosVitales && (
                    <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-teal-800 uppercase block mb-1.5">Signos Vitales & Somatometría</span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] text-slate-700">
                        <div><strong className="text-slate-500">T/A:</strong> {docData.signosVitales.ta || "—"}</div>
                        <div><strong className="text-slate-500">FC:</strong> {docData.signosVitales.fc || "—"}</div>
                        <div><strong className="text-slate-500">FR:</strong> {docData.signosVitales.fr || "—"}</div>
                        <div><strong className="text-slate-500">Temp:</strong> {docData.signosVitales.temp || "—"}</div>
                        <div><strong className="text-slate-500">SatO2:</strong> {docData.signosVitales.satO2 || "—"}</div>
                        <div><strong className="text-slate-500">Peso:</strong> {docData.signosVitales.peso || "—"}</div>
                      </div>
                    </div>
                  )}

                  {/* Motivo de Consulta */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                      Motivo de Consulta
                    </h4>
                    <p className="text-slate-700 leading-relaxed">{docData.motivoConsulta}</p>
                  </div>

                  {/* Diagnóstico */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-teal-800 uppercase text-[11px] border-b border-slate-200 pb-1">
                      Diagnóstico (CIE-10)
                    </h4>
                    <p className="text-slate-900 font-semibold">{docData.diagnosticoCIE10 || "Evaluación Médica"}</p>
                  </div>

                  {/* Plan de Tratamiento & Receta */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-teal-700 uppercase text-[11px] flex items-center justify-between">
                      <span>Plan de Tratamiento & Indicaciones / Receta (Rx)</span>
                      {docData.proximaCita && (
                        <span className="text-rose-600 font-bold text-[10px]">
                          Próximo Control: {docData.proximaCita}
                        </span>
                      )}
                    </h4>
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                      {docData.planTratamiento || "Indicaciones según evaluación médica."}
                    </p>
                  </div>

                  {/* Sello y Firma */}
                  <div className="pt-10 flex justify-center text-center">
                    <div className="border-t border-slate-400 pt-2 w-64">
                      <p className="font-bold text-slate-900">Dr(a). {docData.doctorNombre}</p>
                      <p className="text-[10px] text-slate-500">{docData.especialidad} — MPPS: {docData.matriculaMPPS}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CIERRE DE CAJA PREVIEW ── */}
              {payload.tipo === "CIERRE_CAJA" && (
                <div className="space-y-5">
                  <div className="bg-sky-600 text-white p-5 rounded-xl flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-lg tracking-wide uppercase">{docData.clinicaNombre}</h2>
                      <p className="text-xs text-sky-100 font-medium">Reporte de Auditoría y Cierre de Caja Diaria</p>
                      <p className="text-[10px] text-sky-200">
                        Fecha: {docData.fecha} | Hora: {docData.horaCierre} | Responsable: {docData.doctorNombre}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="bg-sky-700/80 px-2.5 py-1 rounded font-mono font-bold">
                        Tasa BCV: Bs. {(docData.tasaBCV || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Resumen Totales */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-bold">TOTAL USD</span>
                      <span className="text-base font-bold text-emerald-800 font-mono">
                        ${(docData.totalUSD || 0).toFixed(2)} USD
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                      <span className="text-[10px] text-sky-700 block font-bold">TOTAL VES</span>
                      <span className="text-base font-bold text-sky-800 font-mono">
                        Bs. {(docData.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {(docData.totalCOP || 0) > 0 && (
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                        <span className="text-[10px] text-purple-700 block font-bold">TOTAL COP</span>
                        <span className="text-base font-bold text-purple-800 font-mono">
                          ${(docData.totalCOP || 0).toLocaleString("es-CO")} COP
                        </span>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 block font-bold">PACIENTES</span>
                      <span className="text-base font-bold text-amber-800">{docData.totalPacientes} Atendidos</span>
                    </div>
                  </div>

                  {/* Desglose de Pagos */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                      Desglose de Cobros del Día
                    </h4>
                    {(!docData.cobros || docData.cobros.length === 0) ? (
                      <p className="text-slate-400 text-xs">No hay cobros registrados en esta auditoría.</p>
                    ) : (
                      <table className="w-full text-[11px] divide-y divide-slate-200">
                        <thead>
                          <tr className="text-left text-slate-500 font-bold">
                            <th className="py-1.5">#</th>
                            <th className="py-1.5">Paciente</th>
                            <th className="py-1.5">Cédula</th>
                            <th className="py-1.5">Método / Ref</th>
                            <th className="py-1.5 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {docData.cobros.map((c: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 text-slate-400">{c.turno || idx + 1}</td>
                              <td className="py-1.5 font-bold text-slate-800">{c.pacienteNombre}</td>
                              <td className="py-1.5 text-slate-500">{c.identificacion}</td>
                              <td className="py-1.5 text-slate-600">{c.metodoPago} {c.referencia && c.referencia !== "N/A" ? `(${c.referencia})` : ""}</td>
                              <td className="py-1.5 text-right font-mono font-bold">
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
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase mb-0.5">Observaciones de Auditoría</span>
                      <p className="text-slate-700">{docData.observaciones}</p>
                    </div>
                  )}

                  {/* Firmas */}
                  <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-bold text-slate-900">Médico Responsable</p>
                      <p className="text-[10px] text-slate-500">{docData.doctorNombre}</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-bold text-slate-900">Administración / Caja</p>
                      <p className="text-[10px] text-slate-500">Conforme & Auditado</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── COTIZACIÓN / PRESUPUESTO PREVIEW ── */}
              {payload.tipo === "COTIZACION" && (
                <div className="space-y-5">
                  <div className="bg-sky-600 text-white p-5 rounded-xl flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-lg tracking-wide uppercase">{docData.clinicaNombre}</h2>
                      <p className="text-xs text-sky-100 font-medium">Presupuesto / Cotización de Procedimientos</p>
                      <p className="text-[10px] text-sky-200">
                        Fecha: {docData.fecha} | Validez: 15 días continuos
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="bg-sky-700/80 px-2.5 py-1 rounded font-mono font-bold">
                        1 USD = Bs. {(docData.tasaBCV || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Paciente</span>
                      <span className="font-bold text-slate-900">{docData.pacienteNombre}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Cédula</span>
                      <span className="font-semibold text-slate-800">{docData.pacienteCedula}</span>
                    </div>
                  </div>

                  {/* Tabla Procedimientos */}
                  <table className="w-full text-[11px] divide-y divide-slate-200">
                    <thead>
                      <tr className="text-left text-slate-500 font-bold bg-slate-100">
                        <th className="py-2 px-3">Procedimiento / Concepto</th>
                        <th className="py-2 px-3 text-right">USD</th>
                        <th className="py-2 px-3 text-right">VES (Bs.)</th>
                        <th className="py-2 px-3 text-right">COP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(docData.items || []).map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{it.nombre}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">${(it.costoUSD || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-sky-700">Bs. {(it.costoVES || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-purple-700">${(it.costoCOP || 0).toLocaleString("es-CO")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase">Total Estimado</span>
                    <div className="flex items-center gap-4 text-xs font-mono font-bold">
                      <span className="text-emerald-700">${(docData.totalUSD || 0).toFixed(2)} USD</span>
                      <span className="text-sky-700">Bs. {(docData.totalVES || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                      {(docData.totalCOP || 0) > 0 && (
                        <span className="text-purple-700">${(docData.totalCOP || 0).toLocaleString("es-CO")} COP</span>
                      )}
                    </div>
                  </div>

                  {docData.observaciones && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase mb-0.5">Observaciones</span>
                      <p className="text-slate-700">{docData.observaciones}</p>
                    </div>
                  )}

                  <div className="pt-8 flex justify-center text-center text-xs">
                    <div className="border-t border-slate-400 pt-2 w-64">
                      <p className="font-bold text-slate-900">Firma y Sello de la Clínica</p>
                      <p className="text-[10px] text-slate-500">Dr(a). {docData.doctorNombre}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL PARA ENVIAR POR WHATSAPP ── */}
      {modalCompartir === "whatsapp" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 p-5 rounded-2xl space-y-4 text-white shadow-2xl">
            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <span>Enviar por WhatsApp</span>
            </h4>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Número de Teléfono (con código de país)</label>
              <input
                type="tel"
                value={telefonoWhatsApp}
                onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                placeholder="Ej: +584121234567 o 04141234567"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Se abrirá WhatsApp con el informe clínico estructurado listo para enviar.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalCompartir(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarWhatsApp}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PARA ENVIAR POR CORREO ── */}
      {modalCompartir === "email" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 p-5 rounded-2xl space-y-4 text-white shadow-2xl">
            <h4 className="font-bold text-sm text-purple-400 flex items-center gap-2">
              <span>Enviar por Correo Electrónico</span>
            </h4>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Correo Electrónico del Destinatario</label>
              <input
                type="email"
                value={correoDestino}
                onChange={(e) => setCorreoDestino(e.target.value)}
                placeholder="paciente@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalCompartir(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarEmail}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
              >
                Abrir Cliente de Correo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
