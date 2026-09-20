import React, { useState } from "react";
import { SERVICIOS_INICIALES, ESPECIALISTAS_INICIALES } from "./mockData";
import { ServicioPeluqueria, Especialista } from "./types";
import { IconScissors, IconClock, IconSparkles, IconCheck, IconChat, IconCalendar, IconUser } from "../../Icons";
import AuroraLogo from "../../AuroraLogo";

export default function PortalReservasPublico() {
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioPeluqueria>(SERVICIOS_INICIALES[0]);
  const [especialistaSeleccionado, setEspecialistaSeleccionado] = useState<string>("Cualquier Especialista Disponible");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("14:00");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [enviado, setEnviado] = useState(false);

  // Categorías únicas
  const categorias = Array.from(new Set(SERVICIOS_INICIALES.map((s) => s.categoria)));
  const [categoriaActiva, setCategoriaActiva] = useState<string>(categorias[0]);

  const serviciosFiltrados = SERVICIOS_INICIALES.filter((s) => s.categoria === categoriaActiva);

  const telefonoSalon = "+584120000000"; // Teléfono WhatsApp del salón

  const handleConfirmarReserva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) return;

    // Mensaje estructurado de WhatsApp
    const mensaje = `¡Hola! Deseo agendar una cita en el salón:\n\n` +
      `*Servicio:* ${servicioSeleccionado.nombre}\n` +
      `*Precio estimado:* ${servicioSeleccionado.precioUSD} USD\n` +
      `*Duración:* ${servicioSeleccionado.duracionMinutos} min\n` +
      `*Especialista:* ${especialistaSeleccionado}\n` +
      `*Fecha:* ${fecha}\n` +
      `*Hora:* ${hora}\n\n` +
      `*Mis Datos:*\n` +
      `• Nombre: ${nombre.trim()}\n` +
      `• Teléfono: ${telefono.trim()}\n` +
      (notas.trim() ? `• Notas/Petición: ${notas.trim()}\n` : "") +
      `\nQuedo a la espera de su confirmación. Muchas gracias.`;

    const url = `https://wa.me/${telefonoSalon.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Luces Ambientales de Aurora */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="aurora-ribbon-1 -top-32 -left-20 opacity-30" />
        <div className="aurora-ribbon-2 top-1/2 -right-20 opacity-30" />
      </div>

      <div className="max-w-4xl w-full relative z-10 space-y-6">
        {/* Header de la Marca */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-mono uppercase tracking-wider mb-1 shadow-sm">
            <IconSparkles size={14} />
            <span>Reserva Express & Beauty Concierge</span>
          </div>
          <h1 className="font-['Outfit'] font-black text-3xl sm:text-5xl text-white tracking-tight">
            Agenda tu Experiencia de Belleza
          </h1>
          <p className="text-white/60 text-xs sm:text-sm max-w-lg mx-auto">
            Elige tu servicio, fecha y horario. Tu solicitud se enviará de inmediato a nuestro WhatsApp para confirmarte el turno.
          </p>
        </div>

        {enviado ? (
          <div className="apple-glass rounded-3xl p-8 sm:p-12 text-center border border-emerald-500/30 bg-emerald-500/5 space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <IconCheck size={32} />
            </div>
            <h2 className="font-['Outfit'] font-black text-2xl sm:text-3xl text-white">
              ¡Solicitud Enviada a WhatsApp!
            </h2>
            <p className="text-white/70 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Hemos abierto la conversación con nuestro equipo. En breve te confirmaremos tu cita para el <strong>{fecha} a las {hora}</strong>.
            </p>
            <button
              onClick={() => setEnviado(false)}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              Agendar otra cita
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Formulario Principal (7 cols) */}
            <div className="lg:col-span-7 apple-glass rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl space-y-5">
              {/* Paso 1: Elegir Categoría & Servicio */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  1. Selecciona tu Servicio
                </label>
                {/* Pills de Categorías */}
                <div className="flex flex-wrap gap-1.5">
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoriaActiva(cat);
                        const primerServicio = SERVICIOS_INICIALES.find((s) => s.categoria === cat);
                        if (primerServicio) setServicioSeleccionado(primerServicio);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        categoriaActiva === cat
                          ? "bg-rose-500 text-white shadow-md scale-105"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Lista de Servicios de la Categoría */}
                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {serviciosFiltrados.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => setServicioSeleccionado(srv)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        servicioSeleccionado.id === srv.id
                          ? "bg-gradient-to-r from-rose-500/20 via-pink-500/10 to-transparent border-rose-400 shadow-md scale-[1.01]"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20 text-white/80"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">{srv.nombre}</div>
                        <div className="text-[11px] text-white/50">{srv.duracionMinutos} min • {srv.descripcion}</div>
                      </div>
                      <span className="font-mono font-black text-sm text-teal-300 ml-2">
                        ${srv.precioUSD}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paso 2: Especialista y Horario */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  2. Profesional & Horario
                </label>

                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Especialista de Preferencia</label>
                  <select
                    value={especialistaSeleccionado}
                    onChange={(e) => setEspecialistaSeleccionado(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none"
                  >
                    <option value="Cualquier Especialista Disponible">Cualquier Especialista Disponible</option>
                    {ESPECIALISTAS_INICIALES.map((esp) => (
                      <option key={esp.id} value={esp.nombre}>
                        {esp.nombre} ({esp.rol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1">Fecha Deseada</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1">Hora Aproximada</label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Paso 3: Datos de Contacto */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  3. Tus Datos para Confirmar
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre y apellido *"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Tu número WhatsApp *"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Comentarios o notas (ej. cabello con decoloración previa...)"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmarReserva}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-black text-sm hover:brightness-110 shadow-2xl transition-transform hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <span className="flex items-center justify-center gap-2"><IconChat size={16} /> Agendar y Enviar por WhatsApp</span>
                <span>→</span>
              </button>
            </div>

            {/* Resumen Lateral en Vivo (5 cols) */}
            <div className="lg:col-span-5 apple-glass rounded-3xl p-6 border border-white/15 shadow-2xl space-y-4 sticky top-6">
              <h3 className="font-['Outfit'] font-black text-lg text-white border-b border-white/10 pb-3 flex items-center gap-2">
                <IconSparkles size={16} className="text-rose-400" />
                <span>Resumen de tu Reserva</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Servicio Seleccionado</span>
                  <div className="font-bold text-white text-sm">{servicioSeleccionado.nombre}</div>
                  <div className="text-[11px] text-rose-300 font-mono">Duración: ~{servicioSeleccionado.duracionMinutos} min</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/40 block">Fecha:</span>
                    <span className="font-bold text-white font-mono">{fecha}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/40 block">Hora:</span>
                    <span className="font-bold text-white font-mono">{hora}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px]">
                  <span className="text-white/40 block">Especialista:</span>
                  <span className="font-bold text-white">{especialistaSeleccionado}</span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-white/60 font-semibold">Valor Estimado:</span>
                  <span className="font-mono text-2xl font-black text-emerald-400">
                    ${servicioSeleccionado.precioUSD} USD
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-white/40 text-center leading-relaxed">
                Al presionar el botón se abrirá WhatsApp con todos los datos listos. No requiere tarjeta de crédito para reservar.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
