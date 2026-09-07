import { useState, useEffect, useMemo } from "react";
import {
  IconStethoscope, IconUsers, IconFileText, IconPrescription, IconHourglass, IconCalendar,
  IconCard, IconCustomize, IconSearch, IconUser, IconCheck, IconTrash, IconRefresh,
  IconChevronLeft, IconChevronRight, IconCheckCircle,
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
  type CobroItem, type CierreCajaData, type ConsultaReportData
} from "../utils/pdfReports";

type Pagina = "general" | "pacientes" | "historias" | "procedimientos" | "sala-espera" | "agenda" | "financiero" | "configuracion";

const NAV: { id: Pagina; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: "general", label: "Vista General", Icon: IconCustomize },
  { id: "pacientes", label: "Gestión de Pacientes", Icon: IconUsers },
  { id: "historias", label: "Historias Clínicas", Icon: IconFileText },
  { id: "procedimientos", label: "Procedimientos / Cotizaciones", Icon: IconPrescription },
  { id: "sala-espera", label: "Sala de Espera & Caja", Icon: IconHourglass },
  { id: "agenda", label: "Agenda Médica & Calendario", Icon: IconCalendar },
  { id: "financiero", label: "Resúmenes Financieros", Icon: IconCard },
  { id: "configuracion", label: "Configuración & Perfil", Icon: IconCustomize },
];

const hoy = () => new Date().toISOString().slice(0, 10);
const TASA_BCV_DEFAULT = 56.40;

