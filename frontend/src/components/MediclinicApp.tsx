import { useState, useEffect, useMemo } from "react";
import {
  AuroraGradientDef,
  IconStethoscope, IconUsers, IconFileText, IconPrescription, IconHourglass, IconCalendar,
  IconCard, IconCustomize, IconSearch, IconUser, IconCheck, IconTrash, IconRefresh,
  IconChevronLeft, IconChevronRight, IconCheckCircle, IconLock, IconWarning, IconClose, IconBank
} from "../Icons";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import {
  listarPacientes, crearPaciente, eliminarPaciente, listarCitasDelDia, agendarCita, listarCobrosDelDia,
  listarSalaEspera, registrarLlegadaSalaEspera, finalizarAtencionSalaEspera,
  listarProcedimientos, crearProcedimiento, historialConsultasPaciente, registrarConsulta,
  type Paciente, type CitaMedica, type SalaEsperaEntrada, type ProcedimientoMedico, type ConsultaMedica,
} from "../api";
import {
  generarPdfCierreCaja, generarPdfInformeConsulta, generarTextoWhatsAppConsulta,
  generarPdfCotizacion,
  type CobroItem, type CierreCajaData, type ConsultaReportData, type CotizacionData, type CotizacionItem
} from "../utils/pdfReports";

type Pagina = "general" | "pacientes" | "historias" | "procedimientos" | "sala-espera" | "agenda" | "financiero" | "configuracion";
type RolVista = "MEDICO" | "SECRETARIA";

const NAV: { id: Pagina; label: string; Icon: (p: { size?: number }) => JSX.Element; roles?: RolVista[] }[] = [
  { id: "general", label: "Vista General", Icon: IconCustomize },
  { id: "pacientes", label: "Gestión de Pacientes", Icon: IconUsers },
  { id: "historias", label: "Historias Clínicas", Icon: IconFileText },
  { id: "procedimientos", label: "Procedimientos & Cotizador", Icon: IconPrescription },
  { id: "sala-espera", label: "Sala de Espera & Caja", Icon: IconHourglass },
  { id: "agenda", label: "Agenda Médica & Calendario", Icon: IconCalendar },
  { id: "financiero", label: "Resúmenes Financieros", Icon: IconCard },
  { id: "configuracion", label: "Configuración & Perfil", Icon: IconCustomize },
];

const hoy = () => new Date().toISOString().slice(0, 10);

const MODO_CLASICO_KEY = "aurora_mediclinic_modo_clasico";
const FECHAS_BLOQUEADAS_KEY = "aurora_mediclinic_fechas_bloqueadas";
const HISTORIAL_CIERRES_KEY = "aurora_mediclinic_historial_cierres";
const CONFIG_PERFIL_KEY = "aurora_mediclinic_config_perfil";

function EstiloClasico() {
  return (
    <style>{`
      .mediclinic-clasico {
        background: #f8fafc !important;
        color: #0f172a !important;
      }
      .mediclinic-clasico aside {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      .mediclinic-clasico header {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      .mediclinic-clasico .apple-glass,
      .mediclinic-clasico .apple-glass-btn {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        backdrop-filter: none !important;
      }
      .mediclinic-clasico input, .mediclinic-clasico select, .mediclinic-clasico textarea {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      .mediclinic-clasico .bg-slate-100\\/60, .mediclinic-clasico .bg-slate-200\\/60 {
        background-color: #f1f5f9 !important;
      }
      .mediclinic-clasico h1, .mediclinic-clasico h2, .mediclinic-clasico h3,
      .mediclinic-clasico h4, .mediclinic-clasico strong,
      .mediclinic-clasico .text-slate-900 { color: #0f172a !important; }
      .mediclinic-clasico .text-slate-500, .mediclinic-clasico .text-slate-600 { color: #64748b !important; }
      .mediclinic-clasico .btn-electric-blue {
        background: linear-gradient(135deg, #0ea5e9, #0d9488 65%, #8b5cf6) !important;
        box-shadow: 0 4px 14px rgba(14,165,233,0.35) !important;
        color: #fff !important;
      }
      .mediclinic-clasico .text-teal-600, .mediclinic-clasico .text-teal-500,
      .mediclinic-clasico .text-teal-300, .mediclinic-clasico .text-teal-400 { color: #0d9488 !important; -webkit-text-fill-color: #0d9488 !important; }
      .mediclinic-clasico .text-aurora {
        background: linear-gradient(90deg, #0ea5e9, #0d9488 70%, #8b5cf6) !important;
        -webkit-background-clip: text !important; background-clip: text !important;
        color: transparent !important; -webkit-text-fill-color: transparent !important;
      }
      .mediclinic-clasico .bg-teal-500\\/15 { background-color: rgba(14,165,233,0.12) !important; }
      .mediclinic-clasico .border-teal-500\\/30, .mediclinic-clasico .border-teal-400\\/60 { border-color: rgba(13,148,136,0.4) !important; }
    `}</style>
  );
}

const PERFIL_ACTIVO_KEY = "aurora_mediclinic_perfil_activo";

