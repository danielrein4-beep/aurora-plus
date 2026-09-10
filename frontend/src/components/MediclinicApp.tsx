import InboxLaboratorioMedico from "./laboratorio/InboxLaboratorioMedico";
import ModalNuevaOrdenLab from "./laboratorio/ModalNuevaOrdenLab";
import {
  useState, useEffect, useMemo } from "react";
import {
  AuroraGradientDef,
  IconStethoscope, IconUsers, IconFileText, IconPrescription, IconHourglass, IconCalendar,
  IconCard, IconCustomize, IconSearch, IconUser, IconCheck, IconTrash, IconRefresh,
  IconChevronLeft, IconChevronRight, IconCheckCircle, IconLock, IconUnlock, IconWarning, IconClose, IconBank,
  IconWhatsApp, IconMail, IconChart
} from "../Icons";
import ThemeToggle from "./ThemeToggle";
import CanalEndemico from "./CanalEndemico";
import Cie10Buscador from "./Cie10Buscador";
import HistorialImportacionesSalud from "./HistorialImportacionesSalud";
import { useAuth } from "../context/AuthContext";
import {
  contadorInboxLaboratorio, listarOrdenesLaboratorioPaciente, type OrdenLaboratorio,
  listarPacientes, crearPaciente, eliminarPaciente, buscarPacientePorIdentificacion,
  listarCitasDelDia, listarCitasPorRango, agendarCita, actualizarEstadoCita, reprogramarCita, listarCobrosDelDia,
  listarSalaEspera, registrarLlegadaSalaEspera, finalizarAtencionSalaEspera,
  listarProcedimientos, crearProcedimiento, historialConsultasPaciente, registrarConsulta, eliminarConsulta,
  type Paciente, type CitaMedica, type SalaEsperaEntrada, type ProcedimientoMedico, type ConsultaMedica,
} from "../api";
import {
  generarPdfCierreCaja, generarPdfInformeConsulta, generarTextoWhatsAppConsulta,
  generarPdfCotizacion, generarTextoWhatsAppCotizacion,
  abrirWhatsAppDirecto, formatearTelefonoParaWhatsApp,
  type CobroItem, type CierreCajaData, type ConsultaReportData, type CotizacionData, type CotizacionItem
} from "../utils/pdfReports";
import DocumentoPreviewModal, { type DocumentoVisorPayload } from "./DocumentoPreviewModal";

type Pagina = "general" | "pacientes" | "historias" | "laboratorio" | "procedimientos" | "sala-espera" | "agenda" | "canal-endemico" | "financiero" | "configuracion";
type RolVista = "MEDICO" | "SECRETARIA";

const NAV: { id: Pagina; label: string; Icon: (p: { size?: number }) => React.ReactNode; roles?: RolVista[] }[] = [
  { id: "general", label: "Vista General", Icon: IconCustomize },
  { id: "pacientes", label: "Gestión de Pacientes", Icon: IconUsers },
  { id: "historias", label: "Historias Clínicas", Icon: IconFileText },
  { id: "laboratorio", label: "Red Laboratorios & Inbox", Icon: IconPrescription },
  { id: "procedimientos", label: "Procedimientos & Cotizador", Icon: IconPrescription },
  { id: "sala-espera", label: "Sala de Espera & Caja", Icon: IconHourglass },
  { id: "agenda", label: "Agenda Médica & Calendario", Icon: IconCalendar },
  { id: "canal-endemico", label: "Canal Endémico", Icon: IconChart, roles: ["MEDICO"] },
  { id: "financiero", label: "Resúmenes Financieros", Icon: IconCard, roles: ["MEDICO"] },
  { id: "configuracion", label: "Configuración & Perfil", Icon: IconCustomize, roles: ["MEDICO"] },
];

const hoy = () => new Date().toISOString().slice(0, 10);

/** Fecha real de una consulta para mostrar en pantalla. El backend solo devuelve `fechaHora`
 * (nunca `fechaConsulta` — ese campo ni existe en la entidad real); si se usaba únicamente
 * `fechaConsulta`, toda consulta cargada del historial mostraba la fecha de HOY en vez de la
 * fecha real en que ocurrió (hallazgo real: 6 meses de historial mostrando la misma fecha). */
function fechaDeConsulta(c: { fechaHora?: string; fechaConsulta?: string }): string {
  const raw = c.fechaHora || c.fechaConsulta;
  return raw ? raw.slice(0, 10) : hoy();
}

const MODO_CLASICO_KEY = "aurora_mediclinic_modo_clasico"; // preferencia visual, no datos de negocio — se deja global a propósito

// Todo lo demás guardado en localStorage SÍ es específico de un médico (perfil, cierres de caja,
// cotizaciones, turnos de sala de espera...) — la clave DEBE llevar el tenantId, si no, cuando dos
// médicos distintos usan el mismo navegador (una laptop compartida, una demo), el segundo hereda
// los datos guardados del primero (hallazgo real: "inicié sesión como danielrein420 y me abrió el
// perfil del Doctor Mario").
const claveFechasBloqueadas = (tenantId: number) => `aurora_mediclinic_fechas_bloqueadas_${tenantId}`;
const claveHistorialCierres = (tenantId: number) => `aurora_mediclinic_historial_cierres_${tenantId}`;
const claveConfigPerfil = (tenantId: number) => `aurora_mediclinic_config_perfil_${tenantId}`;
export const claveCotizaciones = (tenantId: number) => `aurora_mediclinic_cotizaciones_${tenantId}`;
export const claveSalaEsperaTurnos = (tenantId: number) => `aurora_mediclinic_sala_espera_turnos_v2_${tenantId}`;

