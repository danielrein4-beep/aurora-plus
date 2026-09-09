import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  consultarOrdenPublicaLaboratorio,
  subirResultadoPublicoLaboratorio,
} from "../api";

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Verificando orden médica en la red...</p>
      </div>
    );
  }

  // 2. Estado de error (no encontrada)
  if (error || !orden) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-white">Orden Médica No Encontrada</h1>
          <p className="text-sm text-slate-400">
            {error || "El código o enlace provisto no existe o ha sido revocado. Verifique con el consultorio médico emisor."}
          </p>
        </div>
      </div>
    );
  }

  // 3. 🛡️ ESTADO SELLADA / PROTECCIÓN CONTRA QR ABANDONADO
  if (orden.estado === "SELLADA" || exito) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#07131e] to-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-lg w-full bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-lg">
            🛡️
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold tracking-wider uppercase border border-emerald-500/30">
              Orden Sellada & Protegida
            </span>
            <h1 className="text-2xl font-black text-white font-['Outfit']">
              Resultados Procesados con Éxito
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Esta orden médica (<span className="text-emerald-300 font-mono font-bold">{orden.codigoOrden}</span>) ha sido procesada y archivada de forma segura en el expediente clínico privado del paciente.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-400">
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span>Laboratorio Emisor:</span>
              <span className="text-white font-semibold">{orden.laboratorioEmisor || nombreLaboratorio || "Laboratorio Clínico"}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800">
              <span>Estado Criptográfico:</span>
              <span className="text-emerald-400 font-bold">INMUTABLE (Cerrado a edición)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Privacidad:</span>
              <span className="text-slate-300">Enlace público revocado contra copias/abandonos</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Los resultados ya se encuentran disponibles en el portal médico del consultorio para revisión y diagnóstico.
          </p>
        </div>
      </div>
    );
  }

  // 4. ESTADO ABIERTO: FORMULARIO COMPLETO PARA EL BIOANALISTA
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Inter'] selection:bg-teal-500 selection:text-white pb-16">
      {/* HEADER SUPERIOR */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              🔬
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Red Diagnóstica de Laboratorios
              </span>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                Portal de Recepción & Carga Oficial
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono px-2.5 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-lg">
              {orden.codigoOrden}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* TARJETA 1: FICHA DE LA ORDEN MÉDICA */}
        <div className="bg-slate-900/90 border border-teal-500/30 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Paciente:</span>
              <h2 className="text-lg font-bold text-white">{orden.pacienteNombre}</h2>
              {orden.pacienteCedula && (
                <p className="text-xs font-mono text-teal-400">C.I. / DNI: {orden.pacienteCedula}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Médico Solicitante:</span>
              <p className="text-sm font-semibold text-white">{orden.medicoNombre || "Médico Tratante"}</p>
              <p className="text-xs text-slate-500">{new Date(orden.fechaEmision).toLocaleDateString("es-VE")}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-teal-300 uppercase tracking-wider block mb-2">
              📋 Exámenes Solicitados por el Médico:
            </label>
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
              {orden.examenesSolicitados}
            </div>
          </div>

          {orden.indicacionesClinicas && (
            <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3 flex items-start gap-2">
              <span>⚠️</span>
              <span><strong>Indicaciones / Ayuno:</strong> {orden.indicacionesClinicas}</span>
            </div>
          )}
        </div>

        {/* TARJETA 2: FORMULARIO DEL BIOANALISTA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>✍️</span> Identificación del Laboratorio & Profesional
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              No requiere registrarse ni crear cuenta. Indique el nombre de su institución para estampar la firma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre del Laboratorio <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                value={nombreLaboratorio}
                onChange={(e) => setNombreLaboratorio(e.target.value)}
                placeholder="Ej. Lab Clínico San Rafael"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Bioanalista / Responsable <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                value={bioanalista}
                onChange={(e) => setBioanalista(e.target.value)}
                placeholder="Ej. Lic. María Fernández"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                N° de Colegiatura / Registro (Opcional)
              </label>
              <input
                type="text"
                value={colegiatura}
                onChange={(e) => setColegiatura(e.target.value)}
                placeholder="Ej. Colbio 4821"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* INFORME DETALLADO DE TEXTO */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  📝 Informe Técnico Detallado / Microscopía / Hallazgos
                </label>
                <span className="text-xs text-slate-500">Recuentos, frotis, urocultivo, sedimentos</span>
              </div>
              <textarea
                rows={5}
                value={informeDetallado}
                onChange={(e) => setInformeDetallado(e.target.value)}
                placeholder="Redacte aquí los hallazgos analíticos:
- Hematología: Leucocitos 7.200/mm³, Hb 14.2 g/dL, Plaquetas 245.000/mm³
- Química: Glicemia 92 mg/dL, Urea 28 mg/dL, Creatinina 0.9 mg/dL
- Microscopía / Sedimento: Escasas bacterias, piocitos 0-2 x campo..."
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600 font-mono leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Conclusión / Impresión Diagnóstica del Laboratorio
                </label>
                <input
                  type="text"
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Ej. Parámetros bioquímicos dentro de límites de referencia"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Calidad de Muestra / Condiciones Pre-analíticas
                </label>
                <input
                  type="text"
                  value={observacionesMuestra}
                  onChange={(e) => setObservacionesMuestra(e.target.value)}
                  placeholder="Ej. Suero límpido, ayuno 12h verificado"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* TOGGLE DE VALORES CRÍTICOS / URGENCIA */}
            <div className={`p-4 rounded-2xl border transition-all ${
              valoresCriticos ? "bg-red-500/10 border-red-500/40" : "bg-slate-950/40 border-slate-800"
            }`}>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={valoresCriticos}
                  onChange={(e) => setValoresCriticos(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 text-red-500 focus:ring-red-400"
                />
                <span className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                  <span>🚨</span> Notificar Valores Críticos / Rango de Pánico al Médico
                </span>
              </label>
              {valoresCriticos && (
                <div className="mt-3 pl-8">
                  <input
                    type="text"
                    value={detalleCriticos}
                    onChange={(e) => setDetalleCriticos(e.target.value)}
                    placeholder="Describa el valor crítico que requiere atención inmediata (Ej: Plaquetas 18.000 o Glicemia 420)"
                    className="w-full bg-slate-950 border border-red-500/40 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-400 placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CARGA MÚLTIPLE DE FOTOGRAFÍAS Y DOCUMENTOS */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📸</span> Evidencias Fotográficas & Documentos PDF
                </h4>
                <p className="text-xs text-slate-400">
                  Puede subir múltiples fotos de láminas, tirillas reactivas, fotos de hojas impresas o el PDF oficial.
                </p>
              </div>
              <label className="cursor-pointer px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all">
                <span>➕</span> Añadir Archivos
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
              <label className="border-2 border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40">
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm font-semibold text-slate-300">
                  Haga clic para seleccionar fotos o documentos (o arrástrelos aquí)
                </p>
                <p className="text-xs text-slate-500 mt-1">
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
                    className="relative group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-2 flex flex-col items-center text-center shadow-md"
                  >
                    {adj.previewUrl ? (
                      <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-900 mb-2">
                        <img
                          src={adj.previewUrl}
                          alt={adj.nombreArchivo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-red-400 mb-2">
                        <span className="text-3xl">📄</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">PDF</span>
                      </div>
                    )}
                    <span className="text-[11px] text-slate-300 truncate w-full font-medium px-1">
                      {adj.nombreArchivo}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarAdjunto(i)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs flex items-center justify-center shadow-lg transition-all"
                      title="Eliminar archivo"
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN PRINCIPAL DE ACCIÓN */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setConfirmarModal(true)}
              disabled={enviando}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-slate-950 font-black text-base shadow-xl hover:shadow-teal-500/25 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>🔒</span> Firmar, Sellar y Enviar Informe a Mediclinic
            </button>
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN DE SELLADO */}
      {confirmarModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center text-2xl mx-auto">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-white text-center font-['Outfit']">
              ¿Confirmar Sellado Inmutable?
            </h3>
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              Al confirmar, los resultados se registrarán inmediatamente en la Historia Clínica del paciente y llegarán al <strong>Inbox del Médico</strong>.
              <br /><br />
              <strong className="text-amber-400">Por protocolo de seguridad:</strong> Este enlace público quedará sellado para evitar que terceras personas que tengan acceso al papel o QR físico puedan alterar la información.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmarModal(false)}
                disabled={enviando}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                Volver y Revisar
              </button>
              <button
                type="button"
                onClick={ejecutarEnvioYSellado}
                disabled={enviando}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5"
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