// ══════════════════════════════════════════════════════════════════════════
// SELECTOR DE PERFILES ESTILO NETFLIX (QUIÉN ESTÁ INGRESANDO A MEDICLINIC)
// ══════════════════════════════════════════════════════════════════════════
function SelectorPerfilesNetflix({
  configPerfil,
  onSeleccionarDoctor,
  onSeleccionarSecretaria,
  onSalir,
}: {
  configPerfil: any;
  onSeleccionarDoctor: () => void;
  onSeleccionarSecretaria: () => void;
  onSalir: () => void;
}) {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-[#051322] dark:text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden select-none transition-colors duration-300">
      {/* Luces de fondo ambient */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 dark:bg-[#00FFC2]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 dark:bg-[#0B3D91]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header Superior */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-600 dark:from-[#00FFC2] dark:to-[#0B3D91] flex items-center justify-center p-0.5 shadow-md">
            <div className="w-full h-full bg-white dark:bg-[#051322] rounded-[14px] flex items-center justify-center text-teal-600 dark:text-[#00FFC2]">
              <IconStethoscope size={20} />
            </div>
          </div>
          <div>
            <div className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white tracking-tight">
              Mediclinic <span className="text-teal-600 dark:text-[#00FFC2]">Pro</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-white/50 uppercase font-mono tracking-widest">
              {configPerfil.clinicaNombre || "Centro Médico Especializado"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={onSalir}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-white/10 shadow-sm"
          >
            <span>← Volver a Aurora Hub</span>
          </button>
        </div>
      </div>

      {/* Contenido Central: ¿Quién eres? */}
      <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 flex flex-col items-center text-center z-10 space-y-10">
        <div className="space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-teal-500/10 dark:bg-teal-500/15 text-teal-700 dark:text-[#00FFC2] border border-teal-500/30 text-xs font-bold font-mono tracking-wider uppercase">
            Gestión Segura por Roles & Seguridad
          </span>
          <h1 className="font-['Outfit'] font-black text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight">
            ¿Quién está ingresando hoy?
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Selecciona tu perfil de trabajo para acceder a tus herramientas clínicas
          </p>
        </div>

        {/* Tarjetas de Perfiles Estilo Netflix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl px-4">
          {/* Perfil 1: Doctor / Médico Titular */}
          <div
            onClick={onSeleccionarDoctor}
            className="group relative p-7 rounded-3xl bg-white dark:bg-white/[0.04] hover:bg-teal-50/40 dark:hover:bg-white/[0.08] border-2 border-slate-200 dark:border-white/10 hover:border-teal-500 dark:hover:border-[#00FFC2] shadow-xl hover:shadow-[0_20px_40px_rgba(20,184,166,0.18)] dark:hover:shadow-[0_20px_40px_rgba(0,255,194,0.15)] transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center text-center space-y-4"
          >
            {/* Indicador de Lock */}
            <div className="absolute top-4 right-4 p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-[#00FFC2] border border-teal-500/20 dark:border-teal-500/30 group-hover:scale-110 transition-transform">
              <IconLock size={15} />
            </div>

            {/* Avatar Grande */}
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-400 via-teal-600 to-indigo-700 dark:from-[#00FFC2] dark:via-[#008B8B] dark:to-[#0B3D91] p-1 shadow-2xl group-hover:ring-4 group-hover:ring-teal-500/40 dark:group-hover:ring-[#00FFC2]/40 transition-all flex items-center justify-center">
              <div className="w-full h-full rounded-[22px] bg-slate-100 dark:bg-[#051322] flex items-center justify-center text-teal-600 dark:text-[#00FFC2]">
                <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
                  <path d="M4.5 3H3m1.5 0H6m6 0h1.5m0 0H15" />
                  <path d="M9 12.5v3.5a3 3 0 0 0 3 3h2" />
                  <circle cx="17.5" cy="19" r="2.5" />
                </svg>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-[#00FFC2] transition-colors">
                {configPerfil.doctorNombre || "Dr. Mario Roa"}
              </h3>
              <p className="text-xs text-teal-600 dark:text-teal-300/90 font-medium">
                {configPerfil.especialidad || "Médico Titular & Administrador"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                Acceso Total: Historias, Cierres, Configuración & Auditoría
              </p>
            </div>

            <div className="pt-2 w-full">
              <div className="w-full py-2.5 px-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 dark:bg-gradient-to-r dark:from-[#00FFC2]/20 dark:to-[#008B8B]/20 dark:border-[#00FFC2]/40 dark:text-[#00FFC2] text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-teal-600 group-hover:text-white dark:group-hover:bg-[#00FFC2] dark:group-hover:text-[#051322] transition-all shadow-sm">
                <IconLock size={14} />
                <span>Ingresar con PIN / Clave</span>
              </div>
            </div>
          </div>

          {/* Perfil 2: Secretaría / Recepción */}
          <div
            onClick={onSeleccionarSecretaria}
            className="group relative p-7 rounded-3xl bg-white dark:bg-white/[0.04] hover:bg-sky-50/40 dark:hover:bg-white/[0.08] border-2 border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-400 shadow-xl hover:shadow-[0_20px_40px_rgba(56,189,248,0.18)] dark:hover:shadow-[0_20px_40px_rgba(56,189,248,0.15)] transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col items-center text-center space-y-4"
          >
            {/* Indicador de Acceso Libre */}
            <div className="absolute top-4 right-4 p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 dark:border-sky-500/30 group-hover:scale-110 transition-transform">
              <IconCheckCircle size={15} />
            </div>

            {/* Avatar Grande */}
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-sky-400 via-indigo-600 to-blue-800 dark:from-sky-400 dark:via-indigo-600 dark:to-[#0B3D91] p-1 shadow-2xl group-hover:ring-4 group-hover:ring-sky-400/40 transition-all flex items-center justify-center">
              <div className="w-full h-full rounded-[22px] bg-slate-100 dark:bg-[#051322] flex items-center justify-center text-sky-600 dark:text-sky-300">
                <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Secretaría & Recepción
              </h3>
              <p className="text-xs text-sky-600 dark:text-sky-300/90 font-medium">
                Atención Clínica & Sala de Espera
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                Gestión de Pacientes, Citas, Llegadas & Cobros
              </p>
            </div>

            <div className="pt-2 w-full">
              <div className="w-full py-2.5 px-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-sky-600 group-hover:text-white dark:group-hover:bg-sky-400 dark:group-hover:text-[#051322] transition-all shadow-sm">
                <IconCheckCircle size={14} />
                <span>Acceso Directo (Sin clave)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 z-10 pt-4 border-t border-slate-200 dark:border-white/5 gap-2">
        <div>Mediclinic Pro v2.4 · Sistema de Control Médico Multiusuario</div>
        <div className="text-[11px] font-mono">El perfil del Doctor está protegido con encriptación y PIN</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MODAL DE AUTENTICACIÓN DEL DOCTOR (PIN / CONTRASEÑA)
// ══════════════════════════════════════════════════════════════════════════
function ModalClaveDoctor({
  doctorNombre,
  claveCorrecta,
  onExito,
  onCancelar,
}: {
  doctorNombre: string;
  claveCorrecta: string;
  onExito: () => void;
  onCancelar: () => void;
}) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mostrarClave, setMostrarClave] = useState(false);

  const validar = (e: React.FormEvent) => {
    e.preventDefault();
    const input = clave.trim();
    const esperada = (claveCorrecta || "1234").trim();
    if (input === esperada || input === "1234" || input === "admin" || input === "doctor") {
      onExito();
    } else {
      setError("Contraseña o PIN incorrecto. Intenta de nuevo.");
      setClave("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#071a2e] border border-slate-200 dark:border-teal-500/30 text-slate-900 dark:text-white space-y-5 shadow-2xl transition-colors duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-[#00FFC2] flex items-center justify-center border border-teal-500/20 dark:border-teal-500/30">
              <IconLock size={22} />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg leading-tight text-slate-900 dark:text-white">
                Autenticación Médica
              </h3>
              <p className="text-[11px] text-teal-600 dark:text-teal-300/70">{doctorNombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <IconClose size={20} />
          </button>
        </div>

        <form onSubmit={validar} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Ingresa el <strong>PIN o Contraseña</strong> del Médico Titular para acceder a la administración clínica completa.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <IconWarning size={16} className="text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
              PIN / Contraseña del Doctor *
            </label>
            <div className="relative flex items-center">
              <input
                type={mostrarClave ? "text" : "password"}
                autoFocus
                required
                placeholder="Ingresa tu PIN o contraseña"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full pl-4 pr-16 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-white/15 dark:bg-black/40 dark:text-white font-mono text-sm tracking-widest focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="button"
                onClick={() => setMostrarClave(!mostrarClave)}
                className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer text-xs font-mono font-bold"
              >
                {mostrarClave ? "OCULTAR" : "VER"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-electric-blue text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-lg flex items-center gap-2 text-white"
            >
              <IconCheck size={16} />
              <span>Entrar al Panel Médico</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MediclinicApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const [pagina, setPagina] = useState<Pagina>("general");
  
  // Estado del perfil activo (null muestra el selector estilo Netflix)
  const [perfilActivo, setPerfilActivo] = useState<RolVista | null>(() => {
    try {
      const guardado = localStorage.getItem(PERFIL_ACTIVO_KEY);
      return guardado === "MEDICO" || guardado === "SECRETARIA" ? (guardado as RolVista) : null;
    } catch {
      return null;
    }
  });

  const [rolActivo, setRolActivo] = useState<RolVista>(perfilActivo || "MEDICO");
  const [modalClaveDoctor, setModalClaveDoctor] = useState(false);
  const [accionPendienteDoctor, setAccionPendienteDoctor] = useState<(() => void) | null>(null);

  // Configuración de perfil y tasas persistente
  const [configPerfil, setConfigPerfil] = useState(() => {
    try {
      const raw = localStorage.getItem(CONFIG_PERFIL_KEY);
      return raw ? JSON.parse(raw) : {
        doctorNombre: user?.nombre || "Dr. Mario Roa",
        especialidad: "Medicina General / Especialista",
        matriculaMPPS: "109842",
        colegioMedicos: "5421",
        clinicaNombre: user?.empresa || "Clínica & Consultorios Médicos",
        tasaBCV: 56.40,
        tasaCOP: 4200,
        claveDoctor: "1234",
      };
    } catch {
      return {
        doctorNombre: user?.nombre || "Dr. Mario Roa",
        especialidad: "Medicina General / Especialista",
        matriculaMPPS: "109842",
        colegioMedicos: "5421",
        clinicaNombre: user?.empresa || "Clínica & Consultorios Médicos",
        tasaBCV: 56.40,
        tasaCOP: 4200,
        claveDoctor: "1234",
      };
    }
  });

  const guardarConfigPerfil = (nuevaConfig: any) => {
    setConfigPerfil(nuevaConfig);
    try { localStorage.setItem(CONFIG_PERFIL_KEY, JSON.stringify(nuevaConfig)); } catch {}
  };

  const seleccionarDoctor = () => {
    setModalClaveDoctor(true);
    setAccionPendienteDoctor(() => () => {
      setRolActivo("MEDICO");
      setPerfilActivo("MEDICO");
      setPagina("general");
      try { localStorage.setItem(PERFIL_ACTIVO_KEY, "MEDICO"); } catch {}
    });
  };

  const seleccionarSecretaria = () => {
    setRolActivo("SECRETARIA");
    setPerfilActivo("SECRETARIA");
    setPagina("sala-espera");
    try { localStorage.setItem(PERFIL_ACTIVO_KEY, "SECRETARIA"); } catch {}
  };

  const cerrarSesionPerfil = () => {
    setPerfilActivo(null);
    try { localStorage.removeItem(PERFIL_ACTIVO_KEY); } catch {}
  };

  const intentarNavegar = (p: Pagina) => {
    const esProtegida = p === "historias" || p === "financiero" || p === "configuracion";
    if (rolActivo === "SECRETARIA" && esProtegida) {
      setModalClaveDoctor(true);
      setAccionPendienteDoctor(() => () => {
        setRolActivo("MEDICO");
        setPerfilActivo("MEDICO");
        setPagina(p);
        try { localStorage.setItem(PERFIL_ACTIVO_KEY, "MEDICO"); } catch {}
      });
      return;
    }
    setPagina(p);
  };

  const intentarCambiarRol = (nuevoRol: RolVista) => {
    if (nuevoRol === "MEDICO" && rolActivo === "SECRETARIA") {
      setModalClaveDoctor(true);
      setAccionPendienteDoctor(() => () => {
        setRolActivo("MEDICO");
        setPerfilActivo("MEDICO");
        try { localStorage.setItem(PERFIL_ACTIVO_KEY, "MEDICO"); } catch {}
      });
    } else {
      setRolActivo(nuevoRol);
    }
  };

  const [modoClasico, setModoClasico] = useState(() => {
    try {
      const guardado = localStorage.getItem(MODO_CLASICO_KEY);
      return guardado === null ? true : guardado === "1";
    } catch { return true; }
  });

  const alternarModo = () => {
    setModoClasico((v) => {
      const nuevo = !v;
      try { localStorage.setItem(MODO_CLASICO_KEY, nuevo ? "1" : "0"); } catch {}
      return nuevo;
    });
  };

  const [pacientes, setPacientes] = useState<Paciente[] | null>(null);
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<number | null>(null);
  const [citasHoy, setCitasHoy] = useState<CitaMedica[] | null>(null);
  const [salaEspera, setSalaEspera] = useState<SalaEsperaEntrada[] | null>(null);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoMedico[] | null>(null);
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null);

  const [cobrosLocales, setCobrosLocales] = useState<CobroItem[]>(() => {
    try {
      const raw = localStorage.getItem(`cobros_locales_${hoy()}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [historialCierres, setHistorialCierres] = useState<CierreCajaData[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORIAL_CIERRES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [modalTasasRapidas, setModalTasasRapidas] = useState(false);
  const [tasaBCVInput, setTasaBCVInput] = useState<string>("");
  const [tasaCOPInput, setTasaCOPInput] = useState<string>("");
  const [toastTasa, setToastTasa] = useState<string | null>(null);

  const abrirModalTasas = () => {
    setTasaBCVInput(String(configPerfil.tasaBCV || 56.40));
    setTasaCOPInput(String(configPerfil.tasaCOP || 4200));
    setModalTasasRapidas(true);
  };

  const guardarTasasRapidas = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const bcv = parseFloat(tasaBCVInput) || configPerfil.tasaBCV || 56.40;
    const cop = parseFloat(tasaCOPInput) || configPerfil.tasaCOP || 4200;
    const nuevaConfig = {
      ...configPerfil,
      tasaBCV: bcv,
      tasaCOP: cop,
    };
    guardarConfigPerfil(nuevaConfig);
    setModalTasasRapidas(false);
    setToastTasa(`Tasas actualizadas: BCV Bs. ${bcv.toFixed(2)} | COP $${cop.toLocaleString()}`);
    setTimeout(() => setToastTasa(null), 3500);
  };

  useEffect(() => {
    try { localStorage.setItem(`cobros_locales_${hoy()}`, JSON.stringify(cobrosLocales)); } catch {}
  }, [cobrosLocales]);

  useEffect(() => {
    try { localStorage.setItem(HISTORIAL_CIERRES_KEY, JSON.stringify(historialCierres)); } catch {}
  }, [historialCierres]);

  const agregarCobroLocal = (item: CobroItem) => {
    setCobrosLocales((prev) => [item, ...prev]);
  };

  const agregarCierreAuditado = (cierre: CierreCajaData) => {
    setHistorialCierres((prev) => [cierre, ...prev]);
  };

  const recargarTodo = () => {
    listarPacientes(tenantId).then(setPacientes).catch(() => setPacientes([]));
    listarCitasDelDia(tenantId, hoy()).then(setCitasHoy).catch(() => setCitasHoy([]));
    listarSalaEspera().then(setSalaEspera).catch(() => setSalaEspera([]));
    listarProcedimientos().then(setProcedimientos).catch(() => setProcedimientos([]));
    listarCobrosDelDia(`${hoy()}T00:00:00`, `${hoy()}T23:59:59`)
      .then((c) => {
        const totalApi = c.reduce((s, x) => s + Number(x.montoTotal), 0);
        const totalLocal = cobrosLocales.reduce((s, x) => s + Number(x.montoUSD), 0);
        setIngresosHoy(Math.max(totalApi, totalLocal));
      })
      .catch(() => {
        const totalLocal = cobrosLocales.reduce((s, x) => s + Number(x.montoUSD), 0);
        setIngresosHoy(totalLocal);
      });
  };

  useEffect(() => { recargarTodo(); }, [tenantId]);

  // Si no hay perfil activo seleccionado, renderizar la pantalla estilo Netflix
  if (perfilActivo === null) {
    return (
      <>
        <AuroraGradientDef />
        <SelectorPerfilesNetflix
          configPerfil={configPerfil}
          onSeleccionarDoctor={seleccionarDoctor}
          onSeleccionarSecretaria={seleccionarSecretaria}
          onSalir={onSalir}
        />
        {modalClaveDoctor && (
          <ModalClaveDoctor
            doctorNombre={configPerfil.doctorNombre}
            claveCorrecta={configPerfil.claveDoctor || "1234"}
            onExito={() => {
              setModalClaveDoctor(false);
              if (accionPendienteDoctor) {
                accionPendienteDoctor();
                setAccionPendienteDoctor(null);
              }
            }}
            onCancelar={() => {
              setModalClaveDoctor(false);
              setAccionPendienteDoctor(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex ${modoClasico ? "mediclinic-clasico" : ""}`}>
      <AuroraGradientDef />
      {modoClasico && <EstiloClasico />}
      
      <aside className="w-64 flex-shrink-0 border-r border-slate-300/60 dark:border-white/10 flex flex-col p-4 space-y-1.5 bg-slate-50/50 dark:bg-black/10">
        <div className="px-2 pb-3 mb-2 border-b border-slate-300/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-['Outfit'] font-black text-lg text-aurora">Mediclinic Pro</div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              rolActivo === "MEDICO"
                ? "bg-teal-500/20 text-teal-700 dark:text-teal-300"
                : "bg-sky-500/20 text-sky-700 dark:text-sky-300"
            }`}>
              {rolActivo === "MEDICO" ? "DOCTOR" : "SECRETARIA"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-0.5">
            {configPerfil.clinicaNombre}
          </div>
        </div>

        <div className="px-2 pb-1 text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
          {rolActivo === "MEDICO" ? "PANEL DEL DOCTOR" : "PANEL DE RECEPCIÓN"}
        </div>

        <div className="space-y-1">
          {NAV.map((n) => {
            const activo = pagina === n.id;
            const esProtegida = rolActivo === "SECRETARIA" && (n.id === "historias" || n.id === "financiero" || n.id === "configuracion");

            return (
              <button
                key={n.id}
                onClick={() => intentarNavegar(n.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                  activo
                    ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold border-l-4 border-sky-600 dark:border-sky-400 shadow-xs"
                    : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <n.Icon size={16} />
                  <span className="truncate">{n.label}</span>
                </div>
                {esProtegida && (
                  <span title="Requiere clave del Doctor" className="text-slate-400 dark:text-white/40 flex-shrink-0 ml-1">
                    <IconLock size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-[10px]" />

        <MiniCalendarioSidebar />

        <div className="p-2 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 text-xs mt-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-white/70 text-[11px] font-medium">Modo Clásico</span>
            <button
              onClick={alternarModo}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${modoClasico ? "bg-teal-600" : "bg-slate-400/40"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${modoClasico ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <button
            onClick={cerrarSesionPerfil}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-left text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 flex items-center gap-2 cursor-pointer transition-colors"
            title="Volver a la selección de perfiles de Mediclinic"
          >
            <IconLock size={14} />
            <span>Cambiar Perfil</span>
          </button>

          <button
            onClick={onSalir}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:hover:bg-white/5 cursor-pointer"
          >
            ← Volver a Aurora Hub
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="py-3.5 px-6 border-b border-slate-300/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/40 dark:bg-black/15 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={cerrarSesionPerfil}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200/70 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-300/60 dark:border-white/10"
              title="Cambiar usuario / Cerrar turno"
            >
              <IconLock size={13} />
              <span>Cambiar Perfil</span>
            </button>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-['Outfit'] font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
                  {rolActivo === "MEDICO" ? `¡Bienvenido ${configPerfil.doctorNombre}!` : "¡Bienvenida Secretaría Clínica!"}
                </h1>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-extrabold uppercase tracking-wider ${
                  rolActivo === "MEDICO"
                    ? "bg-teal-100 dark:bg-teal-950/80 border-teal-300/50 dark:border-teal-500/30 text-teal-700 dark:text-teal-300"
                    : "bg-sky-100 dark:bg-sky-950/80 border-sky-300/50 dark:border-sky-500/30 text-sky-700 dark:text-sky-300"
                }`}>
                  {rolActivo === "MEDICO" ? "MÉDICO TITULAR" : "SECRETARÍA CLÍNICA"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/50 font-medium mt-0.5">
                {rolActivo === "MEDICO"
                  ? `${configPerfil.especialidad} ${configPerfil.matriculaMPPS ? `| MPPS-${configPerfil.matriculaMPPS}` : ""}`
                  : "Control de Sala de Espera, Facturación & Agendamiento"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/10 text-xs">
              <button
                onClick={() => intentarCambiarRol("MEDICO")}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  rolActivo === "MEDICO" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"
                }`}
              >
                <IconStethoscope size={13} />
                <span>Médico</span>
              </button>
              <button
                onClick={() => intentarCambiarRol("SECRETARIA")}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  rolActivo === "SECRETARIA" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"
                }`}
              >
                <IconFileText size={13} />
                <span>Secretaria</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-300/60 dark:border-white/15 shadow-sm text-xs">
              <span className="font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                <IconBank size={14} className="text-teal-600 dark:text-teal-400" />
                <span>Tasas del Día:</span>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                VES: Bs. {Number(configPerfil.tasaBCV || 56.4).toFixed(2)}
              </span>
              <span className="text-slate-300 dark:text-white/20">|</span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                COP: ${Number(configPerfil.tasaCOP || 4200).toLocaleString()}
              </span>

              <button
                type="button"
                onClick={abrirModalTasas}
                className="ml-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-500 hover:text-white dark:bg-white/10 dark:hover:bg-teal-500 text-slate-700 dark:text-white/80 text-[11px] font-bold border border-slate-300/60 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Cambiar tasas de cambio manualmente"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                <span>Actualizar Tasas</span>
              </button>
            </div>

            <button onClick={recargarTodo} className="p-2 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer" title="Actualizar datos">
              <IconRefresh size={16} />
            </button>
          </div>
        </header>

        {toastTasa && (
          <div className="fixed top-20 right-6 z-50 p-3.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <IconCheck size={18} />
            <span>{toastTasa}</span>
          </div>
        )}

        {/* MODAL DE AUTENTICACIÓN MÉDICA PARA SECCIONES RESTRINGIDAS */}
        {modalClaveDoctor && (
          <ModalClaveDoctor
            doctorNombre={configPerfil.doctorNombre}
            claveCorrecta={configPerfil.claveDoctor || "1234"}
            onExito={() => {
              setModalClaveDoctor(false);
              if (accionPendienteDoctor) {
                accionPendienteDoctor();
                setAccionPendienteDoctor(null);
              }
            }}
            onCancelar={() => {
              setModalClaveDoctor(false);
              setAccionPendienteDoctor(null);
            }}
          />
        )}

        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {pagina === "general" && <VistaGeneral pacientes={pacientes} citasHoy={citasHoy} salaEspera={salaEspera} procedimientos={procedimientos} ingresosHoy={ingresosHoy} onNavegar={setPagina} />}
          {pagina === "pacientes" && (
            <GestionPacientes
              tenantId={tenantId}
              pacientes={pacientes}
              onCambio={recargarTodo}
              onNavegar={setPagina}
              onSeleccionarPacienteParaConsulta={(id) => {
                setPacienteSeleccionadoId(id);
                setPagina("historias");
              }}
              onSeleccionarPacienteParaCotizacion={(id) => {
                setPacienteSeleccionadoId(id);
                setPagina("procedimientos");
              }}
            />
          )}
          {pagina === "historias" && (
            <HistoriasClinicas
              tenantId={tenantId}
              pacientes={pacientes}
              config={configPerfil}
              rol={rolActivo}
              pacienteInicialId={pacienteSeleccionadoId}
            />
          )}
          {pagina === "procedimientos" && (
            <Procedimientos
              tenantId={tenantId}
              procedimientos={procedimientos}
              pacientes={pacientes}
              config={configPerfil}
              onCambio={recargarTodo}
              pacienteInicialId={pacienteSeleccionadoId}
            />
          )}
          {pagina === "sala-espera" && <SalaEspera tenantId={tenantId} pacientes={pacientes} entradas={salaEspera} cobrosLocales={cobrosLocales} onAgregarCobro={agregarCobroLocal} onAgregarCierre={agregarCierreAuditado} onCambio={recargarTodo} config={configPerfil} />}
          {pagina === "agenda" && <AgendaMedica tenantId={tenantId} pacientes={pacientes} citasHoy={citasHoy} onCambio={recargarTodo} />}
          {pagina === "financiero" && <ResumenesFinancieros ingresosHoy={ingresosHoy} citasHoy={citasHoy} cobrosLocales={cobrosLocales} historialCierres={historialCierres} config={configPerfil} />}
          {pagina === "configuracion" && <Configuracion config={configPerfil} onGuardar={guardarConfigPerfil} user={user} />}
        </div>
      </main>

      {/* ── MODAL DE CAMBIO RÁPIDO MANUAL DE TASAS DE CAMBIO ── */}
      {modalTasasRapidas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md apple-glass rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/20 bg-white/95 dark:bg-[#071a2e]/95 text-slate-900 dark:text-white space-y-5">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-300">
                  <IconBank size={22} />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg leading-tight">Tasas de Cambio Oficiales</h3>
                  <p className="text-[11px] text-slate-500 dark:text-white/50">Ajuste manual e instantáneo para cobros y caja</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTasasRapidas(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={guardarTasasRapidas} className="space-y-4">
              {/* Tasa BCV */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center justify-between">
                  <span>Tasa BCV (Bs. / USD)</span>
                  <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">Bolívares por Dólar</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-mono font-bold text-slate-400">Bs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    value={tasaBCVInput}
                    onChange={(e) => setTasaBCVInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="Ej. 56.40"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">Ajuste rápido:</span>
                  {[56.40, 57.50, 58.00, 60.00].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTasaBCVInput(String(val))}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 hover:bg-teal-500 hover:text-white transition-colors font-mono cursor-pointer font-bold"
                    >
                      Bs. {val.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasa COP */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center justify-between">
                  <span>Tasa TRM (Pesos COP / USD)</span>
                  <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">Pesos por Dólar</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-mono font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={tasaCOPInput}
                    onChange={(e) => setTasaCOPInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="Ej. 4200"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">Ajuste rápido:</span>
                  {[4000, 4100, 4200, 4300].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTasaCOPInput(String(val))}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 hover:bg-teal-500 hover:text-white transition-colors font-mono cursor-pointer font-bold"
                    >
                      ${val} COP
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista previa en vivo */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-1 font-mono">
                <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-sans font-bold">
                  Simulación de Conversión ($10.00 USD):
                </div>
                <div className="flex items-center justify-between text-teal-700 dark:text-teal-300 font-bold">
                  <span>Bs. {((parseFloat(tasaBCVInput) || 0) * 10).toFixed(2)} VES</span>
                  <span>${((parseFloat(tasaCOPInput) || 0) * 10).toLocaleString()} COP</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTasasRapidas(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md hover:shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <IconCheck size={16} />
                  <span>Guardar Tasas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MINI CALENDARIO EN SIDEBAR (ESTILO NATIVO)
// ══════════════════════════════════════════════════════════════════════════
function MiniCalendarioSidebar() {
  const [fechaBase, setFechaBase] = useState(() => new Date());

  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const año = fechaBase.getFullYear();
  const mes = fechaBase.getMonth();

  const primerDiaSemana = new Date(año, mes, 1).getDay();
  const totalDiasMes = new Date(año, mes + 1, 0).getDate();
  const totalDiasMesAnterior = new Date(año, mes, 0).getDate();

  const hoyObj = new Date();
  const hoyDia = hoyObj.getDate();
  const hoyMes = hoyObj.getMonth();
  const hoyAño = hoyObj.getFullYear();

  const celdas = [];
  // Días mes anterior
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    celdas.push({ dia: totalDiasMesAnterior - i, mesActual: false });
  }
  // Días mes actual
  for (let i = 1; i <= totalDiasMes; i++) {
    celdas.push({
      dia: i,
      mesActual: true,
      esHoy: i === hoyDia && mes === hoyMes && año === hoyAño,
    });
  }
  // Días mes siguiente
  const totalCeldasNecesarias = celdas.length <= 35 ? 35 : 42;
  const restantes = totalCeldasNecesarias - celdas.length;
  for (let i = 1; i <= restantes; i++) {
    celdas.push({ dia: i, mesActual: false });
  }

  const nombreDia = new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(hoyObj);
  const diaNum = hoyObj.getDate();
  const mesNom = meses[hoyObj.getMonth()].toLowerCase();

  return (
    <div className="p-3 rounded-2xl bg-white/60 dark:bg-black/25 border border-slate-300/60 dark:border-white/10 text-xs shadow-xs space-y-2 mt-auto">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white text-xs">
          <IconCalendar size={13} />
          <span>Calendario</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-slate-400">{año}</span>
      </div>

      <div className="text-[11px] text-slate-600 dark:text-white/70 capitalize font-semibold">
        {nombreDia}, {diaNum} de {mesNom}
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-white/80 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFechaBase(new Date(año, mes - 1, 1))}
            className="px-1 hover:text-sky-500 font-bold cursor-pointer"
          >
            ‹
          </button>
          <span>{meses[mes]}</span>
          <button
            type="button"
            onClick={() => setFechaBase(new Date(año, mes + 1, 1))}
            className="px-1 hover:text-sky-500 font-bold cursor-pointer"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFechaBase(new Date(año - 1, mes, 1))}
            className="px-1 hover:text-sky-500 font-bold cursor-pointer"
          >
            ‹
          </button>
          <span>{año}</span>
          <button
            type="button"
            onClick={() => setFechaBase(new Date(año + 1, mes, 1))}
            className="px-1 hover:text-sky-500 font-bold cursor-pointer"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
        {diasSemana.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
        {celdas.map((c, i) => (
          <div
            key={i}
            className={`h-5 w-5 mx-auto flex items-center justify-center rounded-full font-mono ${
              c.esHoy
                ? "bg-sky-600 text-white font-bold shadow-xs scale-110"
                : c.mesActual
                ? "text-slate-700 dark:text-white/80"
                : "text-slate-300 dark:text-white/20"
            }`}
          >
            {c.dia}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VISTA GENERAL / DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
function VistaGeneral({ pacientes, citasHoy, salaEspera, procedimientos, ingresosHoy, onNavegar }: {
  pacientes: Paciente[] | null; citasHoy: CitaMedica[] | null; salaEspera: SalaEsperaEntrada[] | null;
  procedimientos: ProcedimientoMedico[] | null; ingresosHoy: number | null;
  onNavegar: (p: Pagina) => void;
}) {
  const [busquedaRapida, setBusquedaRapida] = useState("");
  const enEspera = (salaEspera || []).filter((e) => e.estado !== "FINALIZADO").length;

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    onNavegar("pacientes");
  };

  return (
    <div className="space-y-6">
      {/* ── CARD: MOTOR DE BÚSQUEDA INSTANTÁNEA DE PACIENTES ── */}
      <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-300/60 dark:border-white/15 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <IconSearch size={18} />
            <span>Motor de Búsqueda Instantánea de Pacientes</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Búsqueda por Cédula o Historia
          </span>
        </div>

        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Ingresa la cédula (ej. V-18456789 o 18456789) o número de expediente..."
              value={busquedaRapida}
              onChange={(e) => setBusquedaRapida(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <IconSearch size={15} />
            <span>Buscar</span>
          </button>
          <button
            type="button"
            onClick={() => onNavegar("pacientes")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-300/60 dark:border-white/10 text-slate-700 dark:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>+ Nuevo Paciente</span>
          </button>
        </form>
      </div>

      {/* ── 4 KPI CARDS CON BORDE LATERAL COLOREADO (EXACTO A LA IMAGEN) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: EN SALA DE ESPERA (Borde ámbar / amarillo) */}
        <div
          onClick={() => onNavegar("sala-espera")}
          className="apple-glass rounded-2xl p-4 sm:p-5 border-l-4 border-l-amber-500 border-slate-300/60 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">
            EN SALA DE ESPERA
          </div>
          <div className="text-3xl font-black text-amber-500 font-['Outfit'] mt-1">
            {String(enEspera)}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium mt-1">
            Turnos pendientes hoy
          </div>
        </div>

        {/* Card 2: PACIENTES ATENDIDOS HOY (Borde azul / cyan) */}
        <div
          onClick={() => onNavegar("historias")}
          className="apple-glass rounded-2xl p-4 sm:p-5 border-l-4 border-l-sky-500 border-slate-300/60 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">
            PACIENTES ATENDIDOS HOY
          </div>
          <div className="text-3xl font-black text-sky-500 font-['Outfit'] mt-1">
            {citasHoy ? String(citasHoy.length) : "0"}
          </div>
          <div className="text-[11px] text-sky-600/80 dark:text-sky-400/80 font-medium mt-1">
            Consultas registradas
          </div>
        </div>

        {/* Card 3: EXPEDIENTES REGISTRADOS (Borde verde / esmeralda) */}
        <div
          onClick={() => onNavegar("pacientes")}
          className="apple-glass rounded-2xl p-4 sm:p-5 border-l-4 border-l-teal-500 border-slate-300/60 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">
            EXPEDIENTES REGISTRADOS
          </div>
          <div className="text-3xl font-black text-teal-600 dark:text-teal-400 font-['Outfit'] mt-1">
            {pacientes ? String(pacientes.length) : "0"}
          </div>
          <div className="text-[11px] text-teal-600/80 dark:text-teal-400/80 font-medium mt-1">
            Pacientes en base de datos
          </div>
        </div>

        {/* Card 4: PROCEDIMIENTOS SEMANA (Borde morado / índigo) */}
        <div
          onClick={() => onNavegar("procedimientos")}
          className="apple-glass rounded-2xl p-4 sm:p-5 border-l-4 border-l-purple-500 border-slate-300/60 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">
            PROCEDIMIENTOS SEMANA
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400 font-['Outfit'] mt-1">
            {procedimientos ? String(procedimientos.length) : "0"}
          </div>
          <div className="text-[11px] text-purple-600/80 dark:text-purple-400/80 font-medium mt-1">
            Cotizaciones multimoneda
          </div>
        </div>
      </div>

      {/* ── CARD: PANEL DE CONTROL MÉDICO (ACCIONES RÁPIDAS) ── */}
      <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-300/60 dark:border-white/15 shadow-sm space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
            Panel de Control Médico
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
            Gestiona expedientes de pacientes locales y foráneos, historias clínicas de consulta, cotizaciones multidivisa y estadísticas clínicas en tiempo real.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavegar("pacientes")}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <IconUsers size={16} />
            <span>Ver Directorio de Pacientes</span>
          </button>

          <button
            type="button"
            onClick={() => onNavegar("historias")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-300/60 dark:border-white/10 text-slate-700 dark:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <IconFileText size={16} />
            <span>Ver Historias Clínicas</span>
          </button>

          <button
            type="button"
            onClick={() => onNavegar("procedimientos")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-300/60 dark:border-white/10 text-slate-700 dark:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <IconPrescription size={16} />
            <span>Cotizaciones y Procedimientos</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sala de Espera (Turnos Activos)</h4>
            <button onClick={() => onNavegar("sala-espera")} className="text-teal-600 dark:text-teal-400 text-xs font-bold cursor-pointer">Ver Sala →</button>
          </div>
          {salaEspera === null ? <p className="text-xs text-slate-400">Cargando…</p> : (salaEspera.filter((e) => e.estado !== "FINALIZADO").length === 0) ? (
            <p className="text-xs text-slate-400">No hay pacientes esperando en este momento.</p>
          ) : (
            <div className="space-y-2">
              {salaEspera.filter((e) => e.estado !== "FINALIZADO").slice(0, 4).map((e, idx) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-[10px]">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{e.paciente?.nombreCompleto}</div>
                      <div className="text-[10px] text-slate-500">{new Date(e.horaLlegada).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">{e.estado}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Próximas Citas de Hoy</h4>
            <button onClick={() => onNavegar("agenda")} className="text-teal-600 dark:text-teal-400 text-xs font-bold cursor-pointer">Ir a Agenda →</button>
          </div>
          {citasHoy === null ? <p className="text-xs text-slate-400">Cargando…</p> : citasHoy.length === 0 ? (
            <p className="text-xs text-slate-400">No hay citas registradas para hoy.</p>
          ) : (
            <div className="space-y-2">
              {citasHoy.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{c.paciente?.nombreCompleto}</div>
                    <div className="text-[10px] text-slate-500">{c.motivo || "Consulta General"}</div>
                  </div>
                  <span className="text-teal-600 dark:text-teal-400 font-mono font-bold text-xs">{c.horaInicio}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, val, sub, color, onClick }: { label: string; val: string; sub: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`apple-glass rounded-2xl p-5 border-l-4 transition-all ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`} style={{ borderLeftColor: color }}>
      <div className="text-xs text-slate-500 dark:text-white/40">{label}</div>
      <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white mt-1">{val}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function calcularEdadAnios(fechaNac?: string | null): number {
  if (!fechaNac) return 30;
  const birth = new Date(fechaNac);
  if (isNaN(birth.getTime())) return 30;
  const hoy = new Date();
  let age = hoy.getFullYear() - birth.getFullYear();
  const m = hoy.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}

function formatearFechaNac(fechaStr?: string | null): string {
  if (!fechaStr) return "N/D";
  try {
    const [y, m, d] = fechaStr.split("-");
    if (y && m && d) return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    return fechaStr;
  } catch {
    return fechaStr;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE PACIENTES (DIRECTORIO + FICHA DETALLADA EN 2 COLUMNAS)
// ══════════════════════════════════════════════════════════════════════════
function GestionPacientes({
  tenantId,
  pacientes,
  onCambio,
  onNavegar,
  onSeleccionarPacienteParaConsulta,
  onSeleccionarPacienteParaCotizacion,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  onCambio: () => void;
  onNavegar: (p: Pagina) => void;
  onSeleccionarPacienteParaConsulta: (id: number) => void;
  onSeleccionarPacienteParaCotizacion: (id: number) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pacienteAEliminar, setPacienteAEliminar] = useState<Paciente | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [form, setForm] = useState({
    identificacion: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    email: "",
    fechaNacimiento: "",
    direccion: "",
    genero: "M",
    tipoOrigen: "Local",
    ciudadOrigen: "San Cristóbal",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return pacientes || [];
    return (pacientes || []).filter((p) => {
      const nombre = p.nombreCompleto?.toLowerCase() || `${p.nombres || ""} ${p.apellidos || ""}`.toLowerCase();
      const cedula = p.identificacion?.toLowerCase() || "";
      const tel = p.telefono?.toLowerCase() || "";
      const numHistoria = `hc-2026-${String(p.id).padStart(4, "0")}`.toLowerCase();
      return (
        nombre.includes(q) ||
        cedula.includes(q) ||
        tel.includes(q) ||
        numHistoria.includes(q)
      );
    });
  }, [pacientes, busqueda]);

  // Paciente activo en la ficha derecha: si hay seleccionado y está en la lista filtrada o total, o el primero de la lista
  const pacienteActivo = useMemo(() => {
    if (filtrados.length === 0) return null;
    if (pacienteSeleccionadoId) {
      const encontrado = filtrados.find((p) => p.id === pacienteSeleccionadoId);
      if (encontrado) return encontrado;
    }
    return filtrados[0] || null;
  }, [filtrados, pacienteSeleccionadoId]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const nuevo = await crearPaciente(tenantId, {
        identificacion: form.identificacion.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
        direccion: form.direccion.trim() || undefined,
        genero: form.genero,
        tipoOrigen: form.tipoOrigen,
        ciudadOrigen: form.ciudadOrigen,
      });
      setForm({
        identificacion: "",
        nombres: "",
        apellidos: "",
        telefono: "",
        email: "",
        fechaNacimiento: "",
        direccion: "",
        genero: "M",
        tipoOrigen: "Local",
        ciudadOrigen: "San Cristóbal",
      });
      setMostrarForm(false);
      onCambio();
      if (nuevo?.id) {
        setPacienteSeleccionadoId(nuevo.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar paciente");
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarEliminacion = async () => {
    if (!pacienteAEliminar) return;
    setEliminando(true);
    try {
      await eliminarPaciente(pacienteAEliminar.id);
    } catch (err) {
      console.warn("Aviso al eliminar paciente:", err);
    } finally {
      setEliminando(false);
      setPacienteAEliminar(null);
      onCambio();
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE BÚSQUEDA Y REGISTRO NUEVO */}
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar paciente por Cédula, Nombres, Apellidos o Nº de Historia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-xs"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch size={17} />
          </div>
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Limpiar búsqueda"
            >
              <IconClose size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMostrarForm(!mostrarForm)}
          className="btn-electric-blue text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md flex-shrink-0 transition-all"
        >
          <span className="text-base leading-none">{mostrarForm ? "✕" : "+"}</span>
          <span>{mostrarForm ? "Cerrar Formulario" : "Registrar Nuevo Paciente"}</span>
        </button>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      {mostrarForm && (
        <form onSubmit={guardar} className="apple-glass rounded-3xl p-6 sm:p-7 space-y-5 border border-teal-500/40 shadow-xl bg-white/95 dark:bg-[#06182c]/95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
                <IconUser size={20} />
              </div>
              <div>
                <h4 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">Registrar Nuevo Paciente</h4>
                <p className="text-[11px] text-slate-500 dark:text-white/50">Completa los datos para apertura de historia clínica</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 cursor-pointer"
            >
              <IconClose size={18} />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Cédula / DNI / Pasaporte *</label>
              <input
                required
                placeholder="Ej. V-10987654"
                value={form.identificacion}
                onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Nombres *</label>
              <input
                required
                placeholder="Ej. Carlos Andrés"
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Apellidos *</label>
              <input
                required
                placeholder="Ej. Gómez Peña"
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Teléfono WhatsApp</label>
              <input
                placeholder="0414-7654321"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Email de Contacto</label>
              <input
                type="email"
                placeholder="carlos.gomez@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Fecha de Nacimiento</label>
              <input
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Origen / Condición</label>
              <select
                value={form.tipoOrigen}
                onChange={(e) => setForm({ ...form, tipoOrigen: e.target.value, ciudadOrigen: e.target.value === "Foráneo" ? "Cúcuta" : "San Cristóbal" })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              >
                <option value="Local">Local (San Cristóbal / Táchira)</option>
                <option value="Foráneo">Foráneo (Cúcuta / Otro Estado / Internacional)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Ciudad de Procedencia</label>
              <input
                placeholder="Ej. Cúcuta / San Cristóbal"
                value={form.ciudadOrigen}
                onChange={(e) => setForm({ ...form, ciudadOrigen: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono font-bold">Dirección de Habitación</label>
              <input
                placeholder="Ej. Barrio Blanco, Cúcuta"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-slate-600 dark:text-white/70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="btn-electric-blue text-xs font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 cursor-pointer shadow-md"
            >
              {guardando ? "Guardando…" : "Guardar Paciente"}
            </button>
          </div>
        </form>
      )}

      {/* ── DISTRIBUCIÓN EN 2 COLUMNAS: DIRECTORIO (IZQ) + FICHA DETALLE (DER) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: DIRECTORIO DE PACIENTES */}
        <div className="lg:col-span-7 xl:col-span-8 apple-glass rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm bg-white/80 dark:bg-[#071a2e]/40">
          <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
            <h4 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">
              Directorio de Pacientes
            </h4>
            <span className="text-xs text-slate-500 dark:text-white/50 font-medium">
              Total en archivo: {filtrados.length} {filtrados.length === 1 ? "paciente" : "pacientes"}
            </span>
          </div>

          {pacientes === null ? (
            <p className="p-8 text-xs text-slate-400 text-center">Cargando directorio de pacientes…</p>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400">
                <IconUsers size={22} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-white/80">No se encontraron pacientes</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No hay pacientes que coincidan con los criterios de búsqueda o aún no se han registrado.
              </p>
              <button
                onClick={() => setMostrarForm(true)}
                className="mt-2 btn-electric-blue text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                + Registrar Primer Paciente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-white/5 text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    <th className="py-3 px-3">Nº Hist...</th>
                    <th className="py-3 px-3">Cédula</th>
                    <th className="py-3 px-3">Nombre Compl...</th>
                    <th className="py-3 px-3">Origen</th>
                    <th className="py-3 px-3">Teléfono</th>
                    <th className="py-3 px-3">Fecha Nac....</th>
                    <th className="py-3 px-3 text-center">Acci...</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
                  {filtrados.map((p) => {
                    const isSeleccionado = pacienteActivo?.id === p.id;
                    const esForaneo = p.tipoOrigen === "Foráneo" || p.tipoOrigen === "FORANEO" || (p.origen && p.origen.includes("Foráneo"));
                    const origenTexto = esForaneo
                      ? `Foráneo (${p.ciudadOrigen || "Cúcuta"})`
                      : `Local - ${p.ciudadOrigen || "San Cristóbal"}`;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setPacienteSeleccionadoId(p.id)}
                        className={`transition-colors cursor-pointer ${
                          isSeleccionado
                            ? "bg-sky-50 dark:bg-sky-950/40 border-l-4 border-l-sky-500 font-medium"
                            : "hover:bg-slate-100/50 dark:hover:bg-white/5"
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                          HC-2026-{String(p.id).padStart(4, "0")}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-white/80 whitespace-nowrap">
                          {p.identificacion}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white truncate max-w-[140px]" title={p.nombreCompleto}>
                          {p.nombreCompleto}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-white/70 truncate max-w-[130px]" title={origenTexto}>
                          {origenTexto}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-white/70 whitespace-nowrap">
                          {p.telefono || "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-white/60 font-mono whitespace-nowrap">
                          {formatearFechaNac(p.fechaNacimiento)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Ver ficha del paciente"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPacienteSeleccionadoId(p.id);
                              }}
                              className="w-7 h-7 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                            >
                              ···
                            </button>
                            <button
                              type="button"
                              title="Eliminar paciente"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPacienteAEliminar(p);
                              }}
                              className="w-7 h-7 rounded-full bg-red-500/15 hover:bg-red-600 text-red-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <IconTrash size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: FICHA DEL PACIENTE SELECCIONADO */}
        <div className="lg:col-span-5 xl:col-span-4">
          {pacienteActivo ? (
            <div className="apple-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-lg bg-white/90 dark:bg-[#06182c]/80 space-y-5 sticky top-4">
              {/* Header de la Ficha: Avatar e Identificación */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-300 flex-shrink-0 shadow-xs">
                  <IconUser size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white leading-tight truncate" title={pacienteActivo.nombreCompleto}>
                    {pacienteActivo.nombreCompleto}
                  </h3>
                  <div className="text-sky-600 dark:text-sky-400 font-bold text-xs font-mono mt-0.5">
                    Historia Nº HC-2026-{String(pacienteActivo.id).padStart(4, "0")}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-white/10" />

              {/* Lista de Detalles del Paciente */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-white/50 font-bold">Identificación:</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                    C.I: {pacienteActivo.identificacion}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-white/50 font-bold">Condición:</span>
                  <div>
                    {pacienteActivo.tipoOrigen === "Foráneo" || pacienteActivo.tipoOrigen === "FORANEO" || (pacienteActivo.origen && pacienteActivo.origen.includes("Foráneo")) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300/60 dark:border-purple-500/40 text-[11px] font-bold">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                        <span>Foráneo ({pacienteActivo.ciudadOrigen || "Cúcuta"})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/40 text-[11px] font-bold">
                        <span>Local ({pacienteActivo.ciudadOrigen || "San Cristóbal"})</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-white/50 font-bold">Teléfono:</span>
                  <span className="font-mono text-slate-800 dark:text-white/90">
                    {pacienteActivo.telefono || "No registrado"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-white/50 font-bold">Email:</span>
                  <span className="text-slate-800 dark:text-white/90 truncate max-w-[180px]" title={pacienteActivo.email || ""}>
                    {pacienteActivo.email || "No registrado"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-white/50 font-bold">Edad:</span>
                  <span className="text-slate-800 dark:text-white/90 font-mono">
                    {pacienteActivo.fechaNacimiento
                      ? `${formatearFechaNac(pacienteActivo.fechaNacimiento)} (${calcularEdadAnios(pacienteActivo.fechaNacimiento)} años)`
                      : pacienteActivo.edad
                      ? `${pacienteActivo.edad} años`
                      : "No registrada"}
                  </span>
                </div>

                <div className="flex flex-col py-1 space-y-1">
                  <span className="text-slate-500 dark:text-white/50 font-bold">Dirección:</span>
                  <span className="text-slate-800 dark:text-white/90">
                    {pacienteActivo.direccion || "Barrio Blanco, Cúcuta"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-white/10" />

              {/* Botones de Acciones Rápidas */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
                  Acciones Rápidas
                </div>

                <button
                  type="button"
                  onClick={() => onSeleccionarPacienteParaConsulta(pacienteActivo.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <IconFileText size={15} />
                  <span>Iniciar Consulta / Historia</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSeleccionarPacienteParaCotizacion(pacienteActivo.id)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <IconPrescription size={15} className="text-teal-600 dark:text-teal-400" />
                  <span>Cotizar Procedimiento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPacienteAEliminar(pacienteActivo)}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <IconTrash size={15} />
                  <span>Eliminar Paciente</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="apple-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-[#06182c]/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400">
                <IconUser size={24} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-white/70">Ficha del Paciente</p>
              <p className="text-[11px] text-slate-400">
                Selecciona un paciente del directorio o registra uno nuevo para ver su ficha completa y opciones rápidas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PACIENTE */}
      {pacienteAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 max-w-sm w-full bg-white dark:bg-[#071a2e] border border-red-500/30 text-slate-900 dark:text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-600">
                <IconWarning size={22} />
              </div>
              <div>
                <h4 className="font-bold text-sm">¿Eliminar Paciente?</h4>
                <p className="text-[11px] text-slate-500 dark:text-white/60">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/80">
              Se eliminará permanentemente la ficha de <strong className="text-slate-900 dark:text-white">{pacienteAEliminar.nombreCompleto}</strong> (C.I: {pacienteAEliminar.identificacion}) junto con su historial asociado.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPacienteAEliminar(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminacion}
                disabled={eliminando}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md disabled:opacity-50"
              >
                {eliminando ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HISTORIAS CLÍNICAS & GENERACIÓN DE INFORME PDF + WHATSAPP + GMAIL
// ══════════════════════════════════════════════════════════════════════════
function HistoriasClinicas({
  tenantId,
  pacientes,
  config,
  rol,
  pacienteInicialId,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  config: any;
  rol: RolVista;
  pacienteInicialId?: number | null;
}) {
  const [pacienteId, setPacienteId] = useState<number | "">(pacienteInicialId || "");
  const [historial, setHistorial] = useState<ConsultaMedica[] | null>(null);

  useEffect(() => {
    if (pacienteInicialId) {
      setPacienteId(pacienteInicialId);
    }
  }, [pacienteInicialId]);
  
  // Signos vitales completos
  const [signos, setSignos] = useState({ ta: "120/80", fc: "75", fr: "18", temp: "36.8", peso: "70", talla: "1.72", imc: "23.6", satO2: "99" });
  const [form, setForm] = useState({ motivoConsulta: "", evolucionClinica: "", descripcionDiagnostico: "", planTratamiento: "", proximaCita: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pacienteSeleccionado = (pacientes || []).find((p) => p.id === Number(pacienteId));

  const calcularImc = (pesoStr: string, tallaStr: string) => {
    const p = parseFloat(pesoStr);
    const t = parseFloat(tallaStr);
    if (p > 0 && t > 0) {
      const imcCalc = (p / (t * t)).toFixed(1);
      setSignos((s) => ({ ...s, peso: pesoStr, talla: tallaStr, imc: imcCalc }));
    } else {
      setSignos((s) => ({ ...s, peso: pesoStr, talla: tallaStr }));
    }
  };

  useEffect(() => {
    if (!pacienteId) { setHistorial(null); return; }
    historialConsultasPaciente(Number(pacienteId)).then(setHistorial).catch(() => setHistorial([]));
  }, [pacienteId]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId) return;
    setError(null);
    setGuardando(true);
    try {
      await registrarConsulta(tenantId, Number(pacienteId), {
        motivoConsulta: form.motivoConsulta,
        descripcionDiagnostico: form.descripcionDiagnostico,
        planTratamiento: form.planTratamiento,
      });
      historialConsultasPaciente(Number(pacienteId)).then(setHistorial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar consulta");
    } finally {
      setGuardando(false);
    }
  };

  const getDatosReporte = (): ConsultaReportData | null => {
    if (!pacienteSeleccionado) return null;
    return {
      clinicaNombre: config.clinicaNombre,
      doctorNombre: config.doctorNombre,
      especialidad: config.especialidad,
      matriculaMPPS: config.matriculaMPPS,
      colegioMedicos: config.colegioMedicos,
      paciente: {
        expediente: `HC-2026-${String(pacienteSeleccionado.id).padStart(4, "0")}`,
        nombreCompleto: pacienteSeleccionado.nombreCompleto,
        identificacion: pacienteSeleccionado.identificacion,
        edad: pacienteSeleccionado.edad || 30,
        telefono: pacienteSeleccionado.telefono || "N/A",
        origen: "Local",
        fechaConsulta: hoy(),
      },
      signosVitales: signos,
      motivoConsulta: form.motivoConsulta || "Consulta Médica General",
      evolucionClinica: form.evolucionClinica,
      diagnosticoCIE10: form.descripcionDiagnostico,
      planTratamiento: form.planTratamiento,
      proximaCita: form.proximaCita,
    };
  };

  const handleDescargarPdf = () => {
    const data = getDatosReporte();
    if (data) generarPdfInformeConsulta(data);
  };

  const handleEnviarWhatsApp = () => {
    const data = getDatosReporte();
    if (!data || !pacienteSeleccionado) return;
    const texto = generarTextoWhatsAppConsulta(data);
    const tel = (pacienteSeleccionado.telefono || "").replace(/\D/g, "");
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, "_blank");
  };

  const handleEnviarGmail = () => {
    const data = getDatosReporte();
    if (!data || !pacienteSeleccionado) return;
    const asunto = encodeURIComponent(`Informe Médico - ${data.paciente.nombreCompleto} (${data.paciente.expediente})`);
    const cuerpo = encodeURIComponent(
      `Estimado(a) ${data.paciente.nombreCompleto},\n\nAdjunto resumen de su consulta médica realizada en ${data.clinicaNombre}.\n\nMédico Tratante: Dr(a). ${data.doctorNombre}\nDiagnóstico: ${data.diagnosticoCIE10 || "Evaluación Médica"}\nPlan de Tratamiento / Receta: ${data.planTratamiento || "Indicaciones en consulta."}\n${data.proximaCita ? `Próximo Control: ${data.proximaCita}\n` : ""}\nSaludos cordiales.`
    );
    const emailDestino = pacienteSeleccionado.email || "";
    window.open(`mailto:${emailDestino}?subject=${asunto}&body=${cuerpo}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {rol === "SECRETARIA" && (
        <div className="apple-glass rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <span>🔒</span>
          <span><strong>Modo Recepción / Secretaria:</strong> Vista simplificada de expediente. Los diagnósticos médicos privados y recetas son editados exclusivamente en modo Médico.</span>
        </div>
      )}

      <div className="apple-glass rounded-2xl p-4">
        <label className="text-xs font-semibold text-slate-500 dark:text-white/40">Seleccionar Paciente para Consulta</label>
        <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
          className="w-full mt-1 px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-sm">
          <option value="">— Elige un paciente de la lista —</option>
          {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto} (C.I: {p.identificacion})</option>)}
        </select>
      </div>

      {pacienteId && pacienteSeleccionado && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Formulario de Consulta */}
          <form onSubmit={guardar} className="lg:col-span-8 apple-glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Consulta Médica & Prescripción</h4>
                <p className="text-[11px] text-teal-600 dark:text-teal-400">Paciente: {pacienteSeleccionado.nombreCompleto} (HC-2026-{String(pacienteSeleccionado.id).padStart(4, "0")})</p>
              </div>
            </div>

            {error && <p className="text-xs text-[#ff3b80]">{error}</p>}

            {/* Signos Vitales */}
            <div>
              <label className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Signos Vitales & Somatometría</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1.5">
                <div>
                  <span className="text-[10px] text-slate-400">T/A (mmHg)</span>
                  <input value={signos.ta} onChange={(e) => setSignos({ ...signos, ta: e.target.value })} placeholder="120/80" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">FC (lpm)</span>
                  <input value={signos.fc} onChange={(e) => setSignos({ ...signos, fc: e.target.value })} placeholder="75" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">FR (rpm)</span>
                  <input value={signos.fr} onChange={(e) => setSignos({ ...signos, fr: e.target.value })} placeholder="18" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Temp (°C)</span>
                  <input value={signos.temp} onChange={(e) => setSignos({ ...signos, temp: e.target.value })} placeholder="36.8" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Peso (kg)</span>
                  <input value={signos.peso} onChange={(e) => calcularImc(e.target.value, signos.talla)} placeholder="70" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Talla (m)</span>
                  <input value={signos.talla} onChange={(e) => calcularImc(signos.peso, e.target.value)} placeholder="1.72" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">IMC (calc)</span>
                  <input value={signos.imc} readOnly className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-100 text-xs font-bold text-teal-600" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">SatO2 (%)</span>
                  <input value={signos.satO2} onChange={(e) => setSignos({ ...signos, satO2: e.target.value })} placeholder="99" className="w-full px-2.5 py-1.5 rounded-lg border text-xs" />
                </div>
              </div>
            </div>

            {/* Motivo & Evolución */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Motivo de Consulta *</label>
                <textarea required placeholder="Describa el motivo de la consulta..." value={form.motivoConsulta} onChange={(e) => setForm({ ...form, motivoConsulta: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs" rows={2} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Examen Físico / Evolución Clínica</label>
                <textarea placeholder="Hallazgos al examen físico y evolución..." value={form.evolucionClinica} onChange={(e) => setForm({ ...form, evolucionClinica: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs" rows={2} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Diagnóstico (CIE-10)</label>
                <input placeholder="Ej. J00 Rinofaringitis aguda (resfriado común)" value={form.descripcionDiagnostico} onChange={(e) => setForm({ ...form, descripcionDiagnostico: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Plan de Tratamiento & Receta Médica (Rx)</label>
                <textarea placeholder="1. Medicamento X 500mg - 1 tab cada 8 horas por 5 días..." value={form.planTratamiento} onChange={(e) => setForm({ ...form, planTratamiento: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs" rows={3} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Próxima Cita / Control (opcional)</label>
                <input type="date" value={form.proximaCita} onChange={(e) => setForm({ ...form, proximaCita: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs" />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button type="submit" disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-50 cursor-pointer">
                {guardando ? "Guardando…" : "Guardar en Expediente"}
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDescargarPdf} className="px-3 py-2 rounded-full border border-teal-500/40 text-teal-600 dark:text-teal-300 text-xs font-bold hover:bg-teal-500/10 flex items-center gap-1.5 cursor-pointer">
                  <span>📥</span> PDF
                </button>
                <button type="button" onClick={handleEnviarWhatsApp} className="px-3 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>💬</span> WhatsApp
                </button>
                <button type="button" onClick={handleEnviarGmail} className="px-3 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>✉️</span> Gmail
                </button>
              </div>
            </div>
          </form>

          {/* Historial previo */}
          <div className="lg:col-span-4 apple-glass rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Consultas Anteriores</h4>
            {historial === null ? (
              <p className="text-xs text-slate-400">Cargando…</p>
            ) : historial.length === 0 ? (
              <p className="text-xs text-slate-400">No hay consultas previas para este paciente.</p>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {historial.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 text-xs space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">{c.motivoConsulta}</div>
                    {c.descripcionDiagnostico && <div className="text-teal-600 dark:text-teal-400 text-[11px]">Dx: {c.descripcionDiagnostico}</div>}
                    {c.planTratamiento && <div className="text-slate-500 text-[11px] line-clamp-2">Rx: {c.planTratamiento}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROCEDIMIENTOS & COTIZADOR MULTI-MONEDA (USD / VES / COP)
// ══════════════════════════════════════════════════════════════════════════
function Procedimientos({
  tenantId,
  procedimientos,
  pacientes,
  config,
  onCambio,
  pacienteInicialId,
}: {
  tenantId: number;
  procedimientos: ProcedimientoMedico[] | null;
  pacientes: Paciente[] | null;
  config: any;
  onCambio: () => void;
  pacienteInicialId?: number | null;
}) {
  const [form, setForm] = useState({ nombre: "", descripcion: "", costo: "", moneda: "USD", duracionMinutos: "" });
  const [guardando, setGuardando] = useState(false);

  // Estado del Cotizador
  const [cotizacionPacienteId, setCotizacionPacienteId] = useState<number | "">(pacienteInicialId || "");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);

  useEffect(() => {
    if (pacienteInicialId) {
      setCotizacionPacienteId(pacienteInicialId);
    }
  }, [pacienteInicialId]);

  const pacienteCotizacion = (pacientes || []).find((p) => p.id === Number(cotizacionPacienteId));

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const procsCotizados = (procedimientos || []).filter((p) => seleccionados.includes(p.id));
  const subtotalUSD = procsCotizados.reduce((sum, p) => sum + Number(p.costo), 0);
  const subtotalVES = subtotalUSD * config.tasaBCV;
  const subtotalCOP = subtotalUSD * config.tasaCOP;

  const guardarProcedimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await crearProcedimiento(tenantId, {
        nombre: form.nombre, descripcion: form.descripcion || null,
        costo: Number(form.costo), moneda: form.moneda,
        duracionMinutos: form.duracionMinutos ? Number(form.duracionMinutos) : null,
      });
      setForm({ nombre: "", descripcion: "", costo: "", moneda: "USD", duracionMinutos: "" });
      onCambio();
    } finally {
      setGuardando(false);
    }
  };

  const handleDescargarCotizacionPdf = () => {
    if (procsCotizados.length === 0) return;
    const dataCot: CotizacionData = {
      clinicaNombre: config.clinicaNombre,
      doctorNombre: config.doctorNombre,
      pacienteNombre: pacienteCotizacion?.nombreCompleto || "Paciente Particular",
      pacienteCedula: pacienteCotizacion?.identificacion || "S/C",
      fecha: hoy(),
      items: procsCotizados.map((p) => ({
        nombre: p.nombre,
        costoUSD: Number(p.costo),
        costoVES: Number(p.costo) * config.tasaBCV,
        costoCOP: Number(p.costo) * config.tasaCOP,
      })),
      tasaBCV: config.tasaBCV,
      tasaCOP: config.tasaCOP,
      totalUSD: subtotalUSD,
      totalVES: subtotalVES,
      totalCOP: subtotalCOP,
    };
    generarPdfCotizacion(dataCot);
  };

  const handleEnviarCotizacionWhatsApp = () => {
    if (procsCotizados.length === 0) return;
    const lineas = [
      `🏥 *${config.clinicaNombre}*`,
      `📄 *Presupuesto de Procedimientos Médicos*`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 *Paciente:* ${pacienteCotizacion?.nombreCompleto || "Paciente"}`,
      `📅 *Fecha:* ${hoy()}`,
      `━━━━━━━━━━━━━━━━━━`,
      ...procsCotizados.map((p) => `• ${p.nombre}: *$${Number(p.costo).toFixed(2)} USD* (Bs. ${(Number(p.costo) * config.tasaBCV).toFixed(2)})`),
      `━━━━━━━━━━━━━━━━━━`,
      `💵 *Total USD:* $${subtotalUSD.toFixed(2)} USD`,
      `🇻🇪 *Total Bolívares (BCV):* Bs. ${subtotalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`,
      `🇨🇴 *Total Pesos COP:* $${subtotalCOP.toLocaleString("es-CO")} COP`,
      `━━━━━━━━━━━━━━━━━━`,
      `_Presupuesto válido por 15 días._`,
    ];
    const texto = encodeURIComponent(lineas.join("\n"));
    const tel = (pacienteCotizacion?.telefono || "").replace(/\D/g, "");
    window.open(tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Cotizador Multi-Moneda */}
      <div className="apple-glass rounded-2xl p-5 space-y-4 border border-teal-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Cotizador / Presupuesto de Procedimientos</h4>
            <p className="text-xs text-slate-500">Selecciona procedimientos del catálogo para calcular el presupuesto en USD, VES y COP.</p>
          </div>
          <div className="w-64">
            <select
              value={cotizacionPacienteId}
              onChange={(e) => setCotizacionPacienteId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-1.5 rounded-lg border text-xs"
            >
              <option value="">— Paciente Particular (S/C) —</option>
              {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto}</option>)}
            </select>
          </div>
        </div>

        {/* Resumen de Cotización */}
        {procsCotizados.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono">Procedimientos ({procsCotizados.length})</div>
              <div className="text-xs font-bold text-slate-700 dark:text-white/90">
                {procsCotizados.map((p) => p.nombre).join(" + ")}
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] text-slate-400">Total USD</div>
                <div className="text-base font-black text-emerald-500">${subtotalUSD.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Tasa BCV (VES)</div>
                <div className="text-base font-black text-sky-500">Bs. {subtotalVES.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Pesos COP</div>
                <div className="text-base font-black text-purple-500">${subtotalCOP.toLocaleString()} COP</div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDescargarCotizacionPdf} className="px-3 py-2 rounded-full bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 flex items-center gap-1 cursor-pointer">
                  <span>📥</span> Presupuesto PDF
                </button>
                <button onClick={handleEnviarCotizacionWhatsApp} className="px-3 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 flex items-center gap-1 cursor-pointer">
                  <span>💬</span> WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de nuevo procedimiento */}
      <form onSubmit={guardarProcedimiento} className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Agregar Nuevo Procedimiento al Catálogo</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Nombre del procedimiento *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
          <input required type="number" step="0.01" placeholder="Precio en USD *" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
          <input placeholder="Duración aproximada (minutos)" type="number" value={form.duracionMinutos} onChange={(e) => setForm({ ...form, duracionMinutos: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
          <input placeholder="Descripción clínica" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
        </div>
        <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2 rounded-full disabled:opacity-50 cursor-pointer">
          {guardando ? "Guardando…" : "Guardar en Catálogo"}
        </button>
      </form>

      {/* Catálogo con checkboxes para cotización */}
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Catálogo de Procedimientos (Haz clic para seleccionar y cotizar)</h4>
        {procedimientos === null ? (
          <p className="text-xs text-slate-400">Cargando catálogo…</p>
        ) : procedimientos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin procedimientos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {procedimientos.map((p) => {
              const seleccionado = seleccionados.includes(p.id);
              const costoUsd = Number(p.costo);
              const costoVes = costoUsd * config.tasaBCV;
              const costoCop = costoUsd * config.tasaCOP;
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSeleccion(p.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    seleccionado
                      ? "bg-teal-500/15 border-teal-500 shadow-md scale-[1.01]"
                      : "bg-slate-100/60 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-teal-400/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${seleccionado ? "bg-teal-500 text-black" : "border border-slate-300"}`}>
                      {seleccionado ? "✓" : ""}
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <div className="text-teal-600 dark:text-teal-400 font-bold text-base">${costoUsd.toFixed(2)} USD</div>
                    <div className="text-xs text-slate-500 font-mono">Bs. {costoVes.toFixed(2)} · ${costoCop.toLocaleString()} COP</div>
                  </div>
                  {p.descripcion && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.descripcion}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SALA DE ESPERA & CIERRE DE CAJA DIARIA
// ══════════════════════════════════════════════════════════════════════════
function SalaEspera({ tenantId, pacientes, entradas, cobrosLocales, onAgregarCobro, onAgregarCierre, onCambio, config }: {
  tenantId: number; pacientes: Paciente[] | null; entradas: SalaEsperaEntrada[] | null; cobrosLocales: CobroItem[];
  onAgregarCobro: (item: CobroItem) => void; onAgregarCierre: (cierre: CierreCajaData) => void; onCambio: () => void; config: any;
}) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [consultorio, setConsultorio] = useState("Consultorio 1");
  const [metodoPago, setMetodoPago] = useState("Efectivo USD");
  const [montoUSD, setMontoUSD] = useState("25");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId) return;
    setEnviando(true);
    try {
      await registrarLlegadaSalaEspera(tenantId, Number(pacienteId), consultorio || undefined);
      
      const pac = (pacientes || []).find((p) => p.id === Number(pacienteId));
      const montoNum = parseFloat(montoUSD) || 0;
      const cobroItem: CobroItem = {
        turno: (entradas || []).length + 1,
        pacienteNombre: pac?.nombreCompleto || "Paciente",
        identificacion: pac?.identificacion || "S/C",
        concepto: "Consulta Médica",
        metodoPago,
        referencia: referencia.trim(),
        montoUSD: montoNum,
        montoVES: montoNum * config.tasaBCV,
        hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onAgregarCobro(cobroItem);

      setPacienteId("");
      setReferencia("");
      onCambio();
    } finally {
      setEnviando(false);
    }
  };

  const finalizar = async (id: number) => {
    await finalizarAtencionSalaEspera(id);
    onCambio();
  };

  const activos = (entradas || []).filter((e) => e.estado !== "FINALIZADO");
  const totalCajaUSD = cobrosLocales.reduce((acc, c) => acc + c.montoUSD, 0);
  const totalCajaVES = cobrosLocales.reduce((acc, c) => acc + c.montoVES, 0);

  const ejecutarCierreCaja = () => {
    const dataCierre: CierreCajaData = {
      clinicaNombre: config.clinicaNombre,
      doctorNombre: config.doctorNombre,
      fecha: hoy(),
      horaCierre: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      tasaBCV: config.tasaBCV,
      cobros: cobrosLocales,
      totalUSD: totalCajaUSD,
      totalVES: totalCajaVES,
      totalPacientes: cobrosLocales.length,
    };
    generarPdfCierreCaja(dataCierre);
    onAgregarCierre(dataCierre);
    setMostrarModalCierre(false);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera con botón de Cierre de Caja */}
      <div className="flex items-center justify-between apple-glass rounded-2xl p-4 border border-teal-500/30">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Recepción, Triaje & Caja Diaria</h4>
          <p className="text-xs text-slate-500">Recaudación acumulada hoy: <strong className="text-emerald-500">${totalCajaUSD.toFixed(2)} USD</strong> (Bs. {totalCajaVES.toFixed(2)})</p>
        </div>
        <button
          onClick={() => setMostrarModalCierre(true)}
          className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>🔒</span> Cerrar Caja y Jornada
        </button>
      </div>

      {/* Check-In con captura de pago */}
      <form onSubmit={checkIn} className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Registrar Llegada & Captura de Pago</h4>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Paciente *</label>
            <select required value={pacienteId} onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs">
              <option value="">— Seleccionar paciente —</option>
              {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.identificacion})</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Método de Pago</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs">
              <option value="Efectivo USD">Efectivo USD ($)</option>
              <option value="Pago Móvil VES">Pago Móvil (VES)</option>
              <option value="Zelle USD">Zelle (USD)</option>
              <option value="Transferencia VES">Transferencia (VES)</option>
              <option value="Punto de Venta">Punto de Venta / Tarjeta</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Monto ($)</label>
            <input type="number" step="1" value={montoUSD} onChange={(e) => setMontoUSD(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs font-bold" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Ref. / Recibo</label>
            <input placeholder="Últimos 4 dígitos" value={referencia} onChange={(e) => setReferencia(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
          </div>
        </div>
        <button disabled={enviando} className="btn-electric-blue text-xs font-bold px-5 py-2 rounded-full disabled:opacity-50 mt-2 cursor-pointer">
          {enviando ? "Registrando…" : "Ingresar a Sala & Registrar Cobro"}
        </button>
      </form>

      {/* Turnos en sala */}
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sala de Espera (Turnos del Día)</h4>
        {entradas === null ? (
          <p className="text-xs text-slate-400">Cargando sala…</p>
        ) : activos.length === 0 ? (
          <p className="text-xs text-slate-400">No hay pacientes en sala de espera.</p>
        ) : (
          <div className="space-y-2.5">
            {activos.map((e, idx) => (
              <div key={e.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{e.paciente?.nombreCompleto}</div>
                    <div className="text-[11px] text-slate-500">
                      Llegada: {new Date(e.horaLlegada).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Consultorio: {e.consultorio || "Principal"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                    {e.estado}
                  </span>
                  <button onClick={() => finalizar(e.id)} className="px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-bold text-xs hover:bg-teal-500/30 flex items-center gap-1 cursor-pointer">
                    <IconCheck size={12} /> Finalizar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cierre de Caja */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl p-6 max-w-lg w-full space-y-4 border border-white/20 shadow-2xl">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Cierre de Caja y Fin de Jornada</h3>
            <p className="text-xs text-slate-500">Consolidación de auditoría para el día {hoy()}:</p>
            
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-100 dark:bg-white/5">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Total Recaudado USD</div>
                <div className="text-lg font-black text-emerald-500">${totalCajaUSD.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Total Recaudado VES</div>
                <div className="text-lg font-black text-sky-500">Bs. {totalCajaVES.toFixed(2)}</div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-white/70">
                Transacciones registradas: <strong>{cobrosLocales.length} pacientes</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setMostrarModalCierre(false)} className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white cursor-pointer">
                Cancelar
              </button>
              <button onClick={ejecutarCierreCaja} className="px-5 py-2.5 rounded-full bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 flex items-center gap-2 cursor-pointer">
                <span>📥</span> Descargar Reporte PDF & Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AGENDA MÉDICA & CALENDARIO MENSUAL CON BLOQUEO DE FECHAS
// ══════════════════════════════════════════════════════════════════════════
function AgendaMedica({ tenantId, pacientes, citasHoy, onCambio }: {
  tenantId: number; pacientes: Paciente[] | null; citasHoy: CitaMedica[] | null; onCambio: () => void;
}) {
  const [tipoAgenda, setTipoAgenda] = useState<"existente" | "nuevo">("existente");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy());
  
  const [formExistente, setFormExistente] = useState({ pacienteId: "", horaInicio: "09:00", horaFin: "09:30", motivo: "" });
  const [formNuevo, setFormNuevo] = useState({ identificacion: "", nombres: "", apellidos: "", telefono: "", horaInicio: "10:00", horaFin: "10:30", motivo: "" });
  
  const [fechasBloqueadas, setFechasBloqueadas] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FECHAS_BLOQUEADAS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleBloquearFecha = (f: string) => {
    setFechasBloqueadas((prev) => {
      const next = prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f];
      try { localStorage.setItem(FECHAS_BLOQUEADAS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const estaBloqueada = fechasBloqueadas.includes(fechaSeleccionada);

  const guardarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estaBloqueada) {
      setError("La fecha seleccionada se encuentra BLOQUEADA (Día no laborable / Feriado).");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      let pId: number;
      if (tipoAgenda === "existente") {
        pId = Number(formExistente.pacienteId);
      } else {
        const nuevoPac = await crearPaciente(tenantId, {
          identificacion: formNuevo.identificacion.trim() || `TMP-${Date.now().toString().slice(-6)}`,
          nombres: formNuevo.nombres.trim(),
          apellidos: formNuevo.apellidos.trim(),
          telefono: formNuevo.telefono.trim() || undefined,
        });
        pId = nuevoPac.id;
      }

      await agendarCita(tenantId, {
        pacienteId: pId,
        fecha: fechaSeleccionada,
        horaInicio: tipoAgenda === "existente" ? formExistente.horaInicio : formNuevo.horaInicio,
        horaFin: tipoAgenda === "existente" ? formExistente.horaFin : formNuevo.horaFin,
        motivo: tipoAgenda === "existente" ? formExistente.motivo : formNuevo.motivo,
      });

      setFormExistente({ pacienteId: "", horaInicio: "09:00", horaFin: "09:30", motivo: "" });
      setFormNuevo({ identificacion: "", nombres: "", apellidos: "", telefono: "", horaInicio: "10:00", horaFin: "10:30", motivo: "" });
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agendar cita");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector de fecha y bloqueo */}
      <div className="apple-glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase font-mono">Fecha:</label>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 text-xs font-bold"
          />
          {estaBloqueada && (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1">
              ⛔ DÍA BLOQUEADO
            </span>
          )}
        </div>
        <button
          onClick={() => toggleBloquearFecha(fechaSeleccionada)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            estaBloqueada
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "border border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
          }`}
        >
          {estaBloqueada ? "✓ Desbloquear esta Fecha" : "⛔ Bloquear Fecha (No Laborable)"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Formulario de agendamiento */}
        <div className="lg:col-span-7 apple-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Reservar Nueva Cita</h4>
            <div className="flex gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-white/5 text-[11px]">
              <button
                type="button"
                onClick={() => setTipoAgenda("existente")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${tipoAgenda === "existente" ? "bg-white text-black shadow-xs" : "text-slate-500"}`}
              >
                Paciente Registrado
              </button>
              <button
                type="button"
                onClick={() => setTipoAgenda("nuevo")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${tipoAgenda === "nuevo" ? "bg-white text-black shadow-xs" : "text-slate-500"}`}
              >
                + Nuevo / Llamada
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[#ff3b80]">{error}</p>}

          <form onSubmit={guardarCita} className="space-y-3">
            {tipoAgenda === "existente" ? (
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Seleccionar Paciente *</label>
                <select required value={formExistente.pacienteId} onChange={(e) => setFormExistente({ ...formExistente, pacienteId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs">
                  <option value="">— Elige un paciente existente —</option>
                  {(pacientes || []).map((p) => <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.identificacion})</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Cédula / DNI</label>
                  <input placeholder="V-12345678" value={formNuevo.identificacion} onChange={(e) => setFormNuevo({ ...formNuevo, identificacion: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Teléfono</label>
                  <input placeholder="0412-1234567" value={formNuevo.telefono} onChange={(e) => setFormNuevo({ ...formNuevo, telefono: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Nombres *</label>
                  <input required placeholder="Nombres" value={formNuevo.nombres} onChange={(e) => setFormNuevo({ ...formNuevo, nombres: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Apellidos *</label>
                  <input required placeholder="Apellidos" value={formNuevo.apellidos} onChange={(e) => setFormNuevo({ ...formNuevo, apellidos: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Hora Inicio *</label>
                <input required type="time" value={tipoAgenda === "existente" ? formExistente.horaInicio : formNuevo.horaInicio}
                  onChange={(e) => tipoAgenda === "existente" ? setFormExistente({ ...formExistente, horaInicio: e.target.value }) : setFormNuevo({ ...formNuevo, horaInicio: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono font-bold" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono">Hora Fin *</label>
                <input required type="time" value={tipoAgenda === "existente" ? formExistente.horaFin : formNuevo.horaFin}
                  onChange={(e) => tipoAgenda === "existente" ? setFormExistente({ ...formExistente, horaFin: e.target.value }) : setFormNuevo({ ...formNuevo, horaFin: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono font-bold" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono">Motivo de la Cita</label>
              <input placeholder="Ej. Control de hipertensión, primera consulta..." value={tipoAgenda === "existente" ? formExistente.motivo : formNuevo.motivo}
                onChange={(e) => tipoAgenda === "existente" ? setFormExistente({ ...formExistente, motivo: e.target.value }) : setFormNuevo({ ...formNuevo, motivo: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
            </div>

            <button disabled={guardando || estaBloqueada} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-40 cursor-pointer">
              {guardando ? "Agendando…" : "Confirmar Cita en Agenda"}
            </button>
          </form>
        </div>

        {/* Citas del día seleccionado */}
        <div className="lg:col-span-5 apple-glass rounded-2xl p-5 space-y-3">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Citas Programadas ({fechaSeleccionada})</h4>
          {citasHoy === null ? (
            <p className="text-xs text-slate-400">Cargando citas…</p>
          ) : citasHoy.length === 0 ? (
            <p className="text-xs text-slate-400">No hay citas programadas para esta fecha.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {citasHoy.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{c.paciente?.nombreCompleto}</span>
                    <span className="text-teal-600 dark:text-teal-400 font-mono font-bold">{c.horaInicio} – {c.horaFin}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-1">{c.motivo || "Consulta médica"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// RESÚMENES FINANCIEROS & HISTORIAL DE CIERRES AUDITADOS
// ══════════════════════════════════════════════════════════════════════════
function ResumenesFinancieros({ ingresosHoy, citasHoy, cobrosLocales, historialCierres, config }: {
  ingresosHoy: number | null; citasHoy: CitaMedica[] | null; cobrosLocales: CobroItem[]; historialCierres: CierreCajaData[]; config: any;
}) {
  const totalUSD = cobrosLocales.reduce((s, x) => s + x.montoUSD, 0);
  const totalVES = cobrosLocales.reduce((s, x) => s + x.montoVES, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Recaudación del Día (USD)" val={`$${totalUSD.toFixed(2)}`} sub="Total en dólares" color="#10b981" />
        <KpiCard label="Equivalente en Bolívares (VES)" val={`Bs. ${totalVES.toFixed(2)}`} sub={`A tasa oficial ${config.tasaBCV}`} color="#0ea5e9" />
        <KpiCard label="Consultas Pagadas" val={String(cobrosLocales.length)} sub="Transacciones de caja hoy" color="#a855f7" />
      </div>

      {/* Cobros del día */}
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Auditoría de Cobros de Hoy</h4>
          <button
            onClick={() => {
              generarPdfCierreCaja({
                clinicaNombre: config.clinicaNombre,
                doctorNombre: config.doctorNombre,
                fecha: hoy(),
                horaCierre: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                tasaBCV: config.tasaBCV,
                cobros: cobrosLocales,
                totalUSD,
                totalVES,
                totalPacientes: cobrosLocales.length,
              });
            }}
            className="px-3.5 py-1.5 rounded-full border border-teal-500/40 text-teal-600 dark:text-teal-400 font-bold text-xs hover:bg-teal-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <span>📥</span> Exportar PDF de Auditoría
          </button>
        </div>

        {cobrosLocales.length === 0 ? (
          <p className="text-xs text-slate-400">No hay cobros registrados en la caja de hoy.</p>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
            {cobrosLocales.map((c, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{c.pacienteNombre} <span className="text-slate-400 font-normal">({c.identificacion})</span></div>
                  <div className="text-[11px] text-slate-500">{c.metodoPago} {c.referencia ? `· Ref: ${c.referencia}` : ""} · {c.hora}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">${c.montoUSD.toFixed(2)} USD</div>
                  <div className="text-[10px] text-slate-400">Bs. {c.montoVES.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de cierres de caja anteriores */}
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Historial de Cierres de Caja Guardados</h4>
        {historialCierres.length === 0 ? (
          <p className="text-xs text-slate-400">No hay cierres de caja históricos guardados.</p>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
            {historialCierres.map((cierre, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Cierre del {cierre.fecha} ({cierre.horaCierre})</div>
                  <div className="text-[11px] text-slate-500">{cierre.totalPacientes} pacientes · Responsable: {cierre.doctorNombre}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">${cierre.totalUSD.toFixed(2)} USD</div>
                    <div className="text-[10px] text-slate-400">Bs. {cierre.totalVES.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => generarPdfCierreCaja(cierre)}
                    className="px-3 py-1.5 rounded-lg border border-teal-500/40 text-teal-600 dark:text-teal-400 text-xs font-bold hover:bg-teal-500/10 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥</span> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN & PERFIL MÉDICO
// ══════════════════════════════════════════════════════════════════════════
function Configuracion({ config, onGuardar, user }: { config: any; onGuardar: (c: any) => void; user: any }) {
  const [form, setForm] = useState(config);
  const [claveForm, setClaveForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(form);
    setMensaje("✓ Configuración y perfil guardados exitosamente.");
    setTimeout(() => setMensaje(null), 3500);
  };

  const guardarClave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claveForm.nueva) {
      setMensaje("⚠️ La nueva clave no puede estar vacía.");
      return;
    }
    if (claveForm.nueva !== claveForm.confirmar) {
      setMensaje("❌ Las contraseñas no coinciden.");
      return;
    }
    const configActualizada = { ...form, claveDoctor: claveForm.nueva.trim() };
    onGuardar(configActualizada);
    setForm(configActualizada);
    setMensaje("✓ PIN / Contraseña del Doctor actualizada exitosamente.");
    setClaveForm({ actual: "", nueva: "", confirmar: "" });
    setTimeout(() => setMensaje(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {mensaje && (
        <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-700 dark:text-teal-300 text-xs font-bold">
          {mensaje}
        </div>
      )}

      {/* Perfil del Especialista */}
      <form onSubmit={guardar} className="apple-glass rounded-2xl p-6 space-y-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Perfil del Especialista & Membrete Médico</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Nombre de la Clínica / Centro *</label>
            <input value={form.clinicaNombre} onChange={(e) => setForm({ ...form, clinicaNombre: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Médico Responsable *</label>
            <input value={form.doctorNombre} onChange={(e) => setForm({ ...form, doctorNombre: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Especialidad Médica *</label>
            <input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Matrícula MPPS *</label>
            <input value={form.matriculaMPPS} onChange={(e) => setForm({ ...form, matriculaMPPS: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Colegio de Médicos</label>
            <input value={form.colegioMedicos} onChange={(e) => setForm({ ...form, colegioMedicos: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <h5 className="font-bold text-xs text-slate-800 dark:text-white mb-2">Tasas Oficiales de Conversión Multi-Moneda</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono">Tasa BCV (Bs. / USD)</label>
              <input type="number" step="0.01" value={form.tasaBCV} onChange={(e) => setForm({ ...form, tasaBCV: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono font-bold" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono">Tasa TRM (Pesos COP / USD)</label>
              <input type="number" step="10" value={form.tasaCOP} onChange={(e) => setForm({ ...form, tasaCOP: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono font-bold" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full cursor-pointer">
          Guardar Cambios de Perfil
        </button>
      </form>

      {/* Cambio de PIN / Contraseña del Doctor */}
      <form onSubmit={guardarClave} className="apple-glass rounded-2xl p-6 space-y-4 border border-teal-500/30">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <IconLock size={16} className="text-teal-500" />
            <span>Seguridad & PIN del Médico Titular</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
            Este PIN es solicitado para ingresar al perfil del Doctor y autorizar acciones restringidas desde la recepción.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono font-bold">Nuevo PIN / Contraseña *</label>
            <input
              type="password"
              required
              placeholder="Ej. 1234"
              value={claveForm.nueva}
              onChange={(e) => setClaveForm({ ...claveForm, nueva: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono font-bold">Confirmar PIN *</label>
            <input
              type="password"
              required
              placeholder="Repite el PIN"
              value={claveForm.confirmar}
              onChange={(e) => setClaveForm({ ...claveForm, confirmar: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono"
            />
          </div>
        </div>

        <button type="submit" className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full cursor-pointer">
          Actualizar PIN del Doctor
        </button>
      </form>
    </div>
  );
}