export interface TurnoSalaEspera {
  id: string;
  turnoNumero: number;
  codigoTurno: string;
  pacienteId: number | null;
  pacienteNombre: string;
  pacienteCedula: string;
  pacienteTelefono: string;
  horaLlegada: string;
  fecha: string;
  motivo: string;
  consultorio: string;
  estado: "EN_ESPERA" | "EN_CONSULTA" | "ATENDIDO" | "CANCELADO";
  estadoPago: "PAGADO" | "PENDIENTE" | "EXONERADO" | "PARCIAL";
  metodoPago?: string;
  moneda?: "USD" | "VES" | "COP";
  montoCobrado?: number;
  montoUSD?: number;
  montoVES?: number;
  montoCOP?: number;
  referenciaPago?: string;
}

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
                {configPerfil.doctorNombre || "Médico Titular"}
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
    // Solo el PIN que el médico configuró en Configuración & Perfil abre este panel — el valor
    // por defecto ("1234") es únicamente el que trae de fábrica un tenant nuevo hasta que el
    // médico lo cambie, no un atajo permanente. Nunca aceptar "admin"/"doctor" como comodín.
    const esperada = (claveCorrecta || "1234").trim();
    if (input === esperada) {
      onExito();
    } else {
      setError("Contraseña o PIN incorrecto. Intenta de nuevo.");
      setClave("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md animate-fade-smooth">
      <div className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#071a2e] border border-slate-200 dark:border-teal-500/30 text-slate-900 dark:text-white space-y-5 shadow-2xl transition-colors duration-300 animate-modal-enter">
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
  const [inboxLabPendientes, setInboxLabPendientes] = useState(0);

  const cargarContadorLab = () => {
    contadorInboxLaboratorio(tenantId)
      .then((res: { pendientes: number }) => setInboxLabPendientes(res.pendientes))
      .catch(() => {});
  };
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const [pagina, setPagina] = useState<Pagina>("general");
  
  // Estado del perfil activo: siempre null al montar para mostrar la pantalla de selección estilo Netflix
  const [perfilActivo, setPerfilActivo] = useState<RolVista | null>(null);

  const [rolActivo, setRolActivo] = useState<RolVista>("MEDICO");
  const [modalClaveDoctor, setModalClaveDoctor] = useState(false);
  const [accionPendienteDoctor, setAccionPendienteDoctor] = useState<(() => void) | null>(null);

  // Configuración de perfil y tasas persistente — SIEMPRE bajo una clave con el tenantId (ver nota
  // junto a claveConfigPerfil): sin esto, el perfil guardado de un médico se le mostraba a
  // cualquier otro que iniciara sesión después en el mismo navegador.
  const configPerfilPorDefecto = () => ({
    doctorNombre: user?.nombre || "Médico Titular",
    secretariaNombre: "Recepción / Asistente",
    especialidad: "Medicina General / Especialista",
    matriculaMPPS: "",
    colegioMedicos: "",
    clinicaNombre: user?.empresa || "Mi Consultorio Médico",
    tasaBCV: 56.40,
    tasaCOP: 4200,
    claveDoctor: "1234",
  });

  const [configPerfil, setConfigPerfil] = useState(() => {
    try {
      const raw = localStorage.getItem(claveConfigPerfil(tenantId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return configPerfilPorDefecto();
  });

  const guardarConfigPerfil = (nuevaConfig: any) => {
    setConfigPerfil(nuevaConfig);
    try { localStorage.setItem(claveConfigPerfil(tenantId), JSON.stringify(nuevaConfig)); } catch {}
  };

  const seleccionarDoctor = () => {
    setModalClaveDoctor(true);
    setAccionPendienteDoctor(() => () => {
      setRolActivo("MEDICO");
      setPerfilActivo("MEDICO");
      setPagina("general");
    });
  };

  const seleccionarSecretaria = () => {
    setRolActivo("SECRETARIA");
    setPerfilActivo("SECRETARIA");
    setPagina("sala-espera");
  };

  const cerrarSesionPerfil = () => {
    setPerfilActivo(null);
    try { localStorage.removeItem(PERFIL_ACTIVO_KEY); } catch {}
  };

  const handleSalirAlHub = () => {
    setPerfilActivo(null);
    try { localStorage.removeItem(PERFIL_ACTIVO_KEY); } catch {}
    onSalir();
  };

  const intentarNavegar = (p: Pagina) => {
    const esProtegida = p === "financiero" || p === "configuracion";
    // Si el usuario autenticado es el Doctor, tiene acceso total sin pedir PIN
    if (perfilActivo !== "MEDICO" && rolActivo === "SECRETARIA" && esProtegida) {
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
    // Si el Doctor está en su perfil autenticado, cambia de vista libremente sin pedir PIN
    if (perfilActivo === "MEDICO") {
      setRolActivo(nuevoRol);
      return;
    }
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
  const [visorDocumento, setVisorDocumento] = useState<DocumentoVisorPayload | null>(null);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoMedico[] | null>(null);
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null);

  const claveCobrosLocales = () => `aurora_mediclinic_cobros_locales_${tenantId}_${hoy()}`;

  const [cobrosLocales, setCobrosLocales] = useState<CobroItem[]>(() => {
    try {
      const raw = localStorage.getItem(claveCobrosLocales());
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [historialCierres, setHistorialCierres] = useState<CierreCajaData[]>(() => {
    try {
      const raw = localStorage.getItem(claveHistorialCierres(tenantId));
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
    try { localStorage.setItem(claveCobrosLocales(), JSON.stringify(cobrosLocales)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrosLocales, tenantId]);

  useEffect(() => {
    try { localStorage.setItem(claveHistorialCierres(tenantId), JSON.stringify(historialCierres)); } catch {}
  }, [historialCierres, tenantId]);

  const agregarCobroLocal = (item: CobroItem) => {
    setCobrosLocales((prev) => [item, ...prev]);
  };

  const eliminarCobroLocal = (index: number) => {
    setCobrosLocales((prev) => {
      const nuevas = prev.filter((_, i) => i !== index);
      try { localStorage.setItem(claveCobrosLocales(), JSON.stringify(nuevas)); } catch {}
      return nuevas;
    });
    setToastTasa("✓ Cobro eliminado de la auditoría.");
    setTimeout(() => setToastTasa(null), 3000);
  };

  const limpiarCobrosLocales = () => {
    setCobrosLocales([]);
    try { localStorage.removeItem(claveCobrosLocales()); } catch {}
    setToastTasa("✓ Caja de hoy reiniciada correctamente.");
    setTimeout(() => setToastTasa(null), 3000);
  };

  const agregarCierreAuditado = (cierre: CierreCajaData) => {
    setHistorialCierres((prev) => [cierre, ...prev]);
  };

  const eliminarCierreAuditado = (index: number) => {
    setHistorialCierres((prev) => {
      const nuevas = prev.filter((_, i) => i !== index);
      try { localStorage.setItem(claveHistorialCierres(tenantId), JSON.stringify(nuevas)); } catch {}
      return nuevas;
    });
    setToastTasa("✓ Cierre auditado eliminado del historial.");
    setTimeout(() => setToastTasa(null), 3000);
  };

  const limpiarHistorialCierres = () => {
    setHistorialCierres([]);
    try { localStorage.removeItem(claveHistorialCierres(tenantId)); } catch {}
    setToastTasa("✓ Historial de auditorías vaciado.");
    setTimeout(() => setToastTasa(null), 3000);
  };

  const recargarTodo = () => {
    cargarContadorLab();
    listarPacientes(tenantId).then(setPacientes).catch(() => setPacientes([]));
    listarCitasDelDia(tenantId, hoy()).then(setCitasHoy).catch(() => setCitasHoy([]));
    listarSalaEspera(tenantId).then(setSalaEspera).catch(() => setSalaEspera([]));
    listarProcedimientos(tenantId).then(setProcedimientos).catch(() => setProcedimientos([]));
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
          onSalir={handleSalirAlHub}
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
            const esProtegida = perfilActivo !== "MEDICO" && rolActivo === "SECRETARIA" && (n.id === "financiero" || n.id === "configuracion");

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
                {n.id === "laboratorio" && inboxLabPendientes > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                      {inboxLabPendientes}
                    </span>
                  )}
                  {esProtegida && (
                  <span title="Requiere clave del Doctor" className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0 ml-1 border border-amber-500/20">
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
            onClick={handleSalirAlHub}
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
            {perfilActivo === "MEDICO" && (
              <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/10 text-xs">
                <button
                  onClick={() => intentarCambiarRol("MEDICO")}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    rolActivo === "MEDICO" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"
                  }`}
                  title="Cambiar a vista de Médico Titular"
                >
                  <IconStethoscope size={13} />
                  <span>Médico</span>
                </button>
                <button
                  onClick={() => intentarCambiarRol("SECRETARIA")}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    rolActivo === "SECRETARIA" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"
                  }`}
                  title="Supervisar vista de Secretaría y Sala de Espera"
                >
                  <IconFileText size={13} />
                  <span>Secretaria</span>
                </button>
              </div>
            )}

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

            {inboxLabPendientes > 0 && (
              <button
                type="button"
                onClick={() => intentarNavegar("laboratorio")}
                className="px-3.5 py-1.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-1.5 animate-pulse cursor-pointer shadow-xs transition-all"
                title="Exámenes de laboratorio pendientes de revisión médica"
              >
                <span>🔬</span>
                <span>Inbox: {inboxLabPendientes} {inboxLabPendientes === 1 ? "examen" : "exámenes"}</span>
              </button>
            )}
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

        <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <div key={pagina} className="animate-tab-enter space-y-6">
            {pagina === "general" && (
              <VistaGeneral
                tenantId={tenantId}
                pacientes={pacientes}
                citasHoy={citasHoy}
                salaEspera={salaEspera}
                procedimientos={procedimientos}
                ingresosHoy={ingresosHoy}
                onNavegar={setPagina}
                onSeleccionarPaciente={(id, destino) => {
                  setPacienteSeleccionadoId(id);
                  setPagina(destino);
                }}
              />
            )}
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
                onVerDocumento={setVisorDocumento}
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
                onVerDocumento={setVisorDocumento}
              />
            )}
            {pagina === "sala-espera" && (
              <SalaEspera
                tenantId={tenantId}
                pacientes={pacientes}
                entradas={salaEspera}
                cobrosLocales={cobrosLocales}
                onAgregarCobro={agregarCobroLocal}
                onAgregarCierre={agregarCierreAuditado}
                onCambio={recargarTodo}
                config={configPerfil}
                onNavegar={setPagina}
                onSeleccionarPacienteParaConsulta={(id) => {
                  setPacienteSeleccionadoId(id);
                  setPagina("historias");
                }}
                onVerDocumento={setVisorDocumento}
              />
            )}
            {pagina === "laboratorio" && (
            <InboxLaboratorioMedico
              tenantId={tenantId}
              medicoNombre={configPerfil.doctorNombre}
              onActualizarContador={cargarContadorLab}
            />
          )}
          {pagina === "agenda" && <AgendaMedica tenantId={tenantId} pacientes={pacientes} citasHoy={citasHoy} onCambio={recargarTodo} />}
            {pagina === "canal-endemico" && <CanalEndemico modo="medico" clinicaNombre={configPerfil.clinicaNombre} doctorNombre={configPerfil.doctorNombre} />}
            {pagina === "financiero" && (
              <ResumenesFinancieros
                ingresosHoy={ingresosHoy}
                citasHoy={citasHoy}
                cobrosLocales={cobrosLocales}
                historialCierres={historialCierres}
                config={configPerfil}
                rol={rolActivo}
                onEliminarCobro={eliminarCobroLocal}
                onLimpiarCobros={limpiarCobrosLocales}
                onEliminarCierre={eliminarCierreAuditado}
                onLimpiarCierres={limpiarHistorialCierres}
                onVerDocumento={setVisorDocumento}
              />
            )}
            {pagina === "configuracion" && <Configuracion config={configPerfil} onGuardar={guardarConfigPerfil} user={user} />}
          </div>
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

      {/* ── MODAL VISOR & EDITOR DE DOCUMENTO OFICIAL ── */}
      {visorDocumento && (
        <DocumentoPreviewModal
          payload={visorDocumento}
          onClose={() => setVisorDocumento(null)}
        />
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
// MOTOR DE BÚSQUEDA INTELIGENTE: BÚSQUEDA UNIFICADA POR NOMBRE, CÉDULA, HC O TELÉFONO
// ══════════════════════════════════════════════════════════════════════════
function normalizarTextoBusqueda(texto?: string | null): string {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function coincidePaciente(p: Paciente, query: string): boolean {
  if (!query || !query.trim()) return true;
  const qNorm = normalizarTextoBusqueda(query);
  if (!qNorm) return true;

  const qDigits = qNorm.replace(/\D/g, "");

  const nombreComp = normalizarTextoBusqueda(p.nombreCompleto);
  const nombres = normalizarTextoBusqueda(p.nombres);
  const apellidos = normalizarTextoBusqueda(p.apellidos);
  const cedula = normalizarTextoBusqueda(p.identificacion);
  const cedulaDigits = cedula.replace(/\D/g, "");
  const telefono = normalizarTextoBusqueda(p.telefono);
  const numHistoria = `hc-2026-${String(p.id).padStart(4, "0")}`;
  const numHistoriaNorm = normalizarTextoBusqueda(numHistoria);

  // 1. Coincidencia directa en nombre completo, nombres o apellidos
  if (nombreComp.includes(qNorm) || nombres.includes(qNorm) || apellidos.includes(qNorm)) {
    return true;
  }

  // 2. Coincidencia por tokens de palabras (ej. "carlos gomez" o "medina niccolle")
  const tokens = qNorm.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const todosTokensEnNombre = tokens.every(
      (tok) => nombreComp.includes(tok) || cedula.includes(tok)
    );
    if (todosTokensEnNombre) return true;
  }

  // 3. Coincidencia en cédula (con o sin 'V-', '.', '-')
  if (cedula.includes(qNorm)) return true;
  if (qDigits && cedulaDigits && (cedulaDigits.includes(qDigits) || qDigits.includes(cedulaDigits))) {
    return true;
  }

  // 4. Coincidencia en número de expediente o ID
  if (numHistoriaNorm.includes(qNorm) || String(p.id) === qDigits) {
    return true;
  }

  // 5. Coincidencia en teléfono
  if (telefono.includes(qNorm)) {
    return true;
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════════
// VISTA GENERAL / DASHBOARD (SINCRONIZACIÓN EN TIEMPO REAL)
// ══════════════════════════════════════════════════════════════════════════
function VistaGeneral({
  tenantId,
  pacientes,
  citasHoy,
  salaEspera,
  procedimientos,
  ingresosHoy,
  onNavegar,
  onSeleccionarPaciente,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  citasHoy: CitaMedica[] | null;
  salaEspera: SalaEsperaEntrada[] | null;
  procedimientos: ProcedimientoMedico[] | null;
  ingresosHoy: number | null;
  onNavegar: (p: Pagina) => void;
  onSeleccionarPaciente?: (id: number, destino: Pagina) => void;
}) {
  const [busquedaRapida, setBusquedaRapida] = useState("");

  const pacientesFiltradosRapidos = useMemo(() => {
    if (!busquedaRapida.trim()) return [];
    return (pacientes || []).filter((p) => coincidePaciente(p, busquedaRapida));
  }, [pacientes, busquedaRapida]);

  // Cargar turnos y cotizaciones en tiempo real desde el almacenamiento aislado por tenant
  const [turnosVivos, setTurnosVivos] = useState<TurnoSalaEspera[]>(() => {
    try {
      const raw = localStorage.getItem(claveSalaEsperaTurnos(tenantId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const [cotizacionesVivas, setCotizacionesVivas] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(claveCotizaciones(tenantId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Efecto para escuchar cambios de storage o re-render
  useEffect(() => {
    const refrescarDatos = () => {
      try {
        const rawT = localStorage.getItem(claveSalaEsperaTurnos(tenantId));
        if (rawT) setTurnosVivos(JSON.parse(rawT));
        else setTurnosVivos([]);
        const rawC = localStorage.getItem(claveCotizaciones(tenantId));
        if (rawC) setCotizacionesVivas(JSON.parse(rawC));
        else setCotizacionesVivas([]);
      } catch {}
    };
    refrescarDatos();
    window.addEventListener("storage", refrescarDatos);
    return () => window.removeEventListener("storage", refrescarDatos);
  }, [tenantId]);

  // Cálculos en tiempo real
  const enEspera = turnosVivos.length > 0
    ? turnosVivos.filter((e) => e.estado === "EN_ESPERA" || e.estado === "EN_CONSULTA").length
    : (salaEspera || []).filter((e) => e.estado !== "FINALIZADO").length;

  const atendidosHoy = turnosVivos.length > 0
    ? turnosVivos.filter((e) => e.estado === "ATENDIDO").length
    : (citasHoy ? citasHoy.length : 0);

  const totalPacientes = pacientes ? pacientes.length : 0;
  const totalProcedimientos = (procedimientos ? procedimientos.length : 0) + cotizacionesVivas.length;

  const turnosActivosLista = turnosVivos.length > 0
    ? [...turnosVivos]
        .sort((a, b) => (a.turnoNumero || 0) - (b.turnoNumero || 0))
        .filter((t) => t.estado === "EN_ESPERA" || t.estado === "EN_CONSULTA")
    : (salaEspera || []).filter((e) => e.estado !== "FINALIZADO");

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (pacientesFiltradosRapidos.length > 0) {
      const topMatch = pacientesFiltradosRapidos[0];
      if (onSeleccionarPaciente) {
        onSeleccionarPaciente(topMatch.id, "historias");
      } else {
        onNavegar("historias");
      }
    } else {
      onNavegar("pacientes");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── CARD: MOTOR DE BÚSQUEDA INSTANTÁNEA DE PACIENTES ── */}
      <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-300/60 dark:border-white/15 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <IconSearch size={18} />
            <span>Motor de Búsqueda Instantánea de Pacientes</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-white/60 font-mono bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10">
            Búsqueda por Nombre, Cédula o Historia
          </span>
        </div>

        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Buscar paciente por nombre (ej. Carlos, Niccolle), cédula (ej. 10987654) o historia..."
              value={busquedaRapida}
              onChange={(e) => setBusquedaRapida(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-inner"
            />
            {busquedaRapida && (
              <button
                type="button"
                onClick={() => setBusquedaRapida("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                title="Limpiar"
              >
                <IconClose size={15} />
              </button>
            )}
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

        {/* RESULTADOS EN VIVO DE LA BÚSQUEDA */}
        {busquedaRapida.trim().length > 0 && (
          <div className="pt-2 space-y-2 border-t border-slate-200/80 dark:border-white/10 animate-fade-in">
            <div className="text-[11px] font-bold text-slate-500 dark:text-white/60 flex items-center justify-between">
              <span>Resultados encontrados ({pacientesFiltradosRapidos.length}):</span>
              <button
                type="button"
                onClick={() => setBusquedaRapida("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-[10px] cursor-pointer"
              >
                Limpiar búsqueda ✕
              </button>
            </div>

            {pacientesFiltradosRapidos.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-center text-xs text-slate-500 dark:text-white/50 space-y-2">
                <p>No se encontró ningún paciente con: <strong className="text-slate-800 dark:text-white">"{busquedaRapida}"</strong></p>
                <button
                  type="button"
                  onClick={() => onNavegar("pacientes")}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                >
                  + Registrar este Paciente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {pacientesFiltradosRapidos.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-teal-500/50 shadow-xs flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {p.nombreCompleto}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-white/60 font-mono mt-0.5">
                          <span className="text-sky-600 dark:text-sky-400 font-bold">C.I: {p.identificacion}</span>
                          <span>·</span>
                          <span>HC-2026-{String(p.id).padStart(4, "0")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onSeleccionarPaciente ? onSeleccionarPaciente(p.id, "historias") : onNavegar("historias")}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-300 font-bold text-[11px] transition-colors cursor-pointer"
                          title="Abrir Historia Clínica"
                        >
                          🩺 Historia
                        </button>
                        <button
                          type="button"
                          onClick={() => onSeleccionarPaciente ? onSeleccionarPaciente(p.id, "pacientes") : onNavegar("pacientes")}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold text-[11px] transition-colors cursor-pointer"
                          title="Ver Ficha Completa"
                        >
                          👤 Ficha
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
            Turnos activos hoy
          </div>
        </div>

        {/* Card 2: PACIENTES ATENDIDOS HOY (Borde azul / cyan) */}
        <div
          onClick={() => onNavegar("sala-espera")}
          className="apple-glass rounded-2xl p-4 sm:p-5 border-l-4 border-l-sky-500 border-slate-300/60 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">
            PACIENTES ATENDIDOS HOY
          </div>
          <div className="text-3xl font-black text-sky-500 font-['Outfit'] mt-1">
            {String(atendidosHoy)}
          </div>
          <div className="text-[11px] text-sky-600/80 dark:text-sky-400/80 font-medium mt-1">
            Consultas completadas
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
            {String(totalPacientes)}
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
            {String(totalProcedimientos)}
          </div>
          <div className="text-[11px] text-purple-600/80 dark:text-purple-400/80 font-medium mt-1">
            Cotizaciones y catálogo
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
        {/* Sala de Espera Activa */}
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sala de Espera (Turnos Activos)</h4>
            <button onClick={() => onNavegar("sala-espera")} className="text-teal-600 dark:text-teal-400 text-xs font-bold cursor-pointer">Ver Sala →</button>
          </div>
          {turnosActivosLista.length === 0 ? (
            <p className="text-xs text-slate-400">No hay pacientes esperando en este momento.</p>
          ) : (
            <div className="space-y-2">
              {turnosActivosLista.slice(0, 4).map((item: any, idx: number) => {
                const nombre = item.pacienteNombre || item.paciente?.nombreCompleto || "Paciente";
                const codigo = item.codigoTurno || `#${idx + 1}`;
                const hora = item.horaLlegada || "Hoy";
                const estado = item.estado || "EN_ESPERA";
                return (
                  <div key={item.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/60 dark:bg-white/5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold font-mono text-[11px]">{codigo}</span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{nombre}</div>
                        <div className="text-[10px] text-slate-500">{hora} · {item.motivo || "Consulta General"}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estado === "EN_CONSULTA" ? "bg-sky-500/15 text-sky-600" : "bg-amber-500/15 text-amber-600"}`}>
                      {estado.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas Citas de Hoy */}
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
    const q = busqueda.trim();
    if (!q) return pacientes || [];
    return (pacientes || []).filter((p) => coincidePaciente(p, q));
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
  onVerDocumento,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  config: any;
  rol: RolVista;
  pacienteInicialId?: number | null;
  onVerDocumento?: (payload: DocumentoVisorPayload) => void;
}) {
  const [pacienteId, setPacienteId] = useState<number | "">(() => {
    if (pacienteInicialId) return pacienteInicialId;
    if (pacientes && pacientes.length > 0) return pacientes[0].id;
    return "";
  });
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [historial, setHistorial] = useState<ConsultaMedica[] | null>(null);
  const [consultaDetalle, setConsultaDetalle] = useState<ConsultaMedica | null>(null);
  const [consultaSeleccionadaFicha, setConsultaSeleccionadaFicha] = useState<ConsultaMedica | null>(null);

  const [form, setForm] = useState({
    motivoConsulta: "",
    talla: "1.75",
    peso: "70.0",
    observacionFisica: "",
    evolucionClinica: "",
    anotacionesPrivadas: "",
    descripcionDiagnostico: "",
    diagnosticoPrincipalCIE10: "",
    planTratamiento: "",
    proximaCita: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const dispararToast = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
  };

  useEffect(() => {
    if (pacienteInicialId) {
      setPacienteId(pacienteInicialId);
    } else if (!pacienteId && pacientes && pacientes.length > 0) {
      setPacienteId(pacientes[0].id);
    }
  }, [pacienteInicialId, pacientes]);

  useEffect(() => {
    setConsultaSeleccionadaFicha(null);
  }, [pacienteId]);

  const pacienteSeleccionado = useMemo(() => {
    if (!pacienteId && pacientes && pacientes.length > 0) return pacientes[0];
    return (pacientes || []).find((p) => p.id === Number(pacienteId)) || null;
  }, [pacientes, pacienteId]);

  useEffect(() => {
    if (!pacienteSeleccionado) {
      setHistorial(null);
      return;
    }
    historialConsultasPaciente(Number(pacienteSeleccionado.id))
      .then(setHistorial)
      .catch(() => setHistorial([]));
  }, [pacienteSeleccionado]);

  const handleBuscarPaciente = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = busquedaPaciente.trim();
    if (!query || !pacientes) return;
    const encontrado = pacientes.find((p) => coincidePaciente(p, query));
    if (encontrado) {
      setPacienteId(encontrado.id);
      setBusquedaPaciente("");
      setError(null);
      dispararToast(`✓ Expediente cargado: ${encontrado.nombreCompleto}`);
    } else {
      setError(`No se encontró ningún paciente con: "${busquedaPaciente}"`);
      setTimeout(() => setError(null), 3500);
    }
  };

  const limpiarFormulario = () => {
    setForm({
      motivoConsulta: "",
      talla: "1.75",
      peso: "70.0",
      observacionFisica: "",
      evolucionClinica: "",
      anotacionesPrivadas: "",
      descripcionDiagnostico: "",
      diagnosticoPrincipalCIE10: "",
      planTratamiento: "",
      proximaCita: "",
    });
    setError(null);
  };

  const construirReportData = (): ConsultaReportData | null => {
    if (!pacienteSeleccionado) return null;
    const pKg = parseFloat(form.peso) || 70;
    const tM = parseFloat(form.talla) || 1.75;
    const imcCalc = (pKg / (tM * tM)).toFixed(1);

    const esForaneo =
      pacienteSeleccionado.tipoOrigen === "Foráneo" ||
      pacienteSeleccionado.tipoOrigen === "FORANEO" ||
      (pacienteSeleccionado.origen && pacienteSeleccionado.origen.includes("Foráneo"));

    return {
      clinicaNombre: config.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config.doctorNombre || "Médico Titular",
      especialidad: config.especialidad || "Dermatología / Medicina General",
      matriculaMPPS: config.matriculaMPPS || "109842",
      colegioMedicos: config.colegioMedicos || "5421",
      paciente: {
        expediente: `HC-2026-${String(pacienteSeleccionado.id).padStart(4, "0")}`,
        nombreCompleto: pacienteSeleccionado.nombreCompleto,
        identificacion: pacienteSeleccionado.identificacion,
        edad: pacienteSeleccionado.fechaNacimiento
          ? calcularEdadAnios(pacienteSeleccionado.fechaNacimiento)
          : pacienteSeleccionado.edad || 34,
        telefono: pacienteSeleccionado.telefono || "No registrado",
        email: pacienteSeleccionado.email || "",
        origen: esForaneo ? `Foráneo (${pacienteSeleccionado.ciudadOrigen || "Cúcuta"})` : `Local (${pacienteSeleccionado.ciudadOrigen || "San Cristóbal"})`,
        fechaConsulta: hoy(),
      },
      signosVitales: {
        ta: "120/80",
        fc: "75",
        fr: "18",
        temp: "36.8",
        peso: `${form.peso || "70"} kg`,
        talla: `${form.talla || "1.75"} m`,
        imc: imcCalc,
        satO2: "99%",
      },
      motivoConsulta: form.motivoConsulta || "Control de rutina y evolución clínica",
      evolucionClinica: form.evolucionClinica,
      diagnosticoCIE10: form.descripcionDiagnostico || "Evaluación Clínica General",
      planTratamiento: form.planTratamiento,
      proximaCita: form.proximaCita,
    };
  };

  const ejecutarGuardado = async () => {
    if (!pacienteSeleccionado) {
      setError("Por favor selecciona un paciente");
      return null;
    }
    if (!form.motivoConsulta.trim()) {
      setError("El motivo de consulta es obligatorio");
      return null;
    }
    if (!form.descripcionDiagnostico.trim()) {
      setError("El diagnóstico clínico es obligatorio");
      return null;
    }

    setError(null);
    setGuardando(true);
    try {
      const res = await registrarConsulta(tenantId, Number(pacienteSeleccionado.id), {
        motivoConsulta: form.motivoConsulta,
        descripcionDiagnostico: form.descripcionDiagnostico,
        diagnosticoPrincipalCIE10: form.diagnosticoPrincipalCIE10 || undefined,
        planTratamiento: form.planTratamiento,
        anotacionesPrivadas: form.anotacionesPrivadas,
        talla: form.talla,
        peso: form.peso,
        observacionFisica: form.observacionFisica,
        evolucionClinica: form.evolucionClinica,
      });

      // Refrescar historial
      const nuevoHistorial = await historialConsultasPaciente(Number(pacienteSeleccionado.id));
      setHistorial(nuevoHistorial);

      setMensajeExito("¡Consulta médica registrada con éxito en el expediente!");
      setTimeout(() => setMensajeExito(null), 3500);

      const repData = construirReportData();
      return repData;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la consulta");
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarSolo = async (e: React.FormEvent) => {
    e.preventDefault();
    await ejecutarGuardado();
  };

  const handleGuardarYGenerarPdf = async () => {
    const data = await ejecutarGuardado();
    if (data) {
      if (onVerDocumento) {
        onVerDocumento({ tipo: "INFORME_MEDICO", data });
      } else {
        generarPdfInformeConsulta(data);
      }
    }
  };

  const handleDescargarPdfConsulta = (c: ConsultaMedica) => {
    if (!pacienteSeleccionado) return;
    const esForaneo =
      pacienteSeleccionado.tipoOrigen === "Foráneo" ||
      pacienteSeleccionado.tipoOrigen === "FORANEO" ||
      (pacienteSeleccionado.origen && pacienteSeleccionado.origen.includes("Foráneo"));

    const data: ConsultaReportData = {
      clinicaNombre: config.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config.doctorNombre || "Médico Titular",
      especialidad: config.especialidad || "Dermatología / Medicina General",
      matriculaMPPS: config.matriculaMPPS || "109842",
      colegioMedicos: config.colegioMedicos || "5421",
      paciente: {
        expediente: `HC-2026-${String(pacienteSeleccionado.id).padStart(4, "0")}`,
        nombreCompleto: pacienteSeleccionado.nombreCompleto,
        identificacion: pacienteSeleccionado.identificacion,
        edad: pacienteSeleccionado.fechaNacimiento
          ? calcularEdadAnios(pacienteSeleccionado.fechaNacimiento)
          : pacienteSeleccionado.edad || 34,
        telefono: pacienteSeleccionado.telefono || "No registrado",
        email: pacienteSeleccionado.email || "",
        origen: esForaneo ? `Foráneo (${pacienteSeleccionado.ciudadOrigen || "Cúcuta"})` : `Local (${pacienteSeleccionado.ciudadOrigen || "San Cristóbal"})`,
        fechaConsulta: fechaDeConsulta(c),
      },
      signosVitales: {
        ta: "120/80",
        fc: "75",
        fr: "18",
        temp: "36.8",
        peso: "70 kg",
        talla: "1.75 m",
        imc: "22.8",
        satO2: "99%",
      },
      motivoConsulta: c.motivoConsulta || "Consulta Médica",
      evolucionClinica: "Consulta registrada en el sistema médico Mediclinic Pro.",
      diagnosticoCIE10: c.descripcionDiagnostico || "Evaluación Médica",
      planTratamiento: c.planTratamiento || "Indicaciones según prescripción.",
      proximaCita: undefined,
    };
    if (onVerDocumento) {
      onVerDocumento({ tipo: "INFORME_MEDICO", data });
    } else {
      generarPdfInformeConsulta(data);
    }
  };

  const handleEnviarWhatsAppConsulta = (c: ConsultaMedica) => {
    if (!pacienteSeleccionado) return;
    const esForaneo =
      pacienteSeleccionado.tipoOrigen === "Foráneo" ||
      pacienteSeleccionado.tipoOrigen === "FORANEO" ||
      (pacienteSeleccionado.origen && pacienteSeleccionado.origen.includes("Foráneo"));

    const data: ConsultaReportData = {
      clinicaNombre: config.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config.doctorNombre || "Médico Titular",
      especialidad: config.especialidad || "Dermatología / Medicina General",
      matriculaMPPS: config.matriculaMPPS || "109842",
      colegioMedicos: config.colegioMedicos || "5421",
      paciente: {
        expediente: `HC-2026-${String(pacienteSeleccionado.id).padStart(4, "0")}`,
        nombreCompleto: pacienteSeleccionado.nombreCompleto,
        identificacion: pacienteSeleccionado.identificacion,
        edad: pacienteSeleccionado.fechaNacimiento
          ? calcularEdadAnios(pacienteSeleccionado.fechaNacimiento)
          : pacienteSeleccionado.edad || 34,
        telefono: pacienteSeleccionado.telefono || "No registrado",
        email: pacienteSeleccionado.email || "",
        origen: esForaneo ? `Foráneo (${pacienteSeleccionado.ciudadOrigen || "Cúcuta"})` : `Local (${pacienteSeleccionado.ciudadOrigen || "San Cristóbal"})`,
        fechaConsulta: fechaDeConsulta(c),
      },
      signosVitales: {
        ta: "120/80",
        fc: "75",
        fr: "18",
        temp: "36.8",
        peso: "70 kg",
        talla: "1.75 m",
        imc: "22.8",
        satO2: "99%",
      },
      motivoConsulta: c.motivoConsulta || "Consulta Médica",
      evolucionClinica: "Consulta registrada en el sistema médico Mediclinic Pro.",
      diagnosticoCIE10: c.descripcionDiagnostico || "Evaluación Médica",
      planTratamiento: c.planTratamiento || "Indicaciones según prescripción.",
      proximaCita: undefined,
    };
    if (onVerDocumento) {
      onVerDocumento({ tipo: "INFORME_MEDICO", data });
    } else {
      generarPdfInformeConsulta(data);
      const texto = generarTextoWhatsAppConsulta(data);
      abrirWhatsAppDirecto(data.paciente.telefono, texto);
      dispararToast("📄 PDF descargado en tu equipo. Adjúntalo con el clip (📎) en WhatsApp.");
    }
  };

  const handleEnviarCorreoConsulta = (c: ConsultaMedica) => {
    if (!pacienteSeleccionado) return;
    const esForaneo =
      pacienteSeleccionado.tipoOrigen === "Foráneo" ||
      pacienteSeleccionado.tipoOrigen === "FORANEO" ||
      (pacienteSeleccionado.origen && pacienteSeleccionado.origen.includes("Foráneo"));

    const data: ConsultaReportData = {
      clinicaNombre: config.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config.doctorNombre || "Médico Titular",
      especialidad: config.especialidad || "Dermatología / Medicina General",
      matriculaMPPS: config.matriculaMPPS || "109842",
      colegioMedicos: config.colegioMedicos || "5421",
      paciente: {
        expediente: `HC-2026-${String(pacienteSeleccionado.id).padStart(4, "0")}`,
        nombreCompleto: pacienteSeleccionado.nombreCompleto,
        identificacion: pacienteSeleccionado.identificacion,
        edad: pacienteSeleccionado.fechaNacimiento
          ? calcularEdadAnios(pacienteSeleccionado.fechaNacimiento)
          : pacienteSeleccionado.edad || 34,
        telefono: pacienteSeleccionado.telefono || "No registrado",
        email: pacienteSeleccionado.email || "",
        origen: esForaneo ? `Foráneo (${pacienteSeleccionado.ciudadOrigen || "Cúcuta"})` : `Local (${pacienteSeleccionado.ciudadOrigen || "San Cristóbal"})`,
        fechaConsulta: fechaDeConsulta(c),
      },
      signosVitales: {
        ta: "120/80",
        fc: "75",
        fr: "18",
        temp: "36.8",
        peso: "70 kg",
        talla: "1.75 m",
        imc: "22.8",
        satO2: "99%",
      },
      motivoConsulta: c.motivoConsulta || "Consulta Médica",
      evolucionClinica: "Consulta registrada en el sistema médico Mediclinic Pro.",
      diagnosticoCIE10: c.descripcionDiagnostico || "Evaluación Médica",
      planTratamiento: c.planTratamiento || "Indicaciones según prescripción.",
      proximaCita: undefined,
    };

    if (onVerDocumento) {
      onVerDocumento({ tipo: "INFORME_MEDICO", data });
    } else {
      generarPdfInformeConsulta(data);
      const to = (pacienteSeleccionado.email || "").trim();
      const subject = `Informe Médico y Prescripción - ${pacienteSeleccionado.nombreCompleto} (${data.paciente.expediente})`;
      const body = `Estimado/a ${pacienteSeleccionado.nombreCompleto},\n\n` +
        `Adjunto encontrará el informe médico correspondiente a su consulta del ${data.paciente.fechaConsulta}.\n\n` +
        `• Expediente: ${data.paciente.expediente}\n` +
        `• Diagnóstico: ${data.diagnosticoCIE10}\n` +
        `• Indicaciones / Prescripción:\n${data.planTratamiento || "Sin indicaciones adicionales"}\n\n` +
        `Atentamente,\n` +
        `${data.doctorNombre} · ${data.especialidad}\n` +
        `${data.clinicaNombre}`;

      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      dispararToast(to ? `📧 PDF generado y Gmail abierto para enviar a ${to}` : "📧 PDF generado y Gmail abierto listo para redactar");
    }
  };

  const handleEliminarConsulta = async (c: ConsultaMedica) => {
    if (!pacienteSeleccionado) return;
    const motivo = c.motivoConsulta || "Consulta";
    const fecha = fechaDeConsulta(c);
    if (!confirm(`¿Estás seguro de eliminar la consulta del ${fecha} ("${motivo}")? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await eliminarConsulta(tenantId, Number(pacienteSeleccionado.id), Number(c.id));
      setHistorial((prev) => (prev || []).filter((item) => item.id !== c.id));
      if (consultaDetalle && consultaDetalle.id === c.id) {
        setConsultaDetalle(null);
      }
      dispararToast("✓ Consulta eliminada del historial correctamente");
    } catch (e) {
      console.error(e);
      dispararToast("Error al eliminar la consulta");
    }
  };

  return (
    <div className="space-y-5">
      {/* ── MENSAJE TOAST / ÉXITO GLOBAL ── */}
      {mensajeExito && (
        <div className="apple-glass rounded-2xl p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <IconCheck size={16} className="text-emerald-500 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* ── ALERTA DE ROL SECRETARÍA SI APLICA ── */}
      {rol === "SECRETARIA" && (
        <div className="apple-glass rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <IconLock size={15} />
          <span>
            <strong>Modo Recepción / Secretaría:</strong> Vista de consulta de expedientes. La edición de diagnósticos y prescripciones es reservada para el Médico Titular.
          </span>
        </div>
      )}

      {/* ── 1. BARRA SUPERIOR: SELECTOR DE PACIENTES & BÚSQUEDA POR CÉDULA ── */}
      <div className="apple-glass rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm bg-white/80 dark:bg-[#071a2e]/60 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Selector Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="flex items-center gap-2 text-slate-700 dark:text-white/90 font-bold text-xs whitespace-nowrap">
            <IconUser size={18} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span>Seleccionar Paciente:</span>
          </div>

          <div className="relative flex-1 max-w-md">
            <select
              value={pacienteSeleccionado?.id || ""}
              onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs cursor-pointer"
            >
              <option value="">— Elige un paciente de la lista —</option>
              {(pacientes || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto} (C.I: {p.identificacion})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador Rápido por Nombre o Cédula */}
        <form onSubmit={handleBuscarPaciente} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por Nombre o Cédula..."
            value={busquedaPaciente}
            onChange={(e) => setBusquedaPaciente(e.target.value)}
            className="w-full md:w-72 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-teal-500 hover:text-white dark:bg-white/10 dark:hover:bg-teal-500 text-slate-700 dark:text-white/90 text-xs font-bold border border-slate-300/80 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <IconSearch size={14} />
            <span>Buscar</span>
          </button>
        </form>
      </div>

      {/* ── 2. FICHA / BANNER RESUMEN DEL PACIENTE SELECCIONADO ── */}
      {pacienteSeleccionado ? (
        <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#071a2e]/80 border border-slate-200/80 dark:border-white/10 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Barra Vertical Izquierda de Acento Cyan */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 via-teal-500 to-emerald-500" />

          <div className="flex items-center gap-4 pl-2 min-w-0">
            {/* Avatar Icon Box */}
            <div className="w-12 h-12 rounded-2xl bg-sky-100/90 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-300 flex-shrink-0 shadow-xs">
              <IconUser size={24} />
            </div>

            {/* Datos Principales */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight truncate">
                  {pacienteSeleccionado.nombreCompleto}
                </h3>

                {pacienteSeleccionado.tipoOrigen === "Foráneo" ||
                pacienteSeleccionado.tipoOrigen === "FORANEO" ||
                (pacienteSeleccionado.origen && pacienteSeleccionado.origen.includes("Foráneo")) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300/60 dark:border-purple-500/40 text-[11px] font-bold">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                    <span>Foráneo ({pacienteSeleccionado.ciudadOrigen || "Cúcuta"})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/40 text-[11px] font-bold">
                    <span>Local ({pacienteSeleccionado.ciudadOrigen || "San Cristóbal"})</span>
                  </span>
                )}
              </div>

              {/* Fila de Metadatos */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs text-slate-600 dark:text-white/70">
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                  C.I: {pacienteSeleccionado.identificacion}
                </span>
                <span className="text-slate-300 dark:text-white/20">·</span>
                <span className="font-mono text-slate-500 dark:text-white/60">
                  Expediente: HC-2026-{String(pacienteSeleccionado.id).padStart(4, "0")}
                </span>
                <span className="text-slate-300 dark:text-white/20">·</span>
                <span>
                  Edad:{" "}
                  {pacienteSeleccionado.fechaNacimiento
                    ? `${calcularEdadAnios(pacienteSeleccionado.fechaNacimiento)} años`
                    : pacienteSeleccionado.edad
                    ? `${pacienteSeleccionado.edad} años`
                    : "34 años"}
                </span>
                <span className="text-slate-300 dark:text-white/20">·</span>
                <span>Tel: {pacienteSeleccionado.telefono || "No registrado"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 text-xs">
          Selecciona o busca un paciente para ver su ficha y gestionar su consulta.
        </div>
      )}

      {/* ── 3. WORKSPACE: HISTORIAL (FULL-WIDTH EN SECRETARIA) O DUAL (EN MEDICO) ── */}
      {pacienteSeleccionado && (
        <div className={rol === "SECRETARIA" ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"}>
          {/* ── HISTORIAL DE CONSULTAS MÉDICAS ── */}
          <div className={`${rol === "SECRETARIA" ? "w-full p-6" : "lg:col-span-12 xl:col-span-5 p-5"} apple-glass rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm bg-white/80 dark:bg-[#071a2e]/60 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <IconFileText size={18} className="text-teal-600 dark:text-teal-400" />
                <h4 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">
                  Historial de Consultas Médicas
                </h4>
              </div>
              <span className="text-xs text-slate-500 dark:text-white/50 font-mono font-bold">
                {historial?.length || 0} consulta(s) registrada(s)
              </span>
            </div>

            {/* Tabla del Historial */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-black/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                    <th className="py-2.5 px-3 whitespace-nowrap">Fecha / Hora</th>
                    <th className="py-2.5 px-3">Motivo de Consulta</th>
                    <th className="py-2.5 px-3">Diagnóstico</th>
                    {rol === "SECRETARIA" && <th className="py-2.5 px-3">Tratamiento / Rx</th>}
                    <th className="py-2.5 px-3 whitespace-nowrap">Próx. Cita</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
                  {historial === null ? (
                    <tr>
                      <td colSpan={rol === "SECRETARIA" ? 6 : 5} className="py-12 text-center text-slate-400">
                        Cargando historial de consultas…
                      </td>
                    </tr>
                  ) : historial.length === 0 ? (
                    <tr>
                      <td colSpan={rol === "SECRETARIA" ? 6 : 5} className="py-16 text-center text-slate-400 dark:text-white/40">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-500 dark:text-white/60">
                            Sin consultas registradas
                          </p>
                          <p className="text-[11px] text-slate-400/80">
                            No hay consultas clínicas registradas para este paciente todavía.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    historial.map((c) => {
                      const fechaC = fechaDeConsulta(c);
                      const isSelected = consultaSeleccionadaFicha?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setConsultaSeleccionadaFicha(c)}
                          className={`transition-all cursor-pointer ${
                            isSelected
                              ? "bg-teal-500/20 dark:bg-teal-950/70 border-l-4 border-teal-500 font-bold shadow-xs text-teal-950 dark:text-teal-100"
                              : "hover:bg-slate-100/90 dark:hover:bg-white/10"
                          }`}
                          title="Haz clic para ver la ficha continua de esta consulta"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                            {fechaC}
                          </td>
                          <td className="py-3 px-3 text-slate-800 dark:text-white/90 truncate max-w-[150px]" title={c.motivoConsulta}>
                            {c.motivoConsulta || "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-bold border border-teal-500/20 truncate block max-w-[140px]" title={c.descripcionDiagnostico}>
                              {c.descripcionDiagnostico || "Sin Dx"}
                            </span>
                          </td>
                          {rol === "SECRETARIA" && (
                            <td className="py-3 px-3 text-slate-600 dark:text-white/70 truncate max-w-[180px]" title={c.planTratamiento}>
                              {c.planTratamiento || "—"}
                            </td>
                          )}
                          <td className="py-3 px-3 font-mono text-slate-500 dark:text-white/60 whitespace-nowrap">
                            —
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                title="Descargar Informe PDF"
                                onClick={() => handleDescargarPdfConsulta(c)}
                                className="w-7 h-7 rounded-lg bg-teal-500/10 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-300 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <IconFileText size={13} />
                              </button>
                              <button
                                type="button"
                                title="Enviar por WhatsApp"
                                onClick={() => handleEnviarWhatsAppConsulta(c)}
                                className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <IconWhatsApp size={14} />
                              </button>
                              <button
                                type="button"
                                title="Enviar por Correo Electrónico (Gmail)"
                                onClick={() => handleEnviarCorreoConsulta(c)}
                                className="w-7 h-7 rounded-lg bg-sky-500/10 hover:bg-sky-600 hover:text-white text-sky-600 dark:text-sky-400 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <IconMail size={14} />
                              </button>
                              <button
                                type="button"
                                title="Ver Ficha Continua de esta Consulta"
                                onClick={() => setConsultaSeleccionadaFicha(c)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-teal-600 text-white"
                                    : "bg-teal-500/15 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-300"
                                }`}
                              >
                                <IconSearch size={13} />
                              </button>
                              {rol === "MEDICO" && (
                                <button
                                  type="button"
                                  title="Eliminar Consulta del Historial"
                                  onClick={() => handleEliminarConsulta(c)}
                                  className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <IconTrash size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: FICHA DE CONSULTA SELECCIONADA + REGISTRAR NUEVA CONSULTA ── */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-6">

            {/* 1. FICHA CONTINUA DE RESUMEN DE CONSULTA PREVIA (EXPEDIENTE DE LECTURA) */}
            {consultaSeleccionadaFicha && (
              <div className="rounded-3xl border border-teal-500/40 dark:border-teal-400/30 shadow-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden animate-fade-in">
                {/* Banner Superior Estilo Expediente Continuo */}
                <div className="bg-gradient-to-r from-teal-900/90 via-slate-900 to-slate-900 p-5 border-b border-white/10 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 font-mono font-bold text-xs flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                        <span>CONSULTA DEL {consultaSeleccionadaFicha.fechaConsulta ? consultaSeleccionadaFicha.fechaConsulta.slice(0, 10) : hoy()}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                        Expediente HC-2026-{String(pacienteSeleccionado?.id).padStart(4, "0")}
                      </span>
                    </div>
                    <h3 className="font-['Outfit'] font-black text-lg text-white tracking-wide pt-1">
                      {pacienteSeleccionado?.nombreCompleto}
                    </h3>
                    <p className="text-xs text-slate-300/80">
                      C.I: {pacienteSeleccionado?.identificacion} · Tel: {pacienteSeleccionado?.telefono || "No registrado"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsultaSeleccionadaFicha(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>✕ Cerrar Ficha</span>
                  </button>
                </div>

                {/* Cuerpo Continuo del Resumen Clínico */}
                <div className="p-6 space-y-5 text-xs">
                  {/* Flujo Narrativo: Motivo & Diagnóstico en Tira Continua */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-0.5 max-w-md">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Motivo de Consulta
                        </span>
                        <p className="text-sm font-semibold text-slate-100">
                          {consultaSeleccionadaFicha.motivoConsulta || "Evaluación Médica General"}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                          Diagnóstico Clínico (Dx)
                        </span>
                        <span className="inline-block px-3 py-1 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-200 font-bold text-xs">
                          {consultaSeleccionadaFicha.descripcionDiagnostico || "Evaluación Médica"}
                        </span>
                      </div>
                    </div>

                    {/* Pastillas de Datos Físicos continuos */}
                    {(consultaSeleccionadaFicha.talla || consultaSeleccionadaFicha.peso || consultaSeleccionadaFicha.observacionFisica) && (
                      <div className="pt-2 border-t border-white/10 flex items-center gap-2 flex-wrap text-[11px] text-slate-300">
                        <span className="text-slate-400 font-medium">Examen físico registrado:</span>
                        {consultaSeleccionadaFicha.talla && (
                          <span className="bg-sky-500/15 border border-sky-400/30 text-sky-200 px-2 py-0.5 rounded-lg font-mono">
                            Talla: {consultaSeleccionadaFicha.talla} m
                          </span>
                        )}
                        {consultaSeleccionadaFicha.peso && (
                          <span className="bg-sky-500/15 border border-sky-400/30 text-sky-200 px-2 py-0.5 rounded-lg font-mono">
                            Peso: {consultaSeleccionadaFicha.peso} kg
                          </span>
                        )}
                        {consultaSeleccionadaFicha.observacionFisica && (
                          <span className="bg-white/10 border border-white/15 text-slate-200 px-2.5 py-0.5 rounded-lg">
                            {consultaSeleccionadaFicha.observacionFisica}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Evolución y Hallazgos Clínicos Continuos */}
                  {consultaSeleccionadaFicha.evolucionClinica && (
                    <div className="border-l-3 border-teal-400 pl-3.5 py-0.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                        Evolución Clínica & Hallazgos
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                        {consultaSeleccionadaFicha.evolucionClinica}
                      </p>
                    </div>
                  )}

                  {/* Prescripción Médica / Récipe en Estilo Recetario Integrado */}
                  <div className="bg-slate-900/90 rounded-2xl p-4 border border-teal-500/20 relative space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                        <span className="font-serif italic font-bold text-sm text-teal-400">Rx</span>
                        <span>Prescripción Farmacológica / Indicaciones</span>
                      </span>
                    </div>
                    <pre className="font-mono text-xs text-emerald-200/90 whitespace-pre-wrap bg-black/40 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {consultaSeleccionadaFicha.planTratamiento || "Sin récipe farmacológico especificado en esta consulta."}
                    </pre>
                  </div>

                  {/* ── CAMPO ROJO EXCLUSIVO: ANOTACIONES PRIVADAS Y RESERVADAS DEL MÉDICO ── */}
                  {rol === "MEDICO" && (
                    <div className="rounded-2xl p-4 bg-gradient-to-r from-rose-950/90 via-red-950/80 to-rose-950/90 border-2 border-rose-500/60 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-rose-300 uppercase tracking-wide">
                          <svg className="w-4 h-4 text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          <span>ANOTACIONES PRIVADAS Y RESERVADAS DEL MÉDICO / COMENTARIOS</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-300/80 bg-rose-900/50 px-2 py-0.5 rounded-full border border-rose-500/40">
                          Solo lectura médica
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-200/80 font-medium">
                        🔒 Este campo es 100% privado y confidencial. No aparece en ningún documento externo.
                      </p>
                      <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/30 text-xs text-rose-100 whitespace-pre-wrap leading-relaxed font-sans">
                        {consultaSeleccionadaFicha.anotacionesPrivadas || "Sin comentarios o anotaciones reservadas para esta consulta."}
                      </div>
                    </div>
                  )}

                  {/* Barra de Acciones de la Ficha */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      {rol === "MEDICO" && (
                        <button
                          type="button"
                          onClick={() => {
                            const c = consultaSeleccionadaFicha;
                            setConsultaSeleccionadaFicha(null);
                            handleEliminarConsulta(c);
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-rose-500/30"
                        >
                          <IconTrash size={14} />
                          <span>Eliminar Consulta</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDescargarPdfConsulta(consultaSeleccionadaFicha)}
                        className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <IconFileText size={14} />
                        <span>Ver Informe / PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEnviarWhatsAppConsulta(consultaSeleccionadaFicha)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <IconWhatsApp size={14} />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEnviarCorreoConsulta(consultaSeleccionadaFicha)}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <IconMail size={14} />
                        <span>Gmail</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. FORMULARIO REGISTRAR NUEVA CONSULTA (SIEMPRE DISPONIBLE ABAJO) */}
            {rol !== "SECRETARIA" && (
              <form
                onSubmit={handleGuardarSolo}
                className="apple-glass rounded-3xl p-6 border-2 border-slate-200/90 dark:border-white/10 shadow-sm bg-white dark:bg-[#071a2e]/90 space-y-4"
              >
                {/* Header del Formulario de Registro */}
                <div className="border-b border-slate-200/80 dark:border-white/10 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center font-black text-sm">
                        +
                      </span>
                      <span>Registrar Nueva Consulta</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                      Ingresa los datos físicos, motivo, diagnóstico y récipe para la nueva atención.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-500/30">
                    Nueva Entrada
                  </span>
                </div>

              {/* Mensajes de Estado */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <IconWarning size={16} className="text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Motivo de Consulta */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                Motivo de Consulta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Dolor abdominal agudo, Control de rutina..."
                value={form.motivoConsulta}
                onChange={(e) => setForm({ ...form, motivoConsulta: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* 2. Subpanel: Datos Físicos con ícono de lápiz */}
            <div className="rounded-2xl p-4 border border-sky-200/80 dark:border-sky-500/20 bg-sky-50/40 dark:bg-sky-950/20 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                <span>Datos Físicos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/60">Talla (m)</span>
                  <input
                    type="text"
                    placeholder="Ej. 1.75"
                    value={form.talla}
                    onChange={(e) => setForm({ ...form, talla: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/60">Peso (kg)</span>
                  <input
                    type="text"
                    placeholder="Ej. 70.0"
                    value={form.peso}
                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/60">Observación Física</span>
                  <input
                    type="text"
                    placeholder="Contextura, estado general..."
                    value={form.observacionFisica}
                    onChange={(e) => setForm({ ...form, observacionFisica: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Anotaciones y Evolución Médica */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                Anotaciones y Evolución Médica
              </label>
              <textarea
                rows={3}
                placeholder="Antecedentes, hallazgos en examen físico, evolución clínica..."
                value={form.evolucionClinica}
                onChange={(e) => setForm({ ...form, evolucionClinica: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* ── CAMPO EN ROJO: ANOTACIONES PRIVADAS Y RESERVADAS DEL MÉDICO / COMENTARIOS ── */}
            <div className="rounded-2xl p-4 border-2 border-rose-500/80 dark:border-rose-500/60 bg-rose-50/80 dark:bg-rose-950/30 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>ANOTACIONES PRIVADAS Y RESERVADAS DEL MÉDICO / COMENTARIOS</span>
              </div>
              <p className="text-[11px] text-rose-600/90 dark:text-rose-300/80 font-semibold">
                🔒 Confidencial: Este campo es estrictamente privado para lectura del médico. No se mostrará ni anexará en ningún informe, PDF, correo o WhatsApp.
              </p>
              <textarea
                rows={3}
                placeholder="Escribe aquí observaciones privadas, sospechas clínicas, comentarios confidenciales o antecedentes reservados para tus futuras consultas..."
                value={form.anotacionesPrivadas}
                onChange={(e) => setForm({ ...form, anotacionesPrivadas: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-white dark:bg-black/50 text-xs text-rose-950 dark:text-rose-100 placeholder:text-rose-300 dark:placeholder:text-rose-400/40 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 font-sans shadow-xs"
              />
            </div>

            {/* 4. Diagnóstico Clínico (Dx) — buscador sobre el catálogo CIE-10 completo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                Diagnóstico Clínico (Dx) *
              </label>
              <Cie10Buscador
                valorCodigo={form.diagnosticoPrincipalCIE10}
                valorDescripcion={form.descripcionDiagnostico}
                onSeleccionar={(d) =>
                  setForm({ ...form, diagnosticoPrincipalCIE10: d.codigo, descripcionDiagnostico: d.descripcion })
                }
              />
              {form.diagnosticoPrincipalCIE10 && (
                <p className="text-[10px] text-teal-600 dark:text-teal-400">
                  Código CIE-10 seleccionado: <span className="font-bold">{form.diagnosticoPrincipalCIE10}</span> — se usará para el Canal Endémico.
                </p>
              )}
              <input
                type="text"
                required
                placeholder="Puedes ajustar el texto del diagnóstico aquí (ej. agregar severidad, lateralidad, etc.)"
                value={form.descripcionDiagnostico}
                onChange={(e) => setForm({ ...form, descripcionDiagnostico: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* 5. Prescripción Farmacológica / Récipe (Rx) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                Prescripción Farmacológica / Récipe (Rx)
              </label>
              <textarea
                rows={3}
                placeholder={"1. Medicamento A - 500mg cada 8 horas por 7 días\n2. Medicamento B - 1 comprimido diario en ayunas"}
                value={form.planTratamiento}
                onChange={(e) => setForm({ ...form, planTratamiento: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* 6. Fecha Sugerida de Próxima Cita (Control) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                Fecha Sugerida de Próxima Cita (Control)
              </label>
              <input
                type="date"
                value={form.proximaCita}
                onChange={(e) => setForm({ ...form, proximaCita: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>

            {/* 7. Botones de Acción */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={limpiarFormulario}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Limpiar formulario"
              >
                <IconRefresh size={15} />
              </button>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-all"
                >
                  <IconCheck size={15} />
                  <span>{guardando ? "Guardando..." : "Guardar Consulta"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGuardarYGenerarPdf}
                  disabled={guardando}
                  className="btn-electric-blue px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer transition-all"
                >
                  <IconFileText size={15} />
                  <span>Guardar y Generar PDF</span>
                </button>
              </div>
            </div>
          </form>
        )}
        </div>
      </div>
    )}

      {/* ── MODAL DE DETALLE DE CONSULTA PREVIA ── */}
      {consultaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="apple-glass rounded-3xl p-6 max-w-lg w-full bg-white dark:bg-[#071a2e] border border-slate-200 dark:border-teal-500/30 text-slate-900 dark:text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h4 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">
                  Detalle de Consulta Médica
                </h4>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-mono">
                  Fecha: {consultaDetalle.fechaConsulta ? consultaDetalle.fechaConsulta.slice(0, 10) : hoy()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConsultaDetalle(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 dark:text-white/50 block">Motivo:</span>
                <p className="text-slate-900 dark:text-white font-medium mt-0.5">{consultaDetalle.motivoConsulta}</p>
              </div>

              {/* Anotaciones Privadas y Reservadas del Médico */}
              {rol === "MEDICO" && consultaDetalle.anotacionesPrivadas && (
                <div className="rounded-2xl p-3.5 border-2 border-rose-500/80 dark:border-rose-500/50 bg-rose-50/80 dark:bg-rose-950/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                    <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>ANOTACIONES PRIVADAS Y RESERVADAS DEL MÉDICO / COMENTARIOS</span>
                  </div>
                  <p className="text-rose-950 dark:text-rose-100 font-medium text-xs whitespace-pre-wrap leading-relaxed">
                    {consultaDetalle.anotacionesPrivadas}
                  </p>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-500 dark:text-white/50 block">Diagnóstico (Dx):</span>
                <p className="text-teal-700 dark:text-teal-300 font-bold mt-0.5">{consultaDetalle.descripcionDiagnostico || "Sin diagnóstico registrado"}</p>
              </div>

              <div>
                <span className="font-bold text-slate-500 dark:text-white/50 block">Prescripción / Récipe (Rx):</span>
                <pre className="p-3 rounded-xl bg-slate-100 dark:bg-black/30 font-mono text-[11px] text-slate-800 dark:text-white/90 whitespace-pre-wrap mt-1">
                  {consultaDetalle.planTratamiento || "Sin récipe farmacológico"}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-white/10 flex-wrap">
              <div>
                {rol === "MEDICO" && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = consultaDetalle;
                      handleEliminarConsulta(c);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <IconTrash size={14} />
                    <span>Eliminar Consulta</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const c = consultaDetalle;
                    setConsultaDetalle(null);
                    handleDescargarPdfConsulta(c);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <IconFileText size={14} />
                  <span>Ver Informe / Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = consultaDetalle;
                    setConsultaDetalle(null);
                    handleEnviarWhatsAppConsulta(c);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <IconWhatsApp size={14} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = consultaDetalle;
                    setConsultaDetalle(null);
                    handleEnviarCorreoConsulta(c);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <IconMail size={14} />
                  <span>Enviar por Correo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConsultaDetalle(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROCEDIMIENTOS & COTIZACIONES MULTIDIVISA (USD / VES / COP)
// ══════════════════════════════════════════════════════════════════════════

export interface CotizacionGuardada {
  id: string;
  pacienteId: number | null;
  pacienteNombre: string;
  pacienteCedula: string;
  pacienteTelefono?: string;
  procedimientoNombre: string;
  descripcion?: string;
  costoUSD: number;
  costoVES: number;
  costoCOP: number;
  tasaBCV: number;
  tasaCOP: number;
  estado: "COTIZADA" | "PLANIFICADA" | "REALIZADA" | "CANCELADA";
  fecha: string;
  fechaPlanificada?: string;
}

const PROCEDIMIENTOS_SUGERIDOS = [
  { nombre: "Cirugía Menor Ambulatoria", precio: 250, desc: "Intervención ambulatoria con anestesia local y curación" },
  { nombre: "Resección de quiste sebáceo", precio: 180, desc: "Resección quirúrgica completa con hemostasia y sutura intradérmica" },
  { nombre: "Biopsia de piel y partes blandas", precio: 120, desc: "Toma de muestra tisular por punch o incisión con estudio histológico" },
  { nombre: "Extirpación de nevus / lunar", precio: 90, desc: "Exéresis con margen de seguridad y cierre primario" },
  { nombre: "Cauterización de verrugas múltiples", precio: 75, desc: "Electrocauterización o crioterapia en lesiones cutáneas" },
  { nombre: "Drenaje de absceso superficial", precio: 85, desc: "Incisión, drenaje, desbridamiento y colocación de mecha" },
  { nombre: "Consulta Médica Especializada", precio: 50, desc: "Evaluación clínica integral, diagnóstico y plan terapéutico" },
];

function Procedimientos({
  tenantId,
  procedimientos,
  pacientes,
  config,
  onCambio,
  pacienteInicialId,
  onVerDocumento,
}: {
  tenantId: number;
  procedimientos: ProcedimientoMedico[] | null;
  pacientes: Paciente[] | null;
  config: any;
  onCambio: () => void;
  pacienteInicialId?: number | null;
  onVerDocumento?: (payload: DocumentoVisorPayload) => void;
}) {
  // Lista de Cotizaciones Guardadas — scopeadas por tenant (ver claveCotizaciones); sin datos de
  // demostración por defecto, una clínica nueva empieza con la lista real vacía, no con una
  // paciente inventada que parecería un registro real.
  const [cotizaciones, setCotizaciones] = useState<CotizacionGuardada[]>(() => {
    try {
      const guardado = localStorage.getItem(claveCotizaciones(tenantId));
      if (guardado) {
        return JSON.parse(guardado);
      }
    } catch {
      // Ignorar error de parseo
    }
    return [];
  });

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(claveCotizaciones(tenantId), JSON.stringify(cotizaciones));
    } catch {
      // ignore
    }
  }, [cotizaciones, tenantId]);

  // Formulario de Nueva Cotización / Procedimiento
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [mostrarDropdownPacientes, setMostrarDropdownPacientes] = useState(false);

  const [nombreProcedimiento, setNombreProcedimiento] = useState("");
  const [descripcionClinica, setDescripcionClinica] = useState("");
  const [precioUSD, setPrecioUSD] = useState<number | string>("");
  const [estadoInicial, setEstadoInicial] = useState<"COTIZADA" | "PLANIFICADA" | "REALIZADA" | "CANCELADA">("COTIZADA");
  const [fechaPlanificada, setFechaPlanificada] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [toastExito, setToastExito] = useState<string | null>(null);

  // Modal para ajuste rápido de tasas
  const [modalTasas, setModalTasas] = useState(false);
  const [tempTasaBCV, setTempTasaBCV] = useState(config?.tasaBCV || 950);
  const [tempTasaCOP, setTempTasaCOP] = useState(config?.tasaCOP || 4000);

  // Filtros del Historial
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "COTIZADA" | "PLANIFICADA" | "REALIZADA" | "CANCELADA">("TODOS");

  // Si llega pacienteInicialId por props, preseleccionarlo
  useEffect(() => {
    if (pacienteInicialId && pacientes) {
      const p = pacientes.find((item) => item.id === pacienteInicialId);
      if (p) {
        setPacienteSeleccionado(p);
        setBusquedaPaciente(p.nombreCompleto);
      }
    }
  }, [pacienteInicialId, pacientes]);

  // Cálculo en tiempo real
  const tasaBCV = Number(config?.tasaBCV) || 950;
  const tasaCOP = Number(config?.tasaCOP) || 4000;
  const usdNum = parseFloat(String(precioUSD)) || 0;
  const vesNum = usdNum * tasaBCV;
  const copNum = usdNum * tasaCOP;

  // Pacientes filtrados en el buscador
  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente.trim()) return pacientes || [];
    return (pacientes || []).filter((p) => coincidePaciente(p, busquedaPaciente));
  }, [pacientes, busquedaPaciente]);

  // Limpiar formulario
  const limpiarFormulario = () => {
    setPacienteSeleccionado(null);
    setBusquedaPaciente("");
    setNombreProcedimiento("");
    setDescripcionClinica("");
    setPrecioUSD("");
    setEstadoInicial("COTIZADA");
    setFechaPlanificada("");
    setMostrarDropdownPacientes(false);
  };

  // Mostrar mensaje de éxito temporal
  const dispararToast = (msg: string) => {
    setToastExito(msg);
    setTimeout(() => setToastExito(null), 3500);
  };

  // Guardar Cotización
  const handleGuardarCotizacion = async (generarPdfDespues = false) => {
    if (!busquedaPaciente.trim() && !pacienteSeleccionado) {
      alert("Por favor selecciona o ingresa el nombre del paciente.");
      return;
    }
    if (!nombreProcedimiento.trim()) {
      alert("Por favor ingresa el nombre del procedimiento o cirugía.");
      return;
    }
    if (usdNum <= 0) {
      alert("Por favor ingresa un precio base en USD mayor a 0.");
      return;
    }

    setGuardando(true);
    try {
      const nombrePac = pacienteSeleccionado ? pacienteSeleccionado.nombreCompleto : busquedaPaciente.trim();
      const cedulaPac = pacienteSeleccionado ? pacienteSeleccionado.identificacion : "S/C";
      const telPac = pacienteSeleccionado?.telefono || "";

      const nuevaCot: CotizacionGuardada = {
        id: `cot-${Date.now()}`,
        pacienteId: pacienteSeleccionado ? pacienteSeleccionado.id : null,
        pacienteNombre: nombrePac,
        pacienteCedula: cedulaPac,
        pacienteTelefono: telPac,
        procedimientoNombre: nombreProcedimiento.trim(),
        descripcion: descripcionClinica.trim() || undefined,
        costoUSD: usdNum,
        costoVES: vesNum,
        costoCOP: copNum,
        tasaBCV,
        tasaCOP,
        estado: estadoInicial,
        fecha: hoy(),
        fechaPlanificada: fechaPlanificada || undefined,
      };

      // Si no existe en el catálogo del backend, guardarlo en background
      if (tenantId) {
        crearProcedimiento(tenantId, {
          nombre: nombreProcedimiento.trim(),
          descripcion: descripcionClinica.trim() || null,
          costo: usdNum,
          moneda: "USD",
          duracionMinutos: 45,
        }).catch(() => {});
      }

      setCotizaciones((prev) => [nuevaCot, ...prev]);
      dispararToast("¡Cotización / Procedimiento registrado exitosamente!");

      if (generarPdfDespues) {
        ejecutarPdfCotizacion(nuevaCot);
      }

      limpiarFormulario();
      onCambio();
    } finally {
      setGuardando(false);
    }
  };

  // Generar PDF para una cotización dada
  const ejecutarPdfCotizacion = (cot: CotizacionGuardada) => {
    const dataCot: CotizacionData = {
      clinicaNombre: config?.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config?.doctorNombre || "Dr. Daniel Reina",
      pacienteNombre: cot.pacienteNombre,
      pacienteCedula: cot.pacienteCedula,
      pacienteTelefono: cot.pacienteTelefono,
      fecha: cot.fecha,
      fechaPlanificada: cot.fechaPlanificada,
      items: [
        {
          nombre: cot.procedimientoNombre + (cot.descripcion ? ` - ${cot.descripcion}` : ""),
          costoUSD: cot.costoUSD,
          costoVES: cot.costoVES,
          costoCOP: cot.costoCOP,
        },
      ],
      tasaBCV: cot.tasaBCV || tasaBCV,
      tasaCOP: cot.tasaCOP || tasaCOP,
      totalUSD: cot.costoUSD,
      totalVES: cot.costoVES,
      totalCOP: cot.costoCOP,
      observaciones: cot.descripcion,
    };
    if (onVerDocumento) {
      onVerDocumento({ tipo: "COTIZACION", data: dataCot });
    } else {
      generarPdfCotizacion(dataCot);
    }
  };

  // Enviar WhatsApp para una cotización
  const ejecutarWhatsAppCotizacion = (cot: CotizacionGuardada) => {
    const dataCot: CotizacionData = {
      clinicaNombre: config?.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config?.doctorNombre || "Dr. Daniel Reina",
      pacienteNombre: cot.pacienteNombre,
      pacienteCedula: cot.pacienteCedula,
      pacienteTelefono: cot.pacienteTelefono,
      fecha: cot.fecha,
      fechaPlanificada: cot.fechaPlanificada,
      items: [
        {
          nombre: cot.procedimientoNombre + (cot.descripcion ? ` - ${cot.descripcion}` : ""),
          costoUSD: cot.costoUSD,
          costoVES: cot.costoVES,
          costoCOP: cot.costoCOP,
        },
      ],
      tasaBCV: cot.tasaBCV || tasaBCV,
      tasaCOP: cot.tasaCOP || tasaCOP,
      totalUSD: cot.costoUSD,
      totalVES: cot.costoVES,
      totalCOP: cot.costoCOP,
      observaciones: cot.descripcion,
    };
    if (onVerDocumento) {
      onVerDocumento({ tipo: "COTIZACION", data: dataCot });
    } else {
      generarPdfCotizacion(dataCot);
      const texto = generarTextoWhatsAppCotizacion(dataCot);
      if (cot.pacienteTelefono) {
        abrirWhatsAppDirecto(cot.pacienteTelefono, texto);
      } else {
        dispararToast("⚠️ Este paciente no tiene teléfono registrado — no se pudo abrir WhatsApp.");
      }
      dispararToast("📄 Presupuesto PDF descargado en tu equipo. Adjúntalo con el clip (📎) en WhatsApp.");
    }
  };

  // Cambiar estado de una cotización en el historial
  const cambiarEstado = (id: string, nuevoEstado: CotizacionGuardada["estado"]) => {
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))
    );
    dispararToast(`Estado actualizado a: ${nuevoEstado}`);
  };

  // Eliminar una cotización
  const eliminarCotizacion = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro del historial?")) {
      setCotizaciones((prev) => prev.filter((c) => c.id !== id));
      dispararToast("Registro eliminado.");
    }
  };

  // Filtrado de la tabla de historial
  const cotizacionesFiltradas = useMemo(() => {
    return cotizaciones.filter((c) => {
      if (filtroEstado !== "TODOS" && c.estado !== filtroEstado) {
        return false;
      }
      if (!filtroTexto.trim()) return true;
      const q = filtroTexto.toLowerCase();
      return (
        c.pacienteNombre.toLowerCase().includes(q) ||
        c.pacienteCedula.toLowerCase().includes(q) ||
        c.procedimientoNombre.toLowerCase().includes(q) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(q))
      );
    });
  }, [cotizaciones, filtroEstado, filtroTexto]);

  // Contadores por estado
  const conteos = useMemo(() => {
    return {
      todos: cotizaciones.length,
      cotizada: cotizaciones.filter((c) => c.estado === "COTIZADA").length,
      planificada: cotizaciones.filter((c) => c.estado === "PLANIFICADA").length,
      realizada: cotizaciones.filter((c) => c.estado === "REALIZADA").length,
      cancelada: cotizaciones.filter((c) => c.estado === "CANCELADA").length,
    };
  }, [cotizaciones]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
      {/* Toast Notification */}
      {toastExito && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-400/30 animate-bounce">
          <IconCheckCircle size={20} />
          <span className="text-xs sm:text-sm font-semibold">{toastExito}</span>
        </div>
      )}

      {/* ── HEADER SUPERIOR ── */}
      <div className="apple-glass rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-inner">
            <IconPrescription size={24} />
          </div>
          <div>
            <h2 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Módulo de Procedimientos & Cotizaciones Multidivisa
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/60">
              Gestión de cirugías, procedimientos y presupuestos en tiempo real (USD, VES, COP)
            </p>
          </div>
        </div>

        {/* Pill de Tasas Activas */}
        <div className="flex items-center gap-3 bg-slate-100/90 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400 font-normal">Tasas Activas:</span>
            <span className="text-sky-600 dark:text-sky-400 font-mono">
              VES: Bs. {tasaBCV.toFixed(2)}
            </span>
            <span className="text-slate-300 dark:text-white/20">|</span>
            <span className="text-purple-600 dark:text-purple-400 font-mono">
              COP: ${tasaCOP.toLocaleString("es-CO")}
            </span>
          </div>
          <button
            onClick={() => setModalTasas(true)}
            className="px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-300 dark:border-white/20 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ajustar tasas de cambio"
          >
            <IconBank size={14} />
            <span>Tasas</span>
          </button>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL: 2 COLUMNAS RESPONSIVAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════════
            COLUMNA IZQUIERDA: FORMULARIO NUEVA COTIZACIÓN / PROCEDIMIENTO
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
            {/* Header del formulario */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <h3 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-teal-600 dark:text-teal-400 font-bold text-lg">+</span>
                Nueva Cotización / Procedimiento
              </h3>
              <button
                type="button"
                onClick={limpiarFormulario}
                className="px-3 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer"
              >
                <IconRefresh size={12} />
                <span>Limpiar</span>
              </button>
            </div>

            {/* 1. SELECCIONAR PACIENTE */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                1. Seleccionar Paciente <span className="text-teal-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IconSearch size={15} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar paciente por nombre o cédula..."
                  value={busquedaPaciente}
                  onFocus={() => setMostrarDropdownPacientes(true)}
                  onChange={(e) => {
                    setBusquedaPaciente(e.target.value);
                    setMostrarDropdownPacientes(true);
                    if (pacienteSeleccionado && e.target.value !== pacienteSeleccionado.nombreCompleto) {
                      setPacienteSeleccionado(null);
                    }
                  }}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {busquedaPaciente && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaPaciente("");
                      setPacienteSeleccionado(null);
                      setMostrarDropdownPacientes(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <IconClose size={15} />
                  </button>
                )}
              </div>

              {/* Paciente seleccionado indicador */}
              {pacienteSeleccionado && (
                <div className="mt-1.5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[11px]">
                  <div className="flex items-center gap-2">
                    <IconCheck size={13} className="text-teal-600 dark:text-teal-400" />
                    <span className="font-semibold">{pacienteSeleccionado.nombreCompleto}</span>
                    <span className="opacity-75">({pacienteSeleccionado.identificacion})</span>
                  </div>
                  {pacienteSeleccionado.telefono && (
                    <span className="text-[10px] font-mono opacity-80">{pacienteSeleccionado.telefono}</span>
                  )}
                </div>
              )}

              {/* Dropdown de autocompletado de pacientes */}
              {mostrarDropdownPacientes && pacientesFiltrados.length > 0 && !pacienteSeleccionado && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/20 bg-white dark:bg-[#071a2e] shadow-2xl z-30 divide-y divide-slate-100 dark:divide-white/5">
                  {pacientesFiltrados.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setPacienteSeleccionado(p);
                        setBusquedaPaciente(p.nombreCompleto);
                        setMostrarDropdownPacientes(false);
                      }}
                      className="px-3.5 py-2.5 hover:bg-teal-50 dark:hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{p.nombreCompleto}</div>
                        <div className="text-[10px] text-slate-400">C.I: {p.identificacion}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
                        Seleccionar
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. PROCEDIMIENTO / CIRUGÍA */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                2. Procedimiento / Cirugía <span className="text-teal-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ingresa el nombre del procedimiento o cirugía (ej. Resección...)"
                value={nombreProcedimiento}
                onChange={(e) => setNombreProcedimiento(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              {/* Sugerencias Rápidas de Procedimientos Comunes */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {PROCEDIMIENTOS_SUGERIDOS.slice(0, 4).map((sug) => (
                  <button
                    key={sug.nombre}
                    type="button"
                    onClick={() => {
                      setNombreProcedimiento(sug.nombre);
                      if (!descripcionClinica) setDescripcionClinica(sug.desc);
                      if (!precioUSD || Number(precioUSD) === 0) setPrecioUSD(sug.precio);
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-teal-500/15 hover:text-teal-600 dark:hover:text-teal-300 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer text-slate-600 dark:text-white/70"
                  >
                    + {sug.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* DESCRIPCIÓN / DETALLE CLÍNICO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                Descripción / Detalle Clínico
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Resección de quiste sebáceo en región dorsal con anestesia local..."
                value={descripcionClinica}
                onChange={(e) => setDescripcionClinica(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* 3. PRECIO BASE EN DÓLARES (USD) & CÁLCULO AUTOMÁTICO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                  3. Precio Base en Dólares (USD) <span className="text-teal-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-teal-500/20">
                  <IconRefresh size={10} className="animate-spin" />
                  Cálculo Automático
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400 font-black text-sm">
                  USD $
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precioUSD}
                  onChange={(e) => setPrecioUSD(e.target.value)}
                  className="w-full pl-18 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-base font-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Tarjetas de Conversión Multidivisa en Vivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Bolívares (VES) */}
                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/90 dark:border-sky-500/25 space-y-1">
                  <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                    Bolívares (VES)
                  </div>
                  <div className="text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">
                    Bs. {vesNum.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-white/50">
                    Tasa: 1 USD = Bs. {tasaBCV.toFixed(2)}
                  </div>
                </div>

                {/* Pesos Colombianos (COP) */}
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/90 dark:border-purple-500/25 space-y-1">
                  <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300">
                    Pesos Colombianos (COP)
                  </div>
                  <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
                    COP {Math.round(copNum).toLocaleString("es-CO")}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-white/50">
                    Tasa: 1 USD = ${tasaCOP.toLocaleString("es-CO")}
                  </div>
                </div>
              </div>
            </div>

            {/* ESTADO INICIAL Y FECHA PLANIFICADA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                  Estado Inicial
                </label>
                <select
                  value={estadoInicial}
                  onChange={(e: any) => setEstadoInicial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="COTIZADA">COTIZADA</option>
                  <option value="PLANIFICADA">PLANIFICADA</option>
                  <option value="REALIZADA">REALIZADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                  Fecha Planificada (Opcional)
                </label>
                <input
                  type="date"
                  value={fechaPlanificada}
                  onChange={(e) => setFechaPlanificada(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={guardando}
                onClick={() => handleGuardarCotizacion(false)}
                className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <IconCheck size={16} />
                <span>{guardando ? "Guardando..." : "Guardar Cotización"}</span>
              </button>

              <button
                type="button"
                disabled={guardando}
                onClick={() => handleGuardarCotizacion(true)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Guardar y generar comprobante PDF"
              >
                <IconFileText size={16} />
                <span>Guardar y PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            COLUMNA DERECHA: HISTORIAL DE COTIZACIONES & PROCEDIMIENTOS
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            {/* Header del Historial con Buscador */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
              <h3 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                Historial de Cotizaciones & Procedimientos
              </h3>

              <div className="w-full sm:w-64 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IconSearch size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por paciente, cédula..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Chips de Filtrado por Estado */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1 font-medium">Filtrar:</span>
              <button
                type="button"
                onClick={() => setFiltroEstado("TODOS")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === "TODOS"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                Todos ({conteos.todos})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado("COTIZADA")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === "COTIZADA"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                $ Cotizadas ({conteos.cotizada})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado("PLANIFICADA")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === "PLANIFICADA"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                📅 Planificadas ({conteos.planificada})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado("REALIZADA")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === "REALIZADA"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                ✓ Realizadas ({conteos.realizada})
              </button>
            </div>

            {/* TABLA DE COTIZACIONES Y PROCEDIMIENTOS */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 font-semibold">
                    <th className="py-2.5 px-3">Paciente</th>
                    <th className="py-2.5 px-3">Procedimiento</th>
                    <th className="py-2.5 px-2 text-right">USD</th>
                    <th className="py-2.5 px-2 text-right">VES</th>
                    <th className="py-2.5 px-2 text-right">COP</th>
                    <th className="py-2.5 px-2 text-center">Estado</th>
                    <th className="py-2.5 px-2 text-center">Fecha</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {cotizacionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No hay cotizaciones registradas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    cotizacionesFiltradas.map((cot) => (
                      <tr
                        key={cot.id}
                        className="hover:bg-teal-500/5 transition-colors group"
                      >
                        {/* Paciente */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {cot.pacienteNombre}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {cot.pacienteCedula}
                          </div>
                        </td>

                        {/* Procedimiento */}
                        <td className="py-3 px-3 max-w-[170px]">
                          <div className="font-semibold text-slate-800 dark:text-white/90 truncate" title={cot.procedimientoNombre}>
                            {cot.procedimientoNombre}
                          </div>
                          {cot.descripcion && (
                            <div className="text-[10px] text-slate-400 truncate" title={cot.descripcion}>
                              {cot.descripcion}
                            </div>
                          )}
                        </td>

                        {/* USD */}
                        <td className="py-3 px-2 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          ${cot.costoUSD.toFixed(2)}
                        </td>

                        {/* VES */}
                        <td className="py-3 px-2 text-right font-mono text-sky-600 dark:text-sky-400 text-[11px]">
                          Bs. {cot.costoVES.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>

                        {/* COP */}
                        <td className="py-3 px-2 text-right font-mono text-purple-600 dark:text-purple-400 text-[11px]">
                          ${cot.costoCOP.toLocaleString("es-CO")}
                        </td>

                        {/* Estado con selector de cambio rápido */}
                        <td className="py-3 px-2 text-center">
                          <select
                            value={cot.estado}
                            onChange={(e: any) => cambiarEstado(cot.id, e.target.value)}
                            className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                              cot.estado === "COTIZADA"
                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-400/30"
                                : cot.estado === "PLANIFICADA"
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-400/30"
                                : cot.estado === "REALIZADA"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-400/30"
                            }`}
                          >
                            <option value="COTIZADA">COTIZADA</option>
                            <option value="PLANIFICADA">PLANIFICADA</option>
                            <option value="REALIZADA">REALIZADA</option>
                            <option value="CANCELADA">CANCELADA</option>
                          </select>
                        </td>

                        {/* Fecha */}
                        <td className="py-3 px-2 text-center text-[10px] text-slate-500 dark:text-white/60 font-mono">
                          {cot.fecha}
                          {cot.fechaPlanificada && (
                            <div className="text-indigo-600 dark:text-indigo-400 font-bold">
                              Plan: {cot.fechaPlanificada.slice(5)}
                            </div>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* PDF */}
                            <button
                              type="button"
                              onClick={() => ejecutarPdfCotizacion(cot)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Descargar presupuesto en PDF"
                            >
                              <IconFileText size={15} />
                            </button>

                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={() => ejecutarWhatsAppCotizacion(cot)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Enviar por WhatsApp"
                            >
                              <IconWhatsApp size={15} />
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => eliminarCotizacion(cot.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Eliminar del historial"
                            >
                              <IconTrash size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL DE AJUSTE RÁPIDO DE TASAS DE CAMBIO ── */}
      {modalTasas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm apple-glass rounded-3xl p-6 shadow-2xl border border-white/20 bg-white/95 dark:bg-[#071a2e]/95 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-300">
                  <IconBank size={20} />
                </div>
                <h3 className="font-['Outfit'] font-black text-base">Tasas de Cotización</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalTasas(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">Tasa BCV (Bs. / USD):</label>
                <input
                  type="number"
                  step="0.01"
                  value={tempTasaBCV}
                  onChange={(e) => setTempTasaBCV(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">Tasa COP (Pesos / USD):</label>
                <input
                  type="number"
                  step="1"
                  value={tempTasaCOP}
                  onChange={(e) => setTempTasaCOP(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalTasas(false)}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (config) {
                    config.tasaBCV = tempTasaBCV;
                    config.tasaCOP = tempTasaCOP;
                    try {
                      localStorage.setItem("aurora_mediclinic_config_perfil", JSON.stringify(config));
                    } catch {}
                  }
                  setModalTasas(false);
                  dispararToast("Tasas actualizadas correctamente.");
                  onCambio();
                }}
                className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
              >
                Guardar Tasas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SALA DE ESPERA & GESTIÓN DE TURNOS EN TIEMPO REAL
// ══════════════════════════════════════════════════════════════════════════

export interface TurnoSalaEspera {
  id: string;
  turnoNumero: number;
  codigoTurno: string;
  pacienteId: number | null;
  pacienteNombre: string;
  pacienteCedula: string;
  pacienteTelefono: string;
  horaLlegada: string;
  fecha: string;
  motivo: string;
  consultorio: string;
  estado: "EN_ESPERA" | "EN_CONSULTA" | "ATENDIDO" | "CANCELADO";
  estadoPago: "PAGADO" | "PENDIENTE" | "EXONERADO" | "PARCIAL";
  metodoPago?: string;
  moneda?: "USD" | "VES" | "COP";
  montoCobrado?: number;
  montoUSD?: number;
  montoVES?: number;
  montoCOP?: number;
  referenciaPago?: string;
}

const MOTIVOS_CONSULTA_SUGERIDOS = [
  "Consulta Médica General",
  "Consulta Especializada",
  "Control y Lectura de Exámenes",
  "Cirugía Menor Ambulatoria",
  "Curación / Retiro de Puntos",
  "Evaluación Pre-Operatoria",
  "Triaje y Emergencia",
];

function SalaEspera({
  tenantId,
  pacientes,
  entradas,
  cobrosLocales,
  onAgregarCobro,
  onAgregarCierre,
  onCambio,
  config,
  onNavegar,
  onSeleccionarPacienteParaConsulta,
  onVerDocumento,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  entradas: SalaEsperaEntrada[] | null;
  cobrosLocales: CobroItem[];
  onAgregarCobro: (item: CobroItem) => void;
  onAgregarCierre: (cierre: CierreCajaData) => void;
  onCambio: () => void;
  config: any;
  onNavegar?: (pag: Pagina) => void;
  onSeleccionarPacienteParaConsulta?: (pacienteId: number) => void;
  onVerDocumento?: (payload: DocumentoVisorPayload) => void;
}) {
  // Lista de Turnos del Día
  const [turnos, setTurnos] = useState<TurnoSalaEspera[]>(() => {
    try {
      const guardado = localStorage.getItem(claveSalaEsperaTurnos(tenantId));
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Guardar turnos en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(claveSalaEsperaTurnos(tenantId), JSON.stringify(turnos));
    } catch {}
  }, [turnos, tenantId]);

  // Modales
  const [modalAdmitir, setModalAdmitir] = useState(false);
  const [modalPago, setModalPago] = useState<TurnoSalaEspera | null>(null);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [toastExito, setToastExito] = useState<string | null>(null);

  // Filtros de búsqueda
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "EN_ESPERA" | "EN_CONSULTA" | "ATENDIDO" | "CANCELADO">("TODOS");

  // Formulario de Admisión
  const [admitirPacienteId, setAdmitirPacienteId] = useState<number | "">("");
  const [admitirNombreManual, setAdmitirNombreManual] = useState("");
  const [admitirCedulaManual, setAdmitirCedulaManual] = useState("");
  const [admitirTelefono, setAdmitirTelefono] = useState("");
  const [admitirConsultorio, setAdmitirConsultorio] = useState("Consultorio 1 (Doctor)");
  const [admitirMotivo, setAdmitirMotivo] = useState("Consulta Médica General");
  const [admitirHora, setAdmitirHora] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const [admitirEstadoPago, setAdmitirEstadoPago] = useState<"PAGADO" | "PENDIENTE" | "EXONERADO">("PAGADO");
  const [admitirMetodoPago, setAdmitirMetodoPago] = useState("Efectivo USD");
  const [admitirMontoUSD, setAdmitirMontoUSD] = useState("25");
  const [admitirReferencia, setAdmitirReferencia] = useState("");
  const [guardandoAdmision, setGuardandoAdmision] = useState(false);

  // Formulario de Pago Rápido
  const [pagoMetodo, setPagoMetodo] = useState("Efectivo USD");
  const [pagoMontoUSD, setPagoMontoUSD] = useState("25");
  const [pagoReferencia, setPagoReferencia] = useState("");

  const tasaBCV = Number(config?.tasaBCV) || 950;

  const dispararToast = (msg: string) => {
    setToastExito(msg);
    setTimeout(() => setToastExito(null), 3500);
  };

  // Contadores métricas superiores
  const conteoEnEspera = turnos.filter((t) => t.estado === "EN_ESPERA").length;
  const conteoEnConsulta = turnos.filter((t) => t.estado === "EN_CONSULTA").length;
  const conteoAtendidos = turnos.filter((t) => t.estado === "ATENDIDO").length;

  // Filtrado de la tabla de turnos (orden cronológico ascendente: primer turno arriba, nuevos abajo)
  const turnosFiltrados = useMemo(() => {
    return [...turnos]
      .sort((a, b) => (a.turnoNumero || 0) - (b.turnoNumero || 0))
      .filter((t) => {
        if (filtroEstado !== "TODOS" && t.estado !== filtroEstado) {
          return false;
        }
        if (!filtroTexto.trim()) return true;
        const q = filtroTexto.toLowerCase();
        return (
          t.codigoTurno.toLowerCase().includes(q) ||
          t.pacienteNombre.toLowerCase().includes(q) ||
          t.pacienteCedula.toLowerCase().includes(q) ||
          t.pacienteTelefono.toLowerCase().includes(q) ||
          t.motivo.toLowerCase().includes(q) ||
          t.consultorio.toLowerCase().includes(q)
        );
      });
  }, [turnos, filtroEstado, filtroTexto]);

  // Al seleccionar paciente en formulario de admisión
  const handleSeleccionarPacienteAdmision = (id: number | "") => {
    setAdmitirPacienteId(id);
    if (id && pacientes) {
      const p = pacientes.find((item) => item.id === id);
      if (p) {
        setAdmitirNombreManual(p.nombreCompleto);
        setAdmitirCedulaManual(p.identificacion);
        setAdmitirTelefono(p.telefono || "");
      }
    }
  };

  // Ejecutar admisión de nuevo paciente a sala de espera
  const handleGuardarAdmision = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreFinal = admitirNombreManual.trim();
    if (!nombreFinal) {
      alert("Por favor ingresa o selecciona un paciente.");
      return;
    }

    setGuardandoAdmision(true);
    try {
      const maxNumero = turnos.reduce((max, t) => Math.max(max, t.turnoNumero || 0), 0);
      const nuevoNumero = maxNumero + 1;
      const codigoTurno = `T-${String(nuevoNumero).padStart(2, "0")}`;
      const montoNum = parseFloat(admitirMontoUSD) || 0;

      // Determinar la moneda exacta según el método de pago seleccionado
      let monedaCobro: "USD" | "VES" | "COP" = "USD";
      let montoUSDNum = 0;
      let montoVESNum = 0;
      let montoCOPNum = 0;

      const metodoNorm = (admitirMetodoPago || "").toUpperCase();
      if (metodoNorm.includes("VES") || metodoNorm.includes("BOLÍVAR") || metodoNorm.includes("BOLIVAR") || metodoNorm.includes("PAGO MÓVIL") || metodoNorm.includes("PAGO MOVIL") || metodoNorm.includes("PUNTO")) {
        monedaCobro = "VES";
        montoVESNum = montoNum;
      } else if (metodoNorm.includes("COP") || metodoNorm.includes("PESO")) {
        monedaCobro = "COP";
        montoCOPNum = montoNum;
      } else {
        monedaCobro = "USD";
        montoUSDNum = montoNum;
      }

      const nuevoTurno: TurnoSalaEspera = {
        id: `turno-${Date.now()}`,
        turnoNumero: nuevoNumero,
        codigoTurno,
        pacienteId: admitirPacienteId ? Number(admitirPacienteId) : null,
        pacienteNombre: nombreFinal,
        pacienteCedula: admitirCedulaManual.trim() || "S/C",
        pacienteTelefono: admitirTelefono.trim() || "S/T",
        horaLlegada: admitirHora || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fecha: hoy(),
        motivo: admitirMotivo.trim() || "Consulta Médica General",
        consultorio: admitirConsultorio,
        estado: "EN_ESPERA",
        estadoPago: admitirEstadoPago,
        metodoPago: admitirEstadoPago === "PAGADO" ? admitirMetodoPago : undefined,
        moneda: admitirEstadoPago === "PAGADO" ? monedaCobro : undefined,
        montoCobrado: admitirEstadoPago === "PAGADO" ? montoNum : 0,
        montoUSD: admitirEstadoPago === "PAGADO" ? montoUSDNum : 0,
        montoVES: admitirEstadoPago === "PAGADO" ? montoVESNum : 0,
        montoCOP: admitirEstadoPago === "PAGADO" ? montoCOPNum : 0,
        referenciaPago: admitirEstadoPago === "PAGADO" ? admitirReferencia.trim() : undefined,
      };

      // Si se registró como PAGADO, agregarlo al flujo de cobros locales de caja
      if (admitirEstadoPago === "PAGADO" && montoNum > 0) {
        const cobroItem: CobroItem = {
          turno: nuevoNumero,
          pacienteNombre: nombreFinal,
          identificacion: admitirCedulaManual.trim() || "S/C",
          concepto: admitirMotivo.trim() || "Consulta Médica",
          metodoPago: admitirMetodoPago,
          referencia: admitirReferencia.trim() || "N/A",
          moneda: monedaCobro,
          montoCobrado: montoNum,
          montoUSD: montoUSDNum,
          montoVES: montoVESNum,
          montoCOP: montoCOPNum,
          hora: nuevoTurno.horaLlegada,
        };
        onAgregarCobro(cobroItem);
      }

      // Backend sync
      if (admitirPacienteId && tenantId) {
        registrarLlegadaSalaEspera(tenantId, Number(admitirPacienteId), admitirConsultorio).catch(() => {});
      }

      // Agregar al final (los nuevos van abajo, el primero queda arriba)
      setTurnos((prev) => [...prev, nuevoTurno]);
      dispararToast(`¡Paciente admitido con Turno ${codigoTurno}!`);

      // Limpiar formulario y cerrar modal
      setAdmitirPacienteId("");
      setAdmitirNombreManual("");
      setAdmitirCedulaManual("");
      setAdmitirTelefono("");
      setAdmitirReferencia("");
      setModalAdmitir(false);
      onCambio();
    } finally {
      setGuardandoAdmision(false);
    }
  };

  // Cambiar estado de turno
  const handleCambiarEstado = (id: string, nuevoEstado: TurnoSalaEspera["estado"]) => {
    setTurnos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t))
    );
    dispararToast(`Turno actualizado a: ${nuevoEstado.replace("_", " ")}`);
    onCambio();
  };

  // Llamar a consulta directamente (marcar como EN_CONSULTA en sala de espera)
  const handleLlamarConsulta = (turno: TurnoSalaEspera) => {
    handleCambiarEstado(turno.id, "EN_CONSULTA");
  };

  // Registrar/Modificar pago de un turno
  const handleGuardarPagoModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPago) return;

    const montoNum = parseFloat(pagoMontoUSD) || 0;
    let monedaCobro: "USD" | "VES" | "COP" = "USD";
    let montoUSDNum = 0;
    let montoVESNum = 0;
    let montoCOPNum = 0;

    const metodoNorm = (pagoMetodo || "").toUpperCase();
    if (metodoNorm.includes("VES") || metodoNorm.includes("BOLÍVAR") || metodoNorm.includes("BOLIVAR") || metodoNorm.includes("PAGO MÓVIL") || metodoNorm.includes("PAGO MOVIL") || metodoNorm.includes("PUNTO")) {
      monedaCobro = "VES";
      montoVESNum = montoNum;
    } else if (metodoNorm.includes("COP") || metodoNorm.includes("PESO")) {
      monedaCobro = "COP";
      montoCOPNum = montoNum;
    } else {
      monedaCobro = "USD";
      montoUSDNum = montoNum;
    }

    setTurnos((prev) =>
      prev.map((t) =>
        t.id === modalPago.id
          ? {
              ...t,
              estadoPago: "PAGADO",
              metodoPago: pagoMetodo,
              moneda: monedaCobro,
              montoCobrado: montoNum,
              montoUSD: montoUSDNum,
              montoVES: montoVESNum,
              montoCOP: montoCOPNum,
              referenciaPago: pagoReferencia.trim(),
            }
          : t
      )
    );

    if (montoNum > 0) {
      const cobroItem: CobroItem = {
        turno: modalPago.turnoNumero,
        pacienteNombre: modalPago.pacienteNombre,
        identificacion: modalPago.pacienteCedula,
        concepto: modalPago.motivo || "Consulta Médica",
        metodoPago: pagoMetodo,
        referencia: pagoReferencia.trim() || "N/A",
        moneda: monedaCobro,
        montoCobrado: montoNum,
        montoUSD: montoUSDNum,
        montoVES: montoVESNum,
        montoCOP: montoCOPNum,
        hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onAgregarCobro(cobroItem);
    }

    dispararToast("Pago registrado exitosamente.");
    setModalPago(null);
    setPagoReferencia("");
    onCambio();
  };

  // Eliminar turno
  const handleEliminarTurno = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este turno de la sala de espera?")) {
      setTurnos((prev) => prev.filter((t) => t.id !== id));
      dispararToast("Turno eliminado.");
      onCambio();
    }
  };

  // Totales de caja acumulada estrictamente por moneda recibida
  const totalCajaUSD = cobrosLocales
    .filter((c) => c.moneda === "USD" || (!c.moneda && (c.metodoPago?.toUpperCase().includes("USD") || (c.montoUSD !== undefined && c.montoUSD > 0 && !c.montoVES))))
    .reduce((acc, c) => acc + (c.montoUSD || (c.moneda === "USD" ? c.montoCobrado || 0 : 0)), 0);

  const totalCajaVES = cobrosLocales
    .filter((c) => c.moneda === "VES" || (!c.moneda && (c.metodoPago?.toUpperCase().includes("VES") || c.metodoPago?.toUpperCase().includes("PUNTO") || c.metodoPago?.toUpperCase().includes("PAGO M") || (c.montoVES !== undefined && c.montoVES > 0 && !c.montoUSD))))
    .reduce((acc, c) => acc + (c.montoVES || (c.moneda === "VES" ? c.montoCobrado || 0 : 0)), 0);

  const totalCajaCOP = cobrosLocales
    .filter((c) => c.moneda === "COP" || (!c.moneda && (c.metodoPago?.toUpperCase().includes("COP") || (c.montoCOP !== undefined && c.montoCOP > 0))))
    .reduce((acc, c) => acc + (c.montoCOP || (c.moneda === "COP" ? c.montoCobrado || 0 : 0)), 0);

  // Cierre de caja
  const ejecutarCierreCaja = () => {
    const dataCierre: CierreCajaData = {
      clinicaNombre: config?.clinicaNombre || "Centro Médico Especializado",
      doctorNombre: config?.doctorNombre || "Médico Titular",
      responsableNombre: config?.secretariaNombre || "Recepción / Asistente",
      fecha: hoy(),
      horaCierre: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      tasaBCV: config?.tasaBCV || tasaBCV,
      tasaCOP: config?.tasaCOP || 4200,
      cobros: cobrosLocales,
      totalUSD: totalCajaUSD,
      totalVES: totalCajaVES,
      totalCOP: totalCajaCOP,
      totalPacientes: cobrosLocales.length,
    };
    onAgregarCierre(dataCierre);
    setMostrarModalCierre(false);
    dispararToast("Cierre de caja generado y guardado.");
    if (onVerDocumento) {
      onVerDocumento({ tipo: "CIERRE_CAJA", data: dataCierre });
    } else {
      generarPdfCierreCaja(dataCierre);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
      {/* Toast Notification */}
      {toastExito && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-400/30 animate-bounce">
          <IconCheckCircle size={20} />
          <span className="text-xs sm:text-sm font-semibold">{toastExito}</span>
        </div>
      )}

      {/* ── HEADER SUPERIOR ── */}
      <div className="apple-glass rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-inner">
            <IconHourglass size={24} />
          </div>
          <div>
            <h2 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Gestión de Sala de Espera & Turnos
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/60">
              Control de admisión de pacientes y llamados a consulta médica en tiempo real
            </p>
          </div>
        </div>

        {/* 3 Pills de Estados */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* En Espera */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
            <span className="text-sm">⏳</span>
            <span>En Espera:</span>
            <span className="font-black font-mono text-sm">{conteoEnEspera}</span>
          </div>

          {/* En Consulta */}
          <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
            <span className="text-sm">🚪</span>
            <span>En Consulta:</span>
            <span className="font-black font-mono text-sm">{conteoEnConsulta}</span>
          </div>

          {/* Atendidos */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
            <span className="text-sm">✓</span>
            <span>Atendidos:</span>
            <span className="font-black font-mono text-sm">{conteoAtendidos}</span>
          </div>
        </div>
      </div>

      {/* ── CARD PRINCIPAL: TURNOS Y PACIENTES EN ESPERA (HOY) ── */}
      <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        {/* Barra superior de herramientas */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div>
            <h3 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">
              Turnos y Pacientes en Espera (Hoy)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-white/50 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Recaudación hoy:</span>
              {totalCajaUSD > 0 && (
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  ${totalCajaUSD.toFixed(2)} USD
                </span>
              )}
              {totalCajaVES > 0 && (
                <span className="font-bold font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                  Bs. {totalCajaVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </span>
              )}
              {totalCajaCOP > 0 && (
                <span className="font-bold font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  ${totalCajaCOP.toLocaleString("es-CO")} COP
                </span>
              )}
              {totalCajaUSD === 0 && totalCajaVES === 0 && totalCajaCOP === 0 && (
                <span className="font-mono text-slate-400">$0.00 USD</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
            <div className="w-full sm:w-56 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <IconSearch size={14} />
              </div>
              <input
                type="text"
                placeholder="Buscar turno, paciente..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Botón Admitir Paciente */}
            <button
              type="button"
              onClick={() => setModalAdmitir(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="text-sm font-black">+</span>
              <span>Admitir Paciente</span>
            </button>

            {/* Botón Cierre de Caja */}
            <button
              type="button"
              onClick={() => setMostrarModalCierre(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cerrar caja y generar reporte diario"
            >
              <IconLock size={13} />
              <span>Cierre de Caja</span>
            </button>
          </div>
        </div>

        {/* Pestañas / Chips de Filtrado */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1 font-medium">Filtrar:</span>
          <button
            type="button"
            onClick={() => setFiltroEstado("TODOS")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === "TODOS"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            Todos ({turnos.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("EN_ESPERA")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === "EN_ESPERA"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            ⏳ En Espera ({conteoEnEspera})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("EN_CONSULTA")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === "EN_CONSULTA"
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            🚪 En Consulta ({conteoEnConsulta})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("ATENDIDO")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtroEstado === "ATENDIDO"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            ✓ Atendidos ({conteoAtendidos})
          </button>
        </div>

        {/* TABLA DE TURNOS Y SALA DE ESPERA */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 font-semibold">
                <th className="py-2.5 px-3">Turno</th>
                <th className="py-2.5 px-3">Paciente</th>
                <th className="py-2.5 px-3">Teléfono</th>
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Motivo</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-center">Estado de Pago</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {turnosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="space-y-3">
                      <div className="text-slate-400 text-sm font-medium">
                        Tabla sin contenido
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setModalAdmitir(true)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span className="text-sm font-bold">+</span>
                          <span>Admitir Paciente a Sala de Espera</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                turnosFiltrados.map((t) => {
                  const esVes = t.moneda === "VES" || (t.montoVES !== undefined && t.montoVES > 0 && !t.montoUSD);
                  const esCop = t.moneda === "COP" || (t.montoCOP !== undefined && t.montoCOP > 0);
                  const montoFmt = esVes
                    ? `Bs. ${(t.montoVES || t.montoCobrado || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                    : esCop
                    ? `$${(t.montoCOP || t.montoCobrado || 0).toLocaleString("es-CO")} COP`
                    : `$${(t.montoUSD || t.montoCobrado || 0).toFixed(2)} USD`;

                  return (
                    <tr key={t.id} className="hover:bg-teal-500/5 transition-colors group">
                      {/* Turno */}
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono font-black text-xs border border-teal-500/25">
                          {t.codigoTurno}
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {t.pacienteNombre}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          C.I: {t.pacienteCedula}
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="py-3 px-3">
                        <div className="text-slate-600 dark:text-white/80 font-mono text-[11px] flex items-center gap-1.5">
                          <span>{t.pacienteTelefono}</span>
                          {t.pacienteTelefono && t.pacienteTelefono !== "S/T" && (
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `Hola ${t.pacienteNombre}, le escribimos del consultorio médico para notificarle que su turno está próximo a ser atendido.`;
                                abrirWhatsAppDirecto(t.pacienteTelefono, msg);
                              }}
                              className="p-1 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-md text-xs cursor-pointer transition-colors"
                              title="Enviar mensaje de turno por WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Hora */}
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-white/80 font-medium">
                        {t.horaLlegada}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {t.consultorio}
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="font-medium text-slate-800 dark:text-white/90 truncate" title={t.motivo}>
                          {t.motivo}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={t.estado}
                          onChange={(e: any) => handleCambiarEstado(t.id, e.target.value)}
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                            t.estado === "EN_ESPERA"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30"
                              : t.estado === "EN_CONSULTA"
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30"
                              : t.estado === "ATENDIDO"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30"
                          }`}
                        >
                          <option value="EN_ESPERA">EN ESPERA</option>
                          <option value="EN_CONSULTA">EN CONSULTA</option>
                          <option value="ATENDIDO">ATENDIDO</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                      </td>

                      {/* Estado de Pago */}
                      <td className="py-3 px-3 text-center">
                        {t.estadoPago === "PAGADO" ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 font-bold text-[10px]">
                              {montoFmt}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {t.metodoPago || "Efectivo"}
                            </span>
                          </div>
                        ) : t.estadoPago === "PENDIENTE" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setModalPago(t);
                              setPagoMontoUSD("25");
                            }}
                            className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 font-bold text-[10px] hover:bg-amber-500/25 cursor-pointer"
                            title="Haz clic para registrar cobro"
                          >
                            PENDIENTE 💳
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-400/30 font-bold text-[10px]">
                            {t.estadoPago}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Llamar a Consulta */}
                          <button
                            type="button"
                            onClick={() => handleLlamarConsulta(t)}
                            className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Llamar a Consulta médica"
                          >
                            <IconStethoscope size={15} />
                          </button>

                          {/* Finalizar */}
                          {t.estado !== "ATENDIDO" && (
                            <button
                              type="button"
                              onClick={() => handleCambiarEstado(t.id, "ATENDIDO")}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Marcar como Atendido"
                            >
                              <IconCheck size={15} />
                            </button>
                          )}

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleEliminarTurno(t.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Eliminar Turno"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DE ADMISIÓN DE PACIENTE (NUEVO TURNO) ── */}
      {modalAdmitir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg apple-glass rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/20 bg-white/95 dark:bg-[#071a2e]/95 text-slate-900 dark:text-white space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
                  <IconHourglass size={20} />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-base sm:text-lg">Admitir Paciente a Sala de Espera</h3>
                  <p className="text-[11px] text-slate-500 dark:text-white/50">Asignar turno y registrar cobro inicial</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAdmitir(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarAdmision} className="space-y-3.5 text-xs">
              {/* Seleccionar Paciente Registrado */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/90">
                  Seleccionar Paciente de Base de Datos
                </label>
                <select
                  value={admitirPacienteId}
                  onChange={(e) => handleSeleccionarPacienteAdmision(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-medium"
                >
                  <option value="">— Paciente Particular o Nuevo —</option>
                  {(pacientes || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombreCompleto} ({p.identificacion})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre y Cédula (Auto o manual) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">
                    Nombre del Paciente <span className="text-teal-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Valentina Duque"
                    value={admitirNombreManual}
                    onChange={(e) => setAdmitirNombreManual(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">
                    Cédula / Identificación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. V-28.450.123"
                    value={admitirCedulaManual}
                    onChange={(e) => setAdmitirCedulaManual(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30"
                  />
                </div>
              </div>

              {/* Teléfono y Consultorio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej. +584121234567"
                    value={admitirTelefono}
                    onChange={(e) => setAdmitirTelefono(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">Consultorio Destino</label>
                  <select
                    value={admitirConsultorio}
                    onChange={(e) => setAdmitirConsultorio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30"
                  >
                    <option value="Consultorio 1 (Doctor)">Consultorio 1 (Doctor)</option>
                    <option value="Consultorio 2">Consultorio 2</option>
                    <option value="Sala de Procedimientos">Sala de Procedimientos</option>
                  </select>
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/90">Motivo de Visita</label>
                <input
                  type="text"
                  placeholder="Ej. Consulta Médica General"
                  value={admitirMotivo}
                  onChange={(e) => setAdmitirMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {MOTIVOS_CONSULTA_SUGERIDOS.slice(0, 4).map((mot) => (
                    <button
                      key={mot}
                      type="button"
                      onClick={() => setAdmitirMotivo(mot)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-teal-500/20 text-slate-600 dark:text-white/70 transition-colors cursor-pointer"
                    >
                      {mot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado de Pago */}
              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-white">Estado de Cobro / Caja:</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="estadoPago"
                        checked={admitirEstadoPago === "PAGADO"}
                        onChange={() => setAdmitirEstadoPago("PAGADO")}
                      />
                      <span>Pagado</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="estadoPago"
                        checked={admitirEstadoPago === "PENDIENTE"}
                        onChange={() => setAdmitirEstadoPago("PENDIENTE")}
                      />
                      <span>Pendiente</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="estadoPago"
                        checked={admitirEstadoPago === "EXONERADO"}
                        onChange={() => setAdmitirEstadoPago("EXONERADO")}
                      />
                      <span>Exonerado</span>
                    </label>
                  </div>
                </div>

                {admitirEstadoPago === "PAGADO" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400">Método de Pago</label>
                      <select
                        value={admitirMetodoPago}
                        onChange={(e) => setAdmitirMetodoPago(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 text-xs font-medium"
                      >
                        <option value="Efectivo USD">Efectivo USD ($)</option>
                        <option value="Zelle USD">Zelle (USD)</option>
                        <option value="Transferencia USD">Transferencia (USD)</option>
                        <option value="Pago Móvil VES">Pago Móvil (VES)</option>
                        <option value="Transferencia VES">Transferencia (VES)</option>
                        <option value="Punto de Venta">Punto de Venta / Tarjeta (VES)</option>
                        <option value="Efectivo COP">Efectivo Pesos (COP)</option>
                        <option value="Transferencia COP">Transferencia Pesos (COP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400">
                        {admitirMetodoPago.includes("VES") || admitirMetodoPago.includes("Punto") || admitirMetodoPago.includes("Pago Móvil")
                          ? "Monto en Bolívares (Bs.)"
                          : admitirMetodoPago.includes("COP")
                          ? "Monto en Pesos (COP)"
                          : "Monto en Dólares ($)"}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={admitirMontoUSD}
                        onChange={(e) => setAdmitirMontoUSD(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400">Ref. / Recibo</label>
                      <input
                        type="text"
                        placeholder="Últimos 4 dígitos / N/A"
                        value={admitirReferencia}
                        onChange={(e) => setAdmitirReferencia(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAdmitir(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-slate-600 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAdmision}
                  className="px-5 py-2 rounded-xl text-white bg-teal-600 hover:bg-teal-500 font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {guardandoAdmision ? "Admitiendo..." : "Admitir y Asignar Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE REGISTRO / MODIFICACIÓN DE PAGO ── */}
      {modalPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm apple-glass rounded-3xl p-6 shadow-2xl border border-white/20 bg-white/95 dark:bg-[#071a2e]/95 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-['Outfit'] font-black text-base">Registrar Cobro de Consulta</h3>
              <button
                type="button"
                onClick={() => setModalPago(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-white">{modalPago.pacienteNombre}</div>
              <div className="text-slate-500 font-mono">Turno: {modalPago.codigoTurno} · C.I: {modalPago.pacienteCedula}</div>
            </div>

            <form onSubmit={handleGuardarPagoModal} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">Método de Pago</label>
                <select
                  value={pagoMetodo}
                  onChange={(e) => setPagoMetodo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-medium"
                >
                  <option value="Efectivo USD">Efectivo USD ($)</option>
                  <option value="Zelle USD">Zelle (USD)</option>
                  <option value="Transferencia USD">Transferencia (USD)</option>
                  <option value="Pago Móvil VES">Pago Móvil (VES)</option>
                  <option value="Transferencia VES">Transferencia (VES)</option>
                  <option value="Punto de Venta">Punto de Venta / Tarjeta (VES)</option>
                  <option value="Efectivo COP">Efectivo Pesos (COP)</option>
                  <option value="Transferencia COP">Transferencia Pesos (COP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">
                  {pagoMetodo.includes("VES") || pagoMetodo.includes("Punto") || pagoMetodo.includes("Pago Móvil")
                    ? "Monto en Bolívares (Bs.)"
                    : pagoMetodo.includes("COP")
                    ? "Monto en Pesos (COP)"
                    : "Monto en Dólares ($)"}
                </label>
                <input
                  type="number"
                  step="any"
                  value={pagoMontoUSD}
                  onChange={(e) => setPagoMontoUSD(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">Nro. de Referencia / Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. Ref #9843 / N/A"
                  value={pagoReferencia}
                  onChange={(e) => setPagoReferencia(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPago(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE CIERRE DE CAJA DIARIO ── */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-glass rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 border border-white/20 shadow-2xl bg-white/95 dark:bg-[#071a2e]/95 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <IconLock size={20} />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg">Cierre de Caja y Fin de Jornada</h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">Auditoría diaria para el día {hoy()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalCierre(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Dólares Recibidos (USD)</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">${totalCajaUSD.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Bolívares Recibidos (VES)</div>
                <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">Bs. {totalCajaVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>
              </div>
              {totalCajaCOP > 0 && (
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Pesos Recibidos (COP)</div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">${totalCajaCOP.toLocaleString("es-CO")}</div>
                </div>
              )}
              <div className="col-span-full pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-white/70">
                <span>Transacciones de cobro: <strong>{cobrosLocales.length}</strong></span>
                <span>Pacientes atendidos hoy: <strong>{conteoAtendidos}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalCierre(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarCierreCaja}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
              >
                <IconFileText size={15} />
                <span>Descargar Reporte PDF & Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AGENDA MÉDICA & CALENDARIO MENSUAL CON BLOQUEO DE FECHAS & GESTIÓN SINCRONIZADA
// ══════════════════════════════════════════════════════════════════════════

export interface CitaAgendaItem {
  id: string;
  pacienteId?: number | null;
  pacienteNombre: string;
  pacienteCedula: string;
  pacienteTelefono: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // e.g. "09:00 AM"
  motivo: string;
  estado: string;
  creadoEn: string;
}

/** "09:00 AM" (UI) -> "09:00:00" (backend, LocalTime). */
function horaAmPmA24(hora12: string): string {
  const m = hora12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return "09:00:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}

/** "09:00:00" o "09:00" (backend) -> "09:00 AM" (UI). */
function hora24AAmPm(hora24: string): string {
  const [hStr, mStr] = hora24.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${ampm}`;
}

/** Suma minutos a una hora "HH:mm" o "HH:mm:ss" — para calcular la hora de fin de una cita (bloque de 30 min por defecto). */
function sumarMinutos(hora24: string, minutos: number): string {
  const [hStr, mStr] = hora24.split(":");
  const total = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutos;
  const h = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function mapCitaMedicaAAgendaItem(c: CitaMedica): CitaAgendaItem {
  return {
    id: String(c.id),
    pacienteId: c.paciente?.id ?? null,
    pacienteNombre: c.paciente?.nombreCompleto || "Paciente",
    pacienteCedula: c.paciente?.identificacion || "S/C",
    pacienteTelefono: c.paciente?.telefono || "S/T",
    fecha: c.fecha,
    hora: hora24AAmPm(c.horaInicio),
    motivo: c.motivo || "Consulta Médica",
    estado: c.estado || "PROGRAMADA",
    creadoEn: "",
  };
}

const HORAS_DISPONIBLES_AGENDA = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "01:00 PM", "01:30 PM", "02:00 PM",
  "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM",
  "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM",
];

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA_HEADERS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function AgendaMedica({
  tenantId,
  pacientes,
  citasHoy,
  onCambio,
}: {
  tenantId: number;
  pacientes: Paciente[] | null;
  citasHoy: CitaMedica[] | null;
  onCambio: () => void;
}) {
  // Fecha seleccionada actual (YYYY-MM-DD)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => hoy());

  // Mes y Año en visualización del calendario
  const [mesActual, setMesActual] = useState<number>(() => new Date().getMonth());
  const [añoActual, setAñoActual] = useState<number>(() => new Date().getFullYear());

  // Citas del mes visible — vienen del backend real (tabla salud_citas), no de localStorage: así
  // una cita agendada por Recepción en una PC aparece de verdad en la pantalla del Doctor en otra.
  const [citas, setCitas] = useState<CitaAgendaItem[]>([]);
  const [cargandoCitas, setCargandoCitas] = useState(false);

  // Fechas bloqueadas (días no laborables / feriados / congresos) — se mantiene por ahora en
  // localStorage (configuración de baja frecuencia, no datos clínicos); migrar a BloqueoAgenda
  // del backend queda pendiente para una siguiente pasada.
  const [fechasBloqueadas, setFechasBloqueadas] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(claveFechasBloqueadas(tenantId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Formulario Agendar Cita
  const [formCedula, setFormCedula] = useState("");
  const [formNombres, setFormNombres] = useState("");
  const [formApellidos, setFormApellidos] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formHora, setFormHora] = useState("09:00 AM");
  const [formMotivo, setFormMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [toastAgenda, setToastAgenda] = useState<string | null>(null);

  // Modal Reprogramar Cita
  const [citaParaReprogramar, setCitaParaReprogramar] = useState<CitaAgendaItem | null>(null);
  const [reprogFecha, setReprogFecha] = useState("");
  const [reprogHora, setReprogHora] = useState("09:00 AM");
  const [reprogramando, setReprogramando] = useState(false);

  const dispararToast = (msg: string) => {
    setToastAgenda(msg);
    setTimeout(() => setToastAgenda(null), 3500);
  };

  // Trae del backend todas las citas del mes que se está viendo en el calendario.
  const cargarCitasDelMes = () => {
    const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
    const inicio = `${añoActual}-${String(mesActual + 1).padStart(2, "0")}-01`;
    const fin = `${añoActual}-${String(mesActual + 1).padStart(2, "0")}-${String(diasEnMes).padStart(2, "0")}`;
    setCargandoCitas(true);
    listarCitasPorRango(tenantId, inicio, fin)
      .then((lista) => setCitas(lista.map(mapCitaMedicaAAgendaItem)))
      .catch(() => dispararToast("⚠️ No se pudieron cargar las citas del mes — revisa tu conexión."))
      .finally(() => setCargandoCitas(false));
  };

  useEffect(() => {
    cargarCitasDelMes();
    // Re-consulta periódica: no hay WebSocket todavía, así que esto es lo que hace que Recepción
    // y Doctor vean (con hasta 20s de rezago) las citas que agenda el otro desde su propia pantalla.
    const intervalo = setInterval(cargarCitasDelMes, 20000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, mesActual, añoActual]);

  // Navegación de Meses
  const mesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAñoActual((a) => a - 1);
    } else {
      setMesActual((m) => m - 1);
    }
  };

  const mesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAñoActual((a) => a + 1);
    } else {
      setMesActual((m) => m + 1);
    }
  };

  const irAHoy = () => {
    const hoyDate = new Date();
    setMesActual(hoyDate.getMonth());
    setAñoActual(hoyDate.getFullYear());
    setFechaSeleccionada(hoy());
  };

  // Bloquear / Desbloquear fecha seleccionada
  const toggleBloqueoFecha = (f: string) => {
    const yaBloqueada = fechasBloqueadas.includes(f);
    const nuevas = yaBloqueada ? fechasBloqueadas.filter((x) => x !== f) : [...fechasBloqueadas, f];
    setFechasBloqueadas(nuevas);
    try {
      localStorage.setItem(claveFechasBloqueadas(tenantId), JSON.stringify(nuevas));
      window.dispatchEvent(new Event("aurora_agenda_updated"));
    } catch {}
    dispararToast(yaBloqueada ? `✓ Fecha ${f} desbloqueada para consultas.` : `🔒 Fecha ${f} bloqueada (No laborable).`);
    onCambio();
  };

  const estaBloqueadaSeleccionada = fechasBloqueadas.includes(fechaSeleccionada);

  // Estado de paciente detectado automáticamente
  const [pacienteDetectado, setPacienteDetectado] = useState<{
    nombre: string;
    cedula: string;
    telefono: string;
    origen: string;
  } | null>(null);

  const autoDetectarPaciente = (queryRaw: string) => {
    const qTrim = queryRaw.trim();
    if (!qTrim || qTrim.length < 3) {
      setPacienteDetectado(null);
      return;
    }

    const cleanQ = qTrim.toLowerCase().replace(/[^a-z0-9]/g, "");
    const rawDigitsQ = qTrim.replace(/\D/g, "");

    // Función de comparación flexible de identificaciones
    const coincide = (idVal?: string | null) => {
      if (!idVal) return false;
      const str = idVal.trim().toLowerCase();
      const cleanStr = str.replace(/[^a-z0-9]/g, "");
      const rawDigitsStr = str.replace(/\D/g, "");
      return (
        cleanStr === cleanQ ||
        (rawDigitsQ.length >= 4 && rawDigitsStr === rawDigitsQ) ||
        (rawDigitsQ.length >= 5 && rawDigitsStr.endsWith(rawDigitsQ)) ||
        str === qTrim.toLowerCase()
      );
    };

    // 1. Buscar en lista de pacientes recibida por props
    if (pacientes && Array.isArray(pacientes)) {
      const match = pacientes.find((p) => coincide(p.identificacion));
      if (match) {
        llenarCamposConPaciente(match.nombreCompleto, match.identificacion, match.telefono || "", "Base de Datos");
        return;
      }
    }

    // 2. Buscar en Historias Clínicas y Pacientes guardados en localStorage
    const clavesHistorias = [
      "aurora_mediclinic_historias_v2",
      "aurora_mediclinic_historias",
      "aurora_mediclinic_historias_locales",
      "aurora_mediclinic_pacientes"
    ];
    for (const key of clavesHistorias) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const found = list.find((item: any) =>
              coincide(item.pacienteCedula || item.cedula || item.identificacion || item.idCard)
            );
            if (found) {
              const nom = found.pacienteNombre || found.nombreCompleto || `${found.nombres || ""} ${found.apellidos || ""}`.trim();
              const ced = found.pacienteCedula || found.cedula || found.identificacion || qTrim;
              const tel = found.pacienteTelefono || found.telefono || found.phone || "";
              if (nom) {
                llenarCamposConPaciente(nom, ced, tel, "Historia Clínica");
                return;
              }
            }
          }
        }
      } catch {}
    }

    // 3. Buscar en Sala de Espera de este mismo médico (las citas ya viven en el backend, no aquí)
    const clavesOtras = [claveSalaEsperaTurnos(tenantId)];
    for (const key of clavesOtras) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const found = list.find((item: any) =>
              coincide(item.pacienteCedula || item.cedula)
            );
            if (found) {
              const nom = found.pacienteNombre || `${found.nombres || ""} ${found.apellidos || ""}`.trim();
              const ced = found.pacienteCedula || found.cedula || qTrim;
              const tel = found.pacienteTelefono || found.telefono || "";
              if (nom) {
                llenarCamposConPaciente(nom, ced, tel, "Registro Previo");
                return;
              }
            }
          }
        }
      } catch {}
    }

    setPacienteDetectado(null);
  };

  const llenarCamposConPaciente = (nombreCompleto: string, cedula: string, telefono: string, origen: string) => {
    const partes = nombreCompleto.trim().split(" ");
    if (partes.length >= 2) {
      setFormNombres(partes.slice(0, Math.ceil(partes.length / 2)).join(" "));
      setFormApellidos(partes.slice(Math.ceil(partes.length / 2)).join(" "));
    } else {
      setFormNombres(nombreCompleto.trim());
      setFormApellidos("");
    }
    if (telefono && telefono !== "S/T") {
      setFormTelefono(telefono);
    }
    setPacienteDetectado({
      nombre: nombreCompleto.trim(),
      cedula,
      telefono: telefono || "",
      origen
    });
  };

  // Buscar paciente por cédula manual (al hacer clic en botón de lupa)
  const handleBuscarCedula = () => {
    autoDetectarPaciente(formCedula);
    if (!formCedula.trim()) {
      dispararToast("Ingresa un número de cédula para buscar.");
    }
  };

  const limpiarFormulario = () => {
    setFormCedula("");
    setFormNombres("");
    setFormApellidos("");
    setFormTelefono("");
    setFormHora("09:00 AM");
    setFormMotivo("");
    setPacienteDetectado(null);
  };

  // Busca el paciente por cédula ya sea en la lista cargada, o en el backend; si no existe en
  // ningún lado, lo crea — así agendar una cita para alguien nuevo no exige un paso aparte.
  const resolverPacienteId = async (): Promise<number> => {
    const cedula = formCedula.trim();
    if (cedula && pacientes) {
      const cedulaLimpia = cedula.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = pacientes.find((p) => (p.identificacion || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cedulaLimpia);
      if (match) return match.id;
    }
    if (cedula) {
      const encontrado = await buscarPacientePorIdentificacion(tenantId, cedula);
      if (encontrado) return encontrado.id;
    }
    const creado = await crearPaciente(tenantId, {
      identificacion: cedula || `SC-${Date.now()}`,
      nombres: formNombres.trim(),
      apellidos: formApellidos.trim(),
      telefono: formTelefono.trim() || undefined,
    });
    return creado.id;
  };

  // Guardar nueva cita — va directo al backend (tabla salud_citas), no a localStorage.
  const handleGuardarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estaBloqueadaSeleccionada) {
      alert("⚠️ La fecha seleccionada se encuentra BLOQUEADA. Desbloquéala primero para poder agendar pacientes.");
      return;
    }
    const nombreCompleto = `${formNombres.trim()} ${formApellidos.trim()}`.trim();
    if (!nombreCompleto) {
      alert("Por favor ingresa el nombre del paciente.");
      return;
    }

    setGuardando(true);
    try {
      const pacienteId = await resolverPacienteId();
      const horaInicio24 = horaAmPmA24(formHora);
      await agendarCita(tenantId, {
        pacienteId,
        fecha: fechaSeleccionada,
        horaInicio: horaInicio24,
        horaFin: sumarMinutos(horaInicio24, 30),
        motivo: formMotivo.trim() || "Consulta Médica",
      });
      limpiarFormulario();
      cargarCitasDelMes();
      onCambio();
      dispararToast(`¡Cita agendada con éxito para ${nombreCompleto} a las ${formHora}!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo agendar la cita.");
    } finally {
      setGuardando(false);
    }
  };

  // Cancelar cita — la agenda nunca borra el registro (queda como CANCELADA, con trazabilidad).
  const handleEliminarCita = async (id: string) => {
    if (!confirm("¿Estás seguro de cancelar esta cita?")) return;
    try {
      await actualizarEstadoCita(Number(id), "CANCELADA");
      cargarCitasDelMes();
      onCambio();
      dispararToast("Cita cancelada.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cancelar la cita.");
    }
  };

  // Reprogramar cita
  const abrirModalReprogramar = (cita: CitaAgendaItem) => {
    setCitaParaReprogramar(cita);
    setReprogFecha(cita.fecha);
    setReprogHora(cita.hora || "09:00 AM");
  };

  const ejecutarReprogramacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citaParaReprogramar) return;
    if (fechasBloqueadas.includes(reprogFecha)) {
      alert("La fecha destino está bloqueada. Elige otra fecha.");
      return;
    }

    setReprogramando(true);
    try {
      const horaInicio24 = horaAmPmA24(reprogHora);
      await reprogramarCita(Number(citaParaReprogramar.id), reprogFecha, horaInicio24, sumarMinutos(horaInicio24, 30));
      cargarCitasDelMes();
      onCambio();
      dispararToast(`✓ Cita reprogramada para el ${reprogFecha} a las ${reprogHora}`);
      setCitaParaReprogramar(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo reprogramar la cita.");
    } finally {
      setReprogramando(false);
    }
  };

  // Pasar paciente directamente a sala de espera
  const handlePasarASalaEspera = (cita: CitaAgendaItem) => {
    try {
      const turnosRaw = localStorage.getItem(claveSalaEsperaTurnos(tenantId));
      const turnosList: TurnoSalaEspera[] = turnosRaw ? JSON.parse(turnosRaw) : [];
      const maxNum = turnosList.reduce((max, t) => Math.max(max, t.turnoNumero || 0), 0);
      const nuevoNumero = maxNum + 1;
      const codigoTurno = `T-${String(nuevoNumero).padStart(2, "0")}`;

      const nuevoTurno: TurnoSalaEspera = {
        id: `turno-${Date.now()}`,
        turnoNumero: nuevoNumero,
        codigoTurno,
        pacienteId: null,
        pacienteNombre: cita.pacienteNombre,
        pacienteCedula: cita.pacienteCedula,
        pacienteTelefono: cita.pacienteTelefono,
        horaLlegada: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fecha: hoy(),
        motivo: cita.motivo,
        consultorio: "Consultorio 1 (Doctor)",
        estado: "EN_ESPERA",
        estadoPago: "PENDIENTE",
      };

      localStorage.setItem(claveSalaEsperaTurnos(tenantId), JSON.stringify([...turnosList, nuevoTurno]));
      dispararToast(`¡${cita.pacienteNombre} ingresado a Sala de Espera con Turno ${codigoTurno}!`);
      onCambio();
    } catch {
      alert("Error al transferir paciente a sala de espera.");
    }
  };

  // Mapeo de citas agrupadas por fecha (para conteos en el calendario)
  const citasPorFecha = useMemo(() => {
    const map: Record<string, CitaAgendaItem[]> = {};
    citas.filter((c) => c.estado !== "CANCELADA").forEach((c) => {
      if (!map[c.fecha]) map[c.fecha] = [];
      map[c.fecha].push(c);
    });
    return map;
  }, [citas]);

  // Citas del día seleccionado
  const citasDelDiaSeleccionado = useMemo(() => {
    return (citasPorFecha[fechaSeleccionada] || []).sort((a, b) => a.hora.localeCompare(b.hora));
  }, [citasPorFecha, fechaSeleccionada]);

  // Generación de celdas para el Calendario Mensual Interactivo (Lunes a Domingo)
  const celdasCalendario = useMemo(() => {
    const getDiaSemanaLunes = (d: Date) => {
      const day = d.getDay();
      return day === 0 ? 6 : day - 1;
    };

    const primerDia = new Date(añoActual, mesActual, 1);
    const primerDiaSemana = getDiaSemanaLunes(primerDia);
    const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
    const diasEnMesAnterior = new Date(añoActual, mesActual, 0).getDate();

    const celdas: { dia: number; fechaIso: string; mesActual: boolean; esHoy: boolean }[] = [];
    const hoyStr = hoy();

    // Días remanentes mes anterior
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const diaNum = diasEnMesAnterior - i;
      const mesAnt = mesActual === 0 ? 11 : mesActual - 1;
      const añoAnt = mesActual === 0 ? añoActual - 1 : añoActual;
      const fechaIso = `${añoAnt}-${String(mesAnt + 1).padStart(2, "0")}-${String(diaNum).padStart(2, "0")}`;
      celdas.push({ dia: diaNum, fechaIso, mesActual: false, esHoy: fechaIso === hoyStr });
    }

    // Días del mes actual
    for (let i = 1; i <= diasEnMes; i++) {
      const fechaIso = `${añoActual}-${String(mesActual + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      celdas.push({ dia: i, fechaIso, mesActual: true, esHoy: fechaIso === hoyStr });
    }

    // Días mes siguiente para completar la cuadrícula estándar fija de 42 celdas (6 semanas)
    const totalCeldas = 42;
    const restantes = totalCeldas - celdas.length;
    for (let i = 1; i <= restantes; i++) {
      const mesSig = mesActual === 11 ? 0 : mesActual + 1;
      const añoSig = mesActual === 11 ? añoActual + 1 : añoActual;
      const fechaIso = `${añoSig}-${String(mesSig + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      celdas.push({ dia: i, fechaIso, mesActual: false, esHoy: fechaIso === hoyStr });
    }

    return celdas;
  }, [añoActual, mesActual]);

  // Formato de texto de la fecha seleccionada en español
  const textoFechaLargo = useMemo(() => {
    try {
      const [y, m, d] = fechaSeleccionada.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const diaNom = diasSemana[date.getDay()];
      const mesNom = MESES_NOMBRES[m - 1].toLowerCase();
      return `${diaNom}, ${d} de ${mesNom} de ${y}`;
    } catch {
      return fechaSeleccionada;
    }
  }, [fechaSeleccionada]);

  const [selY, selM, selD] = fechaSeleccionada.split("-");
  const fechaCortaFmt = `${selD}/${selM}/${selY}`;

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
      {/* Toast Notification */}
      {toastAgenda && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-400/30 animate-bounce">
          <IconCheckCircle size={20} />
          <span className="text-xs sm:text-sm font-semibold">{toastAgenda}</span>
        </div>
      )}

      {/* ── BARRA SUPERIOR DE ENCABEZADO Y NAVEGACIÓN ── */}
      <div className="apple-glass rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/30 shadow-inner">
            <IconCalendar size={24} />
          </div>
          <div>
            <h2 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Agenda Médica & Calendario Interactivo
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/60">
              Programación y gestión sincronizada de citas médicas entre Doctor y Secretaría en tiempo real
            </p>
          </div>
        </div>

        {/* Controles de Navegación del Calendario con Ancho Fijo para Estabilidad Total */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={mesAnterior}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-white/80 hover:bg-white dark:hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0 select-none"
              title="Mes Anterior"
            >
              <IconChevronLeft size={13} />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              onClick={irAHoy}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/15 text-teal-600 dark:text-teal-300 transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0 select-none"
              title="Ir a la fecha de hoy"
            >
              <IconCalendar size={13} />
              <span>Hoy</span>
            </button>
            <button
              type="button"
              onClick={mesSiguiente}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-white/80 hover:bg-white dark:hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0 select-none"
              title="Mes Siguiente"
            >
              <span>Siguiente</span>
              <IconChevronRight size={13} />
            </button>
          </div>

          <div className="w-48 text-right font-['Outfit'] font-black text-lg sm:text-xl text-sky-600 dark:text-sky-400 shrink-0 select-none truncate">
            {MESES_NOMBRES[mesActual]} {añoActual}
          </div>
        </div>
      </div>

      {/* ── CUADRÍCULA PRINCIPAL (CALENDARIO A LA IZQUIERDA + DETALLE & AGENDAR A LA DERECHA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ══════════════════════════════════════════════════════════════
            COLUMNA IZQUIERDA: CALENDARIO MENSUAL INTERACTIVO COMPACTO (5 COLS)
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 apple-glass rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2.5">
          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DIAS_SEMANA_HEADERS.map((diaH) => (
              <div
                key={diaH}
                className="text-[10px] font-extrabold font-mono text-slate-500 dark:text-white/60 py-1 uppercase"
              >
                {diaH}
              </div>
            ))}
          </div>

          {/* Celdas de Días Compactas */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {celdasCalendario.map((celda, idx) => {
              const citasEnDia = citasPorFecha[celda.fechaIso] || [];
              const estaBloq = fechasBloqueadas.includes(celda.fechaIso);
              const esSeleccionada = celda.fechaIso === fechaSeleccionada;

              return (
                <div
                  key={idx}
                  onClick={() => setFechaSeleccionada(celda.fechaIso)}
                  className={`min-h-[42px] sm:min-h-[48px] p-1 sm:p-1.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between select-none relative group ${
                    estaBloq && esSeleccionada
                      ? "border-2 border-rose-500 bg-rose-500/20 dark:bg-rose-950/50 shadow-md ring-2 ring-rose-500/30"
                      : estaBloq
                      ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 hover:border-rose-500"
                      : esSeleccionada
                      ? "border-2 border-sky-500 bg-sky-500/15 dark:bg-sky-500/25 shadow-md ring-1 ring-sky-500/30"
                      : celda.mesActual
                      ? "bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 hover:border-sky-400 hover:bg-sky-50/30 dark:hover:bg-white/[0.08]"
                      : "bg-slate-50/40 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-40 hover:opacity-80"
                  }`}
                >
                  {/* Número del día */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-mono font-black ${
                        estaBloq
                          ? "text-rose-600 dark:text-rose-400 text-xs font-black"
                          : esSeleccionada
                          ? "text-sky-700 dark:text-sky-300 text-xs font-black"
                          : celda.esHoy
                          ? "text-teal-600 dark:text-teal-400 font-bold"
                          : celda.mesActual
                          ? "text-slate-800 dark:text-white"
                          : "text-slate-400 dark:text-white/40"
                      }`}
                    >
                      {celda.dia}
                    </span>

                    {celda.esHoy && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-xs" title="Hoy" />
                    )}
                  </div>

                  {/* Badges de Citas o Bloqueado (solo candado SVG limpio sin texto) */}
                  <div className="space-y-0.5 mt-0.5">
                    {estaBloq && (
                      <div className="py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center justify-center shadow-xs">
                        <IconLock size={12} className="stroke-rose-600 dark:stroke-rose-400" />
                      </div>
                    )}

                    {!estaBloq && citasEnDia.length > 0 && (
                      <div className="text-[8.5px] font-black px-1 py-0.5 rounded-md bg-sky-500 text-white dark:bg-sky-600 flex items-center justify-center gap-0.5 shadow-xs truncate">
                        <span>📅</span>
                        <span>{citasEnDia.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            COLUMNA DERECHA: CITAS DEL DÍA + FORMULARIO DE AGENDAMIENTO (7 COLS)
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          {/* ── CARD SUPERIOR: GESTIÓN DE CITAS PARA LA FECHA SELECCIONADA ── */}
          <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div>
                <h3 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white capitalize">
                  {textoFechaLargo}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-white/50">
                  Gestión de citas para el {fechaCortaFmt}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-500/30 text-xs font-bold font-mono shadow-xs">
                {cargandoCitas ? "Actualizando…" : `${citasDelDiaSeleccionado.length} ${citasDelDiaSeleccionado.length === 1 ? "cita" : "citas"}`}
              </span>
            </div>

            {/* Botón de Bloqueo / Desbloqueo de la fecha */}
            <div>
              <button
                type="button"
                onClick={() => toggleBloqueoFecha(fechaSeleccionada)}
                className={`w-full py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  estaBloqueadaSeleccionada
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-slate-100 hover:bg-rose-500/10 text-slate-700 hover:text-rose-600 dark:bg-white/5 dark:text-white/80 dark:hover:bg-rose-500/20 border border-slate-300/80 dark:border-white/10 hover:border-rose-500/40"
                }`}
              >
                {estaBloqueadaSeleccionada ? (
                  <>
                    <IconUnlock size={14} className="stroke-white" />
                    <span>Desbloquear Fecha (Habilitar Consultas)</span>
                  </>
                ) : (
                  <>
                    <IconLock size={14} className="stroke-rose-600 dark:stroke-rose-400" />
                    <span>Bloquear Esta Fecha (Vacaciones/Congreso)</span>
                  </>
                )}
              </button>
            </div>

            {/* Listado de citas agendadas */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {citasDelDiaSeleccionado.length === 0 ? (
                <div className="py-6 text-center space-y-1.5">
                  <IconCalendar size={28} className="mx-auto text-slate-300 dark:text-white/20" />
                  <div className="text-xs font-bold text-slate-700 dark:text-white/80">
                    No hay citas agendadas para esta fecha
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-white/50">
                    Usa el formulario inferior para programar una nueva cita
                  </div>
                </div>
              ) : (
                citasDelDiaSeleccionado.map((cita) => (
                  <div
                    key={cita.id}
                    className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-sky-400/60 transition-all space-y-2 group shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 font-mono font-black text-xs border border-sky-500/25">
                          {cita.hora}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {cita.pacienteNombre}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cita.pacienteCedula}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-white/70">
                      <div className="truncate max-w-[200px]" title={cita.motivo}>
                        {cita.motivo}
                      </div>
                      {cita.pacienteTelefono && cita.pacienteTelefono !== "S/T" && (
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Hola ${cita.pacienteNombre}, le recordamos su cita médica programada para el día ${fechaCortaFmt} a las ${cita.hora}.`;
                            abrirWhatsAppDirecto(cita.pacienteTelefono, msg);
                          }}
                          className="text-emerald-600 hover:text-emerald-500 font-bold flex items-center gap-1 text-[10px] cursor-pointer hover:underline"
                          title="Enviar recordatorio WhatsApp"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>WhatsApp:</span>
                          <span>{cita.pacienteTelefono}</span>
                        </button>
                      )}
                    </div>

                    {/* Acciones de Cita */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => handlePasarASalaEspera(cita)}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Pasar paciente a Sala de Espera"
                      >
                        <IconHourglass size={11} />
                        <span>Sala Espera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirModalReprogramar(cita)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <IconCalendar size={11} />
                        <span>Reprogramar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEliminarCita(cita.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 text-[11px] transition-all cursor-pointer"
                        title="Eliminar Cita"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── CARD INFERIOR: FORMULARIO AGENDAR NUEVA CITA (+ AGENDAR NUEVA CITA) ── */}
          <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <h3 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-sky-600 dark:text-sky-400 text-lg font-black">+</span>
                <span>Agendar Nueva Cita</span>
              </h3>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/15 text-[10px] font-bold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>⟲</span>
                <span>Limpiar</span>
              </button>
            </div>

            <form onSubmit={handleGuardarCita} className="space-y-3.5 text-xs">
              {/* Cédula de Identidad con buscador */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-white/90 flex items-center justify-between">
                  <span>Cédula de Identidad *</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    required
                    type="text"
                    placeholder="Ej. V-30398619 o 1098765432 (Venezuela / Colombia)"
                    value={formCedula}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormCedula(v);
                      autoDetectarPaciente(v);
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBuscarCedula}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-sky-500 hover:text-white transition-all cursor-pointer border border-slate-300 dark:border-white/15 shadow-xs"
                    title="Buscar paciente registrado por cédula"
                  >
                    <IconSearch size={15} />
                  </button>
                </div>

                {/* Badge de detección de paciente */}
                {pacienteDetectado && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold animate-fade-in shadow-xs">
                    <IconCheckCircle size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      ✓ Paciente detectado ({pacienteDetectado.origen}): <strong className="font-black underline">{pacienteDetectado.nombre}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">
                    Nombres *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Nombres"
                    value={formNombres}
                    onChange={(e) => setFormNombres(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">
                    Apellidos *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Apellidos"
                    value={formApellidos}
                    onChange={(e) => setFormApellidos(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/90">
                  Teléfono / WhatsApp *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. 0414-1234567"
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              {/* Hora de la Cita & Motivo / Consulta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">
                    Hora de la Cita *
                  </label>
                  <select
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {HORAS_DISPONIBLES_AGENDA.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-white/90">
                    Motivo / Consulta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Control, Evaluación..."
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-black/20 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Botón Guardar Cita en Agenda */}
              <button
                type="submit"
                disabled={guardando || estaBloqueadaSeleccionada}
                className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-sky-600 via-sky-500 to-teal-600 hover:from-sky-500 hover:to-teal-500 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <IconCalendar size={16} />
                <span>{guardando ? "Agendando..." : "Guardar Cita en Agenda"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── MODAL DE REPROGRAMACIÓN DE CITA ── */}
      {citaParaReprogramar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm apple-glass rounded-3xl p-6 shadow-2xl border border-white/20 bg-white/95 dark:bg-[#071a2e]/95 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-300">
                  <IconCalendar size={18} />
                </div>
                <h3 className="font-['Outfit'] font-black text-base">Reprogramar Cita Médica</h3>
              </div>
              <button
                type="button"
                onClick={() => setCitaParaReprogramar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-white">{citaParaReprogramar.pacienteNombre}</div>
              <div className="text-slate-500 font-mono">C.I: {citaParaReprogramar.pacienteCedula} · Motivo: {citaParaReprogramar.motivo}</div>
            </div>

            <form onSubmit={ejecutarReprogramacion} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">Nueva Fecha de Consulta</label>
                <input
                  required
                  type="date"
                  value={reprogFecha}
                  onChange={(e) => setReprogFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-white/80">Nueva Hora de Consulta</label>
                <select
                  value={reprogHora}
                  onChange={(e) => setReprogHora(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 font-mono font-bold cursor-pointer"
                >
                  {HORAS_DISPONIBLES_AGENDA.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCitaParaReprogramar(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reprogramando}
                  className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {reprogramando ? "Guardando…" : "Confirmar Cambio"}
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
// RESÚMENES FINANCIEROS & HISTORIAL DE CIERRES AUDITADOS
// ══════════════════════════════════════════════════════════════════════════
function ResumenesFinancieros({
  ingresosHoy,
  citasHoy,
  cobrosLocales,
  historialCierres,
  config,
  rol,
  onEliminarCobro,
  onLimpiarCobros,
  onEliminarCierre,
  onLimpiarCierres,
  onVerDocumento,
}: {
  ingresosHoy: number | null;
  citasHoy: CitaMedica[] | null;
  cobrosLocales: CobroItem[];
  historialCierres: CierreCajaData[];
  config: any;
  rol?: RolVista;
  onEliminarCobro?: (index: number) => void;
  onLimpiarCobros?: () => void;
  onEliminarCierre?: (index: number) => void;
  onLimpiarCierres?: () => void;
  onVerDocumento?: (payload: DocumentoVisorPayload) => void;
}) {
  if (rol === "SECRETARIA") {
    return (
      <div className="apple-glass rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto my-12 border border-slate-200/80 dark:border-white/10 shadow-lg bg-white/90 dark:bg-[#071a2e]/90 space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30 shadow-inner">
          <IconLock size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Módulo Financiero Protegido
          </h3>
          <p className="text-xs text-slate-600 dark:text-white/70 max-w-sm mx-auto leading-relaxed">
            El acceso a los resúmenes financieros, balances de caja y auditorías contables está restringido para el perfil de Recepción y Secretaría.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-mono font-bold text-slate-500 dark:text-white/50">
            🔒 Requiere autenticación del Doctor Titular
          </span>
        </div>
      </div>
    );
  }

  const totalUSD = cobrosLocales
    .filter((c) => c.moneda === "USD" || (!c.moneda && (c.metodoPago?.toUpperCase().includes("USD") || (c.montoUSD !== undefined && c.montoUSD > 0 && !c.montoVES))))
    .reduce((s, x) => s + (x.montoUSD || (x.moneda === "USD" ? x.montoCobrado || 0 : 0)), 0);

  const totalVES = cobrosLocales
    .filter((c) => c.moneda === "VES" || (!c.moneda && (c.metodoPago?.toUpperCase().includes("VES") || c.metodoPago?.toUpperCase().includes("PUNTO") || c.metodoPago?.toUpperCase().includes("PAGO M") || (c.montoVES !== undefined && c.montoVES > 0 && !c.montoUSD))))
    .reduce((s, x) => s + (x.montoVES || (x.moneda === "VES" ? x.montoCobrado || 0 : 0)), 0);

  const totalCOP = cobrosLocales
    .filter((c) => c.moneda === "COP" || (!c.moneda && (c.metodoPago?.toUpperCase().includes("COP") || (c.montoCOP !== undefined && c.montoCOP > 0))))
    .reduce((s, x) => s + (x.montoCOP || (x.moneda === "COP" ? x.montoCobrado || 0 : 0)), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Dólares Recibidos (USD)" val={`$${totalUSD.toFixed(2)}`} sub="Recaudación en divisas USD" color="#10b981" />
        <KpiCard label="Bolívares Recibidos (VES)" val={`Bs. ${totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`} sub="Recaudación en moneda nacional" color="#0ea5e9" />
        <KpiCard label="Pesos Recibidos (COP)" val={`$${totalCOP.toLocaleString("es-CO")}`} sub="Recaudación en Pesos COP" color="#a855f7" />
        <KpiCard label="Consultas Pagadas" val={String(cobrosLocales.length)} sub="Transacciones de caja hoy" color="#f59e0b" />
      </div>

      {/* Cobros del día */}
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Auditoría de Cobros de Hoy</h4>
            <p className="text-[11px] text-slate-500 dark:text-white/50">Montos clasificados estrictamente por la moneda recibida</p>
          </div>
          <div className="flex items-center gap-2">
            {onLimpiarCobros && cobrosLocales.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("¿Estás seguro de que deseas vaciar todos los cobros registrados en la caja de hoy?")) {
                    onLimpiarCobros();
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-slate-200/80 dark:border-white/10 hover:border-rose-500/30 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                title="Vaciar todos los cobros registrados de hoy"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Vaciar Cobros
              </button>
            )}
            <button
              onClick={() => {
                const dataHoy: CierreCajaData = {
                  clinicaNombre: config?.clinicaNombre || "Centro Médico Especializado",
                  doctorNombre: config?.doctorNombre || "Médico Titular",
                  responsableNombre: config?.secretariaNombre || config?.doctorNombre || "Recepción y Caja",
                  fecha: hoy(),
                  horaCierre: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  tasaBCV: config?.tasaBCV || 56.4,
                  tasaCOP: config?.tasaCOP || 4200,
                  cobros: cobrosLocales,
                  totalUSD,
                  totalVES,
                  totalCOP,
                  totalPacientes: cobrosLocales.length,
                };
                if (onVerDocumento) {
                  onVerDocumento({ tipo: "CIERRE_CAJA", data: dataHoy });
                } else {
                  generarPdfCierreCaja(dataHoy);
                }
              }}
              className="px-3 py-1 rounded-lg border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar PDF
            </button>
          </div>
        </div>

        {cobrosLocales.length === 0 ? (
          <p className="text-xs text-slate-400">No hay cobros registrados en la caja de hoy.</p>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
            {cobrosLocales.map((c, i) => {
              const esVes = c.moneda === "VES" || (c.montoVES !== undefined && c.montoVES > 0 && !c.montoUSD);
              const esCop = c.moneda === "COP" || (c.montoCOP !== undefined && c.montoCOP > 0);

              return (
                <div key={i} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {c.pacienteNombre} <span className="text-slate-400 font-normal">({c.identificacion})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.metodoPago} {c.referencia && c.referencia !== "N/A" ? `· Ref: ${c.referencia}` : ""} · {c.hora}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {esVes ? (
                        <div className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                          Bs. {(c.montoVES || c.montoCobrado || 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </div>
                      ) : esCop ? (
                        <div className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                          ${(c.montoCOP || c.montoCobrado || 0).toLocaleString("es-CO")} COP
                        </div>
                      ) : (
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ${(c.montoUSD || c.montoCobrado || 0).toFixed(2)} USD
                        </div>
                      )}
                    </div>
                    {onEliminarCobro && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar cobro de ${c.pacienteNombre}?`)) {
                            onEliminarCobro(i);
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors opacity-60 hover:opacity-100"
                        title="Eliminar este cobro"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de cierres de caja anteriores */}
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Historial de Cierres de Caja Guardados</h4>
            <p className="text-[11px] text-slate-500 dark:text-white/50">Auditorías y cierres consolidados</p>
          </div>
          {onLimpiarCierres && historialCierres.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("¿Estás seguro de que deseas borrar TODO el historial de auditorías y cierres guardados?")) {
                  onLimpiarCierres();
                }
              }}
              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-slate-200/80 dark:border-white/10 hover:border-rose-500/30 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-all"
              title="Borrar todas las auditorías guardadas"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Vaciar Historial
            </button>
          )}
        </div>

        {historialCierres.length === 0 ? (
          <p className="text-xs text-slate-400">No hay cierres de caja históricos guardados.</p>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
            {historialCierres.map((cierre, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Cierre del {cierre.fecha} ({cierre.horaCierre})</div>
                  <div className="text-[11px] text-slate-500">{cierre.totalPacientes} pacientes · Responsable: {cierre.doctorNombre}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    {cierre.totalUSD > 0 && (
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${cierre.totalUSD.toFixed(2)} USD
                      </div>
                    )}
                    {cierre.totalVES > 0 && (
                      <div className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                        Bs. {cierre.totalVES.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {(cierre.totalCOP || 0) > 0 && (
                      <div className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                        ${(cierre.totalCOP || 0).toLocaleString("es-CO")} COP
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (onVerDocumento) {
                          onVerDocumento({
                            tipo: "CIERRE_CAJA",
                            data: {
                              ...cierre,
                              responsableNombre: config?.secretariaNombre || cierre.responsableNombre || cierre.doctorNombre,
                            },
                          });
                        } else {
                          generarPdfCierreCaja(cierre);
                        }
                      }}
                      className="px-2 py-1 rounded-md border border-teal-500/30 text-teal-600 dark:text-teal-400 text-[11px] font-medium hover:bg-teal-500/10 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Abrir visor & exportar PDF de esta auditoría"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      PDF
                    </button>
                    {onEliminarCierre && (
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la auditoría/cierre del ${cierre.fecha} (${cierre.horaCierre})?`)) {
                            onEliminarCierre(i);
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors opacity-60 hover:opacity-100"
                        title="Eliminar esta auditoría"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
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
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Nombre de la Secretaria / Recepción</label>
            <input value={form.secretariaNombre || ""} onChange={(e) => setForm({ ...form, secretariaNombre: e.target.value })} placeholder="Ej. Ana Pérez" className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
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

      <HistorialImportacionesSalud claveDoctor={config.claveDoctor} />
    </div>
  );
}
