import React, { useState, useEffect, useRef } from "react";
import AuroraLogo from "../AuroraLogo";
import {
  SaasSoporteTicket,
  SaasSoporteMensaje,
  CrearTicketRequest,
  listarTicketsTenant,
  crearTicketTenant,
  listarMensajesTicketTenant,
  enviarMensajeTicketTenant,
  leerSesion,
} from "../api";

export default function TenantSoporteWidget() {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"LISTA" | "NUEVO" | "CHAT">("LISTA");
  const [tickets, setTickets] = useState<SaasSoporteTicket[]>([]);
  const [ticketActivo, setTicketActivo] = useState<SaasSoporteTicket | null>(null);
  const [mensajes, setMensajes] = useState<SaasSoporteMensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [nuevoForm, setNuevoForm] = useState<CrearTicketRequest>({
    tituloAsunto: "",
    mensajeInicial: "",
    categoria: "SOPORTE_TECNICO",
    prioridad: "MEDIA",
  });

  const mensajesEndRef = useRef<HTMLDivElement | null>(null);
  const sesion = leerSesion();

  // Cargar tickets del tenant
  const cargarTickets = async () => {
    try {
      const data = await listarTicketsTenant(sesion?.tenantId);
      setTickets(data);
    } catch (e) {
      console.error("Error al cargar tickets:", e);
    }
  };

  // Cargar mensajes del ticket activo
  const cargarMensajes = async (ticketId: number) => {
    try {
      const msgs = await listarMensajesTicketTenant(ticketId);
      setMensajes(msgs);
    } catch (e) {
      console.error("Error al cargar mensajes:", e);
    }
  };

  useEffect(() => {
    if (abierto) {
      cargarTickets();
    }
  }, [abierto]);

  // Polling para mensajes en vivo cuando esta en CHAT
  useEffect(() => {
    if (abierto && vista === "CHAT" && ticketActivo) {
      cargarMensajes(ticketActivo.id);
      const interval = setInterval(() => {
        cargarMensajes(ticketActivo.id);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [abierto, vista, ticketActivo]);

  // Auto-scroll al final en el chat
  useEffect(() => {
    if (vista === "CHAT") {
      mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes, vista]);

  // Abrir conversacion de un ticket
  const handleSeleccionarTicket = (t: SaasSoporteTicket) => {
    setTicketActivo(t);
    setVista("CHAT");
    cargarMensajes(t.id);
  };

  // Enviar mensaje en chat
  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketActivo || !nuevoMensaje.trim() || enviando) return;

    setEnviando(true);
    try {
      const msg = await enviarMensajeTicketTenant(ticketActivo.id, nuevoMensaje.trim(), sesion?.username);
      setMensajes((prev) => [...prev, msg]);
      setNuevoMensaje("");
    } catch (err: any) {
      alert("Error al enviar mensaje: " + (err.message || "Error de conexion"));
    } finally {
      setEnviando(false);
    }
  };

  // Crear nuevo ticket
  const handleCrearTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoForm.tituloAsunto.trim() || !nuevoForm.mensajeInicial.trim() || enviando) return;

    setEnviando(true);
    try {
      const nuevo = await crearTicketTenant({
        ...nuevoForm,
        tenantId: sesion?.tenantId,
        usuarioCreador: sesion?.username,
      });
      await cargarTickets();
      setTicketActivo(nuevo);
      setVista("CHAT");
      cargarMensajes(nuevo.id);
      setNuevoForm({
        tituloAsunto: "",
        mensajeInicial: "",
        categoria: "SOPORTE_TECNICO",
        prioridad: "MEDIA",
      });
    } catch (err: any) {
      alert("Error al crear ticket: " + (err.message || "Error"));
    } finally {
      setEnviando(false);
    }
  };

  const ticketsNoLeidos = tickets.reduce((acc, t) => acc + (t.mensajesNoLeidos || 0), 0);

  return (
    <>
      {/* BOTON FLOTANTE DE ASISTENCIA */}
      {!abierto && (
        <div className="soporte-flotante fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setAbierto(true)}
            className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 font-bold text-xs transition-all transform hover:scale-105 cursor-pointer"
            title="Abrir chat de soporte en vivo con Aurora Plus"
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {ticketsNoLeidos > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </div>
            <span>Soporte Aurora</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          </button>
        </div>
      )}

      {/* VENTANA FLOTANTE DE SOPORTE TIPO CHAT */}
      {abierto && (
        <div className="soporte-flotante fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden font-sans text-slate-800 animate-fadeIn">
          {/* HEADER DEL WIDGET */}
          <div className="p-4 bg-emerald-500 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-white/10 flex items-center justify-center">
                <AuroraLogo size={22} animated={false} />
              </div>
              <div>
                <div className="font-['Outfit'] font-extrabold text-sm leading-tight flex items-center gap-1.5">
                  <span>Asistencia Aurora</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-emerald-100 font-medium">
                  Chat en vivo con ingenieria
                </div>
              </div>
            </div>

            <button
              onClick={() => setAbierto(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="Cerrar ventana"
            >
              [X]
            </button>
          </div>

          {/* VISTA 1: LISTADO DE TICKETS DEL NEGOCIO */}
          {vista === "LISTA" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <span className="text-xs font-bold text-slate-700">Tus Casos de Soporte</span>
                <button
                  onClick={() => setVista("NUEVO")}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  + Abrir Ticket
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {tickets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                    <div className="p-3 rounded-full bg-slate-100 text-slate-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-600">Sin tickets de soporte</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Si requieres ayuda tecnica o ajustes en tu plan, inicia un caso aqui.
                      </p>
                    </div>
                    <button
                      onClick={() => setVista("NUEVO")}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all cursor-pointer shadow-xs"
                    >
                      Crear Primer Ticket
                    </button>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSeleccionarTicket(t)}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          #{t.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                          t.estado === "ABIERTO"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : t.estado === "EN_ATENCION"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {t.estado}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-800 line-clamp-1">
                        {t.tituloAsunto}
                      </div>
                      {t.ultimoMensaje && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {t.ultimoMensaje}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>{t.categoria}</span>
                        {t.mensajesNoLeidos && t.mensajesNoLeidos > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold font-mono">
                            {t.mensajesNoLeidos} nuevos
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: FORMULARIO DE NUEVO TICKET */}
          {vista === "NUEVO" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <button
                  onClick={() => setVista("LISTA")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  [Volver]
                </button>
                <span className="text-xs font-bold text-slate-800">Abrir Nuevo Caso</span>
                <div className="w-8"></div>
              </div>

              <form onSubmit={handleCrearTicket} className="flex-1 p-4 space-y-3 overflow-y-auto text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                    Asunto de la Solicitud
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Problema al generar reporte..."
                    value={nuevoForm.tituloAsunto}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, tituloAsunto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-medium focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                      Categoria
                    </label>
                    <select
                      value={nuevoForm.categoria}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, categoria: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-slate-800 font-medium focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="SOPORTE_TECNICO">Soporte Tecnico</option>
                      <option value="FACTURACION">Facturacion & Pagos</option>
                      <option value="DUDA_USO">Duda de Uso</option>
                      <option value="CONFIGURACION">Configuracion</option>
                      <option value="ERROR_SISTEMA">Error en Pantalla</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                      Prioridad
                    </label>
                    <select
                      value={nuevoForm.prioridad}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, prioridad: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-slate-800 font-medium focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="BAJA">Baja</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                    Detalle del Mensaje Inicial
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe claramente que ocurre o que necesitas para que el equipo te responda..."
                    value={nuevoForm.mensajeInicial}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, mensajeInicial: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-medium focus:border-emerald-500 outline-none resize-none"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {enviando ? "Creando caso..." : "Iniciar Chat con Soporte"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VISTA 3: CHAT EN VIVO TIPO WHATSAPP */}
          {vista === "CHAT" && ticketActivo && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              {/* TOP BAR DE LA CONVERSACION */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                <button
                  onClick={() => setVista("LISTA")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <span>[Volver]</span>
                </button>
                <div className="text-center px-2 flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-800 truncate">
                    {ticketActivo.tituloAsunto}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ticket #{ticketActivo.id} - {ticketActivo.estado}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                  ticketActivo.estado === "RESUELTO"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {ticketActivo.estado}
                </span>
              </div>

              {/* AREA DE MENSAJES (BURBUJAS TIPO WHATSAPP) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mensajes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                    Iniciando sala de conversacion...
                  </div>
                ) : (
                  mensajes.map((m) => {
                    const esMio = m.emisorTipo === "TENANT";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${esMio ? "items-end" : "items-start"}`}
                      >
                        <div className="text-[9px] font-semibold text-slate-400 mb-0.5 px-1">
                          {esMio ? "Tu" : m.emisorNombre || "Soporte Aurora"}
                        </div>
                        <div
                          className={`max-w-[84%] p-3 text-xs rounded-2xl shadow-2xs ${
                            esMio
                              ? "bg-emerald-500 text-white rounded-tr-xs"
                              : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                          }`}
                        >
                          <div className="leading-relaxed whitespace-pre-wrap">{m.contenido}</div>
                          <div
                            className={`text-[9px] mt-1 text-right font-mono ${
                              esMio ? "text-emerald-100" : "text-slate-400"
                            }`}
                          >
                            {m.fechaEnvio ? m.fechaEnvio.substring(11, 16) : ""}
                            {esMio && <span className="ml-1">[OK]</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={mensajesEndRef} />
              </div>

              {/* INPUT BAR TIPO WHATSAPP */}
              <form onSubmit={handleEnviarMensaje} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escribe tu mensaje para el soporte..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={enviando}
                  className="flex-1 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={enviando || !nuevoMensaje.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl transition-all shadow-xs shadow-emerald-500/20 cursor-pointer disabled:opacity-40"
                >
                  Enviar
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
