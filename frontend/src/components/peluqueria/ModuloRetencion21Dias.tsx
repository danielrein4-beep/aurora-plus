import React, { useState, useMemo } from "react";
import { ClientePeluqueria } from "./types";
import {
  IconSparkles,
  IconClock,
  IconCheck,
  IconCalendar,
  IconChat,
  IconUsers,
  IconScissors,
  IconCheckCircle,
  IconInfo,
} from "../../Icons";

interface Props {
  clientes: ClientePeluqueria[];
}

interface TratamientoFrecuencia {
  id: string;
  nombre: string;
  diasRecomendados: number;
  descripcion: string;
  keywords: string[];
}

const TRATAMIENTOS_PREDEFINIDOS: TratamientoFrecuencia[] = [
  {
    id: "todos",
    nombre: "Todos los Servicios",
    diasRecomendados: 21,
    descripcion: "Fidelización general para cualquier servicio del salón",
    keywords: [],
  },
  {
    id: "tinte",
    nombre: "Retoque de Raíz & Color",
    diasRecomendados: 21,
    descripcion: "Ciclo biológico ideal para cubrir crecimiento de raíz y matizar rubios",
    keywords: ["tinte", "raíz", "raiz", "color", "balayage", "mechas", "decoloracion", "brillo"],
  },
  {
    id: "barberia",
    nombre: "Corte & Barba Caballero",
    diasRecomendados: 15,
    descripcion: "Frecuencia recomendada para conservar el degrade fade y perfilado",
    keywords: ["corte", "barba", "degradado", "fade", "caballero"],
  },
  {
    id: "hidratacion",
    nombre: "Hidratación & Keratina",
    diasRecomendados: 30,
    descripcion: "Mantenimiento mensual para sellado de cutícula, brillo y control de frizz",
    keywords: ["hidratacion", "hidratación", "keratina", "botox", "mascarilla", "nutricion"],
  },
  {
    id: "unas",
    nombre: "Uñas & Manicura",
    diasRecomendados: 21,
    descripcion: "Retoque antes del desprendimiento de acrílico o crecimiento de esmalte",
    keywords: ["uña", "uñas", "manicura", "pedicura", "acrílico", "semipermanente"],
  },
  {
    id: "pestanas",
    nombre: "Pestañas & Cejas",
    diasRecomendados: 21,
    descripcion: "Relleno de extensiones de pestañas y laminado de cejas",
    keywords: ["pestaña", "pestañas", "cejas", "laminado", "microblading"],
  },
];

const STORAGE_KEY_PLANTILLA = "aurora_retencion_plantilla_v2";
const STORAGE_KEY_HISTORIAL = "aurora_retencion_historial_v2";

