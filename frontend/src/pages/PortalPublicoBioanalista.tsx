import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  consultarOrdenPublicaLaboratorio,
  subirResultadoPublicoLaboratorio,
} from "../api";
import { IconWarning, IconShield, IconFrascoLab, IconClipboardCheck, IconNote, IconCamera, IconPaperclip, IconFileText, IconLock, IconClose } from "../Icons";

interface AdjuntoLocal {
  nombreArchivo: string;
  tipoMime: string;
  contenidoBase64: string;
  previewUrl: string;
}

export default function PortalPublicoBioanalista() {
  const { token } = useParams<{ token: string }>();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<any>(null);

  // Formulario del Bioanalista
  const [nombreLaboratorio, setNombreLaboratorio] = useState(() => {
    return localStorage.getItem("aurora_lab_nombre_guardado") || "";
  });
  const [bioanalista, setBioanalista] = useState(() => {
    return localStorage.getItem("aurora_lab_bioanalista_guardado") || "";
  });
  const [colegiatura, setColegiatura] = useState("");
  const [informeDetallado, setInformeDetallado] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [observacionesMuestra, setObservacionesMuestra] = useState("");
  const [valoresCriticos, setValoresCriticos] = useState(false);
  const [detalleCriticos, setDetalleCriticos] = useState("");

  // Archivos (múltiples fotos o PDFs)
  const [adjuntos, setAdjuntos] = useState<AdjuntoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [confirmarModal, setConfirmarModal] = useState(false);

  useEffect(() => {
    if (!token) return;
    setCargando(true);
    setError(null);
    consultarOrdenPublicaLaboratorio(token)
      .then((data) => {
        setOrden(data);
      })
      .catch((err) => {
        setError(err.message || "No se pudo cargar la orden médica.");
      })
      .finally(() => setCargando(false));
  }, [token]);

  // Manejador de subida de archivos múltiples (fotos / pdf)
  const handleArchivosSeleccionados = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nuevos: AdjuntoLocal[] = [];
    const fileList = Array.from(files);

    let procesados = 0;
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        nuevos.push({
          nombreArchivo: file.name,
          tipoMime: file.type || "application/octet-stream",
          contenidoBase64: base64,
          previewUrl: file.type.startsWith("image/") ? base64 : "",
        });
        procesados++;
        if (procesados === fileList.length) {
          setAdjuntos((prev) => [...prev, ...nuevos]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = "";
  };

  const eliminarAdjunto = (index: number) => {
    setAdjuntos((prev) => prev.filter((_, i) => i !== index));
  };

  const ejecutarEnvioYSellado = async () => {
    if (!nombreLaboratorio.trim()) {
      alert("Por favor indique el Nombre del Laboratorio.");
      return;
    }
    if (!bioanalista.trim()) {
      alert("Por favor indique el Nombre del Bioanalista o Responsable.");
      return;
    }
    if (adjuntos.length === 0 && !informeDetallado.trim()) {
      alert("Debe adjuntar al menos una foto/PDF o redactar el informe técnico detallado.");
      return;
    }

    // Guardar nombre y bioanalista en memoria local para no tener que tipearlos de nuevo
    localStorage.setItem("aurora_lab_nombre_guardado", nombreLaboratorio.trim());
    localStorage.setItem("aurora_lab_bioanalista_guardado", bioanalista.trim());

    setEnviando(true);
    try {
      await subirResultadoPublicoLaboratorio(token!, {
        nombreLaboratorio: nombreLaboratorio.trim(),
        bioanalistaResponsable: bioanalista.trim(),
        colegiaturaBioanalista: colegiatura.trim(),
        informeDetallado: informeDetallado.trim(),
        conclusionDiagnostica: conclusion.trim(),
        observacionesMuestra: observacionesMuestra.trim(),
        valoresCriticos,
        detalleValoresCriticos: valoresCriticos ? detalleCriticos.trim() : "",
        adjuntos: adjuntos.map((a) => ({
          nombreArchivo: a.nombreArchivo,
          tipoMime: a.tipoMime,
          contenidoBase64: a.contenidoBase64,
        })),
      });

      setExito(true);
      setConfirmarModal(false);
    } catch (err: any) {
      alert("Error al sellar los resultados: " + (err.message || "Error de red"));
    } finally {
      setEnviando(false);
    }
  };

  // 1. Estado de carga
  if (cargando) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-[#1D1D1F]">
        <div className="w-10 h-10 border-4 border-[#177E89] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#86868B] font-medium">Verificando orden médica en la red...</p>
      </div>
    );
  }

  // 2. Estado de error (no encontrada)
  if (error || !orden) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-[#1D1D1F]">
        <div className="max-w-md w-full bg-white border border-[#E5E5EA] rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-[#F5F5F7] text-[#ef4444] rounded-2xl flex items-center justify-center mx-auto">
            <IconWarning size={28} />
          </div>
          <h1 className="text-xl font-bold text-[#1D1D1F]">Orden Médica No Encontrada</h1>
          <p className="text-sm text-[#86868B]">
            {error || "El código o enlace provisto no existe o ha sido revocado. Verifique con el consultorio médico emisor."}
          </p>
        </div>
      </div>
    );
  }

  // 3. ESTADO SELLADA / PROTECCIÓN CONTRA QR ABANDONADO
  if (orden.estado === "SELLADA" || exito) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 text-[#1D1D1F]">
        <div className="max-w-lg w-full bg-white border border-[#E5E5EA] rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-[#177E89]/10 border border-[#177E89]/30 text-[#177E89] rounded-3xl flex items-center justify-center mx-auto">
            <IconShield size={36} />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-[#177E89]/10 text-[#177E89] rounded-full text-xs font-semibold tracking-wider uppercase border border-[#177E89]/30">
              Orden Sellada & Protegida
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
              Resultados Procesados con Éxito
            </h1>
            <p className="text-[#6E6E73] text-sm leading-relaxed">
              Esta orden médica (<span className="text-[#177E89] font-mono font-bold">{orden.codigoOrden}</span>) ha sido procesada y archivada de forma segura en el expediente clínico privado del paciente.
            </p>
          </div>

          <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-4 text-left space-y-2 text-xs text-[#86868B]">
            <div className="flex justify-between items-center py-1 border-b border-[#E5E5EA]">
              <span>Laboratorio Emisor:</span>
              <span className="text-[#1D1D1F] font-semibold">{orden.laboratorioEmisor || nombreLaboratorio || "Laboratorio Clínico"}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#E5E5EA]">
              <span>Estado Criptográfico:</span>
              <span className="text-[#177E89] font-bold">INMUTABLE (Cerrado a edición)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Privacidad:</span>
              <span className="text-[#6E6E73]">Enlace público revocado contra copias/abandonos</span>
            </div>
          </div>

          <p className="text-xs text-[#86868B]">
            Los resultados ya se encuentran disponibles en el portal médico del consultorio para revisión y diagnóstico.
          </p>
        </div>
      </div>
    );
  }

  // 4. ESTADO ABIERTO: FORMULARIO COMPLETO PARA EL BIOANALISTA
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased pb-16">
      {/* HEADER SUPERIOR */}
      <header className="border-b border-[#E5E5EA] bg-white sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#177E89]">
              <IconFrascoLab size={18} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#177E89]">
                Red Diagnóstica de Laboratorios
              </span>
              <h1 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                Portal de Recepción &amp; Carga Oficial
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono px-2.5 py-1 bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/20 rounded-lg">
              {orden.codigoOrden}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* TARJETA 1: FICHA DE LA ORDEN MÉDICA */}
        <div className="bg-white border border-[#177E89]/30 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E5EA]">
            <div>
              <span className="text-xs text-[#86868B]">Paciente:</span>
              <h2 className="text-lg font-bold text-[#1D1D1F]">{orden.pacienteNombre}</h2>
              {orden.pacienteCedula && (
                <p className="text-xs font-mono text-[#177E89]">C.I. / DNI: {orden.pacienteCedula}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-[#86868B]">Médico Solicitante:</span>
              <p className="text-sm font-semibold text-[#1D1D1F]">{orden.medicoNombre || "Médico Tratante"}</p>
              <p className="text-xs text-[#86868B]">{new Date(orden.fechaEmision).toLocaleDateString("es-VE")}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#177E89] uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
              <IconClipboardCheck size={13} /> Exámenes Solicitados por el Médico:
            </label>
            <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-4 text-sm text-[#1D1D1F] whitespace-pre-wrap font-sans leading-relaxed">
              {orden.examenesSolicitados}
            </div>
          </div>

          {orden.indicacionesClinicas && (
            <div className="text-xs bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] rounded-xl p-3 flex items-start gap-2">
              <IconWarning size={13} className="shrink-0 mt-0.5 text-[#177E89]" />
              <span><strong>Indicaciones / Ayuno:</strong> {orden.indicacionesClinicas}</span>
            </div>
          )}
        </div>

        {/* TARJETA 2: FORMULARIO DEL BIOANALISTA */}
        <div className="bg-white border border-[#E5E5EA] rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="border-b border-[#E5E5EA] pb-3">
            <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
              Identificación del Laboratorio &amp; Profesional
            </h3>
            <p className="text-xs text-[#86868B] mt-1">
              No requiere registrarse ni crear cuenta. Indique el nombre de su institución para estampar la firma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Nombre del Laboratorio <span className="text-[#177E89]">*</span>
              </label>
              <input
                type="text"
                value={nombreLaboratorio}
                onChange={(e) => setNombreLaboratorio(e.target.value)}
                placeholder="Ej. Lab Clínico San Rafael"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                Bioanalista / Responsable <span className="text-[#177E89]">*</span>
              </label>
              <input
                type="text"
                value={bioanalista}
                onChange={(e) => setBioanalista(e.target.value)}
                placeholder="Ej. Lic. María Fernández"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                N° de Colegiatura / Registro (Opcional)
              </label>
              <input
                type="text"
                value={colegiatura}
                onChange={(e) => setColegiatura(e.target.value)}
                placeholder="Ej. Colbio 4821"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
              />
            </div>
          </div>

          {/* INFORME DETALLADO DE TEXTO */}
          <div className="space-y-4 pt-2 border-t border-[#E5E5EA]">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                  <IconNote size={12} className="inline mr-1" /> Informe Técnico Detallado / Microscopía / Hallazgos
                </label>
                <span className="text-xs text-[#86868B]">Recuentos, frotis, urocultivo, sedimentos</span>
              </div>
              <textarea
                rows={5}
                value={informeDetallado}
                onChange={(e) => setInformeDetallado(e.target.value)}
                placeholder="Redacte aquí los hallazgos analíticos:
- Hematología: Leucocitos 7.200/mm³, Hb 14.2 g/dL, Plaquetas 245.000/mm³
- Química: Glicemia 92 mg/dL, Urea 28 mg/dL, Creatinina 0.9 mg/dL
- Microscopía / Sedimento: Escasas bacterias, piocitos 0-2 x campo..."
                className="w-full bg-white border border-[#E5E5EA] rounded-2xl p-4 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B] font-mono leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                  Conclusión / Impresión Diagnóstica del Laboratorio
                </label>
                <input
                  type="text"
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Ej. Parámetros bioquímicos dentro de límites de referencia"
                  className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
                  Calidad de Muestra / Condiciones Pre-analíticas
                </label>
                <input
                  type="text"
                  value={observacionesMuestra}
                  onChange={(e) => setObservacionesMuestra(e.target.value)}
                  placeholder="Ej. Suero límpido, ayuno 12h verificado"
                  className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
                />
              </div>
            </div>

            {/* TOGGLE DE VALORES CRÍTICOS / URGENCIA */}
            <div className={`p-4 rounded-2xl border transition-colors ${
              valoresCriticos ? "bg-[#ef4444]/5 border-[#ef4444]/40" : "bg-[#F5F5F7] border-[#E5E5EA]"
            }`}>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={valoresCriticos}
                  onChange={(e) => setValoresCriticos(e.target.checked)}
                  className="w-5 h-5 rounded border-[#D1D1D6] text-[#ef4444] focus:ring-[#ef4444]"
                />
                <span className="font-bold text-sm text-[#ef4444] flex items-center gap-1.5">
                  <IconWarning size={13} /> Notificar Valores Críticos / Rango de Pánico al Médico
                </span>
              </label>
              {valoresCriticos && (
                <div className="mt-3 pl-8">
                  <input
                    type="text"
                    value={detalleCriticos}
                    onChange={(e) => setDetalleCriticos(e.target.value)}
                    placeholder="Describa el valor crítico que requiere atención inmediata (Ej: Plaquetas 18.000 o Glicemia 420)"
                    className="w-full bg-white border border-[#ef4444]/40 rounded-xl px-3.5 py-2 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#ef4444] placeholder:text-[#86868B]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CARGA MÚLTIPLE DE FOTOGRAFÍAS Y DOCUMENTOS */}
          <div className="space-y-3 pt-2 border-t border-[#E5E5EA]">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                  <IconCamera size={13} /> Evidencias Fotográficas &amp; Documentos PDF
                </h4>
                <p className="text-xs text-[#86868B]">
                  Puede subir múltiples fotos de láminas, tirillas reactivas, fotos de hojas impresas o el PDF oficial.
                </p>
              </div>
              <label className="cursor-pointer px-4 py-2 bg-[#177E89] hover:bg-[#136570] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 transition-colors">
                <span>+</span> Añadir Archivos
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleArchivosSeleccionados}
                  className="hidden"
                />
              </label>
            </div>

            {/* ZONA DRAG & DROP / SELECTOR VACÍO */}
            {adjuntos.length === 0 ? (
              <label className="border-2 border-dashed border-[#E5E5EA] hover:border-[#177E89]/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#F5F5F7]">
                <div className="mb-2 flex justify-center text-[#86868B]"><IconPaperclip size={28} /></div>
                <p className="text-sm font-semibold text-[#1D1D1F]">
                  Haga clic para seleccionar fotos o documentos (o arrástrelos aquí)
                </p>
                <p className="text-xs text-[#86868B] mt-1">
                  Formatos soportados: JPG, PNG, WEBP, PDF (Sin límite de cantidad)
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleArchivosSeleccionados}
                  className="hidden"
                />
              </label>
            ) : (
              /* GRILLA DE ARCHIVOS CARGADOS */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {adjuntos.map((adj, i) => (
                  <div
                    key={i}
                    className="relative group bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden p-2 flex flex-col items-center text-center shadow-sm"
                  >
                    {adj.previewUrl ? (
                      <div className="w-full h-28 rounded-xl overflow-hidden bg-[#F5F5F7] mb-2">
                        <img
                          src={adj.previewUrl}
                          alt={adj.nombreArchivo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex flex-col items-center justify-center text-[#177E89] mb-2">
                        <IconFileText size={26} />
                        <span className="text-[10px] uppercase font-bold text-[#86868B] mt-1">PDF</span>
                      </div>
                    )}
                    <span className="text-[11px] text-[#1D1D1F] truncate w-full font-medium px-1">
                      {adj.nombreArchivo}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarAdjunto(i)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white border border-[#E5E5EA] hover:bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
                      title="Eliminar archivo"
                    >
                      <IconClose size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN PRINCIPAL DE ACCIÓN */}
          <div className="pt-4 border-t border-[#E5E5EA]">
            <button
              type="button"
              onClick={() => setConfirmarModal(true)}
              disabled={enviando}
              className="w-full py-4 rounded-full bg-[#177E89] text-white font-semibold text-base transition-colors hover:bg-[#136570] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <IconLock size={14} /> Firmar, Sellar y Enviar Informe a Mediclinic
            </button>
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN DE SELLADO */}
      {confirmarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-white border border-[#E5E5EA] rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-[#177E89]/10 text-[#177E89] rounded-2xl flex items-center justify-center mx-auto">
              <IconShield size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#1D1D1F] text-center tracking-tight">
              ¿Confirmar Sellado Inmutable?
            </h3>
            <p className="text-xs text-[#6E6E73] text-center leading-relaxed">
              Al confirmar, los resultados se registrarán inmediatamente en la Historia Clínica del paciente y llegarán al <strong>Inbox del Médico</strong>.
              <br /><br />
              <strong className="text-[#1D1D1F]">Por protocolo de seguridad:</strong> Este enlace público quedará sellado para evitar que terceras personas que tengan acceso al papel o QR físico puedan alterar la información.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarModal(false)}
                disabled={enviando}
                className="flex-1 py-2.5 rounded-full border border-[#E5E5EA] hover:bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold transition-colors cursor-pointer"
              >
                Volver y Revisar
              </button>
              <button
                type="button"
                onClick={ejecutarEnvioYSellado}
                disabled={enviando}
                className="flex-1 py-2.5 rounded-full bg-[#177E89] hover:bg-[#136570] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {enviando ? "Sellando..." : "Sí, Sellar y Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