const MODO_CLASICO_KEY = "aurora_mediclinic_modo_clasico";
const FECHAS_BLOQUEADAS_KEY = "aurora_mediclinic_fechas_bloqueadas";
const HISTORIAL_CIERRES_KEY = "aurora_mediclinic_historial_cierres";

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
        background: linear-gradient(135deg, #0ea5e9, #0d9488) !important;
        box-shadow: 0 4px 14px rgba(14,165,233,0.35) !important;
        color: #fff !important;
      }
      .mediclinic-clasico .text-teal-600, .mediclinic-clasico .text-teal-500,
      .mediclinic-clasico .text-teal-300, .mediclinic-clasico .text-teal-400,
      .mediclinic-clasico .text-aurora { color: #0d9488 !important; -webkit-text-fill-color: #0d9488 !important; }
      .mediclinic-clasico .bg-teal-500\\/15 { background-color: rgba(14,165,233,0.12) !important; }
      .mediclinic-clasico .border-teal-500\\/30, .mediclinic-clasico .border-teal-400\\/60 { border-color: rgba(13,148,136,0.4) !important; }
    `}</style>
  );
}

export default function MediclinicApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const [pagina, setPagina] = useState<Pagina>("general");
  const [modoClasico, setModoClasico] = useState(() => {
    try { return localStorage.getItem(MODO_CLASICO_KEY) === "1"; } catch { return false; }
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

  // Registro de cobros locales para sala de espera y cierre de caja
  const [cobrosLocales, setCobrosLocales] = useState<CobroItem[]>(() => {
    try {
      const raw = localStorage.getItem(`cobros_locales_${hoy()}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Guardar cobros en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`cobros_locales_${hoy()}`, JSON.stringify(cobrosLocales));
    } catch {}
  }, [cobrosLocales]);

  const agregarCobroLocal = (item: CobroItem) => {
    setCobrosLocales((prev) => [item, ...prev]);
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
      
      {/* SIDEBAR NATIVO MEDICLINIC PRO */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-300/60 dark:border-white/10 flex flex-col p-4 space-y-1">
        <div className="px-2 pb-4 mb-2 border-b border-slate-300/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-['Outfit'] font-black text-lg text-aurora">Mediclinic Pro</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 font-mono font-bold">PRO</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-0.5">
            {user?.empresa || "Centro Médico"}
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

        {/* Switch Modo Clásico / Modo Aurora */}
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
          className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-left text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:hover:bg-white/5"
        >
          ← Volver al Hub
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between px-6 bg-white/30 dark:bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              {NAV.find((n) => n.id === pagina)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-right hidden sm:block">
              <div className="font-bold text-slate-900 dark:text-white">Dr(a). {user?.nombre || "Médico Especialista"}</div>
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">Tasa BCV: Bs. {TASA_BCV_DEFAULT.toFixed(2)}/USD</div>
            </div>
            <button onClick={recargarTodo} className="p-2 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60" title="Actualizar datos">
              <IconRefresh size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {pagina === "general" && <VistaGeneral pacientes={pacientes} citasHoy={citasHoy} salaEspera={salaEspera} ingresosHoy={ingresosHoy} onNavegar={setPagina} />}
          {pagina === "pacientes" && <GestionPacientes tenantId={tenantId} pacientes={pacientes} onCambio={recargarTodo} />}
          {pagina === "historias" && <HistoriasClinicas tenantId={tenantId} pacientes={pacientes} user={user} />}
          {pagina === "procedimientos" && <Procedimientos tenantId={tenantId} procedimientos={procedimientos} onCambio={recargarTodo} />}
          {pagina === "sala-espera" && <SalaEspera tenantId={tenantId} pacientes={pacientes} entradas={salaEspera} cobrosLocales={cobrosLocales} onAgregarCobro={agregarCobroLocal} onCambio={recargarTodo} user={user} />}
          {pagina === "agenda" && <AgendaMedica tenantId={tenantId} pacientes={pacientes} citasHoy={citasHoy} onCambio={recargarTodo} />}
          {pagina === "financiero" && <ResumenesFinancieros ingresosHoy={ingresosHoy} citasHoy={citasHoy} cobrosLocales={cobrosLocales} user={user} />}
          {pagina === "configuracion" && <Configuracion user={user} />}
        </div>
      </main>
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
            <button onClick={() => onNavegar("sala-espera")} className="text-teal-600 dark:text-teal-400 text-xs font-bold">Ver Sala →</button>
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
            <button onClick={() => onNavegar("agenda")} className="text-teal-600 dark:text-teal-400 text-xs font-bold">Ir a Agenda →</button>
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
              <label className="text-[10px] text-slate-500 dark:text-white/40 uppercase font-mono">Género</label>
              <select value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-black/20 text-xs">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>
          <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-50">
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
// HISTORIAS CLÍNICAS & GENERACIÓN DE INFORME PDF + WHATSAPP
// ══════════════════════════════════════════════════════════════════════════
function HistoriasClinicas({ tenantId, pacientes, user }: { tenantId: number; pacientes: Paciente[] | null; user: any }) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [historial, setHistorial] = useState<ConsultaMedica[] | null>(null);
  
  // Signos vitales completos
  const [signos, setSignos] = useState({ ta: "120/80", fc: "75", fr: "18", temp: "36.8", peso: "70", talla: "1.72", imc: "23.6", satO2: "99" });
  const [form, setForm] = useState({ motivoConsulta: "", evolucionClinica: "", descripcionDiagnostico: "", planTratamiento: "", proximaCita: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pacienteSeleccionado = (pacientes || []).find((p) => p.id === Number(pacienteId));

  // Cálculo automático de IMC
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

  const handleDescargarPdf = () => {
    if (!pacienteSeleccionado) return;
    const datosPdf: ConsultaReportData = {
      clinicaNombre: user?.empresa || "Clínica Médica Especializada",
      doctorNombre: user?.nombre || "Médico Especialista",
      especialidad: "Medicina General / Especialidad",
      matriculaMPPS: "109842",
      colegioMedicos: "5421",
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
      motivoConsulta: form.motivoConsulta || "Consulta Médica",
      evolucionClinica: form.evolucionClinica,
      diagnosticoCIE10: form.descripcionDiagnostico,
      planTratamiento: form.planTratamiento,
      proximaCita: form.proximaCita,
    };
    generarPdfInformeConsulta(datosPdf);
  };

  const handleEnviarWhatsApp = () => {
    if (!pacienteSeleccionado) return;
    const datosPdf: ConsultaReportData = {
      clinicaNombre: user?.empresa || "Clínica Médica Especializada",
      doctorNombre: user?.nombre || "Médico Especialista",
      especialidad: "Medicina General",
      matriculaMPPS: "109842",
      colegioMedicos: "5421",
      paciente: {
        expediente: `HC-2026-${String(pacienteSeleccionado.id).padStart(4, "0")}`,
        nombreCompleto: pacienteSeleccionado.nombreCompleto,
        identificacion: pacienteSeleccionado.identificacion,
        edad: pacienteSeleccionado.edad || 30,
        telefono: pacienteSeleccionado.telefono || "",
        origen: "Local",
        fechaConsulta: hoy(),
      },
      signosVitales: signos,
      motivoConsulta: form.motivoConsulta,
      evolucionClinica: form.evolucionClinica,
      diagnosticoCIE10: form.descripcionDiagnostico,
      planTratamiento: form.planTratamiento,
      proximaCita: form.proximaCita,
    };
    const texto = generarTextoWhatsAppConsulta(datosPdf);
    const tel = (pacienteSeleccionado.telefono || "").replace(/\D/g, "");
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
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

            {/* Bloque de Signos Vitales */}
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
            <div className="space-y-2">
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

            {/* Botones de acción */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button type="submit" disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-50">
                {guardando ? "Guardando…" : "Guardar en Expediente"}
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDescargarPdf} className="px-3.5 py-2 rounded-full border border-teal-500/40 text-teal-600 dark:text-teal-300 text-xs font-bold hover:bg-teal-500/10 flex items-center gap-1.5">
                  <span>📥</span> Descargar PDF
                </button>
                <button type="button" onClick={handleEnviarWhatsApp} className="px-3.5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 flex items-center gap-1.5 shadow-sm">
                  <span>💬</span> WhatsApp
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
// PROCEDIMIENTOS & COTIZADOR MULTI-MONEDA
// ══════════════════════════════════════════════════════════════════════════
function Procedimientos({ tenantId, procedimientos, onCambio }: { tenantId: number; procedimientos: ProcedimientoMedico[] | null; onCambio: () => void }) {
  const [form, setForm] = useState({ nombre: "", descripcion: "", costo: "", moneda: "USD", duracionMinutos: "" });
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
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

  return (
    <div className="space-y-4">
      <form onSubmit={guardar} className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Nuevo Procedimiento / Arancel</h4>
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
        <button disabled={guardando} className="btn-electric-blue text-xs font-bold px-5 py-2.5 rounded-full disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar en Catálogo"}
        </button>
      </form>

      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Catálogo & Cotizador de Procedimientos</h4>
        {procedimientos === null ? (
          <p className="text-xs text-slate-400">Cargando catálogo…</p>
        ) : procedimientos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin procedimientos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {procedimientos.map((p) => {
              const costoUsd = Number(p.costo);
              const costoVes = costoUsd * TASA_BCV_DEFAULT;
              return (
                <div key={p.id} className="p-4 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-2">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-teal-600 dark:text-teal-400 font-bold text-base">${costoUsd.toFixed(2)} USD</span>
                    <span className="text-slate-500 font-mono text-xs">Bs. {costoVes.toFixed(2)}</span>
                  </div>
                  {p.descripcion && <p className="text-xs text-slate-500 line-clamp-2">{p.descripcion}</p>}
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
function SalaEspera({ tenantId, pacientes, entradas, cobrosLocales, onAgregarCobro, onCambio, user }: {
  tenantId: number; pacientes: Paciente[] | null; entradas: SalaEsperaEntrada[] | null; cobrosLocales: CobroItem[];
  onAgregarCobro: (item: CobroItem) => void; onCambio: () => void; user: any;
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
        montoVES: montoNum * TASA_BCV_DEFAULT,
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
      clinicaNombre: user?.empresa || "Clínica Médica Especializada",
      doctorNombre: user?.nombre || "Médico Especialista",
      fecha: hoy(),
      horaCierre: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      tasaBCV: TASA_BCV_DEFAULT,
      cobros: cobrosLocales,
      totalUSD: totalCajaUSD,
      totalVES: totalCajaVES,
      totalPacientes: cobrosLocales.length,
    };
    generarPdfCierreCaja(dataCierre);
    setMostrarModalCierre(false);
  };

  return (
    <div className="space-y-5">
      {/* Botón superior de Cierre de Caja */}
      <div className="flex items-center justify-between apple-glass rounded-2xl p-4 border border-teal-500/30">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Recepción, Triaje & Caja Diaria</h4>
          <p className="text-xs text-slate-500">Recaudación actual: <strong className="text-emerald-500">${totalCajaUSD.toFixed(2)} USD</strong> (Bs. {totalCajaVES.toFixed(2)})</p>
        </div>
        <button
          onClick={() => setMostrarModalCierre(true)}
          className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>🔒</span> Cerrar Caja y Jornada
        </button>
      </div>

      {/* Formulario de Registro de Llegada con Cobro */}
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

      {/* Lista de Turnos Activos */}
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
                  <button onClick={() => finalizar(e.id)} className="px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-bold text-xs hover:bg-teal-500/30 flex items-center gap-1">
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
              <button onClick={() => setMostrarModalCierre(false)} className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={ejecutarCierreCaja} className="px-5 py-2.5 rounded-full bg-teal-500 text-black font-bold text-xs hover:bg-teal-400 flex items-center gap-2">
                <span>📥</span> Descargar Reporte PDF & Cerrar
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
  
  // Formulario existente
  const [formExistente, setFormExistente] = useState({ pacienteId: "", horaInicio: "09:00", horaFin: "09:30", motivo: "" });
  
  // Formulario nuevo paciente / llamada telefónica
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
        // Crear paciente provisional para la cita
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
      {/* Selector de fecha y botón de bloqueo */}
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
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
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
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${tipoAgenda === "existente" ? "bg-white text-black shadow-xs" : "text-slate-500"}`}
              >
                Paciente Registrado
              </button>
              <button
                type="button"
                onClick={() => setTipoAgenda("nuevo")}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${tipoAgenda === "nuevo" ? "bg-white text-black shadow-xs" : "text-slate-500"}`}
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
// RESÚMENES FINANCIEROS
// ══════════════════════════════════════════════════════════════════════════
function ResumenesFinancieros({ ingresosHoy, citasHoy, cobrosLocales, user }: {
  ingresosHoy: number | null; citasHoy: CitaMedica[] | null; cobrosLocales: CobroItem[]; user: any;
}) {
  const totalUSD = cobrosLocales.reduce((s, x) => s + x.montoUSD, 0);
  const totalVES = cobrosLocales.reduce((s, x) => s + x.montoVES, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Recaudación del Día (USD)" val={`$${totalUSD.toFixed(2)}`} sub="Total en dólares" color="#10b981" />
        <KpiCard label="Equivalente en Bolívares (VES)" val={`Bs. ${totalVES.toFixed(2)}`} sub={`A tasa oficial ${TASA_BCV_DEFAULT}`} color="#0ea5e9" />
        <KpiCard label="Consultas Pagadas" val={String(cobrosLocales.length)} sub="Transacciones de caja" color="#a855f7" />
      </div>

      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Auditoría de Cobros de Hoy</h4>
          <button
            onClick={() => {
              generarPdfCierreCaja({
                clinicaNombre: user?.empresa || "Clínica Médica Especializada",
                doctorNombre: user?.nombre || "Médico Especialista",
                fecha: hoy(),
                horaCierre: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                tasaBCV: TASA_BCV_DEFAULT,
                cobros: cobrosLocales,
                totalUSD,
                totalVES,
                totalPacientes: cobrosLocales.length,
              });
            }}
            className="px-3.5 py-1.5 rounded-full border border-teal-500/40 text-teal-600 dark:text-teal-400 font-bold text-xs hover:bg-teal-500/10 flex items-center gap-1.5"
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
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN & PERFIL MÉDICO
// ══════════════════════════════════════════════════════════════════════════
function Configuracion({ user }: { user: any }) {
  const [tasa, setTasa] = useState(String(TASA_BCV_DEFAULT));
  const [guardado, setGuardado] = useState(false);

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4 max-w-xl">
      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Perfil Médico & Configuración de Tasas</h4>
      <div className="text-xs text-slate-600 dark:text-white/70 space-y-2">
        <div>Clínica / Organización: <strong className="text-slate-900 dark:text-white">{user?.empresa || "Centro Médico"}</strong></div>
        <div>Médico Responsable: <strong className="text-slate-900 dark:text-white">{user?.nombre || "Dr. Especialista"}</strong></div>
        <div>Correo Electrónico: <strong className="text-slate-900 dark:text-white">{user?.email}</strong></div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-white/80">Tasa Oficial de Cambio (BCV / VES por USD)</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            className="w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-mono font-bold"
          />
          <button
            onClick={() => setGuardado(true)}
            className="btn-electric-blue text-xs font-bold px-4 py-2 rounded-full cursor-pointer"
          >
            Actualizar Tasa
          </button>
        </div>
        {guardado && <p className="text-xs text-emerald-500 font-bold">✓ Tasa actualizada exitosamente</p>}
      </div>
    </div>
  );
}
