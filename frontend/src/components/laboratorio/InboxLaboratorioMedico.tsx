import { useState, useEffect, useMemo } from "react";
import {
  listarInboxExamenesRecibidos,
  marcarLeidoExamenRecibido,
  vincularPacienteExamenRecibido,
  obtenerUrlPortalLaboratorio,
  type ExamenRecibidoPaciente,
  type Paciente,
} from "../../api";

export default function InboxLaboratorioMedico({
  tenantId,
  pacientes,
  onActualizarContador,
  onVerHistoriaPaciente,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  onActualizarContador?: () => void;
  onVerHistoriaPaciente?: (pacienteId: number) => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [examenes, setExamenes] = useState<ExamenRecibidoPaciente[]>([]);
  const [examenDetalle, setExamenDetalle] = useState<ExamenRecibidoPaciente | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [urlPortal, setUrlPortal] = useState<string>("");
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [busquedaVincular, setBusquedaVincular] = useState("");
  const [vinculando, setVinculando] = useState(false);

  const cargarDatos = () => {
    setCargando(true);
    listarInboxExamenesRecibidos(tenantId)
      .then((res) => {
        setExamenes(res);
        if (onActualizarContador) onActualizarContador();
      })
      .catch((err) => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarDatos();
    obtenerUrlPortalLaboratorio()
      .then((res) => setUrlPortal(res.url))
      .catch((err) => console.error("No se pudo obtener el enlace del portal:", err));
  }, [tenantId]);

  const pendientesCount = examenes.filter((e) => !e.leido).length;

  const buscarNombrePaciente = (pacienteId: number) => {
    return pacientes?.find((p) => p.id === pacienteId)?.nombreCompleto || null;
  };

  const abrirDetalle = async (examen: ExamenRecibidoPaciente) => {
    setExamenDetalle(examen);
    if (!examen.leido) {
      try {
        const actualizado = await marcarLeidoExamenRecibido(tenantId, examen.id);
        setExamenes((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
        setExamenDetalle(actualizado);
        if (onActualizarContador) onActualizarContador();
      } catch (err) {
        console.error("No se pudo marcar como leído:", err);
      }
    }
  };

  const copiarLinkPortal = () => {
    navigator.clipboard.writeText(urlPortal);
    setCopiadoLink(true);
    setTimeout(() => setCopiadoLink(false), 3000);
  };

  const telefonoDe = (examen: ExamenRecibidoPaciente) => {
    const pacienteVinculado = examen.pacienteId ? pacientes?.find((p) => p.id === examen.pacienteId) : null;
    return (pacienteVinculado?.telefono || examen.telefonoIngresado || "").replace(/\D/g, "");
  };

  const responderWhatsApp = (examen: ExamenRecibidoPaciente) => {
    const tel = telefonoDe(examen);
    const nombrePaciente = examen.pacienteId ? buscarNombrePaciente(examen.pacienteId) : examen.nombreIngresado;
    const mensaje = `Hola ${nombrePaciente || ""}, recibimos los resultados de laboratorio que envió (ficha #${examen.id}). `.trim();
    if (!tel) {
      alert("No hay un número de teléfono registrado para este paciente.");
      return;
    }
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const candidatosVincular = useMemo(() => {
    const q = busquedaVincular.trim().toLowerCase();
    if (!q || !pacientes) return [];
    return pacientes
      .filter((p) => p.nombreCompleto.toLowerCase().includes(q) || p.identificacion.toLowerCase().includes(q))
      .slice(0, 6);
  }, [busquedaVincular, pacientes]);

  const handleVincular = async (pacienteId: number) => {
    if (!examenDetalle) return;
    setVinculando(true);
    try {
      const actualizado = await vincularPacienteExamenRecibido(tenantId, examenDetalle.id, pacienteId);
      setExamenes((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
      setExamenDetalle(actualizado);
      setBusquedaVincular("");
    } catch (err: any) {
      alert("Error al vincular: " + err.message);
    } finally {
      setVinculando(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* CABECERA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔬</span>
            <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">
              Red de Laboratorios & Inbox
            </h2>
            {pendientesCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                {pendientesCount} sin leer
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sus pacientes suben aquí los resultados que reciben del laboratorio, escaneando el QR fijo de su consultorio.
          </p>
        </div>
      </div>

      {/* ENLACE/QR DEL PORTAL — para que el doctor lo comparta o lo verifique */}
      <div className="apple-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Su enlace fijo de recepción (va como QR en la página 2 de cada informe)
          </span>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5">{urlPortal || "Cargando..."}</p>
        </div>
        <button
          onClick={copiarLinkPortal}
          disabled={!urlPortal}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all disabled:opacity-50"
        >
          {copiadoLink ? "¡Copiado!" : "🔗 Copiar enlace"}
        </button>
      </div>

      {/* LISTA */}
      {cargando ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Cargando inbox...
        </div>
      ) : examenes.length === 0 ? (
        <div className="apple-glass rounded-3xl p-12 text-center space-y-3">
          <div className="text-4xl">🧪</div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Bandeja de Entrada al Día</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Cuando un paciente suba resultados desde el enlace/QR de su consultorio, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {examenes.map((examen) => {
            const nombrePaciente = examen.pacienteId ? buscarNombrePaciente(examen.pacienteId) : null;
            const sinIdentificar = !examen.pacienteId;
            return (
              <div
                key={examen.id}
                onClick={() => abrirDetalle(examen)}
                className={`rounded-3xl p-5 space-y-3 border cursor-pointer transition-all ${
                  !examen.leido
                    ? "apple-glass border-teal-500/60 bg-teal-500/5 shadow-lg shadow-teal-500/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {!examen.leido && <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse flex-shrink-0" />}
                      <h4 className={`text-base ${!examen.leido ? "font-black text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-400"}`}>
                        {nombrePaciente || examen.nombreIngresado || "Paciente sin nombre"}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      CI: {examen.cedulaIngresada} • {examen.archivos.length} archivo{examen.archivos.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {sinIdentificar ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                      Sin identificar
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                      Vinculada
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {new Date(examen.fechaHoraRecepcion).toLocaleString("es-VE")}
                  {examen.leido && examen.fechaHoraLeido && (
                    <span> • Leído {new Date(examen.fechaHoraLeido).toLocaleDateString("es-VE")}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* DETALLE / FICHA */}
      {examenDetalle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setExamenDetalle(null)}>
          <div
            className="max-w-3xl w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-left text-white max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Ficha de Laboratorio Recibida</span>
                <h3 className="font-['Outfit'] font-black text-2xl text-white mt-0.5">
                  {examenDetalle.pacienteId ? buscarNombrePaciente(examenDetalle.pacienteId) : examenDetalle.nombreIngresado || "Sin nombre"}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  CI: {examenDetalle.cedulaIngresada} • Recibido {new Date(examenDetalle.fechaHoraRecepcion).toLocaleString("es-VE")}
                </p>
              </div>
              <button
                onClick={() => setExamenDetalle(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* SIN IDENTIFICAR: buscador para vincular */}
            {!examenDetalle.pacienteId && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>⚠️</span> Esta ficha no está vinculada a ningún expediente
                </span>
                <input
                  type="text"
                  value={busquedaVincular}
                  onChange={(e) => setBusquedaVincular(e.target.value)}
                  placeholder="Buscar paciente por nombre o cédula para vincular..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-500"
                />
                {candidatosVincular.length > 0 && (
                  <div className="space-y-1.5">
                    {candidatosVincular.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={vinculando}
                        onClick={() => handleVincular(p.id)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-800 hover:bg-teal-500/20 text-xs text-white transition-all flex items-center justify-between"
                      >
                        <span>{p.nombreCompleto}</span>
                        <span className="text-slate-400 font-mono">{p.identificacion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONTACTO E INFO */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {examenDetalle.telefonoIngresado && (
                <div>
                  <span className="text-slate-500 block">Teléfono indicado por el paciente:</span>
                  <strong className="text-teal-300 text-sm font-mono">{examenDetalle.telefonoIngresado}</strong>
                </div>
              )}
              {examenDetalle.leido && (
                <div>
                  <span className="text-slate-500 block">Revisado:</span>
                  <span className="text-white font-medium">
                    {examenDetalle.fechaHoraLeido ? new Date(examenDetalle.fechaHoraLeido).toLocaleString("es-VE") : "Hoy"}
                    {examenDetalle.leidoPor ? ` por ${examenDetalle.leidoPor}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* GALERÍA DE ARCHIVOS */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <span>📸</span> Archivos Recibidos ({examenDetalle.archivos.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {examenDetalle.archivos.map((adj, idx) => {
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
                          <img src={adj.contenidoBase64} alt={adj.nombreArchivo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="w-full h-32 rounded-xl bg-slate-900 flex flex-col items-center justify-center text-3xl mb-2 text-red-400">
                          <span>📄</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ver PDF</span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-300 truncate font-medium">{adj.nombreArchivo}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RESPUESTA WHATSAPP */}
            <div className="pt-2">
              <button
                onClick={() => responderWhatsApp(examenDetalle)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>💬</span> Responder al Paciente por WhatsApp
              </button>
              {examenDetalle.pacienteId && onVerHistoriaPaciente && (
                <button
                  onClick={() => onVerHistoriaPaciente(examenDetalle.pacienteId!)}
                  className="w-full py-2.5 mt-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all"
                >
                  Ver Historia Clínica del Paciente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[60] cursor-pointer" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={fotoAmpliada} alt="Archivo ampliado" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-teal-500/40" />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center text-lg shadow-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