export default function ModuloRetencion21Dias({ clientes = [] }: Props) {
  const [tratamientoSeleccionadoId, setTratamientoSeleccionadoId] = useState<string>("todos");
  const [diasFiltro, setDiasFiltro] = useState<number>(21);
  const [nombreSalon, setNombreSalon] = useState("Aurora Beauty Studio");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false);
  const [automatizacionActiva, setAutomatizacionActiva] = useState(true);

  // Plantilla editable con variables dinámicas
  const [plantillaMensaje, setPlantillaMensaje] = useState<string>(() => {
    try {
      const guardada = localStorage.getItem(STORAGE_KEY_PLANTILLA);
      if (guardada) return guardada;
    } catch {}
    return "Hola {nombre}. Te saludamos desde {salon}. Han pasado {dias} días desde tu último {servicio} y queremos invitarte a renovar tu estilo. ¿Deseas agendar tu cita esta semana? Elige tu horario aquí: {link} ¡Será un gusto atenderte!";
  });

  // Historial de envíos
  const [historialEnvios, setHistorialEnvios] = useState<{ [clienteId: string]: string }>(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY_HISTORIAL);
      if (guardado) return JSON.parse(guardado);
    } catch {}
    return {};
  });

  const tratamientoActual = useMemo(() => {
    return TRATAMIENTOS_PREDEFINIDOS.find((t) => t.id === tratamientoSeleccionadoId) || TRATAMIENTOS_PREDEFINIDOS[0];
  }, [tratamientoSeleccionadoId]);

  const handleSeleccionarTratamiento = (tratamiento: TratamientoFrecuencia) => {
    setTratamientoSeleccionadoId(tratamiento.id);
    setDiasFiltro(tratamiento.diasRecomendados);
  };

  // Cálculo seguro de días transcurridos
  const calcularDiasTranscurridos = (fechaStr?: string): number => {
    if (!fechaStr) return 0;
    try {
      const fechaVisita = new Date(fechaStr);
      if (isNaN(fechaVisita.getTime())) return 0;
      const hoy = new Date();
      const diffTime = hoy.getTime() - fechaVisita.getTime();
      return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  // Filtrado de clientas candidatas
  const clientesParaRetorno = useMemo(() => {
    if (!Array.isArray(clientes)) return [];

    return clientes
      .map((c) => {
        const dias = calcularDiasTranscurridos(c.fechaUltimaVisita);
        return { ...c, diasTranscurridos: dias };
      })
      .filter((c) => {
        // Filtro por días
        if (c.diasTranscurridos < diasFiltro) return false;

        // Filtro por palabras clave del tratamiento
        if (tratamientoActual.keywords.length > 0) {
          const servicio = (c.ultimoServicio || "").toLowerCase();
          const coincide = tratamientoActual.keywords.some((k) => servicio.includes(k));
          if (!coincide) return false;
        }

        // Filtro por búsqueda
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase();
          const matchNombre = (c.nombre || "").toLowerCase().includes(q);
          const matchTel = (c.telefono || "").includes(q);
          const matchServ = (c.ultimoServicio || "").toLowerCase().includes(q);
          if (!matchNombre && !matchTel && !matchServ) return false;
        }

        // Filtro de solo pendientes
        if (mostrarSoloPendientes && historialEnvios[c.id]) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.diasTranscurridos - a.diasTranscurridos);
  }, [clientes, diasFiltro, tratamientoActual, busqueda, mostrarSoloPendientes, historialEnvios]);

  const potencialIngresosUSD = useMemo(() => {
    return clientesParaRetorno.reduce((acc, c) => {
      const ticket = c.totalGastadoUSD && c.totalVisitas ? c.totalGastadoUSD / c.totalVisitas : 30;
      return acc + ticket;
    }, 0);
  }, [clientesParaRetorno]);

  const construirMensaje = (c: ClientePeluqueria & { diasTranscurridos: number }) => {
    const linkReserva = window.location.origin + "/reservar";
    const servicioTexto = c.ultimoServicio || "tratamiento de belleza";
    return plantillaMensaje
      .replace(/\{nombre\}/g, c.nombre || "estimada clienta")
      .replace(/\{salon\}/g, nombreSalon)
      .replace(/\{dias\}/g, String(c.diasTranscurridos))
      .replace(/\{servicio\}/g, servicioTexto)
      .replace(/\{link\}/g, linkReserva);
  };

  const handleEnviarWhatsApp = (c: ClientePeluqueria & { diasTranscurridos: number }) => {
    const texto = construirMensaje(c);
    const telLimpio = (c.telefono || "").replace(/[^0-9]/g, "");
    const url = `https://wa.me/${telLimpio}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");

    const ahora = new Date().toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const nuevoHistorial = { ...historialEnvios, [c.id]: ahora };
    setHistorialEnvios(nuevoHistorial);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(nuevoHistorial));
    } catch {}
  };

  const handleGuardarPlantilla = () => {
    try {
      localStorage.setItem(STORAGE_KEY_PLANTILLA, plantillaMensaje);
      alert("Plantilla de recordatorio guardada exitosamente.");
    } catch {}
  };

  const insertarVariable = (variable: string) => {
    setPlantillaMensaje((prev) => prev + " " + variable);
  };

  // Ejemplo para vista previa
  const ejemploCliente: ClientePeluqueria & { diasTranscurridos: number } = {
    id: "ejemplo",
    nombre: "Camila Morales",
    telefono: "+58 412 888-9900",
    fechaUltimaVisita: "",
    ultimoServicio: tratamientoActual.nombre,
    totalVisitas: 5,
    totalGastadoUSD: 180,
    diasTranscurridos: diasFiltro,
    fichaTecnica: {
      tonoNatural: "Nivel 5",
      tonoDeseado: "Rubio Cenizo 8.1",
      formulaTinte: "Igora 8.1 + 20 Vol",
      historialDecoloracion: "Puntas matizadas",
      sensibilidadAlergias: "Ninguna",
      bebidaPreferida: "Capuchino",
      observacionesEstilo: "Ondas al agua",
      ultimaActualizacion: "",
    },
  };

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL AUTOMATIZACION */}
      <div className="apple-glass rounded-3xl p-6 sm:p-8 border border-teal-500/30 bg-gradient-to-r from-teal-500/15 via-slate-900/60 to-purple-500/15 relative overflow-hidden shadow-2xl">
        <div className="line-aurora absolute top-0 left-0 right-0" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-mono uppercase tracking-wider">
              <IconSparkles size={14} />
              <span>Automatización de Recordatorios WhatsApp por Tratamiento</span>
            </div>
            <h2 className="font-['Outfit'] font-black text-2xl sm:text-4xl text-white">
              Retención Inteligente & Recompra Periódica
            </h2>
            <p className="text-white/70 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Configura los ciclos recomendados según cada tratamiento (retoque de color, corte, keratina, uñas) para que Aurora filtre automáticamente a las clientas listas para su siguiente visita y les envíe su recordatorio por WhatsApp en 1 solo clic.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Estado de Automatización:</span>
                <button
                  type="button"
                  onClick={() => setAutomatizacionActiva(!automatizacionActiva)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    automatizacionActiva
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/10 text-white/50 border border-white/10"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${automatizacionActiva ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                  <span>{automatizacionActiva ? "Filtros Activos (Automático)" : "Pausado"}</span>
                </button>
              </div>

              <div className="text-xs text-white/50 flex items-center gap-1.5">
                <IconInfo size={14} className="text-teal-400" />
                <span>Enlace de reservas incluido automáticamente en el mensaje</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-center">
              <div className="text-[11px] font-mono text-white/50 uppercase">Listas para Recordar</div>
              <div className="text-3xl font-black text-teal-400 font-['Outfit'] mt-1">{clientesParaRetorno.length}</div>
              <div className="text-[10px] text-teal-300/70">≥ {diasFiltro} días sin cita</div>
            </div>
            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-center">
              <div className="text-[11px] font-mono text-white/50 uppercase">Potencial Recuperable</div>
              <div className="text-3xl font-black text-rose-400 font-['Outfit'] mt-1">${potencialIngresosUSD.toFixed(0)}</div>
              <div className="text-[10px] text-rose-300/70">Ingreso estimado</div>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE TRATAMIENTO & CICLO DE DIAS */}
      <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-2">
            1. Selecciona el Tipo de Tratamiento o Frecuencia a Recordar:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TRATAMIENTOS_PREDEFINIDOS.map((t) => {
              const activo = tratamientoSeleccionadoId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSeleccionarTratamiento(t)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    activo
                      ? "bg-teal-500/20 border-teal-400 text-white shadow-lg shadow-teal-500/10 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-xs leading-tight">{t.nombre}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    <span className={activo ? "text-teal-300 font-bold" : "text-white/40"}>
                      Cada {t.diasRecomendados}d
                    </span>
                    {activo && <IconCheck size={12} className="text-teal-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* AJUSTE FINO DE DÍAS Y NOMBRE DE SALON */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white">
            <span className="text-white/60 font-semibold">Ciclo de días activo:</span>
            {[7, 14, 21, 28, 30, 45, 60].map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => setDiasFiltro(dias)}
                className={`px-3 py-1.5 rounded-xl font-bold font-mono transition-all cursor-pointer ${
                  diasFiltro === dias
                    ? "bg-teal-500 text-black shadow-md scale-105"
                    : "bg-white/5 hover:bg-white/10 text-white/70"
                }`}
              >
                {dias} días
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-white/40 text-xs">Personalizado:</span>
              <input
                type="number"
                min="1"
                max="180"
                value={diasFiltro}
                onChange={(e) => setDiasFiltro(Number(e.target.value) || 21)}
                className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/50">Nombre del Salón:</span>
            <input
              type="text"
              value={nombreSalon}
              onChange={(e) => setNombreSalon(e.target.value)}
              className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>
      </div>

      {/* EDITOR DE PLANTILLA DE WHATSAPP CON PREVISUALIZACION */}
      <div className="apple-glass rounded-2xl p-5 border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-['Outfit'] font-bold text-base text-white flex items-center gap-2">
              <IconChat size={16} className="text-emerald-400" />
              <span>Plantilla del Mensaje de WhatsApp</span>
            </h3>
            <p className="text-xs text-white/60">
              Personaliza el mensaje que se abrirá en WhatsApp al contactar a la clienta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGuardarPlantilla}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold hover:bg-teal-500/30 transition-all cursor-pointer"
            >
              Guardar Plantilla
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-2">
            <textarea
              rows={4}
              value={plantillaMensaje}
              onChange={(e) => setPlantillaMensaje(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-teal-400 font-sans"
              placeholder="Redacta el mensaje de recordatorio..."
            />

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-white/40 mr-1">Variables dinámicas:</span>
              {[
                { tag: "{nombre}", desc: "Nombre de la clienta" },
                { tag: "{servicio}", desc: "Último tratamiento" },
                { tag: "{dias}", desc: "Días transcurridos" },
                { tag: "{salon}", desc: "Nombre del salón" },
                { tag: "{link}", desc: "Enlace de reserva" },
              ].map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertarVariable(v.tag)}
                  title={v.desc}
                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-teal-300 font-mono text-[11px] border border-white/10 transition-colors cursor-pointer"
                >
                  +{v.tag}
                </button>
              ))}
            </div>
          </div>

          {/* SIMULADOR VISUAL DE BURBUJA DE WHATSAPP */}
          <div className="lg:col-span-5 bg-[#0b141a] p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-emerald-400/80 uppercase mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Vista previa en WhatsApp</span>
            </div>

            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-sm text-xs leading-relaxed shadow-sm font-sans whitespace-pre-wrap">
              {construirMensaje(ejemploCliente)}
              <div className="text-[9px] text-white/50 text-right mt-1 font-mono">10:30 a. m.</div>
            </div>

            <div className="text-[10px] text-white/40 mt-2 text-center">
              Se enviará con el nombre y datos de cada clienta correspondiente
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO DE CLIENTAS PARA RECORDATORIO */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-['Outfit'] font-bold text-lg text-white flex items-center gap-2">
              <span>Clientas con ciclo cumplido</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-teal-500/20 text-teal-300 font-bold">
                {clientesParaRetorno.length} disponibles
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por clienta o servicio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400 w-56"
            />

            <button
              type="button"
              onClick={() => setMostrarSoloPendientes(!mostrarSoloPendientes)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                mostrarSoloPendientes
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
            >
              {mostrarSoloPendientes ? "Solo No Contactadas" : "Mostrar Todas"}
            </button>
          </div>
        </div>

        {clientesParaRetorno.length === 0 ? (
          <div className="apple-glass rounded-3xl p-12 text-center border border-white/10 text-white/50 space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/40">
              <IconCheckCircle size={24} />
            </div>
            <div className="font-bold text-white text-sm">Al día con los recordatorios</div>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              No hay clientas con más de {diasFiltro} días sin visita para el filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesParaRetorno.map((c) => {
              const enviadoHora = historialEnvios[c.id];
              return (
                <div
                  key={c.id}
                  className="apple-glass rounded-2xl p-5 border border-white/10 hover:border-teal-400/40 transition-all flex flex-col justify-between space-y-4 shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <IconClock size={12} /> Hace {c.diasTranscurridos} días
                      </span>
                      <span className="text-[11px] font-mono text-white/40">
                        {c.totalVisitas} visitas previas
                      </span>
                    </div>

                    <h4 className="font-['Outfit'] font-black text-lg text-white">{c.nombre}</h4>
                    <div className="text-white/50 text-xs font-mono">{c.telefono}</div>

                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/40">Último Servicio:</span>
                        <span className="font-semibold text-teal-300">{c.ultimoServicio || "Servicio General"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Fecha de visita:</span>
                        <span className="font-mono text-white/70">{c.fechaUltimaVisita || "Reciente"}</span>
                      </div>
                      {c.fichaTecnica?.formulaTinte && (
                        <div className="mt-2 text-[11px] text-pink-300 bg-pink-500/10 p-2 rounded-lg font-mono">
                          <span className="text-white/40">Fórmula:</span> {c.fichaTecnica.formulaTinte}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleEnviarWhatsApp(c)}
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                        enviadoHora
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                          : "bg-gradient-to-r from-emerald-500 to-teal-600 text-black hover:brightness-110 hover:scale-[1.02]"
                      }`}
                    >
                      <IconChat size={15} />
                      <span>{enviadoHora ? "Reenviar WhatsApp" : "Enviar Recordatorio WhatsApp"}</span>
                    </button>

                    {enviadoHora && (
                      <div className="text-[10px] text-center font-mono text-emerald-400/80 flex items-center justify-center gap-1">
                        <IconCheck size={11} />
                        <span>Contactada: {enviadoHora}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}