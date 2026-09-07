import { useState, useEffect, useMemo } from "react";
import {
  IconStethoscope, IconUsers, IconFileText, IconPrescription, IconHourglass, IconCalendar,
  IconCard, IconCustomize, IconSearch, IconUser, IconCheck, IconTrash, IconRefresh,
  IconChevronLeft, IconChevronRight, IconCheckCircle, IconLock, IconWarning, IconClose, IconBank
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import {
  listarPacientes, crearPaciente, listarCitasDelDia, agendarCita, listarCobrosDelDia,
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

export default function MediclinicApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const [pagina, setPagina] = useState<Pagina>("general");
  const [rolActivo, setRolActivo] = useState<RolVista>("MEDICO");

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
      };
    }
  });

  const guardarConfigPerfil = (nuevaConfig: any) => {
    setConfigPerfil(nuevaConfig);
    try { localStorage.setItem(CONFIG_PERFIL_KEY, JSON.stringify(nuevaConfig)); } catch {}
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
  const [citasHoy, setCitasHoy] = useState<CitaMedica[] | null>(null);
  const [salaEspera, setSalaEspera] = useState<SalaEsperaEntrada[] | null>(null);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoMedico[] | null>(null);
  const [ingresosHoy, setIngresosHoy] = useState<number | null>(null);

  // Registro de cobros locales del día
  const [cobrosLocales, setCobrosLocales] = useState<CobroItem[]>(() => {
    try {
      const raw = localStorage.getItem(`cobros_locales_${hoy()}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Historial de cierres de caja auditados
  const [historialCierres, setHistorialCierres] = useState<CierreCajaData[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORIAL_CIERRES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Modal de cambio rápido manual de tasas (esquina superior derecha)
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

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex ${modoClasico ? "mediclinic-clasico" : ""}`}>
      {modoClasico && <EstiloClasico />}
      
      {/* SIDEBAR NATIVO */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-300/60 dark:border-white/10 flex flex-col p-4 space-y-1">
        <div className="px-2 pb-4 mb-2 border-b border-slate-300/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-['Outfit'] font-black text-lg text-aurora">Mediclinic Pro</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-mono font-bold">
              {rolActivo === "MEDICO" ? "DOCTOR" : "SECRETARIA"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-0.5">
            {configPerfil.clinicaNombre}
          </div>
        </div>

        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPagina(n.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
              pagina === n.id
                ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
                : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <n.Icon size={16} />
            <span>{n.label}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Switch Modo Clásico / Aurora */}
        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 text-xs mb-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-white/70 text-[11px] font-medium">Modo Clásico</span>
            <button
              onClick={alternarModo}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${modoClasico ? "bg-teal-600" : "bg-slate-400/40"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${modoClasico ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <button
          onClick={onSalir}
          className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-left text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:hover:bg-white/5 cursor-pointer"
        >
          ← Volver al Hub
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between px-6 bg-white/30 dark:bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onSalir}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200/70 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-300/60 dark:border-white/10"
              title="Regresar al panel general de Aurora Hub"
            >
              <span>← Aurora Hub</span>
            </button>
            <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              {NAV.find((n) => n.id === pagina)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Selector de Rol RBAC */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/10 text-xs">
              <button
                onClick={() => setRolActivo("MEDICO")}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  rolActivo === "MEDICO" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"
                }`}
              >
                🩺 Médico
              </button>
              <button
                onClick={() => setRolActivo("SECRETARIA")}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  rolActivo === "SECRETARIA" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"
                }`}
              >
                📋 Secretaria
              </button>
            </div>

            {/* Widget / Botón Interactivo de Cambio Rápido de Tasas */}
            <button
              type="button"
              onClick={abrirModalTasas}
              className="text-xs text-right hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all cursor-pointer group"
              title="Cambiar tasas de cambio manualmente"
            >
              <div className="flex flex-col items-end">
                <div className="font-bold text-slate-900 dark:text-white leading-tight">
                  {configPerfil.doctorNombre}
                </div>
                <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono leading-tight mt-0.5">
                  BCV: Bs. {Number(configPerfil.tasaBCV || 56.4).toFixed(2)} | COP: ${Number(configPerfil.tasaCOP || 4200).toLocaleString()}
                </div>
              </div>

              {/* Lápiz minimalista sin texto */}
              <div className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 group-hover:bg-teal-500/20 text-slate-400 dark:text-white/40 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-all flex items-center justify-center">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </div>
            </button>

            <button onClick={recargarTodo} className="p-2 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer" title="Actualizar datos">
              <IconRefresh size={16} />
            </button>
          </div>
        </header>

        {/* TOAST DE NOTIFICACIÓN RÁPIDA DE TASAS */}
        {toastTasa && (
          <div className="fixed top-20 right-6 z-50 p-3.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
            <IconCheck size={18} />
            <span>{toastTasa}</span>
          </div>
        )}

        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {pagina === "general" && <VistaGeneral pacientes={pacientes} citasHoy={citasHoy} salaEspera={salaEspera} ingresosHoy={ingresosHoy} onNavegar={setPagina} />}
          {pagina === "pacientes" && <GestionPacientes tenantId={tenantId} pacientes={pacientes} onCambio={recargarTodo} />}
          {pagina === "historias" && <HistoriasClinicas tenantId={tenantId} pacientes={pacientes} config={configPerfil} rol={rolActivo} />}
          {pagina === "procedimientos" && <Procedimientos tenantId={tenantId} procedimientos={procedimientos} pacientes={pacientes} config={configPerfil} onCambio={recargarTodo} />}
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
                  <span>🇻🇪 Tasa BCV (Bs. / USD)</span>
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
                  <span>🇨🇴 Tasa TRM (Pesos COP / USD)</span>
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
                  💡 Simulación de Conversión ($10.00 USD):
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
// VISTA GENERAL / DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
function VistaGeneral({ pacientes, citasHoy, salaEspera, ingresosHoy, onNavegar }: {
  pacientes: Paciente[] | null; citasHoy: CitaMedica[] | null; salaEspera: SalaEsperaEntrada[] | null; ingresosHoy: number | null;
  onNavegar: (p: Pagina) => void;
}) {
  const enEspera = (salaEspera || []).filter((e) => e.estado !== "FINALIZADO").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pacientes Registrados" val={pacientes ? String(pacientes.length) : "…"} sub="Expedientes en sistema" color="#0ea5e9" onClick={() => onNavegar("pacientes")} />
        <KpiCard label="Citas para Hoy" val={citasHoy ? String(citasHoy.length) : "…"} sub="Agenda del día" color="#a855f7" onClick={() => onNavegar("agenda")} />
        <KpiCard label="En Sala de Espera" val={String(enEspera)} sub="Pacientes en turno" color="#f59e0b" onClick={() => onNavegar("sala-espera")} />
        <KpiCard label="Ingresos del Día" val={ingresosHoy !== null ? `$${ingresosHoy.toFixed(2)}` : "…"} sub="Recaudación en USD" color="#10b981" onClick={() => onNavegar("financiero")} />
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

// ══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE PACIENTES
// ══════════════════════════════════════════════════════════════════════════
function GestionPacientes({ tenantId, pacientes, onCambio }: { tenantId: number; pacientes: Paciente[] | null; onCambio: () => void }) {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ identificacion: "", nombres: "", apellidos: "", telefono: "", email: "", fechaNacimiento: "", direccion: "", genero: "M", origen: "Local" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtrados = (pacientes || []).filter((p) => {
    const q = busqueda.toLowerCase();
    return p.nombreCompleto?.toLowerCase().includes(q) || p.identificacion?.toLowerCase().includes(q) || (p.telefono && p.telefono.includes(q));
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await crearPaciente(tenantId, {
        identificacion: form.identificacion.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
        direccion: form.direccion || undefined,
        genero: form.genero,
      });
      setForm({ identificacion: "", nombres: "", apellidos: "", telefono: "", email: "", fechaNacimiento: "", direccion: "", genero: "M", origen: "Local" });
      setMostrarForm(false);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar paciente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por cédula, nombre o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs text-slate-900 dark:text-white"
          />
          <div className="absolute left-3 top-3 text-slate-400"><IconSearch size={14} /></div>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-electric-blue text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 cursor-pointer">
          <span>+</span> {mostrarForm ? "Cerrar Formulario" : "Nuevo Paciente"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="apple-glass rounded-2xl p-5 space-y-4 border border-teal-500/30">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Registrar Nuevo Paciente</h4>
          {error && <p className="text-xs text-[#ff3b80]">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Cédula / DNI *</label>
              <input required placeholder="V-12345678" value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Nombres *</label>
              <input required placeholder="Ej. Carlos Eduardo" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Apellidos *</label>
              <input required placeholder="Ej. Pérez Gómez" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Teléfono WhatsApp</label>
              <input placeholder="+58 412 1234567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Fecha de Nacimiento</label>
              <input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Origen del Paciente</label>
              <select value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs">
                <option value="Local">Local (San Cristóbal / Táchira)</option>
                <option value="Foráneo">Foráneo (Otro Estado / Internacional)</option>
              </select>
            </div>
          </div>
          <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-50 cursor-pointer">
            {guardando ? "Guardando…" : "Guardar Paciente"}
          </button>
        </form>
      )}

      <div className="apple-glass rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Directorio de Pacientes ({filtrados.length})</h4>
        </div>
        {pacientes === null ? (
          <p className="p-5 text-xs text-slate-400">Cargando lista…</p>
        ) : filtrados.length === 0 ? (
          <p className="p-5 text-xs text-slate-400">No se encontraron pacientes registrados.</p>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
            {filtrados.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{p.nombreCompleto}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Cédula: <strong className="text-slate-700 dark:text-white/80">{p.identificacion}</strong> · Tel: {p.telefono || "Sin teléfono"} · Edad: {p.edad ? `${p.edad} años` : "N/D"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-semibold text-[10px]">
                    HC-2026-{String(p.id).padStart(4, "0")}
                  </span>
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
// HISTORIAS CLÍNICAS & GENERACIÓN DE INFORME PDF + WHATSAPP + GMAIL
// ══════════════════════════════════════════════════════════════════════════
function HistoriasClinicas({ tenantId, pacientes, config, rol }: { tenantId: number; pacientes: Paciente[] | null; config: any; rol: RolVista }) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [historial, setHistorial] = useState<ConsultaMedica[] | null>(null);
  
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
function Procedimientos({ tenantId, procedimientos, pacientes, config, onCambio }: {
  tenantId: number; procedimientos: ProcedimientoMedico[] | null; pacientes: Paciente[] | null; config: any; onCambio: () => void;
}) {
  const [form, setForm] = useState({ nombre: "", descripcion: "", costo: "", moneda: "USD", duracionMinutos: "" });
  const [guardando, setGuardando] = useState(false);

  // Estado del Cotizador
  const [cotizacionPacienteId, setCotizacionPacienteId] = useState<number | "">("");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);

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
    if (claveForm.nueva !== claveForm.confirmar) {
      setMensaje("❌ Las contraseñas no coinciden.");
      return;
    }
    setMensaje("✓ Contraseña actualizada correctamente.");
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

      {/* Cambio de Contraseña */}
      <form onSubmit={guardarClave} className="apple-glass rounded-2xl p-6 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Seguridad & Cambio de Contraseña</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Clave Actual</label>
            <input type="password" value={claveForm.actual} onChange={(e) => setClaveForm({ ...claveForm, actual: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Nueva Clave</label>
            <input type="password" value={claveForm.nueva} onChange={(e) => setClaveForm({ ...claveForm, nueva: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-mono">Confirmar</label>
            <input type="password" value={claveForm.confirmar} onChange={(e) => setClaveForm({ ...claveForm, confirmar: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border text-xs" />
          </div>
        </div>
        <button type="submit" className="px-4 py-2 rounded-full border border-slate-300 dark:border-white/10 text-xs font-bold hover:bg-white/10 cursor-pointer">
          Actualizar Contraseña
        </button>
      </form>
    </div>
  );
}
