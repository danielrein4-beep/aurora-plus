import { avisar } from "../avisos";
import { leerSesion } from "../api";
import React, { useState, useEffect, useRef } from "react";

function SvgClose({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SvgAutomation({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3.5" y="4" width="5" height="5" rx="1" />
      <rect x="15.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="3.5" y="15" width="5" height="5" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 6.5h3a3 3 0 013 3v2.5M8.5 17.5h3a3 3 0 003-3v-2.5M12 12h2.5" />
    </svg>
  );
}

function SvgSend({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function SvgCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function SvgCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface MensajeChat {
  emisor: "cliente" | "ia";
  texto: string;
  intencion?: string;
  hora: string;
}

interface Props {
  tenantId: number;
  nombreNegocio?: string;
  onClose: () => void;
}

/** El asistente se configura con la sesión del negocio (la ruta pública ya no existe). */
function cabecerasSesion(): Record<string, string> {
  const token = leerSesion()?.token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function AsistenteIaModal({ tenantId, nombreNegocio, onClose }: Props) {
  const [tab, setTab] = useState<"simulador" | "config" | "meta">("simulador");

  // Estado de Configuracion
  const [activa, setActiva] = useState(true);
  const [saludo, setSaludo] = useState("");
  const [politicaDelivery, setPoliticaDelivery] = useState("");
  const [zonasDelivery, setZonasDelivery] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [msgExitoConfig, setMsgExitoConfig] = useState<string | null>(null);

  // Estado del Simulador
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      emisor: "ia",
      texto: `Hola, bienvenido a ${nombreNegocio || "la tienda"}. Soy tu asistente virtual de ventas conectado a inventario en tiempo real. ¿En que te podemos ayudar hoy?`,
      hora: "Ahora"
    }
  ]);
  const [inputMensaje, setInputMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiadoUrl, setCopiadoUrl] = useState(false);
  const [copiadoToken, setCopiadoToken] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/comercio/whatsapp-ia/config`, { headers: cabecerasSesion() })
      .then((r) => r.json())
      .then((data) => {
        if (data.activa !== undefined) setActiva(data.activa);
        if (data.saludo) setSaludo(data.saludo);
        if (data.politicaDelivery) setPoliticaDelivery(data.politicaDelivery);
        if (data.zonasDelivery) setZonasDelivery(data.zonasDelivery);
        if (data.verifyToken) setVerifyToken(data.verifyToken);
        if (data.webhookUrl) setWebhookUrl(data.webhookUrl);
      })
      .catch(() => avisar("No se pudo cargar la configuración del asistente de WhatsApp. Si guardas así, podrías borrar lo que ya tenías. Cierra y vuelve a abrir.", "error"));
  }, [tenantId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const handleEnviarMensaje = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputMensaje).trim();
    if (!texto || enviando) return;

    const horaActual = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Agregar mensaje del cliente
    setMensajes((prev) => [...prev, { emisor: "cliente", texto, hora: horaActual }]);
    setInputMensaje("");
    setEnviando(true);

    try {
      const res = await fetch(`/api/comercio/whatsapp-ia/simular`, {
        method: "POST",
        headers: cabecerasSesion(),
        body: JSON.stringify({ mensaje: texto, telefono: "584140000000" })
      });

      if (!res.ok) throw new Error("Error en el simulador");
      const data = await res.json();

      setMensajes((prev) => [
        ...prev,
        {
          emisor: "ia",
          texto: data.textoRespuesta,
          intencion: data.intencion,
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          emisor: "ia",
          texto: "Lo siento, ha ocurrido una interrupcion temporal en el servidor de IA.",
          hora: horaActual
        }
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoConfig(true);
    setMsgExitoConfig(null);
    try {
      const res = await fetch(`/api/comercio/whatsapp-ia/config`, {
        method: "POST",
        headers: cabecerasSesion(),
        body: JSON.stringify({ 
          activa, 
          saludo: saludo.trim(), 
          verifyToken: verifyToken.trim(),
          politicaDelivery: politicaDelivery.trim(),
          zonasDelivery: zonasDelivery.trim()
        })
      });
      if (res.ok) {
        setMsgExitoConfig("Configuracion de IA guardada exitosamente.");
        setTimeout(() => setMsgExitoConfig(null), 4000);
      }
    } catch {
      setMsgExitoConfig("Error al guardar la configuracion.");
    } finally {
      setGuardandoConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full h-[620px] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/25 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <SvgAutomation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white leading-none">
                  Asistente IA de WhatsApp & Ventas
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    activa
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {activa ? "IA Activa" : "Pausada"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Atención 24/7 con consulta en vivo de inventario y tasa BCV oficial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <SvgClose className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab("simulador")}
            className={`pb-2.5 border-b-2 transition-colors ${
              tab === "simulador"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Simulador de Chat en Vivo
          </button>
          <button
            type="button"
            onClick={() => setTab("config")}
            className={`pb-2.5 border-b-2 transition-colors ${
              tab === "config"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Personalización & Saludo
          </button>
          <button
            type="button"
            onClick={() => setTab("meta")}
            className={`pb-2.5 border-b-2 transition-colors ${
              tab === "meta"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Conexión Meta Cloud API
          </button>
        </div>

        {/* Contenido según Tab */}
        {tab === "simulador" && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/60">
            {/* Mensajes del Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mensajes.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.emisor === "cliente" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                      m.emisor === "cliente"
                        ? "bg-teal-600 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {m.texto}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {m.intencion && (
                      <span className="text-[9px] font-mono text-teal-500 uppercase tracking-wider">
                        {m.intencion}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{m.hora}</span>
                  </div>
                </div>
              ))}
              {enviando && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span>La IA está consultando el inventario...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chips de Preguntas Frecuentes */}
            <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Probar:
              </span>
              {[
                "¿Tienes taladro percutor y cuánto cuesta?",
                "¿A qué tasa reciben hoy?",
                "Pásame los datos de Pago Móvil",
                "¿Hacen delivery y cuánto cuesta?",
                "¿Dónde están ubicados?",
                "¿Qué métodos de pago aceptan?",
                "Quiero hablar con un asesor",
                "Quiero ver el catálogo completo"
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleEnviarMensaje(sug)}
                  disabled={enviando}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-teal-400 hover:border-teal-500/40 whitespace-nowrap transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Formulario de Entrada */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe como si fueras un cliente en WhatsApp..."
                value={inputMensaje}
                onChange={(e) => setInputMensaje(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEnviarMensaje()}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleEnviarMensaje()}
                disabled={enviando || !inputMensaje.trim()}
                className="p-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold transition-all active:scale-95"
              >
                <SvgSend className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {tab === "config" && (
          <form onSubmit={handleGuardarConfig} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Activar Asistente IA en WhatsApp
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Responde automáticamente a los mensajes entrantes consultando precios y stock.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={(e) => setActiva(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Saludo de Bienvenida Personalizado
              </label>
              <textarea
                rows={2}
                value={saludo}
                onChange={(e) => setSaludo(e.target.value)}
                placeholder="Hola, bienvenido a nuestro negocio. Estamos a tu orden con disponibilidad inmediata..."
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Se enviara cuando un cliente salude por primera vez o escriba "Hola".
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Politica de Delivery / Tarifas
                </label>
                <textarea
                  rows={2}
                  value={politicaDelivery}
                  onChange={(e) => setPoliticaDelivery(e.target.value)}
                  placeholder="Ej: Delivery gratis en compras mayores a $20, o $2 tarifa plana en el casco central."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  La IA respondera con esta politica cuando pregunten por envios.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Zonas de Cobertura
                </label>
                <textarea
                  rows={2}
                  value={zonasDelivery}
                  onChange={(e) => setZonasDelivery(e.target.value)}
                  placeholder="Ej: Casco central, Zona Norte, Zona Este y envios nacionales por Zoom/MRW."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Sectores o ciudades donde el negocio realiza entregas.
                </span>
              </div>
            </div>

            {msgExitoConfig && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {msgExitoConfig}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={guardandoConfig}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                {guardandoConfig ? "Guardando..." : "Guardar Personalización"}
              </button>
            </div>
          </form>
        )}

        {tab === "meta" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs space-y-1">
              <span className="font-bold text-teal-400 block">Conexión Oficial Meta Cloud API</span>
              <p className="text-slate-300">
                Pega estos dos datos en el panel de desarrolladores de Meta (Meta for Developers &gt; WhatsApp &gt; Configuration) para conectar este número de WhatsApp con Aurora Plus:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Callback URL (Webhook de Meta)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl || `https://auroraplus.app/api/public/whatsapp/${tenantId}/webhook`}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl || `https://auroraplus.app/api/public/whatsapp/${tenantId}/webhook`);
                      setCopiadoUrl(true);
                      setTimeout(() => setCopiadoUrl(false), 3000);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
                  >
                    {copiadoUrl ? <SvgCheck className="w-4 h-4 text-teal-400" /> : <SvgCopy className="w-4 h-4" />}
                    <span>{copiadoUrl ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Verify Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={verifyToken || `aurora_token_${tenantId}`}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(verifyToken || `aurora_token_${tenantId}`);
                      setCopiadoToken(true);
                      setTimeout(() => setCopiadoToken(false), 3000);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
                  >
                    {copiadoToken ? <SvgCheck className="w-4 h-4 text-teal-400" /> : <SvgCopy className="w-4 h-4" />}
                    <span>{copiadoToken ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Campos de webhook a suscribir en Meta:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li><code className="text-teal-400">messages</code> (recibe consultas de texto de clientes)</li>
                <li><code className="text-teal-400">message_deliveries</code> (confirmación de entrega)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
