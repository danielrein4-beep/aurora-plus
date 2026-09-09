import { useState, useEffect } from "react";
import {
  listarInboxLaboratorio,
  listarOrdenesLaboratorio,
  marcarRevisadoOrdenLaboratorio,
  type OrdenLaboratorio,
} from "../../api";
import ModalNuevaOrdenLab from "./ModalNuevaOrdenLab";

export default function InboxLaboratorioMedico({
  tenantId,
  medicoNombre,
  onActualizarContador,
}: {
  tenantId: number;
  medicoNombre?: string;
  onActualizarContador?: () => void;
}) {
  const [tab, setTab] = useState<"INBOX" | "TODAS">("INBOX");
  const [cargando, setCargando] = useState(true);
  const [ordenes, setOrdenes] = useState<OrdenLaboratorio[]>([]);
  const [modalNueva, setModalNueva] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenLaboratorio | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [notasRevision, setNotasRevision] = useState("");
  const [marcando, setMarcando] = useState(false);
  const [copiadoToken, setCopiadoToken] = useState<string | null>(null);

  const cargarDatos = () => {
    setCargando(true);
    const peticion = tab === "INBOX" ? listarInboxLaboratorio(tenantId) : listarOrdenesLaboratorio(tenantId);
    peticion
      .then((res) => {
        setOrdenes(res);
        if (onActualizarContador) onActualizarContador();
      })
      .catch((err) => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarDatos();
  }, [tenantId, tab]);

  const pendientesCount = ordenes.filter((o) => o.estado === "SELLADA" && !o.revisadoPorMedico).length;

  const handleMarcarRevisado = async (ordenId: number) => {
    setMarcando(true);
    try {
      const act = await marcarRevisadoOrdenLaboratorio(tenantId, ordenId, notasRevision.trim());
      setOrdenes((prev) => prev.map((o) => (o.id === act.id ? act : o)));
      setOrdenDetalle(act);
      setNotasRevision("");
      if (onActualizarContador) onActualizarContador();
    } catch (err: any) {
      alert("Error al registrar la revisión: " + err.message);
    } finally {
      setMarcando(false);
    }
  };

  const getUrlPublicaLab = (token: string) => {
    return `${window.location.origin}/lab/${token}`;
  };

  const copiarEnlaceLab = (token: string) => {
    const url = getUrlPublicaLab(token);
    navigator.clipboard.writeText(url);
    setCopiadoToken(token);
    setTimeout(() => setCopiadoToken(null), 3000);
  };

  const enviarOrdenWhatsApp = (orden: OrdenLaboratorio) => {
    const url = getUrlPublicaLab(orden.tokenSeguro);
    const mensaje = `Hola ${orden.pacienteNombre}, aquí tiene su orden médica de laboratorio expedida por el ${orden.medicoNombre || "Dr."}.\n\n` +
      `📋 *Código:* ${orden.codigoOrden}\n` +
      `🔬 *Exámenes:* ${orden.examenesSolicitados.replace(/\n/g, ", ")}\n` +
      (orden.indicacionesClinicas ? `⚠️ *Indicaciones:* ${orden.indicacionesClinicas}\n` : "") +
      `\nPresente este enlace en el laboratorio para que procesen y suban sus resultados directamente a su expediente:\n${url}`;

    const tel = orden.pacienteTelefono?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const notificarResultadosListosWhatsApp = (orden: OrdenLaboratorio) => {
    const mensaje = `Estimado(a) ${orden.pacienteNombre}, le informamos que sus resultados del laboratorio ` +
      `(${orden.resultado?.nombreLaboratorio || "Laboratorio Clínico"}) ya fueron recibidos y revisados ` +
      `formalmente por el ${orden.medicoNombre || "Dr."}.\n\n` +
      `Su expediente e historia médica se encuentran actualizados. Cualquier indicación médica le será comunicada en su próxima cita o seguimiento.`;

    const tel = orden.pacienteTelefono?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  return (
    <div className="space-y-6 text-left">
      {/* CABECERA & ACCIONES */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔬</span>
            <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
              Red de Laboratorios & Inbox Médico
            </h2>
            {pendientesCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                {pendientesCount} por revisar
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Recepción directa de exámenes, informes bioanalíticos y fotografías sin papel ni WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setModalNueva(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <span>➕</span> Emitir Nueva Orden de Laboratorio
        </button>
      </div>

      {/* PESTAÑAS DEL INBOX */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setTab("INBOX")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            tab === "INBOX"
              ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <span>📥</span> Inbox de Exámenes Recibidos
          {pendientesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px]">
              {pendientesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("TODAS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            tab === "TODAS"
              ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <span>📋</span> Historial Completo de Órdenes
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {cargando ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Cargando órdenes de laboratorio...
        </div>
      ) : ordenes.length === 0 ? (
        <div className="apple-glass rounded-3xl p-12 text-center space-y-3">
          <div className="text-4xl">🧪</div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {tab === "INBOX" ? "Bandeja de Entrada al Día" : "No hay órdenes emitidas"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {tab === "INBOX"
              ? "No tiene resultados pendientes de revisión médica en este momento. Cuando un laboratorio cargue análisis, aparecerán aquí con alerta."
              : "Aún no ha prescrito órdenes de análisis clínicos. Puede emitir una con el botón superior."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ordenes.map((orden) => {
            const sellada = orden.estado === "SELLADA";
            const tieneCriticos = orden.resultado?.valoresCriticos;
            const tieneFotos = (orden.resultado?.adjuntos || []).length > 0;

            return (
              <div
                key={orden.id}
                className={`apple-glass rounded-3xl p-5 space-y-4 border transition-all ${
                  tieneCriticos && !orden.revisadoPorMedico
                    ? "border-red-500/60 bg-red-500/5 shadow-lg shadow-red-500/10"
                    : sellada && !orden.revisadoPorMedico
                    ? "border-teal-500/50 bg-teal-500/5"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                {/* CABECERA DE LA TARJETA */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {orden.pacienteNombre}
                      </h4>
                      {tieneCriticos && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                          🚨 Valor Crítico
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {orden.pacienteCedula ? `CI: ${orden.pacienteCedula} • ` : ""}
                      {orden.codigoOrden}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        sellada
                          ? orden.revisadoPorMedico
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {sellada
                        ? orden.revisadoPorMedico
                          ? "✓ Revisado por Dr."
                          : "★ Resultados Listos"
                        : "⏳ Esperando Lab"}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(orden.fechaEmision).toLocaleDateString("es-VE")}
                    </p>
                  </div>
                </div>

                {/* ALERTA DE VALOR CRÍTICO SI APLICA */}
                {tieneCriticos && orden.resultado?.detalleValoresCriticos && (
                  <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-3 text-xs text-red-600 dark:text-red-300 font-semibold flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <strong className="block text-[10px] uppercase tracking-wider text-red-500 font-black">
                        Hallazgo de Urgencia Reportado por Bioanalista:
                      </strong>
                      {orden.resultado.detalleValoresCriticos}
                    </div>
                  </div>
                )}

                {/* EXÁMENES SOLICITADOS */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Exámenes Solicitados:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 bg-slate-100/60 dark:bg-slate-900/60 p-2.5 rounded-xl">
                    {orden.examenesSolicitados}
                  </p>
                </div>

                {/* DATOS DEL RESULTADO SI ESTÁ SELLADA */}
                {sellada && orden.resultado && (
                  <div className="bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                      <span>Laboratorio Emisor:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {orden.resultado.nombreLaboratorio}
                      </strong>
                    </div>
                    {orden.resultado.conclusionDiagnostica && (
                      <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase">Conclusión Bioanalítica:</span>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          {orden.resultado.conclusionDiagnostica}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      {tieneFotos && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-semibold flex items-center gap-1">
                          📸 {orden.resultado.adjuntos?.length} Archivos/Fotos
                        </span>
                      )}
                      {orden.resultado.informeDetallado && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-semibold flex items-center gap-1">
                          📝 Informe Escrito
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* BOTONERAS DE ACCIÓN */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {sellada ? (
                    <>
                      <button
                        onClick={() => setOrdenDetalle(orden)}
                        className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>🔍</span> Examinar Resultados Completos
                      </button>
                      <button
                        onClick={() => notificarResultadosListosWhatsApp(orden)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                        title="Avisar al paciente por WhatsApp"
                      >
                        <span>💬</span> WhatsApp
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => copiarEnlaceLab(orden.tokenSeguro)}
                        className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1"
                      >
                        <span>🔗</span> {copiadoToken === orden.tokenSeguro ? "¡Enlace Copiado!" : "Copiar Enlace Lab"}
                      </button>
                      <button
                        onClick={() => enviarOrdenWhatsApp(orden)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                        title="Reenviar orden al paciente por WhatsApp"
                      >
                        <span>📲</span> Enviar Orden
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE NUEVA ORDEN */}
      {modalNueva && (
        <ModalNuevaOrdenLab
          tenantId={tenantId}
          medicoNombre={medicoNombre}
          onClose={() => setModalNueva(false)}
          onOrdenCreada={(nueva) => {
            setModalNueva(false);
            setOrdenes((prev) => [nueva, ...prev]);
            alert(`¡Orden ${nueva.codigoOrden} emitida con éxito! Ahora puede compartir el enlace o esperar a que el laboratorio cargue los resultados.`);
          }}
        />
      )}

      {/* DRAWER / MODAL DE EXAMEN CLÍNICO PROFUNDO (DETALLE) */}
      {ordenDetalle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-3xl w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-left text-white max-h-[90vh] overflow-y-auto">
            {/* CABECERA */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Informe de Resultados de Laboratorio Clínico
                </span>
                <h3 className="font-['Outfit'] font-black text-2xl text-white mt-0.5">
                  {ordenDetalle.pacienteNombre}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Orden: {ordenDetalle.codigoOrden} • C.I.: {ordenDetalle.pacienteCedula || "S/D"}
                </p>
              </div>
              <button
                onClick={() => setOrdenDetalle(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* SELLO DE AUDITORÍA */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Laboratorio Emisor:</span>
                <strong className="text-teal-300 text-sm">
                  {ordenDetalle.resultado?.nombreLaboratorio || "Laboratorio Clínico"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Bioanalista Responsable:</span>
                <span className="text-white font-medium">
                  {ordenDetalle.resultado?.bioanalistaResponsable || "No indicado"}
                </span>
                {ordenDetalle.resultado?.colegiaturaBioanalista && (
                  <span className="text-slate-400 block text-[10px]">
                    Col: {ordenDetalle.resultado.colegiaturaBioanalista}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Fecha y Hora de Carga:</span>
                <span className="text-slate-300 font-mono">
                  {ordenDetalle.resultado?.fechaCarga
                    ? new Date(ordenDetalle.resultado.fechaCarga).toLocaleString("es-VE")
                    : "Reciente"}
                </span>
              </div>
            </div>

            {/* ALERTA DE VALORES CRÍTICOS */}
            {ordenDetalle.resultado?.valoresCriticos && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 text-xs text-red-200 space-y-1">
                <span className="font-black text-red-400 text-sm flex items-center gap-1.5">
                  <span>🚨</span> ALERTA DE VALOR CRÍTICO / RANGO DE PÁNICO
                </span>
                <p className="text-sm font-semibold">{ordenDetalle.resultado.detalleValoresCriticos}</p>
              </div>
            )}

            {/* INFORME DETALLADO DE TEXTO */}
            {ordenDetalle.resultado?.informeDetallado && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  📝 Informe Analítico / Microscopía / Conteos:
                </h4>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                  {ordenDetalle.resultado.informeDetallado}
                </div>
              </div>
            )}

            {/* CONCLUSIÓN & MUESTRA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {ordenDetalle.resultado?.conclusionDiagnostica && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-slate-400 font-semibold block mb-1">Conclusión Bioanalista:</span>
                  <p className="text-slate-200 font-medium">{ordenDetalle.resultado.conclusionDiagnostica}</p>
                </div>
              )}
              {ordenDetalle.resultado?.observacionesMuestra && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-slate-400 font-semibold block mb-1">Observaciones de la Muestra:</span>
                  <p className="text-slate-200 font-medium">{ordenDetalle.resultado.observacionesMuestra}</p>
                </div>
              )}
            </div>

            {/* GALERÍA DE FOTOS Y ARCHIVOS ADJUNTOS */}
            {ordenDetalle.resultado?.adjuntos && ordenDetalle.resultado.adjuntos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📸</span> Evidencias Fotográficas & Documentos ({ordenDetalle.resultado.adjuntos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ordenDetalle.resultado.adjuntos.map((adj, idx) => {
                    const esImagen = adj.tipoMime.startsWith("image/") || adj.contenidoBase64.startsWith("data:image");
                    return (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-2 text-center group cursor-pointer hover:border-teal-500/50 transition-all"
                        onClick={() => {
                          if (esImagen) setFotoAmpliada(adj.contenidoBase64);
                          else {
                            const win = window.open();
                            win?.document.write(`<iframe src="${adj.contenidoBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                          }
                        }}
                      >
                        {esImagen ? (
                          <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-900 mb-2">
                            <img
                              src={adj.contenidoBase64}
                              alt={adj.nombreArchivo}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 rounded-xl bg-slate-900 flex flex-col items-center justify-center text-3xl mb-2 text-red-400">
                            <span>📄</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ver PDF</span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-300 truncate font-medium">{adj.nombreArchivo}</p>
                        <span className="text-[10px] text-teal-400 group-hover:underline">Clic para ampliar</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECCIÓN DE VISTO BUENO / REVISIÓN DEL DOCTOR */}
            <div className="bg-slate-950/80 border border-teal-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>👨‍⚕️</span> Conformidad & Visto Bueno Médico
                </span>
                {ordenDetalle.revisadoPorMedico ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                    ✓ Revisado el {ordenDetalle.fechaRevisionMedico ? new Date(ordenDetalle.fechaRevisionMedico).toLocaleString("es-VE") : "Hoy"}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30">
                    Pendiente de Visto Bueno
                  </span>
                )}
              </div>

              {!ordenDetalle.revisadoPorMedico ? (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={notasRevision}
                    onChange={(e) => setNotasRevision(e.target.value)}
                    placeholder="Notas médicas de revisión (Opcional, ej: Paciente estable, citar para ajuste de dosis)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-500"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleMarcarRevisado(ordenDetalle.id)}
                      disabled={marcando}
                      className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {marcando ? "Firmando..." : "✓ Marcar como Revisado por el Doctor"}
                    </button>
                    <button
                      type="button"
                      onClick={() => notificarResultadosListosWhatsApp(ordenDetalle)}
                      className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>💬</span> Notificar WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                ordenDetalle.notasRevisionMedico && (
                  <p className="text-xs text-slate-300 italic">
                    "{ordenDetalle.notasRevisionMedico}"
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE FOTO AMPLIADA */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[60] cursor-pointer"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={fotoAmpliada}
              alt="Foto ampliada del análisis"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-teal-500/40"
            />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center text-lg shadow-xl"
            >
              ✕
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">Haga clic en cualquier lugar para cerrar</p>
          </div>
        </div>
      )}
    </div>
  );
}
